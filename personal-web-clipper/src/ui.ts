/**
 * User Interface components for the Web Clipper
 */

export class ClipperUI {
  private static isInjected = false;
  private static container: HTMLElement | null = null;

  /**
   * Inject the clipper UI into the page
   */
  static injectUI(): void {
    if (this.isInjected) return;

    this.addStyles();
    this.createContainer();
    this.createButtons();
    this.isInjected = true;
  }

  /**
   * Add CSS styles for the clipper UI
   */
  private static addStyles(): void {
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
  private static createContainer(): void {
    this.container = document.createElement('div');
    this.container.className = 'web-clipper-container';
    this.container.innerHTML = `
      <button class="web-clipper-toggle">📎</button>
    `;

    document.body.appendChild(this.container);

    // Add hover/focus behavior
    let isVisible = false;
    const toggle = () => {
      isVisible = !isVisible;
      this.container?.classList.toggle('visible', isVisible);
    };

    this.container.querySelector('.web-clipper-toggle')?.addEventListener('click', toggle);
  }

  /**
   * Create action buttons
   */
  private static createButtons(): void {
    if (!this.container) return;

    const buttonsContainer = document.createElement('div');
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
  static showNotification(message: string, type: 'success' | 'error' = 'success'): void {
    const notification = document.createElement('div');
    notification.className = `web-clipper-notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Show the notification
    requestAnimationFrame(() => {
      notification.classList.add('show');
    });

    // Remove after 3 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  /**
   * Get the current text selection
   */
  static getSelectedText(): string {
    const selection = window.getSelection();
    return selection ? selection.toString().trim() : '';
  }

  /**
   * Get context around the selection
   */
  static getSelectionContext(): string {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return '';

    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    
    // Find the parent element that contains the selection
    let contextElement = container.nodeType === Node.TEXT_NODE 
      ? container.parentElement 
      : container as Element;

    // Look for meaningful parent elements
    while (contextElement && contextElement !== document.body) {
      const tagName = contextElement.tagName?.toLowerCase();
      if (['article', 'section', 'div', 'p', 'h1', 'h2', 'h3'].includes(tagName || '')) {
        break;
      }
      contextElement = contextElement.parentElement;
    }

    return contextElement?.tagName?.toLowerCase() || 'page';
  }

  /**
   * Remove the UI from the page
   */
  static removeUI(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
      this.container = null;
      this.isInjected = false;
    }
  }
}