import json
import logging
import requests
from typing import Any, Dict, Iterable, List, Optional, TypedDict, Union, Type, Generator
from typing_extensions import Unpack
from pydantic import BaseModel

from strands.types.models import Model
from strands.types.content import Messages, Role, ContentBlock
from strands.types.streaming import StreamEvent
from strands.types.tools import ToolSpec
from strands.types.exceptions import ContextWindowOverflowException

logger = logging.getLogger(__name__)

class OpenRouterModel(Model):
    """
    OpenRouter model provider for Strands Agents.
    
    Provides access to multiple AI models through OpenRouter's unified API.
    Compatible with OpenAI format but offers additional models like Claude, Gemini, etc.
    """

    class ModelConfig(TypedDict):
        """
        Configuration for OpenRouter model.

        Attributes:
            model: OpenRouter model ID (e.g., 'anthropic/claude-3-sonnet', 'openai/gpt-4')
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature (0.0-2.0)
            top_p: Top-p sampling parameter
            presence_penalty: Presence penalty (-2.0 to 2.0)
            frequency_penalty: Frequency penalty (-2.0 to 2.0)
            stream: Whether to stream responses
            timeout: Request timeout in seconds
            base_url: OpenRouter API base URL
            transforms: List of content transforms to apply
        """
        model: str
        max_tokens: Optional[int]
        temperature: Optional[float]
        top_p: Optional[float]
        presence_penalty: Optional[float]
        frequency_penalty: Optional[float]
        stream: Optional[bool]
        timeout: Optional[int]
        base_url: Optional[str]
        transforms: Optional[List[str]]

    def __init__(
        self,
        api_key: str,
        **model_config: Unpack[ModelConfig]
    ) -> None:
        """
        Initialize OpenRouter model provider.

        Args:
            api_key: OpenRouter API key
            **model_config: Configuration options for OpenRouter model
        """
        # Set defaults
        defaults = {
            'model': 'anthropic/claude-3-sonnet',
            'max_tokens': 4096,
            'temperature': 0.7,
            'stream': True,
            'timeout': 30,
            'base_url': 'https://openrouter.ai/api/v1',
            'transforms': []
        }
        
        # Merge with provided config
        self.config = OpenRouterModel.ModelConfig({**defaults, **model_config})
        
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/iddv/tampermonkey',  # Optional: for analytics
            'X-Title': 'Scout Research Agent'  # Optional: for analytics
        })
        
        logger.debug(f"OpenRouter model initialized with config: {self.config}")

    def update_config(self, **model_config: Unpack[ModelConfig]) -> None:
        """
        Update OpenRouter model configuration.

        Args:
            **model_config: Configuration overrides
        """
        self.config.update(model_config)
        logger.debug(f"OpenRouter config updated: {model_config}")

    def get_config(self) -> ModelConfig:
        """
        Get current OpenRouter model configuration.

        Returns:
            Current model configuration
        """
        return self.config

    def format_request(
        self, 
        messages: Messages, 
        tool_specs: Optional[List[ToolSpec]] = None, 
        system_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Format request for OpenRouter API.

        Args:
            messages: Strands Agents messages
            tool_specs: Available tool specifications
            system_prompt: System prompt

        Returns:
            OpenRouter API request payload
        """
        # Convert Strands messages to OpenAI format
        openai_messages = []
        
        # Add system prompt if provided
        if system_prompt:
            openai_messages.append({
                "role": "system",
                "content": system_prompt
            })
        
        # Convert messages
        for message in messages:
            role = message.get("role", "user")
            content = message.get("content", [])
            
            # Handle different content types
            if isinstance(content, str):
                openai_messages.append({
                    "role": role,
                    "content": content
                })
            elif isinstance(content, list):
                # Process content blocks
                text_parts = []
                for block in content:
                    if isinstance(block, dict):
                        if "text" in block:
                            text_parts.append(block["text"])
                        elif "toolUse" in block:
                            # Handle tool use
                            tool_use = block["toolUse"]
                            openai_messages.append({
                                "role": "assistant",
                                "content": None,
                                "tool_calls": [{
                                    "id": tool_use.get("toolUseId", "unknown"),
                                    "type": "function",
                                    "function": {
                                        "name": tool_use.get("name", "unknown"),
                                        "arguments": json.dumps(tool_use.get("input", {}))
                                    }
                                }]
                            })
                        elif "toolResult" in block:
                            # Handle tool result
                            tool_result = block["toolResult"]
                            openai_messages.append({
                                "role": "tool",
                                "tool_call_id": tool_result.get("toolUseId", "unknown"),
                                "content": str(tool_result.get("content", ""))
                            })
                
                if text_parts:
                    openai_messages.append({
                        "role": role,
                        "content": "\n".join(text_parts)
                    })
        
        # Build request payload
        request_payload = {
            "model": self.config["model"],
            "messages": openai_messages,
            "stream": self.config.get("stream", True)
        }
        
        # Add optional parameters
        if self.config.get("max_tokens"):
            request_payload["max_tokens"] = self.config["max_tokens"]
        if self.config.get("temperature") is not None:
            request_payload["temperature"] = self.config["temperature"]
        if self.config.get("top_p") is not None:
            request_payload["top_p"] = self.config["top_p"]
        if self.config.get("presence_penalty") is not None:
            request_payload["presence_penalty"] = self.config["presence_penalty"]
        if self.config.get("frequency_penalty") is not None:
            request_payload["frequency_penalty"] = self.config["frequency_penalty"]
        
        # Add tools if provided
        if tool_specs:
            tools = []
            for tool_spec in tool_specs:
                tools.append({
                    "type": "function",
                    "function": {
                        "name": tool_spec.get("name", "unknown"),
                        "description": tool_spec.get("description", ""),
                        "parameters": tool_spec.get("inputSchema", {})
                    }
                })
            request_payload["tools"] = tools
            request_payload["tool_choice"] = "auto"
        
        return request_payload

    def format_chunk(self, event: Dict[str, Any]) -> StreamEvent:
        """
        Format OpenRouter streaming response to Strands StreamEvent.

        Args:
            event: OpenRouter streaming event

        Returns:
            Strands StreamEvent
        """
        # Handle different event types from OpenRouter (OpenAI format)
        if 'choices' not in event:
            return {"metadata": {"raw_event": event}}
        
        choice = event['choices'][0]
        delta = choice.get('delta', {})
        finish_reason = choice.get('finish_reason')
        
        # Message start event
        if delta.get('role') == 'assistant':
            return {
                "messageStart": {
                    "role": "assistant"
                }
            }
        
        # Content events
        if 'content' in delta and delta['content']:
            # Check if this is the start of content
            if not hasattr(self, '_content_started'):
                self._content_started = True
                # Return content block start + delta
                return {
                    "contentBlockStart": {
                        "start": {}
                    }
                }
            else:
                # Return content delta
                return {
                    "contentBlockDelta": {
                        "delta": {
                            "text": delta['content']
                        }
                    }
                }
        
        # Tool call events
        if 'tool_calls' in delta and delta['tool_calls']:
            tool_call = delta['tool_calls'][0]
            function = tool_call.get('function', {})
            
            # Check if this is the start of a tool call
            if 'name' in function:
                return {
                    "contentBlockStart": {
                        "start": {
                            "toolUse": {
                                "toolUseId": tool_call.get('id', 'unknown'),
                                "name": function['name']
                            }
                        }
                    }
                }
            elif 'arguments' in function:
                return {
                    "contentBlockDelta": {
                        "delta": {
                            "toolUse": {
                                "input": function['arguments']
                            }
                        }
                    }
                }
        
        # Finish events
        if finish_reason:
            # Reset content tracking
            if hasattr(self, '_content_started'):
                delattr(self, '_content_started')
            
            # Content block stop
            content_block_stop = {
                "contentBlockStop": {}
            }
            
            # Message stop
            stop_reason_map = {
                'stop': 'end_turn',
                'length': 'max_tokens',
                'tool_calls': 'tool_use',
                'content_filter': 'content_filtered'
            }
            
            message_stop = {
                "messageStop": {
                    "stopReason": stop_reason_map.get(finish_reason, 'end_turn')
                }
            }
            
            return content_block_stop  # Return one event at a time
        
        # Usage/metadata events
        if 'usage' in event:
            usage = event['usage']
            return {
                "metadata": {
                    "usage": {
                        "inputTokens": usage.get('prompt_tokens', 0),
                        "outputTokens": usage.get('completion_tokens', 0),
                        "totalTokens": usage.get('total_tokens', 0)
                    },
                    "metrics": {
                        "latencyMs": 0  # OpenRouter doesn't provide latency
                    }
                }
            }
        
        # Default: return raw event as metadata
        return {"metadata": {"raw_event": event}}

    def stream(self, request: Dict[str, Any]) -> Iterable[Dict[str, Any]]:
        """
        Stream response from OpenRouter API.

        Args:
            request: Formatted request payload

        Yields:
            OpenRouter streaming events
        """
        try:
            base_url = self.config.get("base_url", "https://openrouter.ai/api/v1")
            url = f"{base_url}/chat/completions"
            timeout = self.config.get("timeout", 30)
            
            logger.debug(f"Making OpenRouter request to {url}")
            
            # Make streaming request
            response = self.session.post(
                url,
                json=request,
                stream=True,
                timeout=timeout
            )
            
            if response.status_code != 200:
                error_text = response.text
                logger.error(f"OpenRouter API error: {response.status_code} - {error_text}")
                
                # Check for context window overflow
                if response.status_code == 400 and ('context' in error_text.lower() or 'token' in error_text.lower()):
                    raise ContextWindowOverflowException(f"Context window overflow: {error_text}")
                
                raise Exception(f"OpenRouter API error: {response.status_code} - {error_text}")
            
            # Yield message start event
            yield {
                "messageStart": {
                    "role": "assistant"
                }
            }
            
            # Process streaming response
            for line in response.iter_lines():
                if line:
                    line = line.decode('utf-8')
                    if line.startswith('data: '):
                        data = line[6:].strip()
                        if data == '[DONE]':
                            break
                        
                        try:
                            event = json.loads(data)
                            yield event
                        except json.JSONDecodeError:
                            logger.warning(f"Failed to parse OpenRouter event: {data}")
                            continue
            
            # Yield final message stop event
            yield {
                "choices": [{
                    "finish_reason": "stop",
                    "delta": {}
                }]
            }
            
        except requests.exceptions.Timeout:
            raise Exception("OpenRouter API request timeout")
        except requests.exceptions.ConnectionError:
            raise Exception("OpenRouter API connection error")
        except Exception as e:
            logger.error(f"OpenRouter streaming error: {str(e)}")
            raise

    def structured_output(
        self, 
        output_model: Type[BaseModel], 
        prompt: Messages
    ) -> Generator[Dict[str, Union[BaseModel, Any]], None, None]:
        """
        Get structured output using OpenRouter with tool calling.

        Args:
            output_model: Pydantic model for output validation
            prompt: Input messages

        Yields:
            Events and final structured output
        """
        try:
            # Convert Pydantic model to OpenAI tool specification
            tool_spec = {
                "name": f"extract_{output_model.__name__.lower()}",
                "description": f"Extract {output_model.__name__} information from the input",
                "inputSchema": output_model.model_json_schema()
            }
            
            # Use existing converse method with tool specification
            request = self.format_request(messages=prompt, tool_specs=[tool_spec])
            
            # Process streaming response
            tool_calls = []
            for event in self.stream(request):
                formatted_event = self.format_chunk(event)
                yield formatted_event  # Pass to callback handler
                
                # Check for tool calls
                if 'choices' in event:
                    choice = event['choices'][0]
                    delta = choice.get('delta', {})
                    
                    if 'tool_calls' in delta:
                        for tool_call in delta['tool_calls']:
                            if tool_call.get('id'):
                                tool_calls.append(tool_call)
                            elif tool_calls and 'function' in tool_call:
                                # Update existing tool call
                                tool_calls[-1]['function'].update(tool_call['function'])
                    
                    if choice.get('finish_reason') == 'tool_calls':
                        break
            
            # Validate and extract tool use output
            if not tool_calls:
                raise ValueError("No tool calls found in OpenRouter response")
            
            tool_call = tool_calls[0]
            function = tool_call.get('function', {})
            
            if function.get('name') != tool_spec['name']:
                raise ValueError(f"Unexpected tool call: {function.get('name')}")
            
            # Parse and validate arguments
            arguments_str = function.get('arguments', '{}')
            arguments = json.loads(arguments_str)
            
            # Create and validate output model
            validated_output = output_model(**arguments)
            
            yield {"output": validated_output}
            
        except Exception as e:
            logger.error(f"OpenRouter structured output error: {str(e)}")
            raise ValueError(f"Structured output failed: {str(e)}")


# Convenience functions for common OpenRouter models
def create_claude_sonnet_model(api_key: str, **kwargs) -> OpenRouterModel:
    """Create OpenRouter model configured for Claude-3 Sonnet"""
    return OpenRouterModel(
        api_key=api_key,
        model="anthropic/claude-3-sonnet",
        **kwargs
    )

def create_claude_haiku_model(api_key: str, **kwargs) -> OpenRouterModel:
    """Create OpenRouter model configured for Claude-3 Haiku"""
    return OpenRouterModel(
        api_key=api_key,
        model="anthropic/claude-3-haiku",
        **kwargs
    )

def create_gpt4_model(api_key: str, **kwargs) -> OpenRouterModel:
    """Create OpenRouter model configured for GPT-4"""
    return OpenRouterModel(
        api_key=api_key,
        model="openai/gpt-4",
        **kwargs
    )

def create_gemini_model(api_key: str, **kwargs) -> OpenRouterModel:
    """Create OpenRouter model configured for Gemini Pro"""
    return OpenRouterModel(
        api_key=api_key,
        model="google/gemini-pro",
        **kwargs
    )

# Popular OpenRouter models
POPULAR_MODELS = {
    "claude-3-sonnet": "anthropic/claude-3-sonnet",
    "claude-3-haiku": "anthropic/claude-3-haiku", 
    "claude-3-opus": "anthropic/claude-3-opus",
    "gpt-4": "openai/gpt-4",
    "gpt-4-turbo": "openai/gpt-4-turbo",
    "gpt-3.5-turbo": "openai/gpt-3.5-turbo",
    "gemini-pro": "google/gemini-pro",
    "gemini-pro-vision": "google/gemini-pro-vision",
    "llama-3-70b": "meta-llama/llama-3-70b-instruct",
    "mixtral-8x7b": "mistralai/mixtral-8x7b-instruct",
    "command-r": "cohere/command-r",
    "command-r-plus": "cohere/command-r-plus"
} 