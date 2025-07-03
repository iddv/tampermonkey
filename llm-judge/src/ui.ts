/**
 * UI Manager
 * Handles all user interface interactions and dialogs
 */

import { Settings, ApiKeys } from './config';

export interface EvaluationResult {
  prompt: string;
  originalText: string;
  result: string;
  timestamp: Date;
}

export class UIManager {
  private currentPanel: HTMLElement | null = null;

  constructor() {
    // Styles are handled by the imported CSS file in main.ts
  }

  showLoading(message: string): void {
    this.closeCurrentPanel();

    const panel = document.createElement('div');
    panel.className = 'llm-judge-panel';
    panel.innerHTML = `
      <div class="llm-judge-header">
        <span>LLM Judge</span>
        <button class="llm-judge-close">×</button>
      </div>
      <div class="llm-judge-content">
        <div class="llm-judge-loading">
          <div class="llm-judge-spinner"></div>
          ${message}
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    this.currentPanel = panel;

    // Add event listener for close button
    const closeBtn = panel.querySelector('.llm-judge-close');
    closeBtn?.addEventListener('click', () => {
      this.closeCurrentPanel();
    });
  }

  showResult(result: EvaluationResult): void {
    this.closeCurrentPanel();

    const panel = document.createElement('div');
    panel.className = 'llm-judge-panel';
    panel.innerHTML = `
      <div class="llm-judge-header">
        <span>LLM Judge - ${this.escapeHtml(result.prompt)}</span>
        <button class="llm-judge-close">×</button>
      </div>
      <div class="llm-judge-content">
        <div class="llm-judge-result">
          <div class="llm-judge-meta">
            Evaluated at ${result.timestamp.toLocaleTimeString()}
          </div>
          <div class="llm-judge-text">${this.escapeHtml(result.result)}</div>
          <div class="llm-judge-actions">
            <button class="llm-judge-btn" id="llm-judge-copy-btn">
              Copy Result
            </button>
            <button class="llm-judge-btn llm-judge-btn-secondary" id="llm-judge-close-btn">
              Close
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    this.currentPanel = panel;

    // Add event listeners securely
    const copyBtn = panel.querySelector('#llm-judge-copy-btn');
    copyBtn?.addEventListener('click', () => {
      navigator.clipboard.writeText(result.result)
        .then(() => this.showSuccess('Result copied!'))
        .catch(() => this.showError('Failed to copy result.'));
    });

    const closeBtn = panel.querySelector('#llm-judge-close-btn');
    closeBtn?.addEventListener('click', () => {
      this.closeCurrentPanel();
    });

    const headerCloseBtn = panel.querySelector('.llm-judge-close');
    headerCloseBtn?.addEventListener('click', () => {
      this.closeCurrentPanel();
    });
  }

  showError(message: string): void {
    this.closeCurrentPanel();

    const panel = document.createElement('div');
    panel.className = 'llm-judge-panel';
    panel.innerHTML = `
      <div class="llm-judge-header" style="background: #f44336;">
        <span>LLM Judge - Error</span>
        <button class="llm-judge-close">×</button>
      </div>
      <div class="llm-judge-content">
        <div style="color: #d32f2f; padding: 8px 0;">
          ${this.escapeHtml(message)}
        </div>
        <div class="llm-judge-actions">
          <button class="llm-judge-btn llm-judge-btn-secondary" id="llm-judge-error-close">
            Close
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    this.currentPanel = panel;

    // Add event listeners
    const closeBtn = panel.querySelector('#llm-judge-error-close');
    closeBtn?.addEventListener('click', () => {
      this.closeCurrentPanel();
    });

    const headerCloseBtn = panel.querySelector('.llm-judge-close');
    headerCloseBtn?.addEventListener('click', () => {
      this.closeCurrentPanel();
    });
  }  showSuccess(message: string): void {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 12px 16px;
      border-radius: 4px;
      z-index: 1000000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  async showSetupDialog(): Promise<ApiKeys | null> {
    return new Promise((resolve) => {
      const dialog = document.createElement('div');
      dialog.className = 'llm-judge-panel';
      dialog.style.width = '450px';
      dialog.innerHTML = `
        <div class="llm-judge-header">
          <span>LLM Judge - First Time Setup</span>
        </div>
        <div class="llm-judge-content">
          <p style="margin-bottom: 16px; color: #666;">
            Welcome to LLM Judge! Please configure your API keys to get started.
          </p>
          
          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 4px; font-weight: 500;">OpenAI API Key (optional)</label>
            <input type="password" id="openai-key" placeholder="sk-..." style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
          </div>
          
          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 4px; font-weight: 500;">Anthropic API Key (optional)</label>
            <input type="password" id="anthropic-key" placeholder="sk-ant-..." style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
          </div>
          
          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 4px; font-weight: 500;">Default Provider</label>
            <select id="default-provider" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
              <option value="openai">OpenAI (GPT)</option>
              <option value="anthropic">Anthropic (Claude)</option>
            </select>
          </div>
          
          <div class="llm-judge-actions">
            <button class="llm-judge-btn" id="save-setup">Save & Continue</button>
            <button class="llm-judge-btn llm-judge-btn-secondary" id="skip-setup">Skip for Now</button>
          </div>
        </div>
      `;

      document.body.appendChild(dialog);

      const saveBtn = dialog.querySelector('#save-setup') as HTMLButtonElement;
      const skipBtn = dialog.querySelector('#skip-setup') as HTMLButtonElement;
      const openaiInput = dialog.querySelector('#openai-key') as HTMLInputElement;
      const anthropicInput = dialog.querySelector('#anthropic-key') as HTMLInputElement;
      const providerSelect = dialog.querySelector('#default-provider') as HTMLSelectElement;

      saveBtn.onclick = () => {
        const openaiKey = openaiInput.value.trim();
        const anthropicKey = anthropicInput.value.trim();
        
        if (!openaiKey && !anthropicKey) {
          this.showError('Please provide at least one API key.');
          return;
        }
        
        dialog.remove();
        resolve({
          openaiKey: openaiKey || undefined,
          anthropicKey: anthropicKey || undefined,
          defaultProvider: providerSelect.value as 'openai' | 'anthropic'
        });
      };

      skipBtn.onclick = () => {
        dialog.remove();
        resolve(null);
      };
    });
  }  async showSettingsDialog(currentSettings: Settings): Promise<Partial<Settings> | null> {
    return new Promise((resolve) => {
      const dialog = document.createElement('div');
      dialog.className = 'llm-judge-panel';
      dialog.style.width = '450px';
      dialog.innerHTML = `
        <div class="llm-judge-header">
          <span>LLM Judge - Settings</span>
          <button class="llm-judge-close">×</button>
        </div>
        <div class="llm-judge-content">
          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 4px; font-weight: 500;">OpenAI API Key</label>
            <input type="password" id="openai-key" value="${this.escapeHtml(currentSettings.openaiApiKey || '')}" placeholder="sk-..." style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
          </div>
          
          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 4px; font-weight: 500;">Anthropic API Key</label>
            <input type="password" id="anthropic-key" value="${this.escapeHtml(currentSettings.anthropicApiKey || '')}" placeholder="sk-ant-..." style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
          </div>
          
          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 4px; font-weight: 500;">Default Provider</label>
            <select id="default-provider" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
              <option value="openai" ${currentSettings.defaultProvider === 'openai' ? 'selected' : ''}>OpenAI (GPT)</option>
              <option value="anthropic" ${currentSettings.defaultProvider === 'anthropic' ? 'selected' : ''}>Anthropic (Claude)</option>
            </select>
          </div>
          
          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 4px; font-weight: 500;">Max Tokens</label>
            <input type="number" id="max-tokens" value="${this.escapeHtml(String(currentSettings.maxTokens))}" min="100" max="4000" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
          </div>
          
          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 4px; font-weight: 500;">Temperature (0-1)</label>
            <input type="number" id="temperature" value="${this.escapeHtml(String(currentSettings.temperature))}" min="0" max="1" step="0.1" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
          </div>
          
          <div class="llm-judge-actions">
            <button class="llm-judge-btn" id="save-settings">Save Settings</button>
            <button class="llm-judge-btn llm-judge-btn-secondary" id="cancel-settings">Cancel</button>
          </div>
        </div>
      `;

      document.body.appendChild(dialog);

      const saveBtn = dialog.querySelector('#save-settings') as HTMLButtonElement;
      const cancelBtn = dialog.querySelector('#cancel-settings') as HTMLButtonElement;
      const headerCloseBtn = dialog.querySelector('.llm-judge-close') as HTMLButtonElement;

      saveBtn.onclick = () => {
        const openaiKey = (dialog.querySelector('#openai-key') as HTMLInputElement).value.trim();
        const anthropicKey = (dialog.querySelector('#anthropic-key') as HTMLInputElement).value.trim();
        const defaultProvider = (dialog.querySelector('#default-provider') as HTMLSelectElement).value as 'openai' | 'anthropic';
        const maxTokens = parseInt((dialog.querySelector('#max-tokens') as HTMLInputElement).value);
        const temperature = parseFloat((dialog.querySelector('#temperature') as HTMLInputElement).value);
        
        dialog.remove();
        resolve({
          openaiApiKey: openaiKey || undefined,
          anthropicApiKey: anthropicKey || undefined,
          defaultProvider,
          maxTokens,
          temperature
        });
      };

      cancelBtn.onclick = () => {
        dialog.remove();
        resolve(null);
      };

      headerCloseBtn.onclick = () => {
        dialog.remove();
        resolve(null);
      };
    });
  }

  private closeCurrentPanel(): void {
    if (this.currentPanel) {
      this.currentPanel.remove();
      this.currentPanel = null;
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }


}