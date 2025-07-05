# Scout Research Agent - Deep Research Bot for Tampermonkey Scripts

An enhanced AI-powered research automation system designed to provide deep insights into your tampermonkey scripts and browser automation projects. This guide will help you deploy the research bot to AWS EU-West-1 region.

## 📁 What's This Directory?

This `scout-research-agent` directory contains a complete AWS-based research automation system that:
- **Analyzes your tampermonkey projects** using AI-powered research agents
- **Provides actionable insights** on browser automation, security, and performance
- **Runs automatically** on a daily schedule (9 AM UTC)
- **Stores results in S3** with human-readable organization
- **Uses modern AWS services** (Lambda, SQS, S3) with enterprise-grade security

**Separate from your tampermonkey scripts**: This research system is completely independent of your actual userscripts and can be deployed to any AWS account.

## 🚀 Quick Start

Your research bot is pre-configured for:
- **Repository**: https://github.com/iddv/tampermonkey
- **Region**: eu-west-1
- **Configuration**: research-config.json (already created)
- **Architecture**: Lambda + SQS + S3 (enhanced with Strands agents)

## 📋 Prerequisites

1. **AWS CLI installed and configured**
   ```bash
   aws configure
   # Set your credentials for eu-west-1 region
   ```

2. **Python 3.11+ and pip**
   ```bash
   python --version
   pip --version
   ```

3. **jq installed** (for JSON parsing)
   ```bash
   # On Ubuntu/Debian
   sudo apt-get install jq
   
   # On macOS
   brew install jq
   ```

4. **API Keys**
   - OpenAI API Key (for research decomposition)
   - Tavily API Key (for web search)

## 🔧 Deployment Steps

### 1. Navigate to Scout Research Agent Directory
```bash
cd scout-research-agent
```

### 2. Make Deploy Script Executable
```bash
chmod +x infrastructure/deploy-eu-west-1.sh
```

### 3. Run Deployment
```bash
./infrastructure/deploy-eu-west-1.sh
```

The script will:
- Validate AWS credentials
- Ask for your OpenAI and Tavily API keys
- Store API keys securely in Parameter Store
- Create Lambda deployment package
- Deploy CloudFormation stack
- Test the deployment

### 4. Expected Output
```
[INFO] Starting deployment of Tampermonkey Deep Research Bot to EU-West-1
[INFO] Validating AWS credentials...
[INFO] Using AWS Account: 123456789012
[INFO] Deploying to region: eu-west-1
Enter your OpenAI API key: [hidden]
Enter your Tavily API key: [hidden]
[INFO] Storing API keys in SSM Parameter Store...
[INFO] Creating Lambda deployment package...
[INFO] Deploying CloudFormation stack: tampermonkey-research-bot
[INFO] Deployment completed successfully!
```

## 🔍 Verification

After deployment, verify your setup:

### 1. Check CloudFormation Stack
```bash
aws cloudformation describe-stacks --stack-name tampermonkey-research-bot --region eu-west-1
```

### 2. Test Manual Research Run
```bash
aws lambda invoke --function-name tampermonkey-research-orchestrator-prod \
  --payload '{"source": "manual-test"}' \
  --cli-binary-format raw-in-base64-out \
  --region eu-west-1 \
  response.json
```

### 3. Check S3 Bucket
```bash
aws s3 ls s3://tampermonkey-research-research-data-prod-YOUR_ACCOUNT_ID/ --region eu-west-1
```

### 4. Monitor CloudWatch Logs
```bash
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/tampermonkey-research --region eu-west-1
```

## 📊 Research Configuration

Your research bot is configured to analyze:

1. **AWS Role Launcher** - IAM role management and browser security
2. **LLM Judge** - AI integration in browser extensions
3. **Personal Web Clipper** - Content extraction and local storage
4. **YouTube Clean Player** - Video platform optimization
5. **Tampermonkey Development Framework** - Modern userscript development

## 🕐 Scheduling

- **Daily Research**: 9:00 AM UTC (10:00 AM CET)
- **Results**: Available in S3 bucket after completion
- **Synthesis**: Auto-triggers after research completion

## 📈 Monitoring

### CloudWatch Alarms
- Dead Letter Queue messages
- Synthesis function errors
- Research completion timeouts

### Logs Location
- Orchestrator: `/aws/lambda/tampermonkey-research-orchestrator-prod`
- Worker: `/aws/lambda/tampermonkey-research-worker-prod`
- Synthesis: `/aws/lambda/tampermonkey-research-synthesis-prod`

## 🛠️ Troubleshooting

### Common Issues

1. **Deployment fails with permissions error**
   ```bash
   # Check IAM permissions
   aws sts get-caller-identity --region eu-west-1
   ```

2. **API keys not working**
   ```bash
   # Verify parameters are set
   aws ssm get-parameter --name "/research-bot/openai-api-key" --region eu-west-1 --with-decryption
   aws ssm get-parameter --name "/research-bot/tavily-api-key" --region eu-west-1 --with-decryption
   ```

3. **Research not running**
   ```bash
   # Check CloudWatch Events rule
   aws events describe-rule --name tampermonkey-research-research-schedule-prod --region eu-west-1
   ```

4. **GitHub config not found**
   - Ensure `research-config.json` is in your repository root
   - Check GitHub API URL format: `https://api.github.com/repos/iddv/tampermonkey/contents/research-config.json`

## 💰 Cost Optimization

Your setup is optimized for AWS free tier:
- **Lambda**: 15-minute timeout, limited concurrency
- **SQS**: Standard queue with DLQ
- **S3**: Lifecycle policies for cost management
- **CloudWatch**: Basic monitoring

Expected monthly cost: **$0-5** (within free tier limits)

## 🔄 Updates and Maintenance

### Update Research Configuration
1. Edit `research-config.json` in your repository
2. Commit and push changes
3. Next scheduled run will use updated config

### Update Lambda Code
1. Modify code in `infrastructure/lambda/`
2. Redeploy: `./deploy-eu-west-1.sh`

### View Research Results
```bash
# List recent research runs
aws s3 ls s3://tampermonkey-research-research-data-prod-YOUR_ACCOUNT_ID/research/ --recursive --region eu-west-1

# Download specific research result
aws s3 cp s3://tampermonkey-research-research-data-prod-YOUR_ACCOUNT_ID/research/YYYY/MM/DD/RUN_ID/success/project-name.json . --region eu-west-1
```

## 📧 Support

If you encounter issues:
1. Check CloudWatch logs for error details
2. Review the troubleshooting section
3. Verify API keys and permissions
4. Ensure research-config.json is valid JSON

## 🎯 Next Steps

### Immediate (After Deployment)
1. **Enable AWS Cost Anomaly Detection** (Highly Recommended)
   ```bash
   # Go to AWS Billing Console > Cost Anomaly Detection > Create anomaly detector
   # This will catch unexpected cost spikes from bugs or misconfigurations
   # Uses ML to learn your spending patterns - much smarter than static budget alarms
   ```

2. **Monitor first research run** (scheduled for 9 AM UTC)
3. **Review research results** in S3 bucket
4. **Verify CloudWatch alarms** are working correctly

### Ongoing Maintenance
1. **Customize research topics** by editing research-config.json
2. **Review CloudWatch logs** for any issues
3. **Monitor research quality** and adjust prompts if needed

### Future Enhancements (Optional)
1. **AWS X-Ray Integration**: For distributed tracing and end-to-end observability
   - Visualize the complete flow: Orchestrator → SQS → Worker → S3 → Synthesis
   - Pinpoint bottlenecks in the research pipeline
   - Enable with just a checkbox in Lambda configuration

2. **Enhanced Research Validation**: Cross-referencing between worker results
3. **Custom Research Triggers**: Manual research runs for specific topics

## 🔥 System Capabilities

Your enhanced research bot now includes:

**🛡️ Enterprise Security:**
- All API keys in Parameter Store (never in public repos)
- Least privilege IAM roles for each component
- S3 and SQS server-side encryption
- No VPC deployment (avoids $32/month NAT Gateway costs)

**⚡ Performance Optimized:**
- ARM64 architecture for 20% better price/performance
- Enhanced research decomposition with structured meta-prompts
- Manifest-checking pattern for 99%+ reliability

**📊 Production Monitoring:**
- CloudWatch alarms for errors, duration, and queue depth
- Automatic log cleanup (30-day retention)
- Dead Letter Queue monitoring
- Ready for Cost Anomaly Detection

**💰 Cost Efficient:**
- Expected cost: $0-5/month (within AWS free tier)
- Optimized Lambda timeouts and memory allocation
- Reserved concurrency limits for cost control

Your enhanced research bot is now ready to provide deep insights into your tampermonkey scripts and browser automation projects! 🚀 