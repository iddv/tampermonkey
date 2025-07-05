# 🔍 Scout Research Agent

## What is this?

The `scout-research-agent/` directory contains an **AI-powered research automation system** that analyzes your tampermonkey scripts and provides actionable insights for improvement.

## 🎯 Purpose

This research bot:
- **Automatically researches** browser automation best practices
- **Analyzes your userscripts** for optimization opportunities  
- **Provides security recommendations** for browser extensions
- **Suggests modern development patterns** for tampermonkey scripts
- **Runs daily** and stores results in AWS S3

## 🏗️ Architecture

- **AWS Lambda** orchestrator decomposes research topics using OpenAI
- **Strands Agents** perform deep web research using Tavily search
- **SQS queues** distribute work across multiple research workers
- **S3 storage** with human-readable organization and lifecycle policies
- **Manifest-checking synthesis** for 99%+ completion reliability

## 🚀 Quick Start

1. Navigate to the scout directory:
   ```bash
   cd scout-research-agent/
   ```

2. Follow the deployment guide:
   ```bash
   # Review the README.md for complete instructions
   chmod +x infrastructure/deploy-eu-west-1.sh
   ./infrastructure/deploy-eu-west-1.sh
   ```

3. The system will research your tampermonkey projects daily at 9 AM UTC

## 📊 What Gets Researched

Your current tampermonkey projects:
- **AWS Role Launcher** - IAM role management & browser security
- **LLM Judge** - AI integration in browser extensions  
- **Personal Web Clipper** - Content extraction & local storage
- **YouTube Clean Player** - Video platform optimization
- **Development Framework** - Modern userscript development

## 💰 Cost

- **$0-5/month** (within AWS free tier)
- Uses ARM64 Lambda for 20% better price/performance
- Optimized with reserved concurrency and lifecycle policies

## 🔒 Security

- All API keys stored in AWS Parameter Store (never in code)
- Least privilege IAM roles for each component
- S3 and SQS server-side encryption enabled
- No VPC deployment (avoids NAT Gateway costs)

---

**Note**: This research system is completely separate from your userscripts and can be deployed independently to any AWS account. 