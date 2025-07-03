# 🧠 LLM Judge - Tampermonkey Script

A clean, focused Tampermonkey userscript for evaluating web content using Large Language Models (OpenAI GPT, Anthropic Claude).

## Philosophy

**Less features that do something very well, is better than many features that are average.**

This script focuses on one core task: **Select text on any webpage → Evaluate with LLM → Get instant feedback**.

## ✨ Features

- **One-click evaluation**: Select text, right-click, evaluate
- **Multiple LLM providers**: OpenAI GPT-4, Claude 3.5 Sonnet
- **Customizable prompts**: Pre-configured prompts for common tasks
- **Clean UI**: Minimal, non-intrusive interface
- **Secure storage**: API keys stored safely in Tampermonkey
- **Cross-site compatible**: Works on any website

## 🚀 Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) browser extension
2. Click [Install Script](./llm-judge.user.js) (or copy the script content)
3. Configure your API keys on first use

## 🔧 Configuration

On first use, you'll be prompted to configure:

- **OpenAI API Key** (for GPT models)
- **Anthropic API Key** (for Claude models)
- **Default provider** and model

## 📋 Usage

1. **Select text** on any webpage
2. **Right-click** and choose "Evaluate with LLM Judge"
3. **Choose a prompt** from the context menu
4. **View results** in the popup panel

### Available Prompts

- **Summarize**: Create a concise summary
- **Analyze**: Provide critical analysis
- **Explain**: Explain complex concepts simply
- **Fact-check**: Verify claims and accuracy
- **Improve**: Suggest improvements

## 🛠️ Development

Built with modern TypeScript and Vite:

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build for production
npm run build
```

## 🔒 Privacy & Security

- API keys stored locally in Tampermonkey's secure storage
- No data sent to third parties (only to chosen LLM provider)
- Content evaluation happens directly with LLM APIs
- No tracking or analytics

## 📄 License

MIT License - see [LICENSE](../../LICENSE) file for details.