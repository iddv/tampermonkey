#!/bin/bash

# Deployment script for Scout - Automated Research Intelligence System
# This script deploys the CloudFormation stack and uploads the Lambda function

set -e

# Cleanup trap
trap 'rm -f research-function.zip packaged-template.yaml /tmp/lambda-response.json' EXIT

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
STACK_NAME="scout-research-automation"
ENVIRONMENT="prod"
REGION="us-east-1"
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
}

# Function to create Lambda deployment package
create_lambda_package() {
    print_status "Creating Lambda deployment package..."
    
    # Create temporary directory for Lambda package
    local temp_dir=$(mktemp -d)
    local lambda_dir="$temp_dir/lambda"
    mkdir -p "$lambda_dir"
    
    # Copy Lambda function code
    cp lambda/research_function.py "$lambda_dir/index.py"
    cp lambda/worker_function.py "$lambda_dir/worker.py"
    
    # Copy requirements.txt from lambda directory
    if [ -f "lambda/requirements.txt" ]; then
        cp lambda/requirements.txt "$lambda_dir/requirements.txt"
    else
        print_error "requirements.txt not found in lambda directory"
        exit 1
    fi
    
    # Install dependencies
    print_status "Installing Lambda dependencies..."
    pip install -r "$lambda_dir/requirements.txt" -t "$lambda_dir"
    
    # Create zip file
    (cd "$lambda_dir" && zip -r "../$LAMBDA_ZIP" . > /dev/null)
    
    # Move zip to current directory
    mv "$temp_dir/$LAMBDA_ZIP" .
    
    # Cleanup
    rm -rf "$temp_dir"
    
    print_status "Lambda package created: $LAMBDA_ZIP"
}



# Function to create deployment S3 bucket if it doesn't exist
create_deployment_bucket() {
    local bucket_name="$STACK_NAME-deployment-$ENVIRONMENT-$AWS_ACCOUNT_ID"
    
    print_status "Checking for deployment bucket: $bucket_name"
    
    if ! aws s3api head-bucket --bucket "$bucket_name" &> /dev/null; then
        print_status "Creating deployment bucket: $bucket_name"
        if [ "$REGION" = "us-east-1" ]; then
            aws s3 mb "s3://$bucket_name"
        else
            aws s3 mb "s3://$bucket_name" --region "$REGION"
        fi
    else
        print_status "Deployment bucket already exists."
    fi
    
    echo "$bucket_name"
}

# Function to store API key securely in Parameter Store
store_api_key() {
    local gemini_api_key="$1"
    local parameter_name="/$STACK_NAME/gemini-api-key"
    
    print_status "Storing Gemini API key in SSM Parameter Store..."
    aws ssm put-parameter \
        --name "$parameter_name" \
        --value "$gemini_api_key" \
        --type SecureString \
        --overwrite \
        --region "$REGION" \
        --description "Google Gemini API key for research automation"
    
    print_status "API key stored securely in Parameter Store: $parameter_name"
}

# Function to deploy CloudFormation stack
deploy_stack() {
    local github_repo_url="$1"
    local deployment_bucket="$2"
    
    print_status "Packaging CloudFormation template..."
    aws cloudformation package \
        --template-file research-automation-stack.yaml \
        --s3-bucket "$deployment_bucket" \
        --output-template-file packaged-template.yaml \
        --region "$REGION"

    print_status "Deploying CloudFormation stack: $STACK_NAME"
    aws cloudformation deploy \
        --template-file packaged-template.yaml \
        --stack-name "$STACK_NAME" \
        --parameter-overrides \
            "Environment=$ENVIRONMENT" \
            "GitHubRepoUrl=$github_repo_url" \
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
    
    local lambda_arn=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query "Stacks[0].Outputs[?OutputKey=='ResearchLambdaArn'].OutputValue" \
        --output text)
    
    if [ -n "$lambda_arn" ]; then
        print_status "Invoking Lambda function for test..."
        
        aws lambda invoke \
            --function-name "$lambda_arn" \
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
        print_warning "Could not find Lambda ARN in stack outputs."
    fi
}

# Function to cleanup deployment artifacts
cleanup() {
    print_status "Cleaning up deployment artifacts..."
    rm -f "$LAMBDA_ZIP"
}

# Main deployment function
main() {
    print_status "Starting deployment of Scout Research Intelligence System"
    
    # Check prerequisites
    check_aws_cli
    check_jq
    validate_aws_credentials
    
    # Get required parameters
    read -p "Enter your Gemini API key: " -s gemini_api_key
    echo
    
    if [ -z "$gemini_api_key" ]; then
        print_error "Gemini API key is required"
        exit 1
    fi
    
    read -p "Enter GitHub repository URL for research config [https://api.github.com/repos/YOUR_USERNAME/scout-research-config/contents]: " github_repo_url
    
    if [ -z "$github_repo_url" ]; then
        github_repo_url="https://api.github.com/repos/your-username/scout-research-config/contents"
    fi
    
    # Store API key securely in Parameter Store
    store_api_key "$gemini_api_key"
    
    # Create Lambda package
    create_lambda_package
    
    # Create deployment bucket
    local deployment_bucket=$(create_deployment_bucket)
    
    # Deploy CloudFormation stack (without API key parameter)
    deploy_stack "$github_repo_url" "$deployment_bucket"
    
    # Get and display stack outputs
    print_status "Deployment completed successfully!"
    echo
    print_status "Stack outputs:"
    get_stack_outputs
    
    # Test the deployment
    test_deployment
    
    # Cleanup
    cleanup
    
    print_status "Deployment complete! Your Scout research intelligence system is now running."
    print_status "Next steps:"
    echo "1. Create a public GitHub repository for your research configuration"
    echo "2. Upload the research-config.json file to the repository"
    echo "3. Update the GitHubRepoUrl parameter if needed"
    echo "4. Monitor CloudWatch logs for research runs"
    echo "5. Check S3 bucket for research results"
}

# Handle script arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--stack-name)
            STACK_NAME="$2"
            shift 2
            ;;
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -r|--region)
            REGION="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  -n, --stack-name    CloudFormation stack name (default: $STACK_NAME)"
            echo "  -e, --environment   Environment (default: $ENVIRONMENT)"
            echo "  -r, --region        AWS region (default: $REGION)"
            echo "  -h, --help          Show this help message"
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