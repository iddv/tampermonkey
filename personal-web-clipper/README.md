# Personal Web Clipper & Organizer

A powerful Tampermonkey userscript that enables you to clip articles and web content directly to local Markdown files using the modern File System Access API. Take control of your digital content and build your personal knowledge base without platform lock-in.

## 🚀 Features

### Core Functionality
- **🎯 Smart Article Extraction**: Automatically identifies and extracts the main article content from web pages
- **📝 Clean Markdown Conversion**: Converts HTML content to well-formatted Markdown with proper headings, links, and formatting
- **💾 Local File Storage**: Save directly to your local file system (no cloud dependencies)
- **✂️ Text Selection Clipping**: Save highlighted text with context and source information
- **🌐 Full Page Backup**: Complete page archival for important content

### Modern Web Technology
- **🔧 File System Access API**: Direct file system integration in supported browsers (Chrome, Edge, Opera)
- **⬇️ Automatic Fallback**: Downloads folder fallback for unsupported browsers
- **⌨️ Keyboard Shortcuts**: Quick access with `Ctrl/Cmd + Shift + C` and `Ctrl/Cmd + Shift + S`
- **🎨 Clean UI**: Unobtrusive, modern interface that stays out of your way

### Privacy & Control
- **🔒 Local-First**: All processing happens locally, no data sent to external servers
- **📂 Your Files**: Save to any location on your computer, in standard Markdown format
- **🚫 No Lock-In**: Standard Markdown files work with any text editor or note-taking app
- **📊 Usage Tracking**: Local statistics only (never shared)

## 📦 Installation

### Prerequisites
- **Tampermonkey browser extension** ([Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo), [Firefox](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/), [Edge](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd))
- **Modern browser** with File System Access API support (recommended: Chrome 86+, Edge 86+, Opera 72+)

### Install the Script

1. **One-Click Installation**: [Install Personal Web Clipper](../dist/personal-web-clipper.user.js)
2. **Manual Installation**: Copy the script content from [`dist/personal-web-clipper.user.js`](../dist/personal-web-clipper.user.js) and paste into Tampermonkey

### Development Setup

If you want to build from source:

```bash
cd personal-web-clipper
npm install
npm run build
```

## 🎯 Usage

### Clipping Articles

1. **Navigate** to any article or blog post
2. **Click** the 📎 clipper icon in the top-right corner
3. **Select** "📄 Clip Article" to extract the main content
4. **Choose** where to save the Markdown file
5. **Done!** Your article is saved as a clean Markdown file

### Saving Text Selections

1. **Select** any text on a webpage
2. **Use** keyboard shortcut `Ctrl/Cmd + Shift + S` or click "✂️ Save Selection"
3. **Save** the highlighted text with context and source information

### Keyboard Shortcuts

- `Ctrl/Cmd + Shift + C`: Clip current article
- `Ctrl/Cmd + Shift + S`: Save selected text

## 🔧 Browser Compatibility

| Browser | File System Access API | Fallback Download |
|---------|------------------------|-------------------|
| Chrome 86+ | ✅ Full Support | ✅ |
| Edge 86+ | ✅ Full Support | ✅ |
| Opera 72+ | ✅ Full Support | ✅ |
| Firefox | ❌ Not Supported | ✅ |
| Safari | ❌ Not Supported | ✅ |

**Note**: Browsers without File System Access API support will automatically use the download fallback, saving files to your Downloads folder.

## 📝 Output Format

The script generates clean Markdown files with metadata:

```markdown
---
title: "Article Title"
url: "https://example.com/article"
clipped: "2025-01-01T12:00:00.000Z"
source: "Personal Web Clipper"
---

# Article Title

Article content with proper formatting...

---

**Source:** [https://example.com/article](https://example.com/article)  
**Clipped:** 1/1/2025, 12:00:00 PM
```

## 🎨 Configuration

Access settings through:
- Click the **⚙️ Web Clipper Settings** in the Tampermonkey menu
- View usage statistics and browser compatibility information

## 🔍 How It Works

1. **Article Detection**: Uses heuristics to identify article content (similar to Reader Mode)
2. **Content Extraction**: Removes navigation, ads, and clutter while preserving main content
3. **Markdown Conversion**: Converts HTML structure to clean Markdown formatting
4. **File Saving**: Uses File System Access API or downloads fallback to save locally

## 🤝 Integration

The generated Markdown files work seamlessly with:

- **Note-taking apps**: Obsidian, Notion, Roam Research, Logseq
- **Text editors**: VS Code, Sublime Text, Vim, Emacs
- **Static site generators**: Jekyll, Hugo, Gatsby
- **Version control**: Git repositories for personal knowledge bases

## 🔒 Privacy & Security

- **No external servers**: All processing happens locally in your browser
- **No data collection**: No analytics, tracking, or telemetry
- **Open source**: Full source code available for inspection
- **Local storage only**: Settings and statistics stored locally via Tampermonkey

## 📊 Why This Script?

Based on comprehensive research into web user pain points, this script addresses:

- **Data Portability**: Export your clipped content to standard Markdown format
- **Platform Independence**: No lock-in to proprietary note-taking services
- **Privacy Control**: Keep your research and reading habits completely private
- **Workflow Efficiency**: Streamline knowledge capture with one-click clipping

## 🛠️ Technical Details

- **Built with**: TypeScript, Vite, vite-plugin-monkey
- **APIs Used**: File System Access API, DOM APIs, Tampermonkey APIs
- **Bundle Size**: Minimal footprint with no external dependencies
- **Performance**: Efficient DOM processing with optimized content extraction

## 📈 Roadmap

Future enhancements being considered:

- [ ] PDF export option
- [ ] Integration with popular note-taking apps
- [ ] Bulk clipping for multiple articles
- [ ] Advanced content filtering options
- [ ] OCR support for image text extraction

## 🐛 Troubleshooting

### Common Issues

**Script doesn't appear on some pages**
- The script only activates on pages with detected article content
- Check if the page has `<article>` tags or similar content structures

**File System API not working**
- Ensure you're using a supported browser (Chrome, Edge, Opera)
- Files will automatically download to your Downloads folder as fallback

**Article extraction is incomplete**
- Some websites use complex layouts that may affect extraction
- Try using "Save Full Page" option for complex sites

## 📄 License

MIT License - see [LICENSE](../LICENSE) file for details.

## 🤝 Contributing

Contributions welcome! Please see the main project repository for contribution guidelines.

---

**Part of the Tampermonkey Scripts Collection** - Empowering users with browser automation and productivity tools.