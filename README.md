# Tampermonkey Scripts Collection

A monorepo containing various Tampermonkey userscripts and browser automation tools.

## 🚀 One-Click Installation

**[Install All Scripts](https://github.com/iddv/tampermonkey/raw/main/dist/tampermonkey-collection.user.js)** ← Click this link!

Or visit our **[Installation Page](https://iddv.github.io/tampermonkey/)** for a better experience.

### Requirements
- [Tampermonkey](https://www.tampermonkey.net/) browser extension

## 📁 Scripts

### [🚀 AWS Role Launcher](./aws-role-launcher/)
Quick access to AWS accounts and roles from anywhere - browser bookmarklet, desktop app, and Tampermonkey script.

**Features:**
- One-click AWS role switching
- Multiple launcher options (bookmarklet, desktop app, browser extension)
- Clean, professional interface
- Support for multiple accounts and roles

**Individual Install**: [aws-role-federation.user.js](https://github.com/iddv/tampermonkey/raw/main/dist/aws-role-federation.user.js)

### [🧠 LLM Judge](./llm-judge/)
A focused Tampermonkey script for evaluating web content using Large Language Models (OpenAI GPT, Anthropic Claude).

**Features:**
- Select text on any webpage and evaluate with AI
- Multiple LLM providers (OpenAI, Anthropic)
- Pre-configured prompts for common tasks
- Clean, minimal interface
- Secure API key storage

**Individual Install**: [llm-judge.user.js](https://github.com/iddv/tampermonkey/raw/main/dist/llm-judge.user.js)

### [📎 Personal Web Clipper & Organizer](./personal-web-clipper/)
A powerful Tampermonkey script for clipping web articles and content to local Markdown files using the modern File System Access API.

**Features:**
- Smart article extraction from any webpage
- Clean HTML to Markdown conversion with proper formatting
- Local file storage (no cloud dependencies)
- File System Access API with download fallback
- Text selection clipping with context preservation
- Privacy-focused local-first approach

**Individual Install**: [personal-web-clipper.user.js](https://github.com/iddv/tampermonkey/raw/main/dist/personal-web-clipper.user.js)

### [🎥 YouTube Clean Player](./youtube-clean-player/)
A performant userscript that enhances your YouTube viewing experience with configurable distraction removal and smart Shorts handling.

**Features:**
- **Configurable Shorts redirect**: Auto-redirect with manual override option
- **Professional settings UI**: Toggle switches integrated into YouTube's menu
- **Manual "View as Video" button**: Convert Shorts when auto-redirect is disabled
- **Keyboard shortcuts**: Shift+V for quick Short conversion
- **Content cleaning**: Hide end-screen suggestions, Shorts from feeds
- **SPA navigation**: Efficient handling of YouTube's single-page architecture

**Individual Install**: [youtube-clean-player.user.js](https://github.com/iddv/tampermonkey/raw/main/dist/youtube-clean-player.user.js)

---

## 🛠️ Development

Each script is contained in its own directory with:
- `README.md` - Specific documentation and setup instructions
- Source files and assets
- Configuration examples
- Build scripts (where applicable)

## 📋 Adding New Scripts

1. Create a new directory: `mkdir script-name`
2. Add a `README.md` with setup instructions
3. Include the userscript file(s)
4. Update this main README with a link

## 🔗 Quick Links

- [Tampermonkey Extension](https://www.tampermonkey.net/)
- [Userscript Documentation](https://www.tampermonkey.net/documentation.php)
- [Greasemonkey API](https://wiki.greasespot.net/Greasemonkey_Manual:API)

## 📄 License

MIT License - see individual script directories for specific licensing information.