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
  // Cache for the content element to avoid double-scanning
  private static cachedContentElement: HTMLElement | null | undefined = undefined;

  // A single, prioritized list of content selectors
  // Try them in order and use the first one that returns a valid element
  private static readonly CONTENT_SELECTORS = [
    // --- OpenAI & modern documentation sites (highest priority) ---
    '.PageContent',        // OpenAI docs main content area
    '.prose',              // Common Tailwind CSS class for articles
    
    // --- High-confidence, semantic selectors ---
    'article',
    'main',
    '[role="main"]',
    
    // --- Modern documentation sites ---
    '#content-area',
    '#content-container',
    '.markdown-body',      // GitHub-style markdown
    '.documentation',
    '.docs-content',
    
    // --- Framework-specific selectors ---
    '[data-component-part="step-content"]',
    '.nextra-content',     // Next.js docs
    '.docusaurus-content', // Docusaurus
    
    // --- GitBook and similar ---
    '.page-inner',
    '.book-body',
    
    // --- Common CMS patterns ---
    '.entry-content',
    '.post-content',
    '.article-content',
    '.article-body',
    
    // --- Generic fallbacks (lower confidence) ---
    '#content',
    '.content',
    '#main-content'
  ];

  /**
   * Extract the main article content from the current page
   */
  static extractArticle(): ArticleData | null {
    try {
      const title = this.extractTitle();
      const contentElement = this.findContentElement();
      
      if (!contentElement) {
        return null; // No suitable content element found
      }

      const content = this.processContentElement(contentElement);
      
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
   * Find the main content element using prioritized selector list
   * Returns the element directly, or null if no suitable element is found
   * Implements caching to avoid double-scanning the DOM
   */
  static findContentElement(): HTMLElement | null {
    // Return cached value if the check has already been performed
    if (this.cachedContentElement !== undefined) {
      return this.cachedContentElement;
    }

    for (const selector of this.CONTENT_SELECTORS) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element && this.isElementSuitable(element)) {
        console.log(`Web Clipper: Content found using selector: ${selector}`);
        // Cache the found element and return it
        this.cachedContentElement = element;
        return element;
      }
    }
    
    console.log('Web Clipper: No suitable content element found');
    // Cache the null result to prevent re-scanning
    this.cachedContentElement = null;
    return null;
  }

  /**
   * Clears the cached content element. Should be called on SPA navigation.
   */
  static clearContentCache(): void {
    this.cachedContentElement = undefined;
  }

  /**
   * Check if an element is suitable for content extraction
   * Combines visibility check and significant text content check
   */
  private static isElementSuitable(element: HTMLElement): boolean {
    // Check if element is visible
    if (!this.isElementVisible(element)) {
      return false;
    }
    
    // Check if element has significant text content
    return this.hasSignificantTextContent(element);
  }

  /**
   * Check if an element is visible (not hidden by CSS)
   */
  private static isElementVisible(element: HTMLElement): boolean {
    return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
  }

  /**
   * Check if an element has significant text content
   */
  private static hasSignificantTextContent(element: HTMLElement): boolean {
    const text = element.textContent || '';
    return text.trim().length > 200; // Minimum text length for significant content
  }

  /**
   * Process a content element to extract its HTML content
   */
  private static processContentElement(contentElement: HTMLElement): string {
    // Clone the element to avoid modifying the original
    const clonedElement = contentElement.cloneNode(true) as HTMLElement;
    
    // Clean up the content
    this.cleanElement(clonedElement);
    
    return clonedElement.innerHTML || '';
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

  /**
   * Check if the current page is suitable for clipping
   * This is now just a wrapper around findContentElement for backward compatibility
   */
  static isClippablePage(): boolean {
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

    // Check if we can find suitable content
    return this.findContentElement() !== null;
  }
}
