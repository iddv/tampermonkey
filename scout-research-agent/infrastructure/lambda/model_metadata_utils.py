import os
import json
import logging
import boto3
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)
ssm_client = boto3.client('ssm')

# Global in-memory cache to hold metadata for warm Lambda invocations
_metadata_cache: Optional[Dict[str, Any]] = None

# Hardcoded fallback data for initial deployment or SSM failure
FALLBACK_METADATA = {
    "data": [
        {
            "id": "anthropic/claude-3-haiku-20240307", 
            "context_length": 200000, 
            "pricing": {"prompt": "0.00000025", "completion": "0.00000125"},
            "architecture": {"tokenizer": "Claude"}
        },
        {
            "id": "anthropic/claude-3-sonnet-20240229", 
            "context_length": 200000, 
            "pricing": {"prompt": "0.000003", "completion": "0.000015"},
            "architecture": {"tokenizer": "Claude"}
        },
        {
            "id": "anthropic/claude-3-opus-20240229", 
            "context_length": 200000, 
            "pricing": {"prompt": "0.000015", "completion": "0.000075"},
            "architecture": {"tokenizer": "Claude"}
        },
        {
            "id": "openai/gpt-4o", 
            "context_length": 128000, 
            "pricing": {"prompt": "0.000005", "completion": "0.000015"},
            "architecture": {"tokenizer": "GPT"}
        },
        {
            "id": "openai/gpt-4-turbo", 
            "context_length": 128000, 
            "pricing": {"prompt": "0.00001", "completion": "0.00003"},
            "architecture": {"tokenizer": "GPT"}
        },
        {
            "id": "google/gemini-pro", 
            "context_length": 32768, 
            "pricing": {"prompt": "0.0000005", "completion": "0.0000015"},
            "architecture": {"tokenizer": "Gemini"}
        },
        {
            "id": "meta-llama/llama-3-70b-instruct", 
            "context_length": 8192, 
            "pricing": {"prompt": "0.0000009", "completion": "0.0000009"},
            "architecture": {"tokenizer": "Llama"}
        }
    ]
}

def get_model_metadata() -> Dict[str, Any]:
    """
    Retrieves model metadata, prioritizing in-memory cache, then SSM Parameter Store,
    and finally a hardcoded fallback map.
    
    Returns:
        Dict containing model metadata in OpenRouter format
    """
    global _metadata_cache
    if _metadata_cache is not None:
        logger.debug("Using in-memory metadata cache.")
        return _metadata_cache

    metadata_param_name = os.environ.get('METADATA_PARAM_NAME')
    if not metadata_param_name:
        logger.warning("METADATA_PARAM_NAME env var not set. Using hardcoded fallback metadata.")
        _metadata_cache = FALLBACK_METADATA
        return _metadata_cache

    try:
        logger.info(f"Cold start: Fetching metadata from SSM Parameter '{metadata_param_name}'.")
        parameter = ssm_client.get_parameter(Name=metadata_param_name)
        metadata_str = parameter.get('Parameter', {}).get('Value')
        
        if not metadata_str:
            # Handles the edge case where the parameter exists but is empty
            raise ValueError("SSM Parameter value is empty.")

        _metadata_cache = json.loads(metadata_str)
        logger.info("Successfully loaded and cached metadata from SSM.")
        return _metadata_cache

    except (ssm_client.exceptions.ParameterNotFound, ValueError) as e:
        logger.warning(f"Could not load valid metadata from SSM ('{e}'). Using hardcoded fallback.")
        _metadata_cache = FALLBACK_METADATA
        return _metadata_cache
    except Exception as e:
        # Catch-all for other potential issues like IAM permissions
        logger.error(f"Unexpected error fetching metadata from SSM: {e}. Using hardcoded fallback.")
        _metadata_cache = FALLBACK_METADATA
        return _metadata_cache

def get_model_context_windows() -> Dict[str, int]:
    """
    Extract context window mappings from model metadata.
    
    Returns:
        Dict mapping model IDs to their context window sizes
    """
    metadata = get_model_metadata()
    context_windows = {}
    
    for model in metadata.get('data', []):
        model_id = model.get('id')
        context_length = model.get('context_length')
        if model_id and context_length:
            context_windows[model_id] = context_length
    
    return context_windows

def get_model_pricing() -> Dict[str, Dict[str, float]]:
    """
    Extract pricing information from model metadata.
    
    Returns:
        Dict mapping model IDs to their pricing info (prompt, completion costs)
    """
    metadata = get_model_metadata()
    pricing_info = {}
    
    for model in metadata.get('data', []):
        model_id = model.get('id')
        pricing = model.get('pricing', {})
        if model_id and pricing:
            try:
                pricing_info[model_id] = {
                    'prompt': float(pricing.get('prompt', 0)),
                    'completion': float(pricing.get('completion', 0))
                }
            except (ValueError, TypeError):
                logger.warning(f"Invalid pricing data for model {model_id}")
                continue
    
    return pricing_info

def get_context_limit_for_model(model_id: str, default: int = 8192) -> int:
    """
    Get the context window limit for a specific model.
    
    Args:
        model_id: The OpenRouter model ID
        default: Default context limit if model not found
        
    Returns:
        Context window size in tokens
    """
    context_windows = get_model_context_windows()
    return context_windows.get(model_id, default)

def is_metadata_from_fallback() -> bool:
    """
    Check if we're currently using fallback metadata instead of fresh data.
    
    Returns:
        True if using hardcoded fallback, False if using SSM data
    """
    global _metadata_cache
    if _metadata_cache is None:
        get_model_metadata()  # Initialize cache
    
    # Simple heuristic: fallback has fewer models than real OpenRouter API
    return len(_metadata_cache.get('data', [])) < 50

def refresh_metadata_cache() -> bool:
    """
    Force refresh of the metadata cache from SSM.
    
    Returns:
        True if refresh successful, False otherwise
    """
    global _metadata_cache
    _metadata_cache = None  # Clear cache
    
    try:
        get_model_metadata()  # This will fetch fresh data
        return not is_metadata_from_fallback()
    except Exception as e:
        logger.error(f"Failed to refresh metadata cache: {e}")
        return False

def get_model_capabilities(model_id: str) -> Dict[str, Any]:
    """
    Get model capabilities and architecture info.
    
    Args:
        model_id: The OpenRouter model ID
        
    Returns:
        Dict with model architecture and capability info
    """
    metadata = get_model_metadata()
    
    for model in metadata.get('data', []):
        if model.get('id') == model_id:
            return {
                'context_length': model.get('context_length', 8192),
                'pricing': model.get('pricing', {}),
                'architecture': model.get('architecture', {}),
                'supported_parameters': model.get('supported_parameters', [])
            }
    
    return {
        'context_length': 8192,
        'pricing': {},
        'architecture': {},
        'supported_parameters': []
    }

# Logging helper for observability
def log_metadata_status():
    """
    Log current metadata status for observability.
    """
    try:
        metadata = get_model_metadata()
        model_count = len(metadata.get('data', []))
        is_fallback = is_metadata_from_fallback()
        
        logger.info(f"Model metadata status - Count: {model_count}, Using fallback: {is_fallback}")
        
        if is_fallback:
            logger.warning("Operating with fallback metadata - consider checking SSM parameter and metadata updater")
    except Exception as e:
        logger.error(f"Failed to log metadata status: {e}") 