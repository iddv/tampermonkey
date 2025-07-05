# Scout - Automated Research Intelligence System

An automated research system that uses Google Gemini AI to generate daily research insights for software development projects. Scout follows structured prompts, comprehensive tracking, and actionable outputs to help development teams stay ahead of technology trends and best practices.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   EventBridge   │───▶│ Main Lambda     │───▶│   SQS Queue     │
│   (Daily Cron)  │    │ (Coordinator)   │    │ (Fan-out)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │                        │
                              ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   DLQ (Main)    │    │ Worker Lambda   │
                       │   (Error)       │    │ (Processing)    │
                       └─────────────────┘    └─────────────────┘
                                                       │
                                                       ▼
                                              ┌─────────────────┐
                                              │   S3 Bucket     │
                                              │   (Results)     │
                                              └─────────────────┘
                                                       │
                                                       ▼
                                              ┌─────────────────┐
                                              │   CloudWatch    │
                                              │   (Logs)        │
                                              └─────────────────┘
                                                       │
                                                       ▼
                                              ┌─────────────────┐
                                              │   GitHub        │
                                              │   (Config)      │
                                              └─────────────────┘
```

## 🔧 Detailed Architecture Design

### **Two-Lambda Fan-Out Pattern**

Our system uses a **coordinator-worker pattern** for scalability and reliability:

#### **1. Main Lambda (Coordinator Function)**
- **File**: `research_function.py` → deployed as `index.py`
- **Trigger**: EventBridge rule (daily at 9 AM UTC)
- **Purpose**: Orchestration and fan-out
- **Process**:
  1. Fetches research configuration from GitHub
  2. Creates one SQS message per project
  3. Returns immediately (no AI processing)
- **Timeout**: 15 minutes (plenty for coordination)
- **Concurrency**: 1 execution per day

#### **2. Worker Lambda (Processing Function)**  
- **File**: `worker_function.py` → deployed as `worker.py`
- **Trigger**: SQS messages (automatic event source mapping)
- **Purpose**: Individual project research processing
- **Process**:
  1. Receives project configuration from SQS
  2. Builds CO-STAR research prompt
  3. Calls Google Gemini API
  4. Stores results in S3
- **Timeout**: 15 minutes per project
- **Concurrency**: Up to 4 parallel executions (one per project)

### **Why This Design?**

#### **🚀 Scalability**
- **Before**: All projects processed serially → 15-minute timeout risk
- **After**: Parallel processing → each project gets full 15 minutes
- **Benefit**: Can handle 100+ projects without timeout

#### **🛡️ Reliability** 
- **Individual Failures**: One project failure doesn't affect others
- **Retry Logic**: SQS automatically retries failed messages (3 attempts)
- **Dead Letter Queue**: Failed messages preserved for analysis
- **Graceful Degradation**: System continues even if some projects fail

#### **💰 Cost Efficiency**
- **Pay Per Use**: Only pay for actual processing time
- **No Idle Time**: Workers only run when needed
- **Free Tier Friendly**: Stays well within AWS limits

#### **🔍 Observability**
- **Separate Logs**: Main coordination vs. individual processing
- **Granular Tracking**: Per-userscript success/failure in DynamoDB
- **Error Isolation**: Easy to identify which userscript caused issues

### **Execution Flow**

```
09:00 UTC Daily
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│ EventBridge triggers Main Lambda                            │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 1. Fetch GitHub config (research-config.json)          │ │
│ │ 2. Parse 4 projects                                     │ │
│ │ 3. Send 4 messages to SQS queue                        │ │
│ │ 4. Return success (takes ~5 seconds)                   │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│ SQS automatically triggers 4 Worker Lambda instances       │
│                                                             │
│ Worker 1: Web Dashboard        Worker 2: API Gateway       │
│ ┌─────────────────────────┐    ┌─────────────────────────┐ │
│ │ • Get API key from SSM  │    │ • Get API key from SSM  │ │
│ │ • Build research prompt │    │ • Build research prompt │ │
│ │ • Call Gemini API       │    │ • Call Gemini API       │ │
│ │ • Store results in S3   │    │ • Store results in S3   │ │
│ └─────────────────────────┘    └─────────────────────────┘ │
│                                                             │
│ Worker 3: Mobile App           Worker 4: Data Pipeline     │
│ ┌─────────────────────────┐    ┌─────────────────────────┐ │
│ │ • Get API key from SSM  │    │ • Get API key from SSM  │ │
│ │ • Build research prompt │    │ • Build research prompt │ │
│ │ • Call Gemini API       │    │ • Call Gemini API       │ │
│ │ • Store results in S3   │    │ • Store results in S3   │ │
│ └─────────────────────────┘    └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────┐
│ All results stored in S3 (takes ~2-5 minutes total)        │
└─────────────────────────────────────────────────────────────┘
```

### **Automatic Setup**

**Yes, everything is automatically configured during deployment:**

1. **EventBridge Rule**: Automatically created with daily cron schedule
2. **SQS Event Source Mapping**: Automatically connects SQS to Worker Lambda
3. **IAM Permissions**: Both Lambdas get appropriate permissions
4. **Dead Letter Queues**: Automatically configured for error handling
5. **CloudWatch Logs**: Automatically created for both functions

**No manual configuration needed** - just run `./deploy.sh` and the system is fully operational.

### **GitHub Configuration Integration**

**Yes, both functions use the GitHub configuration file for research prompts:**

#### **Main Lambda (Coordinator)**:
- Fetches `research-config.json` from your GitHub repository
- Parses the project configurations
- Passes complete project config to each worker via SQS message

#### **Worker Lambda (Processor)**:
- Receives project configuration from SQS message
- Uses the same `build_costar_prompt()` function as before
- Builds research prompts based on:
  - `research_topic` from GitHub config
  - `known_issues` from GitHub config  
  - `focus_areas` from GitHub config
  - `description` and `platform` from GitHub config

#### **Configuration Flow**:
```
GitHub Repo (research-config.json)
     │
     ▼ (fetched once daily)
Main Lambda (parses config)
     │
     ▼ (config passed via SQS)
Worker Lambda (uses config for prompts)
     │
     ▼ (sends to Gemini API)
Research Results
```

**Key Benefits:**
- **Single Source of Truth**: All research configuration in one GitHub file
- **Version Control**: Changes to research topics are tracked in Git
- **No Duplication**: Configuration fetched once, used by all workers
- **Easy Updates**: Change GitHub file, next day's research uses new config

## 🌟 Features

### ✅ **Free and Cost-Effective**
- Uses Google Gemini API (completely free)
- DynamoDB and S3 within AWS free tier limits
- SQS within free tier (1M messages/month)
- No ongoing costs for typical usage

### ✅ **Secure and Reliable**
- API keys stored securely in AWS Parameter Store (encrypted)
- Dead Letter Queues for error handling and retry logic
- Least-privilege IAM roles and policies
- No sensitive data in CloudFormation parameters

### ✅ **Scalable Architecture**
- Fan-out pattern with SQS for parallel processing
- Individual userscripts processed independently
- No timeout issues with large numbers of scripts
- Automatic retry and error handling

### ✅ **Intelligent Research**
- CO-STAR prompt framework for structured research
- Focused on actionable, technical improvements
- Confidence scoring for prioritization
- Source attribution for verification

### ✅ **Configurable and Flexible**
- GitHub-based configuration for easy updates
- Version control for research prompts
- A/B testing capability
- Per-userscript customization

### ✅ **Simple and Observable**
- S3 results as source of truth
- CloudWatch logs for monitoring and debugging
- SQS queues provide natural processing state
- Error handling with Dead Letter Queues

### ✅ **Agent-Ready Output**
- Structured JSON with standardized schema
- Actionability metadata for implementation
- Effort estimation and API requirements
- Ready for downstream automation

## 🚀 Quick Start

### Prerequisites
- AWS CLI configured with appropriate permissions
- Python 3.11+ (for local development)
- jq (for JSON processing)
- Google Gemini API key (free from [Google AI Studio](https://ai.google.dev/))

### 1. Get Your Gemini API Key
1. Go to [Google AI Studio](https://ai.google.dev/)
2. Create a new API key (completely free)
3. Save the key securely

### 2. Set Up GitHub Configuration Repository
1. Create a public GitHub repository (e.g., `tampermonkey-research-config`)
2. Upload the `research-config.json` file from `research-config-examples/`
3. Note the repository URL for deployment

### 3. Deploy the System
```bash
cd infrastructure
./deploy.sh
```

The script will:
- Validate AWS credentials
- Create Lambda deployment package
- Deploy CloudFormation stack
- Test the deployment
- Provide next steps

### 4. Monitor and Customize
- Check CloudWatch logs: `/aws/lambda/tampermonkey-research-function-prod`
- Monitor S3 bucket for research results
- Update GitHub configuration as needed

## 🚀 Deployment and Operations

### **Fully Automated Setup**

When you run `./deploy.sh`, the system automatically configures:

1. **EventBridge Rule**: 
   - Schedule: `cron(0 9 * * ? *)` (daily at 9 AM UTC)
   - Target: Main Lambda function
   - Status: ENABLED

2. **SQS Event Source Mapping**:
   - Connects SQS queue to Worker Lambda
   - Batch size: 1 (process one userscript at a time)
   - Automatic scaling based on queue depth

3. **Dead Letter Queues**:
   - Main Lambda DLQ for coordination failures
   - SQS redrive policy for processing failures (3 retries)

4. **IAM Permissions**:
   - Main Lambda: SQS send, SSM read, DynamoDB write
   - Worker Lambda: S3 write, DynamoDB write, SSM read, SQS receive/delete

5. **CloudWatch Logs**:
   - Separate log groups for main and worker functions
   - 30-day retention policy

### **Daily Operation Flow**

**9:00 AM UTC Every Day:**
```
EventBridge → Main Lambda (10 seconds)
    ↓
SQS Queue (4 messages)
    ↓
4x Worker Lambda (2-5 minutes each, parallel)
    ↓
Results in S3 + DynamoDB tracking
```

**Total Daily Execution Time**: ~5-10 minutes
**AWS Resources Used**: 
- 1 main Lambda execution
- 4 worker Lambda executions  
- 4 SQS messages
- 4 S3 PUT operations

### **State Tracking Without DynamoDB**

**Success Detection:**
```bash
# Check if research completed successfully for today
aws s3 ls s3://bucket/research/$(date +%Y/%m/%d)/Web-Dashboard/
# File exists = success, no file = failure/in-progress
```

**Error Detection:**
```bash
# Check CloudWatch logs for errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/scout-worker-prod \
  --start-time $(date -d "today" +%s)000 \
  --filter-pattern "ERROR"
```

**Processing Status:**
```bash
# Check SQS queue depth
aws sqs get-queue-attributes \
  --queue-url $QUEUE_URL \
  --attribute-names ApproximateNumberOfMessages
# 0 messages = all processed, >0 = still processing
```

### **Monitoring and Troubleshooting**

**CloudWatch Logs**:
- `/aws/lambda/scout-coordinator-prod` (Main Lambda)
- `/aws/lambda/scout-worker-prod` (Worker Lambda)

**S3 Results Structure**:
```
research/
├── 2025/01/05/
│   ├── Web-Dashboard/research-{uuid}.json
│   ├── API-Gateway/research-{uuid}.json
│   ├── Mobile-App/research-{uuid}.json
│   └── Data-Pipeline/research-{uuid}.json
```

**Dead Letter Queues**:
- Failed coordination attempts → Main Lambda DLQ
- Failed processing attempts → SQS Processing DLQ (after 3 retries)

**Common Issues**:
- **GitHub API rate limits**: Rare, but check main Lambda logs
- **Gemini API errors**: Check worker Lambda logs for specific project
- **Individual failures**: Don't affect other projects, check S3 for missing results

## 📋 Configuration

### Research Configuration Structure
```json
{
  "version": "1.0.0",
  "projects": [
    {
      "name": "Project Name",
      "description": "Project description",
      "project_type": "Web Application",
      "platform": "React, Node.js, PostgreSQL",
      "research_topic": "Focus area for research",
      "known_issues": ["Issue 1", "Issue 2"],
      "focus_areas": ["Area 1", "Area 2"]
    }
  ],
  "research_guidelines": {
    "minimum_confidence_score": 0.7,
    "max_findings_per_project": 5
  }
}
```

### Customizing Research Topics
Update your GitHub repository's `research-config.json` to modify:
- Research focus areas
- Known issues to address
- Project types and platforms
- Research guidelines and thresholds

## 📊 Output Schema

### Research Results Structure
```json
{
  "metadata": {
    "researchRunId": "uuid",
    "project": "Project Name",
    "timestamp": "ISO 8601",
    "promptVersion": "git-hash",
    "llmModel": "gemini-1.5-flash"
  },
  "findings": [
    {
      "findingId": "sec-001",
      "category": "Security",
      "title": "Improvement Title",
      "summary": "Brief description",
      "justification": "Detailed reasoning",
      "actionability": {
        "type": "code_change",
        "required_apis": ["storage.local"],
        "suggested_implementation": "Technical steps",
        "estimated_effort": "low"
      },
      "sources": ["https://example.com"],
      "confidence_score": 0.85
    }
  ]
}
```

### S3 Storage Organization
```
research/
├── 2024/01/27/
│   ├── Web-Dashboard/
│   │   └── research-{uuid}.json
│   ├── API-Gateway/
│   │   └── research-{uuid}.json
│   └── Mobile-App/
│       └── research-{uuid}.json
```

## 🔧 Development

### Local Testing
```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export GEMINI_API_KEY="your-api-key"
export GITHUB_REPO_URL="https://api.github.com/repos/user/repo/contents"

# Run local test
python test_research.py
```

### Updating Lambda Function
1. Modify `lambda/research_function.py`
2. Run `./deploy.sh` to update the deployment
3. Test with manual Lambda invocation

### Monitoring and Debugging
```bash
# View CloudWatch logs
aws logs tail /aws/lambda/tampermonkey-research-function-prod --follow

# Manual Lambda invocation
aws lambda invoke \
  --function-name tampermonkey-research-function-prod \
  --payload '{"source": "manual-test"}' \
  response.json

# Check S3 results
aws s3 ls s3://tampermonkey-research-results-prod/research/ --recursive
```

## 🎯 Integration with Agent Workflow

This system integrates with the existing agent workflow described in `AGENT_INSTRUCTIONS.md`:

### 1. Research Phase (Automated)
- ✅ Daily research runs via EventBridge
- ✅ Structured research output in S3
- ✅ Tracking in DynamoDB

### 2. Agent Discovery Phase
The agent can now:
```bash
# Find recent research
aws s3 ls s3://bucket/research/$(date +%Y/%m/%d)/ --recursive

# Download research results
aws s3 cp s3://bucket/research/path/to/research.json .

# Parse findings with confidence > 0.7
jq '.findings[] | select(.confidence_score > 0.7)' research.json
```

### 3. Implementation Phase
Agent uses research findings to:
- Prioritize by confidence score and effort
- Access implementation guidance
- Reference sources for verification
- Track which findings were implemented

## 🔒 Security

### API Key Management
- Stored in AWS Parameter Store (encrypted at rest)
- Never logged or exposed in CloudFormation
- Passed securely via HTTP headers (not URL parameters)
- Rotation supported through parameter updates

### Access Control
- Lambda runs with least-privilege IAM roles
- S3 bucket private with specific permissions
- DynamoDB access limited to research table
- SQS queues with proper IAM policies

### Data Privacy
- No sensitive user data processed
- Only public web information analyzed
- Research focuses on technical improvements
- All data encrypted in transit and at rest

### Error Handling
- Dead Letter Queues prevent data loss
- Comprehensive error logging
- Graceful degradation on failures
- No sensitive information in error messages

## 🎯 Architecture Decision Rationale

### **Why Fan-Out Pattern Instead of Single Lambda?**

#### **Problem with Single Lambda Approach**:
- **Timeout Risk**: 15-minute Lambda limit for ALL userscripts
- **Serial Processing**: One failure blocks all subsequent userscripts  
- **Poor Scalability**: Adding userscripts increases total execution time
- **Resource Waste**: Large memory allocation for entire duration

#### **Benefits of Fan-Out Pattern**:
- **Parallel Processing**: Each userscript gets full 15-minute timeout
- **Fault Isolation**: Individual failures don't affect others
- **Better Resource Utilization**: Workers only run when needed
- **Infinite Scalability**: Can handle hundreds of userscripts
- **Cost Efficiency**: Pay only for actual processing time

### **Why SQS Instead of Direct Lambda Invocation?**

#### **SQS Advantages**:
- **Built-in Retry Logic**: Automatic retry with exponential backoff
- **Dead Letter Queues**: Failed messages preserved for analysis
- **Backpressure Handling**: Natural throttling if workers are busy
- **Durability**: Messages persisted until successfully processed
- **Free Tier Friendly**: 1M messages/month free

#### **Alternative Approaches Considered**:
- **Step Functions**: More complex, costs money, overkill for simple fan-out
- **Direct Lambda Invoke**: No retry logic, harder error handling
- **SNS**: No retry/DLQ capabilities, fire-and-forget model

### **Why Two Separate Lambda Functions?**

#### **Separation of Concerns**:
- **Coordinator**: Fast, lightweight, handles orchestration
- **Worker**: Heavy processing, AI API calls, result storage
- **Different Scaling**: Coordinator runs once, workers scale with workload
- **Different Monitoring**: Separate logs for coordination vs. processing issues

#### **Operational Benefits**:
- **Independent Updates**: Can update worker logic without touching coordinator
- **Granular Monitoring**: Easy to identify if issue is coordination or processing
- **Resource Optimization**: Different memory/timeout settings per function type

### **Why GitHub for Configuration?**

#### **Version Control Benefits**:
- **Change Tracking**: See what research topics changed when
- **Rollback Capability**: Easy to revert problematic configurations
- **Collaboration**: Multiple people can contribute research topics
- **Documentation**: Git commits explain why changes were made

#### **Alternative Approaches Considered**:
- **S3**: No version control, harder to manage changes
- **DynamoDB**: More complex, costs money, no version history
- **Environment Variables**: Limited size, requires redeployment for changes
- **Parameter Store**: No version control, harder collaboration

## 💰 Cost Optimization

### Free Tier Usage
- **Gemini API**: Completely free
- **Lambda**: 1M requests/month free (main + worker functions)
- **SQS**: 1M requests/month free
- **S3**: 5GB storage free
- **CloudWatch**: 5GB logs free
- **Parameter Store**: 10,000 operations/month free

### Estimated Monthly Costs
For daily research runs with 4 userscripts:
- Main Lambda: ~30 requests/month (coordination)
- Worker Lambda: ~120 requests/month (processing)
- SQS: ~120 messages/month (fan-out)
- S3: ~120 PUT requests/month (results storage)
- **Total: $0/month** (all within free tier limits)

### Scaling Considerations
- Up to ~250 projects can be processed daily within free tier limits
- SQS provides natural backpressure and retry mechanisms
- Dead Letter Queues prevent data loss during failures
- No state tracking overhead = faster execution and lower costs

## 📈 Advanced Features

### A/B Testing Research Prompts
1. Create feature branch in GitHub config repo
2. Update Lambda environment to test experimental prompts
3. Compare results in DynamoDB
4. Promote successful prompts to main branch

### Custom Research Topics
Add new research topics by updating the GitHub configuration:
```json
{
  "research_topic": "Browser Extension Manifest V3 Migration",
  "focus_areas": [
    "Manifest V3 compatibility",
    "Service worker migration",
    "API replacements"
  ]
}
```

### Scaling for Multiple Projects
Deploy multiple stacks for different project collections:
```bash
./deploy.sh -n project-a-research -e prod
./deploy.sh -n project-b-research -e prod
```

## 🛠️ Troubleshooting

### Common Issues

#### Lambda Function Timeout
```bash
# Increase timeout in CloudFormation template
Timeout: 900  # 15 minutes
```

#### GitHub API Rate Limits
```bash
# Add GitHub token for higher rate limits
export GITHUB_TOKEN="your-token"
```

#### Gemini API Errors
```bash
# Check API key validity
curl -H "Authorization: Bearer $GEMINI_API_KEY" \
  "https://generativelanguage.googleapis.com/v1beta/models"
```

### Debugging Steps
1. Check CloudWatch logs for errors
2. Verify GitHub configuration syntax
3. Test Gemini API key manually
4. Check DynamoDB for run status
5. Verify S3 permissions

## 📚 Resources

- [Google Gemini API Documentation](https://ai.google.dev/docs)
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [CloudFormation Templates](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/)
- [Tampermonkey Documentation](https://www.tampermonkey.net/documentation.php)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Test your changes locally
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

---

**Next Steps**: 
1. Deploy the system using `./deploy.sh`
2. Create your GitHub configuration repository
3. Monitor the first few research runs
4. Integrate with your agent workflow
5. Customize research topics based on results 