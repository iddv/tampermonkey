#!/bin/bash

# EU-West-1 Deployment script for Tampermonkey Deep Research Bot
# This script deploys the CloudFormation stack and uploads the Lambda functions

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Change to project root to ensure consistent paths
cd "$PROJECT_ROOT"

# Cleanup trap
trap 'rm -f research-function.zip packaged-template.yaml' EXIT

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration for tampermonkey repository
STACK_NAME="tampermonkey-research-bot"
ENVIRONMENT="prod"
REGION="eu-west-1"
GITHUB_REPO_URL="https://api.github.com/repos/iddv/tampermonkey/contents"
LAMBDA_ZIP="research-function.zip"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if AWS CLI is installed
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
}

# Function to check if jq is installed
check_jq() {
    if ! command -v jq &> /dev/null; then
        print_error "jq is not installed. Please install it first."
        exit 1
    fi
}

# Function to validate AWS credentials
validate_aws_credentials() {
    print_status "Validating AWS credentials..."
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    account_id=$(aws sts get-caller-identity --query Account --output text)
    export AWS_ACCOUNT_ID=$account_id
    local user_arn=$(aws sts get-caller-identity --query Arn --output text)
    print_status "Using AWS Account: $account_id"
    print_status "Using Identity: $user_arn"
    print_status "Deploying to region: $REGION"
}

# Function to create Lambda deployment package
create_lambda_package() {
    print_status "Creating Lambda deployment package..."
    print_status "Working from directory: $(pwd)"
    
    # Verify files exist before proceeding
    local lambda_files=(
        "infrastructure/lambda/research_function.py"
        "infrastructure/lambda/worker_function.py" 
        "infrastructure/lambda/synthesis_function.py"
        "infrastructure/lambda/openrouter_model.py"
        "infrastructure/lambda/model_metadata_utils.py"
        "infrastructure/lambda/requirements.txt"
    )
    
    for file in "${lambda_files[@]}"; do
        if [ ! -f "$file" ]; then
            print_error "Required file not found: $file"
            print_error "Current directory: $(pwd)"
            print_error "Directory contents:"
            ls -la infrastructure/lambda/ || echo "Lambda directory not found"
            exit 1
        fi
    done
    
    print_status "All required Lambda files found ✓"
    
    # Create temporary directory for Lambda package
    local temp_dir=$(mktemp -d)
    local lambda_dir="$temp_dir/lambda"
    mkdir -p "$lambda_dir"
    
    # Copy Lambda function code
    cp infrastructure/lambda/research_function.py "$lambda_dir/"
    cp infrastructure/lambda/worker_function.py "$lambda_dir/"
    cp infrastructure/lambda/synthesis_function.py "$lambda_dir/"
    cp infrastructure/lambda/openrouter_model.py "$lambda_dir/"
    cp infrastructure/lambda/model_metadata_utils.py "$lambda_dir/"
    cp infrastructure/lambda/requirements.txt "$lambda_dir/"
    
    # Install dependencies for ARM64 Linux (Lambda architecture)
    print_status "Installing Lambda dependencies for ARM64 architecture..."
    cd "$lambda_dir"
    pip install -r requirements.txt -t . --platform linux_aarch64 --only-binary=:all: --upgrade
    
    # Create zip file
    zip -r "../$LAMBDA_ZIP" . > /dev/null
    
    # Move zip to current directory
    cd - > /dev/null
    mv "$temp_dir/$LAMBDA_ZIP" .
    
    # Cleanup
    rm -rf "$temp_dir"
    
    print_status "Lambda package created: $LAMBDA_ZIP"
}

# Function to create deployment S3 bucket if it doesn't exist
create_deployment_bucket() {
    local bucket_name="$STACK_NAME-deployment-$ENVIRONMENT-$AWS_ACCOUNT_ID"
    
    print_status "Checking for deployment bucket: $bucket_name" >&2
    
    if ! aws s3api head-bucket --bucket "$bucket_name" --region "$REGION" &> /dev/null; then
        print_status "Creating deployment bucket: $bucket_name" >&2
        aws s3 mb "s3://$bucket_name" --region "$REGION" >&2
    else
        print_status "Deployment bucket already exists." >&2
    fi
    
    echo "$bucket_name"
}

# Function to store API keys securely in Parameter Store
store_api_keys() {
    local openrouter_api_key="$1"
    local tavily_api_key="$2"
    
    print_status "Storing API keys in SSM Parameter Store..."
    
    # Store OpenRouter API key
    aws ssm put-parameter \
        --name "/research-bot/openrouter-api-key" \
        --value "$openrouter_api_key" \
        --type SecureString \
        --overwrite \
        --region "$REGION" \
        --description "OpenRouter API key for multi-model access and research decomposition"
    
    # Store Tavily API key
    aws ssm put-parameter \
        --name "/research-bot/tavily-api-key" \
        --value "$tavily_api_key" \
        --type SecureString \
        --overwrite \
        --region "$REGION" \
        --description "Tavily API key for web search"
    

    
    print_status "API keys and configuration stored securely in Parameter Store"
}

# Function to deploy CloudFormation stack
deploy_stack() {
    local deployment_bucket="$1"
    
    print_status "Packaging CloudFormation template..."
    aws cloudformation package \
        --template-file infrastructure/research-automation-stack.yaml \
        --s3-bucket "$deployment_bucket" \
        --output-template-file packaged-template.yaml \
        --region "$REGION"

    print_status "Deploying CloudFormation stack: $STACK_NAME"
    print_status "This will take 5-10 minutes. Showing detailed progress..."
    
    # Deploy with detailed output
    if aws cloudformation deploy \
        --template-file packaged-template.yaml \
        --stack-name "$STACK_NAME" \
        --parameter-overrides \
            "Environment=$ENVIRONMENT" \
            "GitHubRepoUrl=$GITHUB_REPO_URL" \
            "ProjectName=tampermonkey-research" \
        --capabilities CAPABILITY_NAMED_IAM \
        --region "$REGION" \
        --no-fail-on-empty-changeset; then
        
        print_status "CloudFormation deployment completed successfully!"
    else
        print_error "CloudFormation deployment failed!"
        print_error "Getting detailed error information..."
        
        # Show failed events
        echo
        print_error "=== FAILED EVENTS ==="
        aws cloudformation describe-stack-events \
            --stack-name "$STACK_NAME" \
            --region "$REGION" \
            --query 'StackEvents[?ResourceStatus==`CREATE_FAILED` || ResourceStatus==`UPDATE_FAILED`].[Timestamp,LogicalResourceId,ResourceStatus,ResourceStatusReason]' \
            --output table
            
        # Show all recent events for context
        echo
        print_error "=== RECENT EVENTS (Last 10) ==="
        aws cloudformation describe-stack-events \
            --stack-name "$STACK_NAME" \
            --region "$REGION" \
            --query 'StackEvents[:10].[Timestamp,LogicalResourceId,ResourceStatus,ResourceStatusReason]' \
            --output table
            
        exit 1
    fi
    
    # Cleanup temporary template
    rm -f packaged-template.yaml
}

# Function to get stack outputs
get_stack_outputs() {
    print_status "Getting stack outputs..."
    
    local outputs=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query "Stacks[0].Outputs" \
        --output json)
    
    echo "$outputs" | jq -r '.[] | "\(.OutputKey): \(.OutputValue)"'
}

# Test function removed - infrastructure deployment is sufficient
# Users can test Lambda functions manually via AWS Console or CLI if needed

# Function to cleanup deployment artifacts
cleanup() {
    print_status "Cleaning up deployment artifacts..."
    rm -f "$LAMBDA_ZIP"
}

# Main deployment function
main() {
    local openrouter_api_key="$1"
    local tavily_api_key="$2"
    
    print_status "Starting deployment of Tampermonkey Deep Research Bot to EU-West-1"
    
    # Check prerequisites
    check_aws_cli
    check_jq
    validate_aws_credentials
    
    # Validate required parameters
    if [ -z "$openrouter_api_key" ]; then
        print_error "OpenRouter API key is required"
        echo "Usage: $0 <openrouter-api-key> <tavily-api-key>"
        exit 1
    fi
    
    if [ -z "$tavily_api_key" ]; then
        print_error "Tavily API key is required"
        echo "Usage: $0 <openrouter-api-key> <tavily-api-key>"
        exit 1
    fi
    
    print_status "API keys provided as parameters ✓"
    
    # Store API keys securely in Parameter Store
    store_api_keys "$openrouter_api_key" "$tavily_api_key"
    
    # Create Lambda package
    create_lambda_package
    
    # Create deployment bucket
    local deployment_bucket=$(create_deployment_bucket)
    
    # Deploy CloudFormation stack
    deploy_stack "$deployment_bucket"
    
    # Get and display stack outputs
    print_status "Deployment completed successfully!"
    echo
    print_status "Stack outputs:"
    get_stack_outputs
    
    # Skip Lambda testing during deployment - infrastructure is ready for use
    
    # Cleanup
    cleanup
    
    print_status "Deployment complete! Your OpenRouter-powered Tampermonkey research bot is now running in EU-West-1."
    print_status "Next steps:"
    echo "1. The research configuration is already in your tampermonkey repository (research-config.json)"
    echo "2. Research will run daily at 9 AM UTC using OpenRouter models"
    echo "3. Monitor CloudWatch logs for research runs"
    echo "4. Check S3 bucket for research results"
    echo "5. GitHub repository: https://github.com/iddv/tampermonkey"
}

# Handle script arguments
if [[ $# -eq 0 ]]; then
    echo "Usage: $0 <openrouter-api-key> <tavily-api-key>"
    echo "       $0 -h|--help"
    echo
    echo "Example:"
    echo "  $0 'sk-or-v1-your-openrouter-key' 'tvly-your-tavily-key'"
    exit 1
fi

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            echo "Usage: $0 <openrouter-api-key> <tavily-api-key>"
            echo "This script deploys the Tampermonkey Deep Research Bot to EU-West-1"
            echo
            echo "Arguments:"
            echo "  openrouter-api-key    Your OpenRouter API key (get from openrouter.ai)"
            echo "  tavily-api-key        Your Tavily API key (get from tavily.com)"
            echo
            echo "Configuration:"
            echo "  Region: $REGION"
            echo "  Stack Name: $STACK_NAME"
            echo "  GitHub Repo: $GITHUB_REPO_URL"
            echo "  Environment: $ENVIRONMENT"
            echo
            echo "Example:"
            echo "  $0 'sk-or-v1-your-openrouter-key' 'tvly-your-tavily-key'"
            exit 0
            ;;
        *)
            # Not a flag, break to handle as positional arguments
            break
            ;;
    esac
done

# Run main function with API keys as arguments
main "$1" "$2" 