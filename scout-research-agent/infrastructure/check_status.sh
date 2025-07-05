#!/bin/bash

# Scout Research Status Checker
# This script checks the status of daily research runs

set -e

# Configuration
BUCKET_NAME="${BUCKET_NAME:-scout-research-results-prod}"
SQS_QUEUE_URL="${SQS_QUEUE_URL:-}"
DATE="${1:-$(date +%Y/%m/%d)}"
PROJECTS=("Web-Dashboard" "API-Gateway" "Mobile-App" "Data-Pipeline")

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Scout Research Status for $DATE${NC}"
echo "=================================="

# Check each project
for project in "${PROJECTS[@]}"; do
    echo -n "Checking $project... "
    
    # Check if results exist in S3
    if aws s3 ls "s3://$BUCKET_NAME/research/$DATE/$project/" &>/dev/null; then
        echo -e "${GREEN}✅ COMPLETED${NC}"
        
        # Show file details
        file_info=$(aws s3 ls "s3://$BUCKET_NAME/research/$DATE/$project/" --human-readable)
        echo "   └─ $file_info"
    else
        # Check if there are recent errors in logs
        echo -e "${RED}❌ NO RESULTS${NC}"
        
        # Check for errors in worker Lambda logs
        echo -n "   └─ Checking logs... "
        
        # Get today's timestamp in milliseconds
        today_ms=$(date -d "today 00:00:00" +%s)000
        
        errors=$(aws logs filter-log-events \
            --log-group-name /aws/lambda/scout-worker-prod \
            --start-time "$today_ms" \
            --filter-pattern "\"$project\" ERROR" \
            --query 'events[0].message' \
            --output text 2>/dev/null || echo "None")
        
        if [ "$errors" != "None" ] && [ -n "$errors" ] && [ "$errors" != "null" ]; then
            echo -e "${RED}ERROR FOUND${NC}"
            echo "   └─ $errors"
        else
            echo -e "${YELLOW}IN PROGRESS or NO LOGS${NC}"
        fi
    fi
done

echo ""

# Check SQS queue status if URL provided
if [ -n "$SQS_QUEUE_URL" ]; then
    echo -e "${BLUE}Queue Status:${NC}"
    
    # Get queue attributes
    queue_attrs=$(aws sqs get-queue-attributes \
        --queue-url "$SQS_QUEUE_URL" \
        --attribute-names ApproximateNumberOfMessages,ApproximateNumberOfMessagesNotVisible \
        --output json 2>/dev/null || echo '{"Attributes": {}}')
    
    visible=$(echo "$queue_attrs" | jq -r '.Attributes.ApproximateNumberOfMessages // "0"')
    in_flight=$(echo "$queue_attrs" | jq -r '.Attributes.ApproximateNumberOfMessagesNotVisible // "0"')
    
    if [ "$visible" = "0" ] && [ "$in_flight" = "0" ]; then
        echo -e "   ${GREEN}✅ Queue empty - all processing complete${NC}"
    else
        echo -e "   ${YELLOW}⏳ Messages in queue: $visible visible, $in_flight in-flight${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  SQS_QUEUE_URL not set - cannot check queue status${NC}"
    echo "   Set environment variable: export SQS_QUEUE_URL=https://sqs.region.amazonaws.com/account/queue-name"
fi

echo ""

# Check Dead Letter Queues
echo -e "${BLUE}Error Queues:${NC}"

# Try to find DLQ by naming convention
dlq_name="scout-processing-dlq-prod"
dlq_url=$(aws sqs get-queue-url --queue-name "$dlq_name" --query 'QueueUrl' --output text 2>/dev/null || echo "")

if [ -n "$dlq_url" ]; then
    dlq_count=$(aws sqs get-queue-attributes \
        --queue-url "$dlq_url" \
        --attribute-names ApproximateNumberOfMessages \
        --query 'Attributes.ApproximateNumberOfMessages' \
        --output text 2>/dev/null || echo "0")
    
    if [ "$dlq_count" = "0" ]; then
        echo -e "   ${GREEN}✅ No failed messages in DLQ${NC}"
    else
        echo -e "   ${RED}❌ $dlq_count failed messages in DLQ${NC}"
        echo "   └─ Check: aws sqs receive-message --queue-url $dlq_url"
    fi
else
    echo -e "   ${YELLOW}⚠️  Could not find DLQ (expected name: $dlq_name)${NC}"
fi

echo ""

# Summary
echo -e "${BLUE}Quick Commands:${NC}"
echo "# View recent results:"
echo "aws s3 ls s3://$BUCKET_NAME/research/$DATE/ --recursive --human-readable"
echo ""
echo "# Check worker logs for errors:"
echo "aws logs filter-log-events --log-group-name /aws/lambda/scout-worker-prod --start-time $(date -d 'today' +%s)000 --filter-pattern ERROR"
echo ""
echo "# Download a specific result:"
echo "aws s3 cp s3://$BUCKET_NAME/research/$DATE/Web-Dashboard/ . --recursive"
