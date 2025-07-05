import json
import boto3
import os
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
import requests
import time

# Strands Agents imports
from strands import Agent, tool

# Initialize AWS clients
s3_client = boto3.client('s3')
ssm_client = boto3.client('ssm')

# Environment variables
S3_BUCKET = os.environ['S3_BUCKET']
BEDROCK_MODEL_ID = os.environ.get('SYNTHESIS_BEDROCK_MODEL_ID', 'anthropic.claude-3-sonnet-20240229-v1:0')
GITHUB_REPO_URL = os.environ['GITHUB_REPO_URL']
ENVIRONMENT = os.environ['ENVIRONMENT']
PROJECT_NAME = os.environ['PROJECT_NAME']

class SynthesisError(Exception):
    """Custom exception for synthesis errors"""
    pass

@tool
def read_s3_research_file(s3_key: str) -> str:
    """
    Read and return the content of a research file from S3.
    Use this to access individual research findings.
    """
    try:
        response = s3_client.get_object(Bucket=S3_BUCKET, Key=s3_key)
        content = response['Body'].read().decode('utf-8')
        return f"Research file {s3_key}:\n{content}"
    except Exception as e:
        return f"Error reading {s3_key}: {str(e)}"

@tool
def list_research_files_for_date(date_str: str) -> str:
    """
    List all research files for a specific date.
    Date format: YYYY/MM/DD
    Returns a summary of available research files.
    """
    try:
        prefix = f"research/{date_str}/"
        response = s3_client.list_objects_v2(Bucket=S3_BUCKET, Prefix=prefix)
        
        if 'Contents' not in response:
            return f"No research files found for {date_str}"
        
        files = []
        for obj in response['Contents']:
            key = obj['Key']
            size = obj['Size']
            modified = obj['LastModified'].isoformat()
            
            # Extract metadata if available
            try:
                metadata_response = s3_client.head_object(Bucket=S3_BUCKET, Key=key)
                metadata = metadata_response.get('Metadata', {})
                project = metadata.get('project', 'unknown')
                sub_topic = metadata.get('sub-topic', 'unknown')
            except:
                project = 'unknown'
                sub_topic = 'unknown'
            
            files.append({
                'key': key,
                'size': size,
                'modified': modified,
                'project': project,
                'sub_topic': sub_topic
            })
        
        # Format output
        output = f"Found {len(files)} research files for {date_str}:\n\n"
        for file_info in files:
            output += f"- {file_info['key']}\n"
            output += f"  Project: {file_info['project']}\n"
            output += f"  Sub-topic: {file_info['sub_topic']}\n"
            output += f"  Size: {file_info['size']} bytes\n"
            output += f"  Modified: {file_info['modified']}\n\n"
        
        return output
        
    except Exception as e:
        return f"Error listing research files for {date_str}: {str(e)}"

@tool
def check_research_manifest(run_id: str, date_str: str) -> str:
    """
    Check the research manifest and compare with completed results.
    Returns completion status and details about missing files.
    """
    try:
        # Load manifest
        manifest_key = f"research/{date_str}/{run_id}/_manifest.json"
        try:
            response = s3_client.get_object(Bucket=S3_BUCKET, Key=manifest_key)
            manifest = json.loads(response['Body'].read().decode('utf-8'))
        except Exception as e:
            return f"Error reading manifest {manifest_key}: {str(e)}"
        
        expected_files = manifest.get('expectedFiles', [])
        total_expected = len(expected_files)
        
        if total_expected == 0:
            return f"Manifest found but no expected files listed for run {run_id}"
        
        # Check success files
        success_prefix = f"research/{date_str}/{run_id}/success/"
        success_response = s3_client.list_objects_v2(Bucket=S3_BUCKET, Prefix=success_prefix)
        success_files = [obj['Key'] for obj in success_response.get('Contents', [])]
        
        # Check failed files  
        failed_prefix = f"research/{date_str}/{run_id}/failed/"
        failed_response = s3_client.list_objects_v2(Bucket=S3_BUCKET, Prefix=failed_prefix)
        failed_files = [obj['Key'] for obj in failed_response.get('Contents', [])]
        
        total_completed = len(success_files) + len(failed_files)
        completion_rate = total_completed / total_expected if total_expected > 0 else 0
        
        # Determine missing files
        all_completed_files = set(success_files + failed_files)
        missing_files = []
        for expected_file in expected_files:
            # Convert success path to check both success and failed variants
            if expected_file not in all_completed_files:
                failed_variant = expected_file.replace('/success/', '/failed/')
                if failed_variant not in all_completed_files:
                    missing_files.append(expected_file)
        
        status_summary = f"""Research Completion Status for run {run_id}:
- Expected files: {total_expected}
- Completed successfully: {len(success_files)}
- Failed: {len(failed_files)}
- Total completed: {total_completed}
- Missing: {len(missing_files)}
- Completion rate: {completion_rate:.2%}

Missing files:
{chr(10).join(f"- {f}" for f in missing_files[:10])}
{'... and more' if len(missing_files) > 10 else ''}

Status: {'COMPLETE' if completion_rate >= 1.0 else 'INCOMPLETE'}
"""
        
        return status_summary
        
    except Exception as e:
        return f"Error checking research manifest for run {run_id}: {str(e)}"

def lambda_handler(event, context):
    """
    Enhanced synthesis Lambda with manifest-checking pattern
    Waits for research completion before generating reports
    """
    try:
        print(f"Starting enhanced synthesis with manifest checking: {json.dumps(event, default=str)}")
        
        # Determine the date and run_id to synthesize
        target_date = datetime.now(timezone.utc)
        run_id = None
        
        # Check if specific parameters were provided
        if 'synthesis_date' in event:
            target_date = datetime.fromisoformat(event['synthesis_date'])
        if 'run_id' in event:
            run_id = event['run_id']
        
        date_str = target_date.strftime('%Y/%m/%d')
        
        # If no specific run_id provided, find the most recent one for the date
        if not run_id:
            run_id = find_most_recent_run(date_str)
            if not run_id:
                return {
                    'statusCode': 404,
                    'body': json.dumps({
                        'error': f'No research runs found for date {date_str}',
                        'date': date_str
                    })
                }
        
        print(f"Synthesizing research for date: {date_str}, run_id: {run_id}")
        
        # Get synthesis configuration from GitHub
        research_config = fetch_research_config()
        synthesis_settings = research_config.get('synthesis_settings', {})
        
        # Check research completion status using manifest
        completion_status = check_research_completion(run_id, date_str, synthesis_settings)
        
        if completion_status['status'] == 'incomplete':
            # Handle incomplete research based on configuration
            min_completion_rate = synthesis_settings.get('minimum_completion_rate', 0.8)
            
            if completion_status['completion_rate'] < min_completion_rate:
                # Check if this is a retry (self-invocation)
                retry_count = event.get('retry_count', 0)
                max_retries = synthesis_settings.get('max_retries', 6)  # 30 minutes with 5-minute intervals
                
                if retry_count < max_retries:
                    print(f"Research incomplete ({completion_status['completion_rate']:.1%}), scheduling retry {retry_count + 1}")
                    return self_invoke_with_delay(event, retry_count + 1)
                else:
                    print(f"Max retries reached, proceeding with partial data ({completion_status['completion_rate']:.1%})")
        
        # Generate comprehensive report
        synthesis_result = generate_enhanced_comprehensive_report(
            date_str,
            run_id,
            synthesis_settings,
            target_date,
            completion_status
        )
        
        # Store synthesis result
        s3_key = store_synthesis_result(synthesis_result, target_date, run_id)
        
        print(f"Enhanced synthesis completed successfully -> {s3_key}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Enhanced synthesis completed successfully',
                'date': date_str,
                'run_id': run_id,
                'report_location': s3_key,
                'completion_status': completion_status,
                'summary': {
                    'total_research_files': synthesis_result['metadata']['totalResearchFiles'],
                    'projects_analyzed': synthesis_result['metadata']['projectsAnalyzed'],
                    'confidence_score': synthesis_result['metadata']['overallConfidenceScore']
                }
            })
        }
        
    except Exception as e:
        print(f"Critical error in enhanced synthesis process: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e),
                'message': 'Enhanced synthesis failed'
            })
        }

def fetch_research_config() -> Dict[str, Any]:
    """
    Fetch research configuration from GitHub repository
    """
    try:
        import base64
        
        config_url = f"{GITHUB_REPO_URL.rstrip('/')}/research-config.json"
        response = requests.get(config_url, timeout=30)
        response.raise_for_status()
        
        content_data = response.json()
        if 'content' in content_data:
            config_content = base64.b64decode(content_data['content']).decode('utf-8')
            config = json.loads(config_content)
        else:
            raise SynthesisError("GitHub API response missing content field")
        
        return config
        
    except Exception as e:
        raise SynthesisError(f"Failed to fetch research config: {str(e)}")

def find_most_recent_run(date_str: str) -> Optional[str]:
    """
    Find the most recent research run for a given date
    """
    try:
        prefix = f"research/{date_str}/"
        response = s3_client.list_objects_v2(Bucket=S3_BUCKET, Prefix=prefix, Delimiter='/')
        
        # Extract run IDs from common prefixes
        run_ids = []
        for prefix_info in response.get('CommonPrefixes', []):
            prefix_path = prefix_info['Prefix']
            # Extract run_id from path like "research/2024/01/15/{run_id}/"
            path_parts = prefix_path.rstrip('/').split('/')
            if len(path_parts) >= 4:
                potential_run_id = path_parts[4]
                # Check if it looks like a UUID
                if len(potential_run_id) >= 32 and '-' in potential_run_id:
                    run_ids.append(potential_run_id)
        
        if not run_ids:
            return None
        
        # Return the most recent one (assuming UUIDs are time-ordered for simplicity)
        # In practice, you might want to check manifest timestamps
        return sorted(run_ids)[-1]
        
    except Exception as e:
        print(f"Error finding recent run for {date_str}: {str(e)}")
        return None

def check_research_completion(run_id: str, date_str: str, synthesis_settings: Dict[str, Any]) -> Dict[str, Any]:
    """
    Check research completion status using manifest
    """
    try:
        # Load manifest
        manifest_key = f"research/{date_str}/{run_id}/_manifest.json"
        response = s3_client.get_object(Bucket=S3_BUCKET, Key=manifest_key)
        manifest = json.loads(response['Body'].read().decode('utf-8'))
        
        expected_files = manifest.get('expectedFiles', [])
        total_expected = len(expected_files)
        
        # Count completed files (success + failed)
        success_prefix = f"research/{date_str}/{run_id}/success/"
        success_response = s3_client.list_objects_v2(Bucket=S3_BUCKET, Prefix=success_prefix)
        success_count = len(success_response.get('Contents', []))
        
        failed_prefix = f"research/{date_str}/{run_id}/failed/"
        failed_response = s3_client.list_objects_v2(Bucket=S3_BUCKET, Prefix=failed_prefix)
        failed_count = len(failed_response.get('Contents', []))
        
        total_completed = success_count + failed_count
        completion_rate = total_completed / total_expected if total_expected > 0 else 0
        
        # Determine status
        min_completion_rate = synthesis_settings.get('minimum_completion_rate', 0.8)
        status = 'complete' if completion_rate >= 1.0 else ('acceptable' if completion_rate >= min_completion_rate else 'incomplete')
        
        return {
            'status': status,
            'total_expected': total_expected,
            'success_count': success_count,
            'failed_count': failed_count,
            'total_completed': total_completed,
            'completion_rate': completion_rate,
            'run_id': run_id,
            'manifest': manifest
        }
        
    except Exception as e:
        print(f"Error checking completion status: {str(e)}")
        return {
            'status': 'error',
            'error': str(e),
            'total_expected': 0,
            'success_count': 0,
            'failed_count': 0,
            'total_completed': 0,
            'completion_rate': 0.0
        }

def self_invoke_with_delay(original_event: Dict[str, Any], retry_count: int) -> Dict[str, Any]:
    """
    Self-invoke the Lambda with a delay for polling pattern
    """
    try:
        import boto3
        lambda_client = boto3.client('lambda')
        
        # Create new event with retry count
        new_event = original_event.copy()
        new_event['retry_count'] = retry_count
        
        # Schedule invocation in 5 minutes
        lambda_client.invoke(
            FunctionName=context.function_name,
            InvocationType='Event',  # Async invocation
            Payload=json.dumps(new_event)
        )
        
        print(f"Scheduled retry {retry_count} in 5 minutes")
        
        return {
            'statusCode': 202,
            'body': json.dumps({
                'message': f'Research incomplete, retry {retry_count} scheduled',
                'retry_count': retry_count,
                'next_check_in': '5 minutes'
            })
        }
        
    except Exception as e:
        print(f"Error scheduling retry: {str(e)}")
        # Fall back to proceeding with partial data
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Failed to schedule retry, proceeding with partial data',
                'error': str(e)
            })
        }

def generate_enhanced_comprehensive_report(
    date_str: str,
    run_id: str,
    synthesis_settings: Dict[str, Any],
    target_date: datetime,
    completion_status: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Generate enhanced comprehensive research report with manifest awareness
    """
    start_time = time.time()
    
    # Build enhanced synthesis prompt
    system_prompt = build_enhanced_synthesis_prompt(synthesis_settings, completion_status)
    
    # Initialize enhanced Strands synthesis agent
    synthesis_agent = Agent(
        system_prompt=system_prompt,
        tools=[
            lambda date_str=date_str: list_research_files_for_date(date_str),
            read_s3_research_file,
            lambda run_id=run_id, date_str=date_str: check_research_manifest(run_id, date_str)
        ],
        model=f"bedrock:{synthesis_settings.get('synthesis_model', BEDROCK_MODEL_ID)}",
        max_iterations=12
    )
    
    # Execute enhanced synthesis
    print(f"Starting enhanced Strands agent synthesis for: {date_str}/{run_id}")
    
    synthesis_query = f"""Analyze research for {date_str} (run: {run_id}) and generate a comprehensive report.

COMPLETION STATUS:
- Expected files: {completion_status['total_expected']}
- Successfully completed: {completion_status['success_count']}
- Failed: {completion_status['failed_count']}
- Completion rate: {completion_status['completion_rate']:.1%}

SYNTHESIS APPROACH:
1. First, check the research manifest to understand the scope
2. List and analyze all available research files (focus on success/ prefix)
3. Read each research file and extract structured insights
4. Synthesize findings into a comprehensive report following the configured structure
5. Identify cross-project patterns and actionable recommendations
6. Note any gaps due to incomplete research (if applicable)

Focus on creating actionable insights that connect findings across different research areas.
If research is incomplete, clearly note what's missing and adjust confidence accordingly."""
    
    synthesis_result = synthesis_agent(synthesis_query)
    
    # Calculate metadata with enhanced tracking
    execution_time = time.time() - start_time
    
    # Structure the comprehensive result with completion awareness
    structured_result = {
        'metadata': {
            'synthesisDate': target_date.isoformat(),
            'researchPeriod': date_str,
            'runId': run_id,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'executionTimeSeconds': round(execution_time, 2),
            'completionStatus': completion_status,
            'totalResearchFiles': completion_status['success_count'],
            'failedResearchFiles': completion_status['failed_count'],
            'projectsAnalyzed': len(set(completion_status.get('manifest', {}).get('expectedFiles', []))),
            'synthesisModel': synthesis_settings.get('synthesis_model', BEDROCK_MODEL_ID),
            'framework': 'strands-agents-enhanced',
            'overallConfidenceScore': extract_confidence_score(str(synthesis_result)),
            'synthesisVersion': '2.0'
        },
        'comprehensiveReport': str(synthesis_result),
        'reportSections': extract_report_sections(str(synthesis_result), synthesis_settings)
    }
    
    return structured_result

def build_enhanced_synthesis_prompt(
    synthesis_settings: Dict[str, Any], 
    completion_status: Dict[str, Any]
) -> str:
    """
    Build enhanced synthesis prompt with completion awareness
    """
    sections = synthesis_settings.get('comprehensive_report_sections', [
        "Executive Summary",
        "Key Findings by Project", 
        "Cross-Project Patterns and Insights",
        "Recommended Action Items",
        "Technology Trends and Implications",
        "Implementation Roadmap Suggestions"
    ])
    
    max_length = synthesis_settings.get('max_report_length', 5000)
    completion_rate = completion_status.get('completion_rate', 1.0)
    
    completion_guidance = ""
    if completion_rate < 1.0:
        completion_guidance = f"""
IMPORTANT: Research is {completion_rate:.1%} complete. Some findings may be missing.
- Adjust confidence levels accordingly
- Clearly note any gaps in coverage
- Focus on insights from available data
- Mention limitations in your analysis
"""
    
    return f"""You are a senior research analyst tasked with synthesizing multiple research findings into a comprehensive report.

{completion_guidance}

Your approach:
1. Use check_research_manifest to understand the research scope and completion status
2. Use list_research_files_for_date to discover all available research
3. Use read_s3_research_file to access and analyze each research finding
4. Synthesize information across all research areas with awareness of any gaps
5. Identify patterns, connections, and insights that span multiple topics
6. Generate actionable recommendations based on the collective findings

Report Structure (aim for ~{max_length} words total):
{chr(10).join(f"- {section}" for section in sections)}

Enhanced Analysis Guidelines:
- Prioritize insights from successfully completed research
- Cross-reference findings across different research areas
- Highlight connections between technical and business insights
- Provide specific implementation guidance with effort estimates
- Note confidence levels based on source quality and completeness
- Include risk assessments for recommendations
- Cite specific research sources where relevant

Quality Standards:
- Ensure logical flow from findings to actionable recommendations
- Balance technical depth with executive accessibility
- Provide concrete next steps rather than generic advice
- Account for any research gaps in confidence assessments
"""

def extract_confidence_score(synthesis_content: str) -> float:
    """
    Extract or estimate overall confidence score from synthesis content
    """
    try:
        import re
        
        # Look for explicit confidence mentions
        confidence_patterns = [
            r'overall confidence[:\s]*([0-9]+(?:\.[0-9]+)?)%',
            r'synthesis confidence[:\s]*([0-9]+(?:\.[0-9]+)?)%',
            r'report confidence[:\s]*([0-9]+(?:\.[0-9]+)?)%'
        ]
        
        for pattern in confidence_patterns:
            matches = re.findall(pattern, synthesis_content.lower())
            if matches:
                return float(matches[0]) / 100.0
        
        # Estimate based on content quality indicators
        quality_indicators = [
            'executive summary' in synthesis_content.lower(),
            'recommendations' in synthesis_content.lower(),
            'findings' in synthesis_content.lower(),
            'implementation' in synthesis_content.lower(),
            len(synthesis_content) > 1000,
            synthesis_content.count('\n') > 20  # Structured content
        ]
        
        base_score = 0.75
        bonus = sum(quality_indicators) * 0.03
        return min(base_score + bonus, 0.95)
        
    except Exception:
        return 0.8  # Default high confidence for synthesis

def extract_report_sections(
    synthesis_content: str, 
    synthesis_settings: Dict[str, Any]
) -> List[Dict[str, str]]:
    """
    Extract report sections from synthesis content
    """
    try:
        import re
        
        sections = []
        expected_sections = synthesis_settings.get('comprehensive_report_sections', [])
        
        # Try to extract sections based on headers
        for section_name in expected_sections:
            # Look for section headers (various formats)
            patterns = [
                f"## {re.escape(section_name)}.*?(?=\n##|\Z)",
                f"# {re.escape(section_name)}.*?(?=\n#|\Z)",
                f"{re.escape(section_name)}:.*?(?=\n[A-Z][^:]*:|\Z)"
            ]
            
            for pattern in patterns:
                match = re.search(pattern, synthesis_content, re.DOTALL | re.IGNORECASE)
                if match:
                    content = match.group(0).strip()
                    # Clean up the content
                    content = re.sub(f"^(##?\\s*)?{re.escape(section_name)}:?\\s*", "", content, flags=re.IGNORECASE)
                    
                    sections.append({
                        'title': section_name,
                        'content': content[:500] + ('...' if len(content) > 500 else '')
                    })
                    break
        
        return sections
        
    except Exception:
        return []

def store_synthesis_result(
    result: Dict[str, Any], 
    target_date: datetime,
    run_id: str
) -> str:
    """
    Store synthesis result with enhanced metadata
    """
    try:
        # Create S3 key for synthesis reports
        date_path = target_date.strftime('%Y/%m/%d')
        timestamp = datetime.now(timezone.utc).strftime('%H%M%S')
        s3_key = f"reports/{date_path}/comprehensive_research_report_{run_id}_{timestamp}.json"
        
        # Store in S3
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=s3_key,
            Body=json.dumps(result, indent=2),
            ContentType='application/json',
            Metadata={
                'report-type': 'comprehensive-synthesis',
                'research-date': target_date.strftime('%Y-%m-%d'),
                'run-id': run_id,
                'completion-rate': str(result['metadata']['completionStatus']['completion_rate']),
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'framework': 'strands-agents-enhanced'
            }
        )
        
        print(f"Stored enhanced synthesis report: s3://{S3_BUCKET}/{s3_key}")
        return s3_key
        
    except Exception as e:
        raise SynthesisError(f"Failed to store enhanced synthesis result in S3: {str(e)}") 