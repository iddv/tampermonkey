#!/bin/bash

# EU-West-1 Deployment script for Tampermonkey Deep Research Bot
# This script deploys the CloudFormation stack and uploads the Lambda functions

set -e

# Cleanup trap
trap 'rm -f research-function.zip packaged-template.yaml /tmp/lambda-response.json' EXIT

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
    
    # Create temporary directory for Lambda package
    local temp_dir=$(mktemp -d)
    local lambda_dir="$temp_dir/lambda"
    mkdir -p "$lambda_dir"
    
    # Copy Lambda function code
    cp infrastructure/lambda/research_function.py "$lambda_dir/"
    cp infrastructure/lambda/worker_function.py "$lambda_dir/"
    cp infrastructure/lambda/synthesis_function.py "$lambda_dir/"
    
    # Copy requirements.txt from lambda directory
    if [ -f "infrastructure/lambda/requirements.txt" ]; then
        cp infrastructure/lambda/requirements.txt "$lambda_dir/requirements.txt"
    else
        print_error "requirements.txt not found in lambda directory"
        exit 1
    fi
    
    # Install dependencies
    print_status "Installing Lambda dependencies..."
    cd "$lambda_dir"
    pip install -r requirements.txt -t .
    
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
    
    print_status "Checking for deployment bucket: $bucket_name"
    
    if ! aws s3api head-bucket --bucket "$bucket_name" --region "$REGION" &> /dev/null; then
        print_status "Creating deployment bucket: $bucket_name"
        aws s3 mb "s3://$bucket_name" --region "$REGION"
    else
        print_status "Deployment bucket already exists."
    fi
    
    echo "$bucket_name"
}

# Function to store API keys securely in Parameter Store
store_api_keys() {
    local openai_api_key="$1"
    local tavily_api_key="$2"
    
    print_status "Storing API keys in SSM Parameter Store..."
    
    # Store OpenAI API key
    aws ssm put-parameter \
        --name "/research-bot/openai-api-key" \
        --value "$openai_api_key" \
        --type SecureString \
        --overwrite \
        --region "$REGION" \
        --description "OpenAI API key for research decomposition"
    
    # Store Tavily API key
    aws ssm put-parameter \
        --name "/research-bot/tavily-api-key" \
        --value "$tavily_api_key" \
        --type SecureString \
        --overwrite \
        --region "$REGION" \
        --description "Tavily API key for web search"
    
    print_status "API keys stored securely in Parameter Store"
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
    aws cloudformation deploy \
        --template-file packaged-template.yaml \
        --stack-name "$STACK_NAME" \
        --parameter-overrides \
            "Environment=$ENVIRONMENT" \
            "GitHubRepoUrl=$GITHUB_REPO_URL" \
            "ProjectName=tampermonkey-research" \
        --capabilities CAPABILITY_NAMED_IAM \
        --region "$REGION"
    
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

# Function to test the deployment
test_deployment() {
    print_status "Testing deployment..."
    
    local orchestrator_arn=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query "Stacks[0].Outputs[?OutputKey=='OrchestratorFunctionArn'].OutputValue" \
        --output text)
    
    if [ -n "$orchestrator_arn" ]; then
        print_status "Invoking orchestrator function for test..."
        
        aws lambda invoke \
            --function-name "$orchestrator_arn" \
            --payload '{"source": "manual-test", "detail": {"trigger": "deployment-test"}}' \
            --cli-binary-format raw-in-base64-out \
            --region "$REGION" \
            /tmp/lambda-response.json > /dev/null
        
        # Check for function errors
        local function_error=$(jq -r '.FunctionError // ""' /tmp/lambda-response.json 2>/dev/null || echo "")
        
        if [ -z "$function_error" ]; then
            print_status "Lambda function test successful!"
            cat /tmp/lambda-response.json
        else
            print_warning "Lambda function test FAILED. FunctionError: $function_error"
            print_warning "Check CloudWatch logs for details."
            cat /tmp/lambda-response.json
        fi
        
        rm -f /tmp/lambda-response.json
    else
        print_warning "Could not find orchestrator Lambda ARN in stack outputs."
    fi
}

# Function to cleanup deployment artifacts
cleanup() {
    print_status "Cleaning up deployment artifacts..."
    rm -f "$LAMBDA_ZIP"
}

# Main deployment function
main() {
    print_status "Starting deployment of Tampermonkey Deep Research Bot to EU-West-1"
    
    # Check prerequisites
    check_aws_cli
    check_jq
    validate_aws_credentials
    
    # Get required parameters
    read -p "Enter your OpenAI API key: " -s openai_api_key
    echo
    
    if [ -z "$openai_api_key" ]; then
        print_error "OpenAI API key is required"
        exit 1
    fi
    
    read -p "Enter your Tavily API key: " -s tavily_api_key
    echo
    
    if [ -z "$tavily_api_key" ]; then
        print_error "Tavily API key is required"
        exit 1
    fi
    
    # Store API keys securely in Parameter Store
    store_api_keys "$openai_api_key" "$tavily_api_key"
    
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
    
    # Test the deployment
    test_deployment
    
    # Cleanup
    cleanup
    
    print_status "Deployment complete! Your Tampermonkey research bot is now running in EU-West-1."
    print_status "Next steps:"
    echo "1. The research configuration is already in your tampermonkey repository (research-config.json)"
    echo "2. Research will run daily at 9 AM UTC"
    echo "3. Monitor CloudWatch logs for research runs"
    echo "4. Check S3 bucket for research results"
    echo "5. GitHub repository: https://github.com/iddv/tampermonkey"
}

# Handle script arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            echo "Usage: $0 [options]"
            echo "This script deploys the Tampermonkey Deep Research Bot to EU-West-1"
            echo "Configuration:"
            echo "  Region: $REGION"
            echo "  Stack Name: $STACK_NAME"
            echo "  GitHub Repo: $GITHUB_REPO_URL"
            echo "  Environment: $ENVIRONMENT"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main 