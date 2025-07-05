import json
import boto3
import os
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import requests
import base64
import openai

# Initialize AWS clients
s3_client = boto3.client('s3')
ssm_client = boto3.client('ssm')
sqs_client = boto3.client('sqs')

# Environment variables
S3_BUCKET = os.environ['S3_BUCKET']
OPENAI_API_KEY_PARAM = os.environ.get('OPENAI_API_KEY_PARAM', '/research-bot/openai-api-key')
GITHUB_REPO_URL = os.environ['GITHUB_REPO_URL']
ENVIRONMENT = os.environ['ENVIRONMENT']
PROJECT_NAME = os.environ['PROJECT_NAME']
SQS_QUEUE_URL = os.environ['SQS_QUEUE_URL']

class ResearchAutomationError(Exception):
    """Custom exception for research automation errors"""
    pass

def lambda_handler(event, context):
    """
    Enhanced research coordination with intelligent topic decomposition
    Reads decomposition strategies from GitHub and uses OpenAI for topic breakdown
    """
    try:
        # Generate unique run ID
        run_id = str(uuid.uuid4())
        timestamp = datetime.now(timezone.utc)
        
        print(f"Starting enhanced research coordination run: {run_id}")
        print(f"Event: {json.dumps(event, default=str)}")
        
        # Get research configuration from GitHub
        research_config = fetch_research_config()
        
        # Get OpenAI API key
        openai_api_key = get_openai_api_key()
        
        # Send decomposed sub-topics to SQS for parallel processing
        total_sub_topics = 0
        expected_files = []
        
        for project_config in research_config.get('projects', []):
            project_name = project_config['name']
            
            print(f"Decomposing research topics for: {project_name}")
            
            try:
                # Use enhanced decomposition with search query optimization
                sub_topics_with_queries = decompose_research_with_search_queries(
                    project_config, 
                    research_config.get('decomposition_strategy', {}),
                    openai_api_key
                )
                
                print(f"Generated {len(sub_topics_with_queries)} enhanced sub-topics for {project_name}")
                
                # Send each sub-topic with its search strategy as a separate SQS message
                for item in sub_topics_with_queries:
                    sub_topic = item['topic']
                    search_queries = item.get('search_queries', [sub_topic])
                    search_params = item.get('search_params', {})
                    
                    # Create human-readable slug for S3 path
                    topic_slug = create_topic_slug(sub_topic)
                    expected_s3_key = f"research/{timestamp.strftime('%Y/%m/%d')}/{run_id}/success/{project_name}_{topic_slug}.json"
                    expected_files.append(expected_s3_key)
                    
                    message_body = {
                        'runId': run_id,
                        'timestamp': timestamp.isoformat(),
                        'projectName': project_name,
                        'subTopic': sub_topic,
                        'searchQueries': search_queries,
                        'searchParams': search_params,
                        'expectedS3Key': expected_s3_key,
                        'originalProject': project_config,
                        'researchPrompts': research_config.get('research_prompts', {}),
                        'configVersion': research_config.get('version', 'unknown')
                    }
                    
                    # Send to SQS
                    sqs_client.send_message(
                        QueueUrl=SQS_QUEUE_URL,
                        MessageBody=json.dumps(message_body),
                        MessageAttributes={
                            'project': {
                                'StringValue': project_name,
                                'DataType': 'String'
                            },
                            'runId': {
                                'StringValue': run_id,
                                'DataType': 'String'
                            },
                            'subTopic': {
                                'StringValue': sub_topic[:100],  # Truncate for attribute limit
                                'DataType': 'String'
                            }
                        }
                    )
                    total_sub_topics += 1
                    
                print(f"Successfully queued {len(sub_topics_with_queries)} sub-topics for {project_name}")
                
            except Exception as e:
                print(f"Error processing {project_name}: {str(e)}")
                continue
        
        # Create manifest file for synthesis coordination
        manifest = {
            'totalSubTopics': total_sub_topics,
            'projectCount': len(research_config.get('projects', [])),
            'runId': run_id,
            'timestamp': timestamp.isoformat(),
            'expectedFiles': expected_files  # List of expected S3 keys
        }
        
        # Store manifest
        date_path = timestamp.strftime('%Y/%m/%d')
        manifest_key = f"research/{date_path}/{run_id}/_manifest.json"
        
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=manifest_key,
            Body=json.dumps(manifest, indent=2),
            ContentType='application/json',
            Metadata={
                'run-id': run_id,
                'timestamp': timestamp.isoformat(),
                'type': 'research-manifest'
            }
        )
        
        print(f"Created manifest: s3://{S3_BUCKET}/{manifest_key}")
        
        # Return summary
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Enhanced research coordination completed',
                'runId': run_id,
                'timestamp': timestamp.isoformat(),
                'sub_topics_queued': total_sub_topics,
                'total_projects': len(research_config.get('projects', []))
            })
        }
        
    except Exception as e:
        print(f"Critical error in research coordination: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e),
                'message': 'Research coordination failed'
            })
        }

def fetch_research_config() -> Dict[str, Any]:
    """
    Fetch enhanced research configuration from GitHub repository
    Now includes decomposition strategies and research prompts
    """
    try:
        # Construct URL for main config file
        config_url = f"{GITHUB_REPO_URL.rstrip('/')}/research-config.json"
        
        print(f"Fetching research config from: {config_url}")
        
        response = requests.get(config_url, timeout=30)
        response.raise_for_status()
        
        # GitHub API returns base64 encoded content
        content_data = response.json()
        if 'content' in content_data:
            # Decode base64 content
            config_content = base64.b64decode(content_data['content']).decode('utf-8')
            config = json.loads(config_content)
        else:
            raise ResearchAutomationError("GitHub API response missing content field")
        
        print(f"Loaded enhanced research config version: {config.get('version', 'unknown')}")
        print(f"Config includes {len(config.get('projects', []))} projects")
        
        # Validate required sections
        required_sections = ['projects', 'decomposition_strategy', 'research_prompts']
        for section in required_sections:
            if section not in config:
                print(f"Warning: Missing {section} in config, using defaults")
        
        return config
        
    except requests.RequestException as e:
        raise ResearchAutomationError(f"Failed to fetch research config from GitHub: {str(e)}")
    except json.JSONDecodeError as e:
        raise ResearchAutomationError(f"Invalid JSON in research config: {str(e)}")

def get_openai_api_key() -> str:
    """
    Retrieve OpenAI API key from Parameter Store
    """
    try:
        response = ssm_client.get_parameter(
            Name=OPENAI_API_KEY_PARAM,
            WithDecryption=True
        )
        return response['Parameter']['Value']
    except Exception as e:
        raise ResearchAutomationError(f"Failed to retrieve OpenAI API key: {str(e)}")

def decompose_research_with_search_queries(
    project_config: Dict[str, Any], 
    decomposition_strategy: Dict[str, Any],
    api_key: str
) -> List[Dict[str, str]]:
    """
    Enhanced decomposition that generates both sub-topics and optimized search queries
    """
    try:
        client = openai.OpenAI(api_key=api_key)
        
        # Enhanced structured meta-prompt for high-quality research decomposition
        base_prompt = decomposition_strategy.get('prompt_template', """
You are a senior research analyst. Your goal is to create a research plan by deconstructing a high-level topic into a set of specific, independent, and answerable questions. These questions will be sent to individual research agents.

For the given topic, generate a JSON array of 4-5 sub-questions designed to cover these distinct angles:
1. **Core Purpose & Functionality**: What is this tool/concept, and what primary problem does it solve for users?
2. **Reported Issues & Limitations**: What are the most common bugs, user complaints, or inherent drawbacks?
3. **Comparative Analysis**: How does it compare to its main alternatives? (e.g., other browser extensions or native features)
4. **Recent Activity & Security**: What are the latest updates, news, or security discussions related to it in the last 12 months?
5. **Implementation & Best Practices**: What are the current best practices, optimization techniques, or recommended approaches?

Each sub-question should include:
- A clear, focused research topic
- 2-3 optimized search queries (under 400 characters each)
- Suggested search parameters for better results

Return ONLY a JSON array with this structure:
[
  {
    "topic": "What are the primary use cases and benefits of the tool?",
    "search_queries": [
      "tool name primary use cases benefits documentation",
      "tool name user testimonials success stories"
    ],
    "search_params": {
      "time_range": "year",
      "search_depth": "advanced",
      "include_domains": ["github.com", "stackoverflow.com", "reddit.com"]
    }
  }
]
""")
        
        # Get project details
        project_name = project_config['name']
        description = project_config.get('description', 'No description provided')
        research_topic = project_config.get('research_topic', 'General Enhancement')
        known_issues = project_config.get('known_issues', [])
        focus_areas = project_config.get('focus_areas', [])
        
        # Determine number of sub-topics based on complexity
        target_count = decomposition_strategy.get('default_sub_topic_count', 4)
        if len(focus_areas) > 3:
            target_count = max(target_count, len(focus_areas))
        
        decomposition_prompt = f"""{base_prompt}

Project Details:
- Name: {project_name}
- Description: {description}
- Research Focus: {research_topic}
- Known Issues: {', '.join(known_issues) if known_issues else 'None'}
- Focus Areas: {', '.join(focus_areas) if focus_areas else 'General'}

Generate {target_count} focused sub-topics with optimized search strategies.

Search Query Guidelines:
- Keep queries under 400 characters
- Use specific technical terms relevant to the project
- Include timeframes when looking for current trends
- Suggest domain filtering for authoritative sources
- Consider "advanced" search depth for technical topics
"""
        
        response = client.chat.completions.create(
            model=decomposition_strategy.get('model', 'gpt-4o-mini'),
            messages=[{"role": "user", "content": decomposition_prompt}],
            max_tokens=decomposition_strategy.get('max_tokens', 1000),
            temperature=decomposition_strategy.get('temperature', 0.3)
        )
        
        # Parse JSON response
        response_text = response.choices[0].message.content.strip()
        
        # Clean the response (remove any markdown formatting)
        if response_text.startswith('```json'):
            response_text = response_text.replace('```json', '').replace('```', '').strip()
        elif response_text.startswith('```'):
            response_text = response_text.replace('```', '').strip()
        
        sub_topics_with_queries = json.loads(response_text)
        
        # Validate and filter
        if not isinstance(sub_topics_with_queries, list):
            raise ValueError("Response is not a JSON array")
        
        # Filter out invalid entries
        filtered_topics = []
        for item in sub_topics_with_queries:
            if (isinstance(item, dict) and 
                'topic' in item and 
                'search_queries' in item and
                len(item['topic'].strip()) > 10):
                filtered_topics.append(item)
        
        if not filtered_topics:
            # Fallback to simple topics if decomposition fails
            fallback_topics = decomposition_strategy.get('fallback_topics', [
                "Current state of serverless architecture trends",
                "Performance optimization best practices",
                "Security considerations and implementations",
                "Cost optimization strategies"
            ])
            
            # Convert to expected format
            return [
                {
                    "topic": topic,
                    "search_queries": [topic + " best practices", topic + " 2024"],
                    "search_params": {"search_depth": "advanced", "time_range": "year"}
                }
                for topic in fallback_topics
            ]
        
        return filtered_topics
        
    except Exception as e:
        print(f"Error in enhanced topic decomposition for {project_config['name']}: {str(e)}")
        # Return simple fallback
        return [
            {
                "topic": f"Technical analysis: {project_config.get('research_topic', 'General Enhancement')}",
                "search_queries": [
                    f"{project_config['name']} optimization techniques",
                    f"{project_config.get('research_topic', 'enhancement')} best practices"
                ],
                "search_params": {"search_depth": "basic"}
            }
        ]

def create_topic_slug(topic: str) -> str:
    """
    Create a human-readable slug from a research topic
    """
    import re
    
    # Convert to lowercase and replace spaces/special chars with hyphens
    slug = re.sub(r'[^a-zA-Z0-9\s-]', '', topic.lower())
    slug = re.sub(r'\s+', '-', slug.strip())
    slug = re.sub(r'-+', '-', slug)  # Remove multiple hyphens
    slug = slug.strip('-')  # Remove leading/trailing hyphens
    
    # Truncate to reasonable length
    if len(slug) > 50:
        slug = slug[:50].rsplit('-', 1)[0]  # Cut at word boundary
    
    return slug or 'research-topic'

# Note: Old Gemini-based functions removed - research is now handled by worker Lambda using Strands agents 