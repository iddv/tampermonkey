/**
 * Predefined Prompts for Content Evaluation
 * Each prompt is designed for a specific type of analysis
 */

export interface Prompt {
  id: string;
  label: string;
  description: string;
  template: string;
  category: 'analysis' | 'improvement' | 'verification' | 'explanation';
}

export const PROMPTS: Prompt[] = [
  {
    id: 'summarize',
    label: 'Summarize',
    description: 'Create a concise summary of the content',
    category: 'analysis',
    template: `Please provide a clear, concise summary of the following text. Focus on the main points and key takeaways:

{CONTENT}

Summary:`
  },
  
  {
    id: 'analyze',
    label: 'Critical Analysis',
    description: 'Provide detailed critical analysis',
    category: 'analysis',
    template: `Please provide a critical analysis of the following text. Consider strengths, weaknesses, assumptions, and implications:

{CONTENT}

Analysis:`
  },
  
  {
    id: 'explain',
    label: 'Explain Simply',
    description: 'Explain complex concepts in simple terms',
    category: 'explanation',
    template: `Please explain the following text in simple, easy-to-understand terms. Assume the reader is not familiar with technical jargon:

{CONTENT}

Simple explanation:`
  },
  
  {
    id: 'fact-check',
    label: 'Fact Check',
    description: 'Verify claims and check for accuracy',
    category: 'verification',
    template: `Please fact-check the following text. Identify any claims that can be verified, note potential inaccuracies, and highlight areas that need more evidence:

{CONTENT}

Fact-check analysis:`
  },
  
  {
    id: 'improve',
    label: 'Suggest Improvements',
    description: 'Provide suggestions for improvement',
    category: 'improvement',
    template: `Please review the following text and suggest specific improvements. Focus on clarity, structure, accuracy, and effectiveness:

{CONTENT}

Improvement suggestions:`
  }
];

export function getPromptById(id: string): Prompt | undefined {
  return PROMPTS.find(prompt => prompt.id === id);
}

export function getPromptsByCategory(category: Prompt['category']): Prompt[] {
  return PROMPTS.filter(prompt => prompt.category === category);
}

export function formatPrompt(prompt: Prompt, content: string): string {
  return prompt.template.replace('{CONTENT}', content.trim());
}