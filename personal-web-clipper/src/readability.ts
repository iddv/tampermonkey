/**
 * Simplified article extraction based on Mozilla's Readability
 * This is a minimal implementation to avoid external dependencies
 */

interface ArticleData {
  title: string;
  content: string;
  url: string;
  timestamp: string;
}

export class ReadabilityExtractor {
  /**
   * Extract the main article content from the current page
   */
  static extractArticle(): ArticleData | null {
    try {
      const title = this.extractTitle();
      const content = this.extractMainContent();
      
      if (!content || content.trim().length < 100) {
        return null; // Not enough content to be considered an article
      }

      return {
        title,
        content,
        url: window.location.href,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error extracting article:', error);
      return null;
    }
  }

  /**
   * Extract the page title
   */
  private static extractTitle(): string {
    // Try various title sources in order of preference
    const selectors = [
      'h1[class*="title"]',
      'h1[class*="headline"]',
      '.entry-title h1',
      '.post-title h1',
      'article h1',
      'h1',
      '[class*="title"] h1',
      '[class*="headline"] h1'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element && element.textContent?.trim()) {
        return element.textContent.trim();
      }
    }

    // Fallback to document title
    return document.title || 'Untitled Article';
  }

  /**
   * Extract the main content of the article
   */
  private static extractMainContent(): string {
    // Try to find the main article content
    const contentSelectors = [
      'article',
      '[role="main"]',
      '.entry-content',
      '.post-content',
      '.article-content',
      '.content',
      '#content',
      'main',
      // Modern documentation sites
      '#content-area',
      '#content-container',
      '.prose',
      '.markdown-body',
      '.documentation',
      '.docs-content',
      // Framework-specific selectors
      '[data-component-part="step-content"]',
      '.nextra-content',
      '.docusaurus-content',
      // GitBook and similar
      '.page-inner',
      '.book-body'
    ];

    let contentElement: HTMLElement | null = null;

    for (const selector of contentSelectors) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element && this.hasSignificantTextContent(element)) {
        contentElement = element;
        break;
      }
    }

    // If no specific content area found, return empty (don't use document.body as fallback)
    if (!contentElement) {
      return '';
    }

    // Clone the element to avoid modifying the original
    const clonedElement = contentElement.cloneNode(true) as HTMLElement;
    
    // Clean up the content
    this.cleanElement(clonedElement);
    
    return clonedElement.innerHTML || '';
  }

  /**
   * Check if an element has significant text content
   */
  private static hasSignificantTextContent(element: HTMLElement): boolean {
    const text = element.textContent || '';
    return text.trim().length > 200; // Minimum text length for significant content
  }

  /**
   * Clean up the element by removing unwanted elements
   */
  private static cleanElement(element: HTMLElement): void {
    // Remove unwanted elements
    const unwantedSelectors = [
      'script',
      'style',
      'nav',
      'header',
      'footer',
      '.advertisement',
      '.ad',
      '.social-share',
      '.comments',
      '.sidebar',
      '[class*="popup"]',
      '[class*="modal"]',
      'iframe[src*="ads"]',
      '[class*="related"]',
      '[class*="recommend"]'
    ];

    unwantedSelectors.forEach(selector => {
      const elements = element.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });

    // Only remove elements that are clearly navigation/ads based on selectors
    // Avoid removing content based on text length as it can remove valid short content
  }
}