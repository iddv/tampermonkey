/**
 * Personal Web Clipper & Organizer
 * A powerful Tampermonkey script for clipping web content to local Markdown files
 */

import { ReadabilityExtractor } from './readability';
import { MarkdownConverter } from './markdown-converter';
import { FileSaver } from './file-saver';
import { ClipperUI } from './ui';

class PersonalWebClipper {
  private initialized = false;

  constructor() {
    this.init();
  }

  /**
   * Initialize the web clipper
   */
  private async init(): Promise<void> {
    if (this.initialized) return;

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }

    this.initialized = true;
  }

  /**
   * Set up the clipper UI and event handlers
   */
  private setup(): void {
    // Check if we're on a page that likely contains articles
    if (!this.isClippablePage()) {
      return;
    }

    // Inject the UI
    ClipperUI.injectUI();

    // Set up event handlers
    this.setupEventHandlers();

    // Register menu commands
    this.registerMenuCommands();

    console.log('Personal Web Clipper loaded successfully');
  }

  /**
   * Check if the current page is suitable for clipping
   */
  private isClippablePage(): boolean {
    const url = window.location.href;
    
    // Skip certain domains/pages
    const skipDomains = [
      'chrome://',
      'moz-extension://',
      'chrome-extension://',
      'about:',
      'data:',
      'javascript:'
    ];

    if (skipDomains.some(domain => url.startsWith(domain))) {
      return false;
    }

    // Check for article indicators
    const articleIndicators = [
      'article',
      '.post',
      '.entry',
      '.content',
      '[class*="article"]',
      '[id*="article"]',
      // Modern documentation sites
      '#content-area',
      '.prose',
      '.markdown-body',
      '.documentation',
      '.docs-content',
      'main',
      '[role="main"]',
      // Framework-specific
      '.nextra-content',
      '.docusaurus-content',
      '.page-inner',
      '.book-body'
    ];

    return articleIndicators.some(selector => document.querySelector(selector));
  }

  /**
   * Set up event handlers for the UI
   */
  private setupEventHandlers(): void {
    // Clip article button
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      
      if (target.id === 'clip-article') {
        this.clipArticle();
      } else if (target.id === 'clip-selection') {
        this.clipSelection();
      } else if (target.id === 'clip-page') {
        this.clipFullPage();
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (event) => {
      // Ctrl/Cmd + Shift + C to clip article
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'C') {
        event.preventDefault();
        this.clipArticle();
      }
      
      // Ctrl/Cmd + Shift + S to save selection
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'S') {
        event.preventDefault();
        this.clipSelection();
      }
    });
  }

  /**
   * Register Tampermonkey menu commands
   */
  private registerMenuCommands(): void {
    GM_registerMenuCommand('🔧 Clip Current Article', () => this.clipArticle());
    GM_registerMenuCommand('✂️ Save Selected Text', () => this.clipSelection());
    GM_registerMenuCommand('🌐 Save Full Page', () => this.clipFullPage());
    GM_registerMenuCommand('⚙️ Web Clipper Settings', () => this.showSettings());
  }

  /**
   * Clip the main article content
   */
  private async clipArticle(): Promise<void> {
    try {
      const article = ReadabilityExtractor.extractArticle();
      
      if (!article) {
        ClipperUI.showNotification('No article content found on this page', 'error');
        return;
      }

      // Create a temporary container with the extracted HTML content
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = article.content;
      
      const markdown = MarkdownConverter.htmlToMarkdown(tempDiv);
      const fullMarkdown = MarkdownConverter.createMarkdownDocument(
        article.title,
        markdown,
        article.url,
        article.timestamp
      );

      const success = await FileSaver.saveMarkdownFile(fullMarkdown, article.title);
      
      if (success) {
        ClipperUI.showNotification('Article saved successfully!');
        this.trackUsage('article');
      } else {
        ClipperUI.showNotification('Article downloaded to your Downloads folder');
        this.trackUsage('article_fallback');
      }
    } catch (error) {
      console.error('Error clipping article:', error);
      ClipperUI.showNotification('Error clipping article. Please try again.', 'error');
    }
  }

  /**
   * Clip the currently selected text
   */
  private async clipSelection(): Promise<void> {
    const selectedText = ClipperUI.getSelectedText();
    
    if (!selectedText) {
      ClipperUI.showNotification('Please select some text first', 'error');
      return;
    }

    try {
      const context = ClipperUI.getSelectionContext();
      const success = await FileSaver.saveHighlight(
        selectedText,
        context,
        window.location.href
      );

      if (success || !FileSaver.isSupported()) {
        ClipperUI.showNotification('Selection saved successfully!');
        this.trackUsage('selection');
      } else {
        ClipperUI.showNotification('Selection downloaded to your Downloads folder');
        this.trackUsage('selection_fallback');
      }
    } catch (error) {
      console.error('Error saving selection:', error);
      ClipperUI.showNotification('Error saving selection. Please try again.', 'error');
    }
  }

  /**
   * Clip the full page content
   */
  private async clipFullPage(): Promise<void> {
    try {
      // First try to extract article content
      const article = ReadabilityExtractor.extractArticle();
      
      if (article) {
        // If we found article content, use that instead of full page
        ClipperUI.showNotification('Using extracted article content instead of full page');
        await this.clipArticle();
        return;
      }

      // Warn user about full page clipping
      const proceed = confirm(
        'Full page clipping will include all page content (navigation, ads, etc.) and may be slow. ' +
        'Continue with full page clip?'
      );
      
      if (!proceed) {
        return;
      }

      const title = document.title || 'Web Page';
      
      // Create a cleaned copy of the body for processing
      const bodyClone = document.body.cloneNode(true) as HTMLElement;
      
      // Remove obviously unwanted elements from the clone
      const unwantedSelectors = [
        'script',
        'style',
        'nav',
        'header',
        'footer',
        '.advertisement',
        '.ad',
        '[class*="popup"]',
        '[class*="modal"]',
        'iframe[src*="ads"]'
      ];

      unwantedSelectors.forEach(selector => {
        const elements = bodyClone.querySelectorAll(selector);
        elements.forEach(el => el.remove());
      });

      const content = MarkdownConverter.htmlToMarkdown(bodyClone);
      const timestamp = new Date().toISOString();
      
      const fullMarkdown = MarkdownConverter.createMarkdownDocument(
        title + ' (Full Page)',
        content,
        window.location.href,
        timestamp
      );

      const success = await FileSaver.saveMarkdownFile(fullMarkdown, title + '-fullpage');
      
      if (success) {
        ClipperUI.showNotification('Full page saved successfully!');
        this.trackUsage('full_page');
      } else {
        ClipperUI.showNotification('Full page downloaded to your Downloads folder');
        this.trackUsage('full_page_fallback');
      }
    } catch (error) {
      console.error('Error clipping full page:', error);
      ClipperUI.showNotification('Error clipping page. Please try again.', 'error');
    }
  }

  /**
   * Show settings dialog
   */
  private showSettings(): void {
    const hasFileSystemAccess = FileSaver.isSupported();
    const stats = this.getUsageStats();
    
    const message = `
Personal Web Clipper Settings

File System Access API: ${hasFileSystemAccess ? '✅ Supported' : '❌ Not supported (will use downloads)'}

Usage Statistics:
- Articles clipped: ${stats.article || 0}
- Selections saved: ${stats.selection || 0}
- Full pages saved: ${stats.full_page || 0}

Keyboard Shortcuts:
- Ctrl/Cmd + Shift + C: Clip article
- Ctrl/Cmd + Shift + S: Save selection

Browser Compatibility:
- File System Access API works in Chrome, Edge, and Opera
- Other browsers will use download fallback
    `.trim();

    alert(message);
  }

  /**
   * Track usage statistics
   */
  private trackUsage(action: string): void {
    const stats = this.getUsageStats();
    stats[action] = (stats[action] || 0) + 1;
    GM_setValue('usage_stats', JSON.stringify(stats));
  }

  /**
   * Get usage statistics
   */
  private getUsageStats(): Record<string, number> {
    try {
      const stats = GM_getValue('usage_stats', '{}');
      return JSON.parse(stats);
    } catch {
      return {};
    }
  }
}

// Initialize the Personal Web Clipper
new PersonalWebClipper();