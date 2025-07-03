// ==UserScript==
// @name         LLM Judge
// @namespace    https://github.com/your-username/tampermonkey-scripts
// @version      2.0.0
// @author       Your Name
// @description  Evaluate web content using Large Language Models (OpenAI GPT, Anthropic Claude)
// @license      MIT
// @icon         data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzRDQUY1MCIvPgo8cGF0aCBkPSJNOCAxNkMxMiAxNiAxNiAxMiAxNiA4QzE2IDEyIDIwIDE2IDI0IDE2QzIwIDE2IDE2IDIwIDE2IDI0QzE2IDIwIDEyIDE2IDggMTZaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K
// @match        *://*/*
// @connect      api.openai.com
// @connect      api.anthropic.com
// @grant        GM_addStyle
// @grant        GM_deleteValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(t=>{if(typeof GM_addStyle=="function"){GM_addStyle(t);return}const o=document.createElement("style");o.textContent=t,document.head.append(o)})(" .llm-judge-panel *{box-sizing:border-box;margin:0;padding:0}.llm-judge-panel{position:fixed!important;top:20px!important;right:20px!important;width:400px!important;max-width:90vw!important;max-height:80vh!important;background:#fff!important;border:1px solid #ddd!important;border-radius:8px!important;box-shadow:0 4px 20px #00000026!important;z-index:999999!important;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif!important;font-size:14px!important;line-height:1.4!important;overflow:hidden!important}.llm-judge-header{background:#4caf50!important;color:#fff!important;padding:12px 16px!important;display:flex!important;justify-content:space-between!important;align-items:center!important;font-weight:500!important;cursor:move!important;user-select:none!important}.llm-judge-close{background:none!important;border:none!important;color:#fff!important;font-size:18px!important;cursor:pointer!important;padding:0!important;width:24px!important;height:24px!important;display:flex!important;align-items:center!important;justify-content:center!important;border-radius:4px!important;transition:background-color .2s!important}.llm-judge-close:hover{background:#fff3!important}.llm-judge-content{padding:16px!important;max-height:60vh!important;overflow-y:auto!important}.llm-judge-loading{text-align:center!important;padding:20px!important;color:#666!important}.llm-judge-spinner{display:inline-block!important;width:20px!important;height:20px!important;border:3px solid #f3f3f3!important;border-top:3px solid #4CAF50!important;border-radius:50%!important;animation:llm-judge-spin 1s linear infinite!important;margin-right:8px!important}@keyframes llm-judge-spin{0%{transform:rotate(0)}to{transform:rotate(360deg)}}.llm-judge-result{line-height:1.5!important}.llm-judge-meta{background:#f5f5f5!important;padding:8px 12px!important;border-radius:4px!important;margin-bottom:12px!important;font-size:12px!important;color:#666!important}.llm-judge-text{white-space:pre-wrap!important;word-wrap:break-word!important;color:#333!important}.llm-judge-actions{margin-top:12px!important;display:flex!important;gap:8px!important}.llm-judge-btn{background:#4caf50!important;color:#fff!important;border:none!important;padding:8px 12px!important;border-radius:4px!important;cursor:pointer!important;font-size:12px!important;font-weight:500!important;transition:background-color .2s!important}.llm-judge-btn:hover{background:#45a049!important}.llm-judge-btn-secondary{background:#f1f1f1!important;color:#333!important}.llm-judge-btn-secondary:hover{background:#e1e1e1!important}.llm-judge-panel input,.llm-judge-panel select,.llm-judge-panel textarea{width:100%!important;padding:8px!important;border:1px solid #ddd!important;border-radius:4px!important;font-size:14px!important;font-family:inherit!important}.llm-judge-panel label{display:block!important;margin-bottom:4px!important;font-weight:500!important;color:#333!important}@media (max-width: 480px){.llm-judge-panel{width:95vw!important;right:2.5vw!important;left:2.5vw!important}} ");

(function () {
  'use strict';

  const DEFAULT_SETTINGS = {
    defaultProvider: "openai",
    defaultModel: "gpt-4",
    maxTokens: 1e3,
    temperature: 0.7
  };
  const STORAGE_KEYS = {
    OPENAI_API_KEY: "llmjudge_openai_key",
    ANTHROPIC_API_KEY: "llmjudge_anthropic_key",
    SETTINGS: "llmjudge_settings"
  };
  class ConfigManager {
    constructor() {
      this.settings = DEFAULT_SETTINGS;
    }
    async initialize() {
      await this.loadSettings();
    }
    async loadSettings() {
      try {
        const savedSettings = await GM_getValue(STORAGE_KEYS.SETTINGS, "{}");
        const parsed = JSON.parse(savedSettings);
        this.settings = {
          ...DEFAULT_SETTINGS,
          ...parsed
        };
        this.settings.openaiApiKey = await GM_getValue(STORAGE_KEYS.OPENAI_API_KEY, "");
        this.settings.anthropicApiKey = await GM_getValue(STORAGE_KEYS.ANTHROPIC_API_KEY, "");
      } catch (error) {
        console.error("Failed to load settings:", error);
        this.settings = DEFAULT_SETTINGS;
      }
    }
    async saveSettings() {
      try {
        const settingsToSave = { ...this.settings };
        delete settingsToSave.openaiApiKey;
        delete settingsToSave.anthropicApiKey;
        await GM_setValue(STORAGE_KEYS.SETTINGS, JSON.stringify(settingsToSave));
      } catch (error) {
        console.error("Failed to save settings:", error);
        throw new Error("Failed to save settings");
      }
    }
    async saveApiKeys(openaiKey, anthropicKey) {
      try {
        if (openaiKey) {
          await GM_setValue(STORAGE_KEYS.OPENAI_API_KEY, openaiKey);
          this.settings.openaiApiKey = openaiKey;
        }
        if (anthropicKey) {
          await GM_setValue(STORAGE_KEYS.ANTHROPIC_API_KEY, anthropicKey);
          this.settings.anthropicApiKey = anthropicKey;
        }
      } catch (error) {
        console.error("Failed to save API keys:", error);
        throw new Error("Failed to save API keys");
      }
    }
    async setDefaultProvider(provider) {
      this.settings.defaultProvider = provider;
      if (provider === "openai") {
        this.settings.defaultModel = "gpt-4";
      } else {
        this.settings.defaultModel = "claude-3-5-sonnet-20240620";
      }
      await this.saveSettings();
    }
    async updateSettings(newSettings) {
      this.settings = { ...this.settings, ...newSettings };
      await this.saveSettings();
      if (newSettings.openaiApiKey || newSettings.anthropicApiKey) {
        await this.saveApiKeys(newSettings.openaiApiKey, newSettings.anthropicApiKey);
      }
    }
    async hasValidApiKeys() {
      const openaiKey = this.settings.openaiApiKey;
      const anthropicKey = this.settings.anthropicApiKey;
      return !!(openaiKey || anthropicKey);
    }
    getSettings() {
      return { ...this.settings };
    }
    getApiKey(provider) {
      const targetProvider = provider || this.settings.defaultProvider;
      if (targetProvider === "openai") {
        return this.settings.openaiApiKey;
      } else {
        return this.settings.anthropicApiKey;
      }
    }
    getDefaultModel(provider) {
      const targetProvider = provider || this.settings.defaultProvider;
      if (targetProvider === "openai") {
        return this.settings.defaultModel.startsWith("gpt") ? this.settings.defaultModel : "gpt-4";
      } else {
        return this.settings.defaultModel.startsWith("claude") ? this.settings.defaultModel : "claude-3-5-sonnet-20240620";
      }
    }
    async clearAllData() {
      try {
        await GM_deleteValue(STORAGE_KEYS.OPENAI_API_KEY);
        await GM_deleteValue(STORAGE_KEYS.ANTHROPIC_API_KEY);
        await GM_deleteValue(STORAGE_KEYS.SETTINGS);
        this.settings = DEFAULT_SETTINGS;
      } catch (error) {
        console.error("Failed to clear data:", error);
        throw new Error("Failed to clear data");
      }
    }
  }
  class UIManager {
    constructor() {
      this.currentPanel = null;
    }
    showLoading(message) {
      this.closeCurrentPanel();
      const panel = document.createElement("div");
      panel.className = "llm-judge-panel";
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
      const closeBtn = panel.querySelector(".llm-judge-close");
      closeBtn?.addEventListener("click", () => {
        this.closeCurrentPanel();
      });
    }
    showResult(result) {
      this.closeCurrentPanel();
      const panel = document.createElement("div");
      panel.className = "llm-judge-panel";
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
      const copyBtn = panel.querySelector("#llm-judge-copy-btn");
      copyBtn?.addEventListener("click", () => {
        navigator.clipboard.writeText(result.result).then(() => this.showSuccess("Result copied!")).catch(() => this.showError("Failed to copy result."));
      });
      const closeBtn = panel.querySelector("#llm-judge-close-btn");
      closeBtn?.addEventListener("click", () => {
        this.closeCurrentPanel();
      });
      const headerCloseBtn = panel.querySelector(".llm-judge-close");
      headerCloseBtn?.addEventListener("click", () => {
        this.closeCurrentPanel();
      });
    }
    showError(message) {
      this.closeCurrentPanel();
      const panel = document.createElement("div");
      panel.className = "llm-judge-panel";
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
      const closeBtn = panel.querySelector("#llm-judge-error-close");
      closeBtn?.addEventListener("click", () => {
        this.closeCurrentPanel();
      });
      const headerCloseBtn = panel.querySelector(".llm-judge-close");
      headerCloseBtn?.addEventListener("click", () => {
        this.closeCurrentPanel();
      });
    }
    showSuccess(message) {
      const notification = document.createElement("div");
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
      }, 3e3);
    }
    async showSetupDialog() {
      return new Promise((resolve) => {
        const dialog = document.createElement("div");
        dialog.className = "llm-judge-panel";
        dialog.style.width = "450px";
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
        const saveBtn = dialog.querySelector("#save-setup");
        const skipBtn = dialog.querySelector("#skip-setup");
        const openaiInput = dialog.querySelector("#openai-key");
        const anthropicInput = dialog.querySelector("#anthropic-key");
        const providerSelect = dialog.querySelector("#default-provider");
        saveBtn.onclick = () => {
          const openaiKey = openaiInput.value.trim();
          const anthropicKey = anthropicInput.value.trim();
          if (!openaiKey && !anthropicKey) {
            this.showError("Please provide at least one API key.");
            return;
          }
          dialog.remove();
          resolve({
            openaiKey: openaiKey || void 0,
            anthropicKey: anthropicKey || void 0,
            defaultProvider: providerSelect.value
          });
        };
        skipBtn.onclick = () => {
          dialog.remove();
          resolve(null);
        };
      });
    }
    async showSettingsDialog(currentSettings) {
      return new Promise((resolve) => {
        const dialog = document.createElement("div");
        dialog.className = "llm-judge-panel";
        dialog.style.width = "450px";
        dialog.innerHTML = `
        <div class="llm-judge-header">
          <span>LLM Judge - Settings</span>
          <button class="llm-judge-close">×</button>
        </div>
        <div class="llm-judge-content">
          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 4px; font-weight: 500;">OpenAI API Key</label>
            <input type="password" id="openai-key" value="${this.escapeHtml(currentSettings.openaiApiKey || "")}" placeholder="sk-..." style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
          </div>
          
          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 4px; font-weight: 500;">Anthropic API Key</label>
            <input type="password" id="anthropic-key" value="${this.escapeHtml(currentSettings.anthropicApiKey || "")}" placeholder="sk-ant-..." style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
          </div>
          
          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 4px; font-weight: 500;">Default Provider</label>
            <select id="default-provider" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
              <option value="openai" ${currentSettings.defaultProvider === "openai" ? "selected" : ""}>OpenAI (GPT)</option>
              <option value="anthropic" ${currentSettings.defaultProvider === "anthropic" ? "selected" : ""}>Anthropic (Claude)</option>
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
        const saveBtn = dialog.querySelector("#save-settings");
        const cancelBtn = dialog.querySelector("#cancel-settings");
        const headerCloseBtn = dialog.querySelector(".llm-judge-close");
        saveBtn.onclick = () => {
          const openaiKey = dialog.querySelector("#openai-key").value.trim();
          const anthropicKey = dialog.querySelector("#anthropic-key").value.trim();
          const defaultProvider = dialog.querySelector("#default-provider").value;
          const maxTokens = parseInt(dialog.querySelector("#max-tokens").value);
          const temperature = parseFloat(dialog.querySelector("#temperature").value);
          dialog.remove();
          resolve({
            openaiApiKey: openaiKey || void 0,
            anthropicApiKey: anthropicKey || void 0,
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
    closeCurrentPanel() {
      if (this.currentPanel) {
        this.currentPanel.remove();
        this.currentPanel = null;
      }
    }
    escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
  }
  const PROMPTS = [
    {
      id: "summarize",
      label: "Summarize",
      description: "Create a concise summary of the content",
      category: "analysis",
      template: `Please provide a clear, concise summary of the following text. Focus on the main points and key takeaways:

{CONTENT}

Summary:`
    },
    {
      id: "analyze",
      label: "Critical Analysis",
      description: "Provide detailed critical analysis",
      category: "analysis",
      template: `Please provide a critical analysis of the following text. Consider strengths, weaknesses, assumptions, and implications:

{CONTENT}

Analysis:`
    },
    {
      id: "explain",
      label: "Explain Simply",
      description: "Explain complex concepts in simple terms",
      category: "explanation",
      template: `Please explain the following text in simple, easy-to-understand terms. Assume the reader is not familiar with technical jargon:

{CONTENT}

Simple explanation:`
    },
    {
      id: "fact-check",
      label: "Fact Check",
      description: "Verify claims and check for accuracy",
      category: "verification",
      template: `Please fact-check the following text. Identify any claims that can be verified, note potential inaccuracies, and highlight areas that need more evidence:

{CONTENT}

Fact-check analysis:`
    },
    {
      id: "improve",
      label: "Suggest Improvements",
      description: "Provide suggestions for improvement",
      category: "improvement",
      template: `Please review the following text and suggest specific improvements. Focus on clarity, structure, accuracy, and effectiveness:

{CONTENT}

Improvement suggestions:`
    }
  ];
  function formatPrompt(prompt, content) {
    return prompt.template.replace("{CONTENT}", content.trim());
  }
  class LLMEvaluator {
    constructor(config) {
      this.config = config;
    }
    async evaluate(content, prompt) {
      const settings = this.config.getSettings();
      const provider = settings.defaultProvider;
      const apiKey = this.config.getApiKey(provider);
      if (!apiKey) {
        throw new Error(`No API key configured for ${provider}`);
      }
      const formattedPrompt = formatPrompt(prompt, content);
      if (provider === "openai") {
        return this.evaluateWithOpenAI(formattedPrompt, apiKey);
      } else {
        return this.evaluateWithAnthropic(formattedPrompt, apiKey);
      }
    }
    async evaluateWithOpenAI(prompt, apiKey) {
      const settings = this.config.getSettings();
      const model = this.config.getDefaultModel("openai");
      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: "POST",
          url: "https://api.openai.com/v1/chat/completions",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          data: JSON.stringify({
            model,
            messages: [
              {
                role: "user",
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
                reject(new Error("No response from OpenAI"));
                return;
              }
              resolve(result.trim());
            } catch (error) {
              reject(new Error(`Failed to parse OpenAI response: ${error}`));
            }
          },
          onerror: () => {
            reject(new Error("Network error while contacting OpenAI"));
          },
          ontimeout: () => {
            reject(new Error("Request to OpenAI timed out"));
          },
          timeout: 3e4
        });
      });
    }
    async evaluateWithAnthropic(prompt, apiKey) {
      const settings = this.config.getSettings();
      const model = this.config.getDefaultModel("anthropic");
      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: "POST",
          url: "https://api.anthropic.com/v1/messages",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01"
          },
          data: JSON.stringify({
            model,
            max_tokens: settings.maxTokens,
            temperature: settings.temperature,
            messages: [
              {
                role: "user",
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
                reject(new Error("No response from Anthropic"));
                return;
              }
              resolve(result.trim());
            } catch (error) {
              reject(new Error(`Failed to parse Anthropic response: ${error}`));
            }
          },
          onerror: () => {
            reject(new Error("Network error while contacting Anthropic"));
          },
          ontimeout: () => {
            reject(new Error("Request to Anthropic timed out"));
          },
          timeout: 3e4
        });
      });
    }
  }
  class LLMJudge {
    constructor() {
      this.config = new ConfigManager();
      this.ui = new UIManager();
      this.evaluator = new LLMEvaluator(this.config);
    }
    async initialize() {
      try {
        await this.config.initialize();
        const hasKeys = await this.config.hasValidApiKeys();
        if (!hasKeys) {
          await this.showFirstTimeSetup();
        }
        this.registerMenuCommands();
        console.log("LLM Judge initialized successfully");
      } catch (error) {
        console.error("Failed to initialize LLM Judge:", error);
        this.ui.showError("Failed to initialize LLM Judge. Please refresh the page.");
      }
    }
    async showFirstTimeSetup() {
      const setup = await this.ui.showSetupDialog();
      if (setup) {
        await this.config.saveApiKeys(setup.openaiKey, setup.anthropicKey);
        await this.config.setDefaultProvider(setup.defaultProvider);
      }
    }
    registerMenuCommands() {
      PROMPTS.forEach((prompt) => {
        GM_registerMenuCommand(`📝 ${prompt.label}`, () => {
          this.handleEvaluation(prompt.id);
        });
      });
      GM_registerMenuCommand("⚙️ Settings", () => {
        this.showSettings();
      });
    }
    async handleEvaluation(promptId) {
      try {
        const selectedText = window.getSelection()?.toString().trim();
        if (!selectedText) {
          this.ui.showError("Please select some text to evaluate.");
          return;
        }
        const prompt = PROMPTS.find((p) => p.id === promptId);
        if (!prompt) {
          this.ui.showError("Prompt not found.");
          return;
        }
        this.ui.showLoading(`Evaluating with ${prompt.label}...`);
        const result = await this.evaluator.evaluate(selectedText, prompt);
        this.ui.showResult({
          prompt: prompt.label,
          originalText: selectedText,
          result,
          timestamp: /* @__PURE__ */ new Date()
        });
      } catch (error) {
        console.error("Evaluation failed:", error);
        this.ui.showError(`Evaluation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
    async showSettings() {
      const currentSettings = await this.config.getSettings();
      const newSettings = await this.ui.showSettingsDialog(currentSettings);
      if (newSettings) {
        await this.config.updateSettings(newSettings);
        this.ui.showSuccess("Settings updated successfully!");
      }
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeLLMJudge);
  } else {
    initializeLLMJudge();
  }
  async function initializeLLMJudge() {
    const llmJudge = new LLMJudge();
    await llmJudge.initialize();
  }

})();