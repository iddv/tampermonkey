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
  private contentObserver: MutationObserver | null = null;
  private setupRetryCount = 0;
  private maxSetupRetries = 10;

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
      document.addEventListener('DOMContentLoaded', () => this.init());
      return;
    }

    // For SPAs, wait a bit for initial content to load
    await new Promise(resolve => setTimeout(resolve, 500));

    this.setup();
    this.initialized = true;
  }

  /**
   * Setup the web clipper with retry logic for SPAs
   */
  private async setup(): Promise<void> {
    console.log('Web Clipper: Setting up...');

    // Try to find content immediately
    if (ReadabilityExtractor.isClippablePage()) {
      console.log('Web Clipper: Content found immediately');
      this.finalizeSetup();
      return;
    }

    // If no content found, this might be an SPA - wait for content to appear
    console.log('Web Clipper: No content found immediately, waiting for SPA content...');
    
    // Try with increasing delays for SPA loading
    const retryDelays = [1000, 2000, 3000, 5000, 8000];
    
    for (const delay of retryDelays) {
      if (this.setupRetryCount >= this.maxSetupRetries) {
        console.log('Web Clipper: Max retries reached, giving up');
        break;
      }

      this.setupRetryCount++;
      console.log(`Web Clipper: Retry ${this.setupRetryCount} after ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Clear cache and try again
      ReadabilityExtractor.clearContentCache();
      
      if (ReadabilityExtractor.isClippablePage()) {
        console.log('Web Clipper: Content found after retry');
        this.finalizeSetup();
        return;
      }
    }

    // If still no content, set up MutationObserver to watch for changes
    this.setupContentObserver();
  }

  /**
   * Set up MutationObserver to watch for content changes (SPA navigation)
   */
  private setupContentObserver(): void {
    console.log('Web Clipper: Setting up content observer for SPA...');

    this.contentObserver = new MutationObserver((mutations) => {
      let shouldCheck = false;

      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if any added nodes contain significant content
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              if (element.textContent && element.textContent.length > 100) {
                shouldCheck = true;
                break;
              }
            }
          }
        }
      }

      if (shouldCheck) {
        // Debounce the check to avoid excessive calls
        if (this.debouncedContentCheck !== null) {
          clearTimeout(this.debouncedContentCheck);
        }
        this.debouncedContentCheck = setTimeout(() => {
          this.checkForContent();
        }, 1000);
      }
    });

    // Observe changes to the document body and root element
    this.contentObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Also observe the root element for SPAs
    const rootElement = document.getElementById('root');
    if (rootElement) {
      this.contentObserver.observe(rootElement, {
        childList: true,
        subtree: true
      });
    }
  }

  private debouncedContentCheck: number | null = null;

  /**
   * Check for content after DOM changes
   */
  private checkForContent(): void {
    console.log('Web Clipper: Checking for content after DOM changes...');
    
    // Clear cache and check again
    ReadabilityExtractor.clearContentCache();
    
    if (ReadabilityExtractor.isClippablePage()) {
      console.log('Web Clipper: Content found after DOM changes');
      this.finalizeSetup();
      
      // Stop observing once we find content
      if (this.contentObserver) {
        this.contentObserver.disconnect();
        this.contentObserver = null;
      }
    }
  }

  /**
   * Finalize setup once content is found
   */
  private finalizeSetup(): void {
    console.log('Web Clipper: Finalizing setup');
    
    ClipperUI.injectUI();
    this.setupEventHandlers();
    this.registerMenuCommands();
    this.trackUsage('page_loaded');
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        if (e.key === 'C') {
          e.preventDefault();
          this.clipArticle();
        } else if (e.key === 'S') {
          e.preventDefault();
          this.clipSelection();
        }
      }
    });

    // Handle SPA navigation - clear cache when URL changes
    let lastUrl = window.location.href;
    const urlObserver = new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        console.log('Web Clipper: URL changed, clearing content cache');
        ReadabilityExtractor.clearContentCache();
        
        // Re-setup content observer if needed
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
  private registerMenuCommands(): void {
    GM_registerMenuCommand('📄 Clip Article', () => this.clipArticle());
    GM_registerMenuCommand('✂️ Clip Selection', () => this.clipSelection());
    GM_registerMenuCommand('📋 Clip Full Page', () => this.clipFullPage());
    GM_registerMenuCommand('⚙️ Web Clipper Settings', () => this.showSettings());
  }

  /**
   * Clip the main article content
   */
  private async clipArticle(): Promise<void> {
    try {
      ClipperUI.showNotification('Extracting article content...', 'success');
      
      const article = ReadabilityExtractor.extractArticle();
      if (!article) {
        ClipperUI.showNotification('❌ No article content found on this page', 'error');
        return;
      }

      const markdown = MarkdownConverter.htmlToMarkdown(document.createElement('div'));
      const tempDiv = document.createElement('div');
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
        ClipperUI.showNotification('✅ Article clipped successfully!', 'success');
        this.trackUsage('article_clipped');
      } else {
        ClipperUI.showNotification('❌ Article clipping was cancelled', 'error');
      }
    } catch (error) {
      console.error('Error clipping article:', error);
      ClipperUI.showNotification('❌ Error clipping article', 'error');
    }
  }

  /**
   * Clip selected text
   */
  private async clipSelection(): Promise<void> {
    try {
      const selectedText = ClipperUI.getSelectedText();
      if (!selectedText) {
        ClipperUI.showNotification('❌ No text selected', 'error');
        return;
      }

      const context = ClipperUI.getSelectionContext();
      const saved = await FileSaver.saveHighlight(selectedText, context, window.location.href);
      
      if (saved) {
        ClipperUI.showNotification('✅ Selection clipped successfully!', 'success');
        this.trackUsage('selection_clipped');
      } else {
        ClipperUI.showNotification('❌ Selection clipping was cancelled', 'error');
      }
    } catch (error) {
      console.error('Error clipping selection:', error);
      ClipperUI.showNotification('❌ Error clipping selection', 'error');
    }
  }

  /**
   * Clip the full page content
   */
  private async clipFullPage(): Promise<void> {
    try {
      ClipperUI.showNotification('Capturing full page...', 'success');
      
      const title = document.title || 'Full Page Capture';
      const content = document.documentElement.outerHTML;
      
      const timestamp = new Date().toISOString();
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
        ClipperUI.showNotification('✅ Full page captured successfully!', 'success');
        this.trackUsage('full_page_clipped');
      } else {
        ClipperUI.showNotification('❌ Full page capture was cancelled', 'error');
      }
    } catch (error) {
      console.error('Error capturing full page:', error);
      ClipperUI.showNotification('❌ Error capturing full page', 'error');
    }
  }

  /**
   * Show settings dialog
   */
  private showSettings(): void {
    const stats = this.getUsageStats();
    const isSupported = FileSaver.isSupported();
    
         alert(`Personal Web Clipper Settings

Version: 1.2.0
File System API: ${isSupported ? '✅ Supported' : '❌ Not supported (using download fallback)'}
Browser: ${navigator.userAgent.split(' ').slice(-1)[0]}

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
  private trackUsage(action: string): void {
    const stats = this.getUsageStats();
    const key = action.replace('_', '_');
    stats[key] = (stats[key] || 0) + 1;
    GM_setValue('usage_stats', JSON.stringify(stats));
  }

  /**
   * Get usage statistics
   */
  private getUsageStats(): any {
    const stored = GM_getValue('usage_stats', '{}');
    return JSON.parse(stored);
  }
}

// Initialize the web clipper
new PersonalWebClipper();