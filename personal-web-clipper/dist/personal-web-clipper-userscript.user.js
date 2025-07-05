// ==UserScript==
// @name         Personal Web Clipper & Organizer
// @namespace    https://github.com/your-username/tampermonkey-scripts
// @version      1.2.0
// @author       Tampermonkey Scripts Collection
// @description  Clip articles and web content to local Markdown files with File System Access API
// @license      MIT
// @icon         data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzJENzJEMiIvPgo8cGF0aCBkPSJNOSA5SDE1VjE1SDlWOVoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xNyA5SDIzVjE1SDE3VjlaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNOSAxN0gxNVYyM0g5VjE3WiIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTE3IDE3SDIzVjIzSDE3VjE3WiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cg==
// @match        https://*/*
// @match        http://*/*
// @exclude      https://accounts.google.com/*
// @exclude      https://login.microsoftonline.com/*
// @exclude      https://*.bank*
// @exclude      https://chrome://*
// @exclude      https://moz-extension://*
// @grant        GM_addStyle
// @grant        GM_deleteValue
// @grant        GM_getValue
// @grant        GM_notification
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// ==/UserScript==

(function () {
  'use strict';

  const _ReadabilityExtractor = class _ReadabilityExtractor {
    /**
     * Extract the main article content from the current page
     */
    static extractArticle() {
      try {
        const title = this.extractTitle();
        const contentElement = this.findContentElement();
        if (!contentElement) {
          return null;
        }
        const content = this.processContentElement(contentElement);
        if (!content || content.trim().length < 100) {
          return null;
        }
        return {
          title,
          content,
          url: window.location.href,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
      } catch (error) {
        console.error("Error extracting article:", error);
        return null;
      }
    }
    /**
     * Find the main content element using prioritized selector list
     * Returns the element directly, or null if no suitable element is found
     * Implements caching to avoid double-scanning the DOM
     */
    static findContentElement() {
      if (this.cachedContentElement !== void 0) {
        return this.cachedContentElement;
      }
      for (const selector of this.CONTENT_SELECTORS) {
        const element = document.querySelector(selector);
        if (element && this.isElementSuitable(element)) {
          console.log(`Web Clipper: Content found using selector: ${selector}`);
          this.cachedContentElement = element;
          return element;
        }
      }
      console.log("Web Clipper: No suitable content element found");
      this.cachedContentElement = null;
      return null;
    }
    /**
     * Clears the cached content element. Should be called on SPA navigation.
     */
    static clearContentCache() {
      this.cachedContentElement = void 0;
    }
    /**
     * Check if an element is suitable for content extraction
     * Combines visibility check and significant text content check
     */
    static isElementSuitable(element) {
      if (!this.isElementVisible(element)) {
        return false;
      }
      return this.hasSignificantTextContent(element);
    }
    /**
     * Check if an element is visible (not hidden by CSS)
     */
    static isElementVisible(element) {
      return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
    }
    /**
     * Check if an element has significant text content
     */
    static hasSignificantTextContent(element) {
      const text = element.textContent || "";
      return text.trim().length > 200;
    }
    /**
     * Process a content element to extract its HTML content
     */
    static processContentElement(contentElement) {
      const clonedElement = contentElement.cloneNode(true);
      this.cleanElement(clonedElement);
      return clonedElement.innerHTML || "";
    }
    /**
     * Extract the page title
     */
    static extractTitle() {
      const selectors = [
        'h1[class*="title"]',
        'h1[class*="headline"]',
        ".entry-title h1",
        ".post-title h1",
        "article h1",
        "h1",
        '[class*="title"] h1',
        '[class*="headline"] h1'
      ];
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent?.trim()) {
          return element.textContent.trim();
        }
      }
      return document.title || "Untitled Article";
    }
    /**
     * Clean up the element by removing unwanted elements
     */
    static cleanElement(element) {
      const unwantedSelectors = [
        "script",
        "style",
        "nav",
        "header",
        "footer",
        ".advertisement",
        ".ad",
        ".social-share",
        ".comments",
        ".sidebar",
        '[class*="popup"]',
        '[class*="modal"]',
        'iframe[src*="ads"]',
        '[class*="related"]',
        '[class*="recommend"]'
      ];
      unwantedSelectors.forEach((selector) => {
        const elements = element.querySelectorAll(selector);
        elements.forEach((el) => el.remove());
      });
    }
    /**
     * Check if the current page is suitable for clipping
     * This is now just a wrapper around findContentElement for backward compatibility
     */
    static isClippablePage() {
      const url = window.location.href;
      const skipDomains = [
        "chrome://",
        "moz-extension://",
        "chrome-extension://",
        "about:",
        "data:",
        "javascript:"
      ];
      if (skipDomains.some((domain) => url.startsWith(domain))) {
        return false;
      }
      return this.findContentElement() !== null;
    }
  };
  _ReadabilityExtractor.cachedContentElement = void 0;
  _ReadabilityExtractor.CONTENT_SELECTORS = [
    // --- OpenAI & modern documentation sites (highest priority) ---
    ".PageContent",
    // OpenAI docs main content area
    ".prose",
    // Common Tailwind CSS class for articles
    // --- High-confidence, semantic selectors ---
    "article",
    "main",
    '[role="main"]',
    // --- Modern documentation sites ---
    "#content-area",
    "#content-container",
    ".markdown-body",
    // GitHub-style markdown
    ".documentation",
    ".docs-content",
    // --- Framework-specific selectors ---
    '[data-component-part="step-content"]',
    ".nextra-content",
    // Next.js docs
    ".docusaurus-content",
    // Docusaurus
    // --- GitBook and similar ---
    ".page-inner",
    ".book-body",
    // --- Common CMS patterns ---
    ".entry-content",
    ".post-content",
    ".article-content",
    ".article-body",
    // --- Generic fallbacks (lower confidence) ---
    "#content",
    ".content",
    "#main-content"
  ];
  let ReadabilityExtractor = _ReadabilityExtractor;
  class MarkdownConverter {
    /**
     * Convert HTML element to Markdown using recursive approach
     */
    static htmlToMarkdown(element) {
      return this.cleanupMarkdown(this.processNode(element));
    }
    /**
     * Recursively process a node and its children
     */
    static processNode(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || "";
        return this.escapeMarkdown(text);
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node;
        const tagName = element.tagName.toLowerCase();
        const directConversion = this.getDirectConversion(element, tagName);
        if (directConversion !== null) {
          return directConversion;
        }
        let result = "";
        for (const child of element.childNodes) {
          result += this.processNode(child);
        }
        return this.wrapWithElementFormatting(result, tagName);
      }
      return "";
    }
    /**
     * Get direct conversion for elements that should be processed as a whole
     */
    static getDirectConversion(element, tagName) {
      const text = element.textContent?.trim() || "";
      switch (tagName) {
        case "code":
          return `\`${text}\``;
        case "pre":
          return `
\`\`\`
${text}
\`\`\`

`;
        case "ul":
          return this.convertList(element, false);
        case "ol":
          return this.convertList(element, true);
        case "a":
          const href = element.getAttribute("href");
          if (href && href.startsWith("http")) {
            return `[${text}](${href})`;
          }
          return text;
        case "img":
          const src = element.getAttribute("src");
          const alt = element.getAttribute("alt") || "Image";
          if (src) {
            return `![${alt}](${src})`;
          }
          return "";
        case "br":
          return "\n";
        case "hr":
          return "\n---\n\n";
        default:
          return null;
      }
    }
    /**
     * Wrap processed content with element-specific formatting
     */
    static wrapWithElementFormatting(content, tagName) {
      const trimmedContent = content.trim();
      if (!trimmedContent) return "";
      switch (tagName) {
        case "h1":
          return `
# ${trimmedContent}

`;
        case "h2":
          return `
## ${trimmedContent}

`;
        case "h3":
          return `
### ${trimmedContent}

`;
        case "h4":
          return `
#### ${trimmedContent}

`;
        case "h5":
          return `
##### ${trimmedContent}

`;
        case "h6":
          return `
###### ${trimmedContent}

`;
        case "blockquote":
          return "\n" + trimmedContent.split("\n").filter(Boolean).map((line) => `> ${line}`).join("\n") + "\n\n";
        case "p":
          return `
${trimmedContent}

`;
        case "strong":
        case "b":
          return `**${trimmedContent}**`;
        case "em":
        case "i":
          return `*${trimmedContent}*`;
        case "li":
          return "";
        default:
          return content;
      }
    }
    /**
     * Convert lists to Markdown
     */
    static convertList(listElement, ordered) {
      let markdown = "\n";
      let itemIndex = 1;
      for (const item of Array.from(listElement.children)) {
        if (item.tagName.toLowerCase() === "li") {
          const prefix = ordered ? `${itemIndex++}. ` : "- ";
          let itemContent = "";
          for (const child of Array.from(item.childNodes)) {
            itemContent += this.processNode(child);
          }
          const processedContent = itemContent.trim().replace(/\n/g, "\n  ");
          markdown += `${prefix}${processedContent}
`;
        }
      }
      return markdown + "\n";
    }
    /**
     * Escape special Markdown characters in text
     */
    static escapeMarkdown(text) {
      return text.replace(/\\/g, "\\\\").replace(/\*/g, "\\*").replace(/_/g, "\\_").replace(/\[/g, "\\[").replace(/\]/g, "\\]").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/#/g, "\\#").replace(/\+/g, "\\+").replace(/!/g, "\\!");
    }
    /**
     * Clean up the final Markdown
     */
    static cleanupMarkdown(markdown) {
      return markdown.replace(/\n{3,}/g, "\n\n").replace(/ +$/gm, "").trim();
    }
    /**
     * Create a complete Markdown document with metadata
     */
    static createMarkdownDocument(title, content, url, timestamp) {
      const frontMatter = `---
title: "${title.replace(/"/g, '\\"')}"
url: "${url}"
clipped: "${timestamp}"
source: "Personal Web Clipper"
---

`;
      return frontMatter + `# ${title}

${content}

---

**Source:** [${url}](${url})  
**Clipped:** ${new Date(timestamp).toLocaleString()}`;
    }
  }
  class FileSaver {
    /**
     * Check if File System Access API is supported
     */
    static isSupported() {
      return "showSaveFilePicker" in window;
    }
    /**
     * Save content as a file using File System Access API
     */
    static async saveMarkdownFile(content, suggestedName) {
      if (!this.isSupported()) {
        this.fallbackSave(content, suggestedName);
        return false;
      }
      try {
        const cleanName = this.sanitizeFilename(suggestedName);
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: `${cleanName}.md`,
          types: [{
            description: "Markdown files",
            accept: {
              "text/markdown": [".md"],
              "text/plain": [".txt"]
            }
          }]
        });
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
        return true;
      } catch (error) {
        if (error.name === "AbortError") {
          return false;
        }
        console.error("Error saving file:", error);
        this.fallbackSave(content, suggestedName);
        return false;
      }
    }
    /**
     * Fallback method for browsers that don't support File System Access API
     */
    static fallbackSave(content, suggestedName) {
      const cleanName = this.sanitizeFilename(suggestedName);
      const blob = new Blob([content], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${cleanName}.md`;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    }
    /**
     * Sanitize filename for cross-platform compatibility
     */
    static sanitizeFilename(filename) {
      return filename.replace(/[<>:"/\\|?*]/g, "-").replace(/\s+/g, " ").replace(/\.+$/, "").trim().substring(0, 100);
    }
    /**
     * Save selected text as a highlight/note
     */
    static async saveHighlight(selectedText, context, url) {
      (/* @__PURE__ */ new Date()).toISOString();
      const content = `# Web Highlight

**URL:** [${url}](${url})  
**Date:** ${(/* @__PURE__ */ new Date()).toLocaleString()}  
**Context:** ${context}

## Selected Text

> ${selectedText.split("\n").join("\n> ")}

---

*Saved with Personal Web Clipper*
`;
      const filename = `highlight-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}-${Date.now()}`;
      return this.saveMarkdownFile(content, filename);
    }
  }
  const _ClipperUI = class _ClipperUI {
    /**
     * Inject the clipper UI into the page
     */
    static injectUI() {
      if (this.isInjected) return;
      this.addStyles();
      this.createContainer();
      this.createButtons();
      this.isInjected = true;
    }
    /**
     * Add CSS styles for the clipper UI
     */
    static addStyles() {
      GM_addStyle(`
      .web-clipper-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 999999;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 12px;
        padding: 12px;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        transform: translateX(100%);
        transition: transform 0.3s ease;
      }

      .web-clipper-container.visible {
        transform: translateX(0);
      }

      .web-clipper-container:hover {
        transform: translateX(0);
        box-shadow: 0 12px 35px rgba(0, 0, 0, 0.2);
      }

      .web-clipper-button {
        display: block;
        width: 100%;
        padding: 10px 16px;
        margin: 4px 0;
        background: rgba(255, 255, 255, 0.9);
        border: none;
        border-radius: 8px;
        color: #333;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        backdrop-filter: blur(10px);
      }

      .web-clipper-button:hover {
        background: rgba(255, 255, 255, 1);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .web-clipper-button:active {
        transform: translateY(0);
      }

      .web-clipper-button.primary {
        background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
        color: white;
      }

      .web-clipper-button.primary:hover {
        background: linear-gradient(135deg, #45a049 0%, #3d8b40 100%);
      }

      .web-clipper-toggle {
        position: absolute;
        top: 50%;
        left: -12px;
        transform: translateY(-50%);
        width: 24px;
        height: 24px;
        background: inherit;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      }

      .web-clipper-notification {
        position: fixed;
        top: 80px;
        right: 20px;
        z-index: 1000000;
        background: #4CAF50;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
      }

      .web-clipper-notification.show {
        opacity: 1;
        transform: translateX(0);
      }

      .web-clipper-notification.error {
        background: #f44336;
      }
    `);
    }
    /**
     * Create the main container
     */
    static createContainer() {
      this.container = document.createElement("div");
      this.container.className = "web-clipper-container";
      this.container.innerHTML = `
      <button class="web-clipper-toggle">📎</button>
    `;
      document.body.appendChild(this.container);
      let isVisible = false;
      const toggle = () => {
        isVisible = !isVisible;
        this.container?.classList.toggle("visible", isVisible);
      };
      this.container.querySelector(".web-clipper-toggle")?.addEventListener("click", toggle);
    }
    /**
     * Create action buttons
     */
    static createButtons() {
      if (!this.container) return;
      const buttonsContainer = document.createElement("div");
      buttonsContainer.innerHTML = `
      <button class="web-clipper-button primary" id="clip-article">
        📄 Clip Article
      </button>
      <button class="web-clipper-button" id="clip-selection">
        ✂️ Save Selection
      </button>
      <button class="web-clipper-button" id="clip-page">
        🌐 Save Full Page
      </button>
    `;
      this.container.appendChild(buttonsContainer);
    }
    /**
     * Show a notification to the user
     */
    static showNotification(message, type = "success") {
      const notification = document.createElement("div");
      notification.className = `web-clipper-notification ${type}`;
      notification.textContent = message;
      document.body.appendChild(notification);
      requestAnimationFrame(() => {
        notification.classList.add("show");
      });
      setTimeout(() => {
        notification.classList.remove("show");
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }, 3e3);
    }
    /**
     * Get the current text selection
     */
    static getSelectedText() {
      const selection = window.getSelection();
      return selection ? selection.toString().trim() : "";
    }
    /**
     * Get context around the selection
     */
    static getSelectionContext() {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return "";
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      let contextElement = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
      while (contextElement && contextElement !== document.body) {
        const tagName = contextElement.tagName?.toLowerCase();
        if (["article", "section", "div", "p", "h1", "h2", "h3"].includes(tagName || "")) {
          break;
        }
        contextElement = contextElement.parentElement;
      }
      return contextElement?.tagName?.toLowerCase() || "page";
    }
    /**
     * Remove the UI from the page
     */
    static removeUI() {
      if (this.container && this.container.parentNode) {
        this.container.parentNode.removeChild(this.container);
        this.container = null;
        this.isInjected = false;
      }
    }
  };
  _ClipperUI.isInjected = false;
  _ClipperUI.container = null;
  let ClipperUI = _ClipperUI;
  class PersonalWebClipper {
    constructor() {
      this.initialized = false;
      this.contentObserver = null;
      this.setupRetryCount = 0;
      this.maxSetupRetries = 10;
      this.debouncedContentCheck = null;
      this.init();
    }
    /**
     * Initialize the web clipper
     */
    async init() {
      if (this.initialized) return;
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => this.init());
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      this.setup();
      this.initialized = true;
    }
    /**
     * Setup the web clipper with retry logic for SPAs
     */
    async setup() {
      console.log("Web Clipper: Setting up...");
      if (ReadabilityExtractor.isClippablePage()) {
        console.log("Web Clipper: Content found immediately");
        this.finalizeSetup();
        return;
      }
      console.log("Web Clipper: No content found immediately, waiting for SPA content...");
      const retryDelays = [1e3, 2e3, 3e3, 5e3, 8e3];
      for (const delay of retryDelays) {
        if (this.setupRetryCount >= this.maxSetupRetries) {
          console.log("Web Clipper: Max retries reached, giving up");
          break;
        }
        this.setupRetryCount++;
        console.log(`Web Clipper: Retry ${this.setupRetryCount} after ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        ReadabilityExtractor.clearContentCache();
        if (ReadabilityExtractor.isClippablePage()) {
          console.log("Web Clipper: Content found after retry");
          this.finalizeSetup();
          return;
        }
      }
      this.setupContentObserver();
    }
    /**
     * Set up MutationObserver to watch for content changes (SPA navigation)
     */
    setupContentObserver() {
      console.log("Web Clipper: Setting up content observer for SPA...");
      this.contentObserver = new MutationObserver((mutations) => {
        let shouldCheck = false;
        for (const mutation of mutations) {
          if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
            for (const node of mutation.addedNodes) {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node;
                if (element.textContent && element.textContent.length > 100) {
                  shouldCheck = true;
                  break;
                }
              }
            }
          }
        }
        if (shouldCheck) {
          if (this.debouncedContentCheck !== null) {
            clearTimeout(this.debouncedContentCheck);
          }
          this.debouncedContentCheck = setTimeout(() => {
            this.checkForContent();
          }, 1e3);
        }
      });
      this.contentObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
      const rootElement = document.getElementById("root");
      if (rootElement) {
        this.contentObserver.observe(rootElement, {
          childList: true,
          subtree: true
        });
      }
    }
    /**
     * Check for content after DOM changes
     */
    checkForContent() {
      console.log("Web Clipper: Checking for content after DOM changes...");
      ReadabilityExtractor.clearContentCache();
      if (ReadabilityExtractor.isClippablePage()) {
        console.log("Web Clipper: Content found after DOM changes");
        this.finalizeSetup();
        if (this.contentObserver) {
          this.contentObserver.disconnect();
          this.contentObserver = null;
        }
      }
    }
    /**
     * Finalize setup once content is found
     */
    finalizeSetup() {
      console.log("Web Clipper: Finalizing setup");
      ClipperUI.injectUI();
      this.setupEventHandlers();
      this.registerMenuCommands();
      this.trackUsage("page_loaded");
    }
    /**
     * Setup event handlers
     */
    setupEventHandlers() {
      document.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
          if (e.key === "C") {
            e.preventDefault();
            this.clipArticle();
          } else if (e.key === "S") {
            e.preventDefault();
            this.clipSelection();
          }
        }
      });
      let lastUrl = window.location.href;
      const urlObserver = new MutationObserver(() => {
        if (window.location.href !== lastUrl) {
          lastUrl = window.location.href;
          console.log("Web Clipper: URL changed, clearing content cache");
          ReadabilityExtractor.clearContentCache();
          if (!ReadabilityExtractor.isClippablePage()) {
            this.setupContentObserver();
          }
        }
      });
      urlObserver.observe(document.body, { childList: true, subtree: true });
    }
    /**
     * Register Tampermonkey menu commands
     */
    registerMenuCommands() {
      GM_registerMenuCommand("📄 Clip Article", () => this.clipArticle());
      GM_registerMenuCommand("✂️ Clip Selection", () => this.clipSelection());
      GM_registerMenuCommand("📋 Clip Full Page", () => this.clipFullPage());
      GM_registerMenuCommand("⚙️ Web Clipper Settings", () => this.showSettings());
    }
    /**
     * Clip the main article content
     */
    async clipArticle() {
      try {
        ClipperUI.showNotification("Extracting article content...", "success");
        const article = ReadabilityExtractor.extractArticle();
        if (!article) {
          ClipperUI.showNotification("❌ No article content found on this page", "error");
          return;
        }
        const markdown = MarkdownConverter.htmlToMarkdown(document.createElement("div"));
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = article.content;
        const markdownContent = MarkdownConverter.htmlToMarkdown(tempDiv);
        const fullMarkdown = MarkdownConverter.createMarkdownDocument(
          article.title,
          markdownContent,
          article.url,
          article.timestamp
        );
        const saved = await FileSaver.saveMarkdownFile(fullMarkdown, article.title);
        if (saved) {
          ClipperUI.showNotification("✅ Article clipped successfully!", "success");
          this.trackUsage("article_clipped");
        } else {
          ClipperUI.showNotification("❌ Article clipping was cancelled", "error");
        }
      } catch (error) {
        console.error("Error clipping article:", error);
        ClipperUI.showNotification("❌ Error clipping article", "error");
      }
    }
    /**
     * Clip selected text
     */
    async clipSelection() {
      try {
        const selectedText = ClipperUI.getSelectedText();
        if (!selectedText) {
          ClipperUI.showNotification("❌ No text selected", "error");
          return;
        }
        const context = ClipperUI.getSelectionContext();
        const saved = await FileSaver.saveHighlight(selectedText, context, window.location.href);
        if (saved) {
          ClipperUI.showNotification("✅ Selection clipped successfully!", "success");
          this.trackUsage("selection_clipped");
        } else {
          ClipperUI.showNotification("❌ Selection clipping was cancelled", "error");
        }
      } catch (error) {
        console.error("Error clipping selection:", error);
        ClipperUI.showNotification("❌ Error clipping selection", "error");
      }
    }
    /**
     * Clip the full page content
     */
    async clipFullPage() {
      try {
        ClipperUI.showNotification("Capturing full page...", "success");
        const title = document.title || "Full Page Capture";
        const content = document.documentElement.outerHTML;
        const timestamp = (/* @__PURE__ */ new Date()).toISOString();
        const markdownContent = `# ${title}

## Full Page HTML Archive

\`\`\`html
${content}
\`\`\`

---

**Source:** [${window.location.href}](${window.location.href})  
**Captured:** ${new Date(timestamp).toLocaleString()}
**Type:** Full Page HTML Archive
`;
        const saved = await FileSaver.saveMarkdownFile(markdownContent, `${title} - Full Page`);
        if (saved) {
          ClipperUI.showNotification("✅ Full page captured successfully!", "success");
          this.trackUsage("full_page_clipped");
        } else {
          ClipperUI.showNotification("❌ Full page capture was cancelled", "error");
        }
      } catch (error) {
        console.error("Error capturing full page:", error);
        ClipperUI.showNotification("❌ Error capturing full page", "error");
      }
    }
    /**
     * Show settings dialog
     */
    showSettings() {
      const stats = this.getUsageStats();
      const isSupported = FileSaver.isSupported();
      alert(`Personal Web Clipper Settings

Version: 1.2.0
File System API: ${isSupported ? "✅ Supported" : "❌ Not supported (using download fallback)"}
Browser: ${navigator.userAgent.split(" ").slice(-1)[0]}

Usage Statistics:
• Pages loaded: ${stats.pages_loaded || 0}
• Articles clipped: ${stats.articles_clipped || 0}
• Selections clipped: ${stats.selections_clipped || 0}
• Full pages captured: ${stats.full_pages_captured || 0}

Keyboard Shortcuts:
• Ctrl/Cmd + Shift + C: Clip Article
• Ctrl/Cmd + Shift + S: Clip Selection

Note: This script only works on pages with article content.
For complex pages, try "Clip Full Page" option.`);
    }
    /**
     * Track usage for statistics
     */
    trackUsage(action) {
      const stats = this.getUsageStats();
      const key = action.replace("_", "_");
      stats[key] = (stats[key] || 0) + 1;
      GM_setValue("usage_stats", JSON.stringify(stats));
    }
    /**
     * Get usage statistics
     */
    getUsageStats() {
      const stored = GM_getValue("usage_stats", "{}");
      return JSON.parse(stored);
    }
  }
  new PersonalWebClipper();

})();