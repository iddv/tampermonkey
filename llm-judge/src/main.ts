/**
 * LLM Judge - Tampermonkey Script
 * A focused tool for evaluating web content using Large Language Models
 */

import { ConfigManager } from './config';
import { UIManager } from './ui';
import { LLMEvaluator } from './evaluator';
import { PROMPTS } from './prompts';
import './styles.css';

class LLMJudge {
  private config: ConfigManager;
  private ui: UIManager;
  private evaluator: LLMEvaluator;

  constructor() {
    this.config = new ConfigManager();
    this.ui = new UIManager();
    this.evaluator = new LLMEvaluator(this.config);
  }

  async initialize(): Promise<void> {
    try {
      // Load configuration
      await this.config.initialize();
      
      // Check if API keys are configured
      const hasKeys = await this.config.hasValidApiKeys();
      if (!hasKeys) {
        await this.showFirstTimeSetup();
      }

      // Register menu commands for each prompt
      this.registerMenuCommands();
      
      console.log('LLM Judge initialized successfully');
    } catch (error) {
      console.error('Failed to initialize LLM Judge:', error);
      this.ui.showError('Failed to initialize LLM Judge. Please refresh the page.');
    }
  }

  private async showFirstTimeSetup(): Promise<void> {
    const setup = await this.ui.showSetupDialog();
    if (setup) {
      await this.config.saveApiKeys(setup.openaiKey, setup.anthropicKey);
      await this.config.setDefaultProvider(setup.defaultProvider);
    }
  }

  private registerMenuCommands(): void {
    // Register a menu command for each prompt
    PROMPTS.forEach(prompt => {
      GM_registerMenuCommand(`📝 ${prompt.label}`, () => {
        this.handleEvaluation(prompt.id);
      });
    });

    // Add settings command
    GM_registerMenuCommand('⚙️ Settings', () => {
      this.showSettings();
    });
  }

  private async handleEvaluation(promptId: string): Promise<void> {
    try {
      // Get selected text
      const selectedText = window.getSelection()?.toString().trim();
      if (!selectedText) {
        this.ui.showError('Please select some text to evaluate.');
        return;
      }

      // Find the prompt
      const prompt = PROMPTS.find(p => p.id === promptId);
      if (!prompt) {
        this.ui.showError('Prompt not found.');
        return;
      }

      // Show loading state
      this.ui.showLoading(`Evaluating with ${prompt.label}...`);

      // Perform evaluation
      const result = await this.evaluator.evaluate(selectedText, prompt);

      // Show result
      this.ui.showResult({
        prompt: prompt.label,
        originalText: selectedText,
        result: result,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Evaluation failed:', error);
      this.ui.showError(`Evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async showSettings(): Promise<void> {
    const currentSettings = await this.config.getSettings();
    const newSettings = await this.ui.showSettingsDialog(currentSettings);
    
    if (newSettings) {
      await this.config.updateSettings(newSettings);
      this.ui.showSuccess('Settings updated successfully!');
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeLLMJudge);
} else {
  initializeLLMJudge();
}

async function initializeLLMJudge(): Promise<void> {
  const llmJudge = new LLMJudge();
  await llmJudge.initialize();
}