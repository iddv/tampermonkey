import json
import boto3
import os
import hashlib
import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
import requests

# Strands Agents imports
from strands import Agent, tool

# Initialize AWS clients
s3_client = boto3.client('s3')
ssm_client = boto3.client('ssm')

# Environment variables
S3_BUCKET = os.environ['S3_BUCKET']
BEDROCK_MODEL_ID = os.environ.get('BEDROCK_MODEL_ID', 'anthropic.claude-3-haiku-20240307-v1:0')
TAVILY_API_KEY_PARAM = os.environ.get('TAVILY_API_KEY_PARAM', '/research-bot/tavily-api-key')
ENVIRONMENT = os.environ['ENVIRONMENT']
PROJECT_NAME = os.environ['PROJECT_NAME']

class ResearchAutomationError(Exception):
    """Custom exception for research automation errors"""
    pass

# Strands Tools for Web Research
@tool
def web_search(query: str, search_params: Dict[str, Any] = None, max_results: int = 10) -> str:
    """
    Enhanced web search using Tavily API with advanced parameters.
    Returns structured search results with URLs and snippets.
    """
    try:
        api_key = get_tavily_api_key()
        
        url = "https://api.tavily.com/search"
        headers = {
            "Content-Type": "application/json"
        }
        
        # Default search parameters optimized for research
        default_params = {
            "search_depth": "advanced",
            "include_answer": False,
            "include_raw_content": False,
            "max_results": max_results,
            "include_images": False
        }
        
        # Merge with provided search parameters
        if search_params:
            default_params.update(search_params)
        
        payload = {
            "api_key": api_key,
            "query": query,
            **default_params
        }
        
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
        
        results = response.json()
        
        # Format search results for the agent
        formatted_results = []
        for result in results.get('results', []):
            formatted_results.append({
                'title': result.get('title', ''),
                'url': result.get('url', ''),
                'content': result.get('content', ''),
                'published_date': result.get('published_date', ''),
                'score': result.get('score', 0)
            })
        
        # Return as formatted string with metadata
        output = f"Found {len(formatted_results)} search results for '{query}':\n\n"
        for i, result in enumerate(formatted_results, 1):
            output += f"{i}. **{result['title']}**\n"
            output += f"   URL: {result['url']}\n"
            output += f"   Content: {result['content'][:300]}...\n"
            if result['published_date']:
                output += f"   Published: {result['published_date']}\n"
            if result['score']:
                output += f"   Relevance Score: {result['score']:.3f}\n"
            output += "\n"
        
        return output
        
    except Exception as e:
        return f"Error searching web: {str(e)}"

@tool
def extract_article_content(url: str) -> str:
    """
    Extract and summarize main content from a specific URL.
    Useful for getting detailed information from search results.
    """
    try:
        # Simple content extraction using requests
        response = requests.get(url, timeout=15, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        response.raise_for_status()
        
        # Basic content extraction (in production, use a proper library like readability)
        content = response.text
        
        # Simple text cleaning
        # Remove HTML tags, scripts, and styles (basic approach)
        import re
        content = re.sub(r'<script.*?</script>', '', content, flags=re.DOTALL)
        content = re.sub(r'<style.*?</style>', '', content, flags=re.DOTALL)
        content = re.sub(r'<[^>]+>', '', content)
        content = re.sub(r'\s+', ' ', content).strip()
        
        # Truncate to reasonable length
        if len(content) > 2000:
            content = content[:2000] + "... [content truncated]"
        
        return f"Content from {url}:\n\n{content}"
        
    except Exception as e:
        return f"Error extracting content from {url}: {str(e)}"

def lambda_handler(event, context):
    """
    Enhanced worker Lambda handler using Strands Agents
    Processes individual research sub-topics with optimized search strategies
    """
    try:
        print(f"Enhanced Strands worker processing event: {json.dumps(event, default=str)}")
        
        # Process each SQS record
        for record in event['Records']:
            message_body = json.loads(record['body'])
            
            run_id = message_body['runId']
            timestamp_str = message_body['timestamp']
            project_name = message_body['projectName']
            sub_topic = message_body['subTopic']
            search_queries = message_body.get('searchQueries', [sub_topic])
            search_params = message_body.get('searchParams', {})
            expected_s3_key = message_body.get('expectedS3Key')
            original_project = message_body['originalProject']
            research_prompts = message_body.get('researchPrompts', {})
            config_version = message_body['configVersion']
            
            timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
            
            print(f"Processing enhanced sub-topic '{sub_topic}' for project: {project_name} (run: {run_id})")
            print(f"Using {len(search_queries)} optimized search queries")
            
            try:
                # Conduct research using enhanced Strands agent
                research_results = conduct_enhanced_research(
                    sub_topic,
                    search_queries,
                    search_params,
                    project_name,
                    original_project,
                    research_prompts,
                    run_id,
                    config_version
                )
                
                # Store results with enhanced S3 path structure
                s3_key = store_enhanced_research_results(
                    research_results, 
                    expected_s3_key or f"research/{timestamp.strftime('%Y/%m/%d')}/{run_id}/success/{project_name}_research.json",
                    timestamp
                )
                
                print(f"Successfully completed enhanced research for '{sub_topic}' -> {s3_key}")
                
            except Exception as e:
                print(f"Error processing sub-topic '{sub_topic}': {str(e)}")
                
                # Store failure record for manifest tracking
                try:
                    failure_key = expected_s3_key.replace('/success/', '/failed/') if expected_s3_key else None
                    if failure_key:
                        store_failure_record(failure_key, sub_topic, str(e), timestamp)
                except:
                    pass  # Don't let failure recording break the main error flow
                
                # Re-raise to trigger SQS retry/DLQ
                raise
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Enhanced Strands worker processing completed',
                'processed_records': len(event['Records'])
            })
        }
        
    except Exception as e:
        print(f"Critical error in enhanced Strands worker processing: {str(e)}")
        raise  # Let SQS handle retry/DLQ

def get_tavily_api_key() -> str:
    """
    Retrieve Tavily API key from Parameter Store
    """
    try:
        response = ssm_client.get_parameter(
            Name=TAVILY_API_KEY_PARAM,
            WithDecryption=True
        )
        return response['Parameter']['Value']
    except Exception as e:
        raise ResearchAutomationError(f"Failed to retrieve Tavily API key: {str(e)}")

def conduct_enhanced_research(
    sub_topic: str,
    search_queries: List[str],
    search_params: Dict[str, Any],
    project_name: str,
    original_project: Dict[str, Any],
    research_prompts: Dict[str, Any],
    run_id: str,
    config_version: str
) -> Dict[str, Any]:
    """
    Conduct focused research using enhanced Strands Agents with structured output
    """
    start_time = time.time()
    
    # Build enhanced research prompt for structured output
    system_prompt = build_enhanced_research_prompt(
        sub_topic, search_queries, project_name, original_project, research_prompts
    )
    
    # Initialize enhanced Strands research agent with updated tools
    research_agent = Agent(
        system_prompt=system_prompt,
        tools=[
            lambda query, max_results=10: web_search(query, search_params, max_results),
            extract_article_content
        ],
        model=f"bedrock:{BEDROCK_MODEL_ID}",
        max_iterations=research_prompts.get('max_iterations', 8)
    )
    
    # Execute research with structured guidance
    print(f"Starting enhanced Strands agent research for: {sub_topic}")
    
    research_query = f"""Research this topic comprehensively using the provided search queries: {sub_topic}

Suggested search queries to use:
{chr(10).join(f"- {query}" for query in search_queries)}

CRITICAL: Your final response must be a valid JSON object with this exact structure:
{{
  "executive_summary": "Brief overview of findings",
  "key_insights": [
    {{
      "insight": "Specific finding or recommendation",
      "source_url": "URL where this information was found",
      "confidence": "high|medium|low",
      "actionability": "Description of how this can be implemented"
    }}
  ],
  "sources_consulted": ["list of all URLs accessed"],
  "research_quality": {{
    "source_count": 5,
    "confidence_score": 0.85,
    "coverage_assessment": "comprehensive|partial|limited"
  }}
}}

Begin your research now."""
    
    research_result = research_agent(research_query)
    
    # Parse and validate the structured output
    structured_findings = parse_structured_research_output(str(research_result))
    
    # Calculate metadata
    execution_time = time.time() - start_time
    
    # Structure the comprehensive result
    structured_result = {
        'metadata': {
            'researchRunId': run_id,
            'projectName': project_name,
            'subTopic': sub_topic,
            'searchQueries': search_queries,
            'searchParams': search_params,
            'originalResearchTopic': original_project.get('research_topic', 'General Enhancement'),
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'configVersion': config_version,
            'executionTimeSeconds': round(execution_time, 2),
            'agentModel': BEDROCK_MODEL_ID,
            'framework': 'strands-agents-enhanced'
        },
        'structuredFindings': structured_findings,
        'rawAgentOutput': str(research_result)
    }
    
    return structured_result

def build_enhanced_research_prompt(
    sub_topic: str,
    search_queries: List[str], 
    project_name: str, 
    original_project: Dict[str, Any],
    research_prompts: Dict[str, Any]
) -> str:
    """
    Build enhanced research prompt with structured output requirements
    """
    base_template = research_prompts.get('worker_prompt_template', """
You are a specialized research agent conducting deep research on specific topics.

Your research approach:
1. Use the provided optimized search queries to find current, authoritative information
2. Use extract_article_content to get detailed information from the most relevant sources
3. Synthesize findings into structured insights with mandatory source citations
4. CRITICAL: Every claim must be tied to a specific source URL
5. Provide confidence assessments and actionability for each finding

Focus on quality over quantity - find the most relevant and current information.
""")
    
    # Get project context
    description = original_project.get('description', 'No description provided')
    known_issues = original_project.get('known_issues', [])
    focus_areas = original_project.get('focus_areas', [])
    
    # Build contextual prompt
    context_section = f"""
Project Context:
- Project: {project_name}
- Description: {description}
- Focus Areas: {', '.join(focus_areas) if focus_areas else 'General improvement'}
- Known Issues: {', '.join(known_issues) if known_issues else 'None reported'}

Your Current Research Topic: {sub_topic}

Optimized Search Queries Available:
{chr(10).join(f"- {query}" for query in search_queries)}
"""
    
    # Enhanced output format requirements
    output_format = """
MANDATORY OUTPUT FORMAT:
Your final response MUST be a valid JSON object. Every insight must include a source URL.
No insights without sources will be accepted.

JSON Structure:
{
  "executive_summary": "2-3 sentence overview of key findings",
  "key_insights": [
    {
      "insight": "Specific, actionable finding or recommendation",
      "source_url": "Exact URL where this information was found", 
      "confidence": "high|medium|low based on source authority and evidence",
      "actionability": "How this can be practically implemented",
      "relevance_score": 1-10
    }
  ],
  "sources_consulted": ["complete list of all URLs you accessed"],
  "research_quality": {
    "source_count": "number of unique sources accessed",
    "confidence_score": 0.0-1.0,
    "coverage_assessment": "comprehensive|partial|limited"
  }
}

Quality Requirements:
- Minimum 3 high-quality insights with sources
- All URLs must be real and accessible
- Insights must be specific and actionable
- Confidence levels must be justified
"""
    
    return f"{base_template}\n{context_section}\n{output_format}"

def parse_structured_research_output(agent_output: str) -> Dict[str, Any]:
    """
    Parse and validate the agent's structured JSON output
    """
    try:
        import re
        
        # Try to extract JSON from the agent output
        json_match = re.search(r'\{.*\}', agent_output, re.DOTALL)
        if json_match:
            json_str = json_match.group(0)
            parsed_data = json.loads(json_str)
            
            # Validate required fields
            required_fields = ['executive_summary', 'key_insights', 'sources_consulted']
            for field in required_fields:
                if field not in parsed_data:
                    raise ValueError(f"Missing required field: {field}")
            
            # Validate insights structure
            if not isinstance(parsed_data['key_insights'], list):
                raise ValueError("key_insights must be a list")
            
            for insight in parsed_data['key_insights']:
                if not isinstance(insight, dict) or 'source_url' not in insight:
                    raise ValueError("Each insight must have a source_url")
            
            return parsed_data
        else:
            raise ValueError("No JSON found in agent output")
            
    except Exception as e:
        print(f"Error parsing structured output: {str(e)}")
        print(f"Agent output: {agent_output[:500]}...")
        
        # Return fallback structure
        return {
            'executive_summary': 'Research completed but output format could not be parsed',
            'key_insights': [
                {
                    'insight': 'Raw research data available in agent output',
                    'source_url': 'N/A - parsing error',
                    'confidence': 'low',
                    'actionability': 'Manual review required'
                }
            ],
            'sources_consulted': [],
            'research_quality': {
                'source_count': 0,
                'confidence_score': 0.3,
                'coverage_assessment': 'limited'
            },
            'parsing_error': str(e)
        }

def store_enhanced_research_results(
    results: Dict[str, Any],
    s3_key: str,
    timestamp: datetime
) -> str:
    """
    Store enhanced research results using state-based S3 structure
    """
    try:
        # Store in S3 with enhanced metadata
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=s3_key,
            Body=json.dumps(results, indent=2),
            ContentType='application/json',
            Metadata={
                'project': results['metadata']['projectName'],
                'sub-topic': results['metadata']['subTopic'][:100],
                'run-id': results['metadata']['researchRunId'],
                'timestamp': timestamp.isoformat(),
                'framework': 'strands-agents-enhanced',
                'state': 'success'
            }
        )
        
        print(f"Stored enhanced research results: s3://{S3_BUCKET}/{s3_key}")
        return s3_key
        
    except Exception as e:
        raise ResearchAutomationError(f"Failed to store enhanced research results in S3: {str(e)}")

def store_failure_record(
    failure_key: str,
    sub_topic: str,
    error_message: str,
    timestamp: datetime
) -> None:
    """
    Store failure record for manifest tracking
    """
    try:
        failure_record = {
            'subTopic': sub_topic,
            'error': error_message,
            'timestamp': timestamp.isoformat(),
            'state': 'failed'
        }
        
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=failure_key,
            Body=json.dumps(failure_record, indent=2),
            ContentType='application/json',
            Metadata={
                'sub-topic': sub_topic[:100],
                'timestamp': timestamp.isoformat(),
                'state': 'failed'
            }
        )
        
        print(f"Stored failure record: s3://{S3_BUCKET}/{failure_key}")
        
    except Exception as e:
        print(f"Failed to store failure record: {str(e)}")
        # Don't raise - this is auxiliary functionality
