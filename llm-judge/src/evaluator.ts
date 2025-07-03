/**
 * LLM Evaluator
 * Handles communication with OpenAI and Anthropic APIs
 */

import { ConfigManager } from './config';
import { Prompt, formatPrompt } from './prompts';

export interface EvaluationResult {
  content: string;
  provider: 'openai' | 'anthropic';
  model: string;
  tokensUsed?: number;
  cost?: number;
}

export class LLMEvaluator {
  constructor(private config: ConfigManager) {}

  async evaluate(content: string, prompt: Prompt): Promise<string> {
    const settings = this.config.getSettings();
    const provider = settings.defaultProvider;
    const apiKey = this.config.getApiKey(provider);

    if (!apiKey) {
      throw new Error(`No API key configured for ${provider}`);
    }

    const formattedPrompt = formatPrompt(prompt, content);

    if (provider === 'openai') {
      return this.evaluateWithOpenAI(formattedPrompt, apiKey);
    } else {
      return this.evaluateWithAnthropic(formattedPrompt, apiKey);
    }
  }

  private async evaluateWithOpenAI(prompt: string, apiKey: string): Promise<string> {
    const settings = this.config.getSettings();
    const model = this.config.getDefaultModel('openai');

    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'POST',
        url: 'https://api.openai.com/v1/chat/completions',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        data: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: settings.maxTokens,
          temperature: settings.temperature
        }),
        onload: (response) => {
          try {
            if (response.status !== 200) {
              const errorData = JSON.parse(response.responseText);
              reject(new Error(errorData.error?.message || `OpenAI API error: ${response.status}`));
              return;
            }

            const data = JSON.parse(response.responseText);
            const result = data.choices?.[0]?.message?.content;
            
            if (!result) {
              reject(new Error('No response from OpenAI'));
              return;
            }

            resolve(result.trim());
          } catch (error) {
            reject(new Error(`Failed to parse OpenAI response: ${error}`));
          }
        },
        onerror: () => {
          reject(new Error('Network error while contacting OpenAI'));
        },
        ontimeout: () => {
          reject(new Error('Request to OpenAI timed out'));
        },
        timeout: 30000
      });
    });
  }

  private async evaluateWithAnthropic(prompt: string, apiKey: string): Promise<string> {
    const settings = this.config.getSettings();
    const model = this.config.getDefaultModel('anthropic');

    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'POST',
        url: 'https://api.anthropic.com/v1/messages',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        data: JSON.stringify({
          model: model,
          max_tokens: settings.maxTokens,
          temperature: settings.temperature,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        }),
        onload: (response) => {
          try {
            if (response.status !== 200) {
              const errorData = JSON.parse(response.responseText);
              reject(new Error(errorData.error?.message || `Anthropic API error: ${response.status}`));
              return;
            }

            const data = JSON.parse(response.responseText);
            const result = data.content?.[0]?.text;
            
            if (!result) {
              reject(new Error('No response from Anthropic'));
              return;
            }

            resolve(result.trim());
          } catch (error) {
            reject(new Error(`Failed to parse Anthropic response: ${error}`));
          }
        },
        onerror: () => {
          reject(new Error('Network error while contacting Anthropic'));
        },
        ontimeout: () => {
          reject(new Error('Request to Anthropic timed out'));
        },
        timeout: 30000
      });
    });
  }
}