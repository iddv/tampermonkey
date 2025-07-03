/**
 * Configuration Management
 * Handles API keys, settings, and user preferences
 */

export interface Settings {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  defaultProvider: 'openai' | 'anthropic';
  defaultModel: string;
  maxTokens: number;
  temperature: number;
}

export interface ApiKeys {
  openaiKey?: string;
  anthropicKey?: string;
  defaultProvider: 'openai' | 'anthropic';
}

const DEFAULT_SETTINGS: Settings = {
  defaultProvider: 'openai',
  defaultModel: 'gpt-4',
  maxTokens: 1000,
  temperature: 0.7
};

const STORAGE_KEYS = {
  OPENAI_API_KEY: 'llmjudge_openai_key',
  ANTHROPIC_API_KEY: 'llmjudge_anthropic_key',
  SETTINGS: 'llmjudge_settings'
} as const;

export class ConfigManager {
  private settings: Settings = DEFAULT_SETTINGS;

  async initialize(): Promise<void> {
    await this.loadSettings();
  }

  async loadSettings(): Promise<void> {
    try {
      const savedSettings = await GM_getValue(STORAGE_KEYS.SETTINGS, '{}');
      const parsed = JSON.parse(savedSettings) as Partial<Settings>;
      
      this.settings = {
        ...DEFAULT_SETTINGS,
        ...parsed
      };

      // Load API keys separately for security
      this.settings.openaiApiKey = await GM_getValue(STORAGE_KEYS.OPENAI_API_KEY, '');
      this.settings.anthropicApiKey = await GM_getValue(STORAGE_KEYS.ANTHROPIC_API_KEY, '');
      
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.settings = DEFAULT_SETTINGS;
    }
  }

  async saveSettings(): Promise<void> {
    try {
      // Save settings (excluding API keys)
      const settingsToSave = { ...this.settings };
      delete settingsToSave.openaiApiKey;
      delete settingsToSave.anthropicApiKey;
      
      await GM_setValue(STORAGE_KEYS.SETTINGS, JSON.stringify(settingsToSave));
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw new Error('Failed to save settings');
    }
  }

  async saveApiKeys(openaiKey?: string, anthropicKey?: string): Promise<void> {
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
      console.error('Failed to save API keys:', error);
      throw new Error('Failed to save API keys');
    }
  }

  async setDefaultProvider(provider: 'openai' | 'anthropic'): Promise<void> {
    this.settings.defaultProvider = provider;
    
    // Update default model based on provider
    if (provider === 'openai') {
      this.settings.defaultModel = 'gpt-4';
    } else {
      this.settings.defaultModel = 'claude-3-5-sonnet-20240620';
    }
    
    await this.saveSettings();
  }

  async updateSettings(newSettings: Partial<Settings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    await this.saveSettings();
    
    // Save API keys separately if provided
    if (newSettings.openaiApiKey || newSettings.anthropicApiKey) {
      await this.saveApiKeys(newSettings.openaiApiKey, newSettings.anthropicApiKey);
    }
  }  async hasValidApiKeys(): Promise<boolean> {
    const openaiKey = this.settings.openaiApiKey;
    const anthropicKey = this.settings.anthropicApiKey;
    
    return !!(openaiKey || anthropicKey);
  }

  getSettings(): Settings {
    return { ...this.settings };
  }

  getApiKey(provider?: 'openai' | 'anthropic'): string | undefined {
    const targetProvider = provider || this.settings.defaultProvider;
    
    if (targetProvider === 'openai') {
      return this.settings.openaiApiKey;
    } else {
      return this.settings.anthropicApiKey;
    }
  }

  getDefaultModel(provider?: 'openai' | 'anthropic'): string {
    const targetProvider = provider || this.settings.defaultProvider;
    
    if (targetProvider === 'openai') {
      return this.settings.defaultModel.startsWith('gpt') ? this.settings.defaultModel : 'gpt-4';
    } else {
      return this.settings.defaultModel.startsWith('claude') ? this.settings.defaultModel : 'claude-3-5-sonnet-20240620';
    }
  }

  async clearAllData(): Promise<void> {
    try {
      await GM_deleteValue(STORAGE_KEYS.OPENAI_API_KEY);
      await GM_deleteValue(STORAGE_KEYS.ANTHROPIC_API_KEY);
      await GM_deleteValue(STORAGE_KEYS.SETTINGS);
      
      this.settings = DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Failed to clear data:', error);
      throw new Error('Failed to clear data');
    }
  }
}