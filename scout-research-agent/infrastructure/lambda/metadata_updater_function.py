import os
import json
import logging
import boto3
from urllib import request, error

# Setup logging for Lambda
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Get environment variables from Lambda configuration
METADATA_PARAM_NAME = os.environ['METADATA_PARAM_NAME']
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/models"

# Initialize Boto3 client outside the handler for reuse
ssm_client = boto3.client('ssm')

def lambda_handler(event, context):
    """
    Fetches model metadata from OpenRouter and stores it in an SSM Parameter.
    This function is triggered by an Amazon EventBridge schedule.
    """
    logger.info("Starting OpenRouter model metadata update.")

    try:
        # 1. Fetch data from the OpenRouter API
        with request.urlopen(OPENROUTER_API_URL, timeout=15) as response:
            if response.status != 200:
                # This will be caught by the URLError handler below
                raise error.URLError(f"API request failed with status: {response.status}")
            api_data = json.loads(response.read().decode())
        
        logger.info(f"Successfully fetched metadata for {len(api_data.get('data', []))} models.")

        # 2. Put the full JSON blob into the SSM Parameter
        ssm_client.put_parameter(
            Name=METADATA_PARAM_NAME,
            Description='Cache of OpenRouter model metadata, updated by a scheduled Lambda.',
            Value=json.dumps(api_data),
            Type='String',
            Overwrite=True,
            Tier='Standard'
        )
        logger.info(f"Successfully updated SSM Parameter: {METADATA_PARAM_NAME}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'status': 'success',
                'models_updated': len(api_data.get('data', [])),
                'timestamp': context.aws_request_id
            })
        }

    except error.URLError as e:
        logger.error(f"Failed to fetch data from OpenRouter API: {e}")
        # Re-raise to signal failure, allowing EventBridge to handle retries if configured
        raise
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON from OpenRouter API response: {e}")
        raise
    except Exception as e:
        logger.error(f"An unexpected error occurred during metadata update: {e}")
        raise 