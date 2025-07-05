/**
 * Simple HTML to Markdown converter
 * Handles basic HTML elements commonly found in articles
 */

export class MarkdownConverter {
  /**
   * Convert HTML element to Markdown using recursive approach
   */
  static htmlToMarkdown(element: HTMLElement): string {
    return this.cleanupMarkdown(this.processNode(element));
  }

  /**
   * Recursively process a node and its children
   */
  private static processNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      // Do not trim whitespace from text nodes. It is significant for spacing 
      // between elements. The final cleanup functions will handle extra whitespace.
      const text = node.textContent || '';
      return this.escapeMarkdown(text);
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const tagName = element.tagName.toLowerCase();
      
      // Handle special elements that we want to convert directly
      const directConversion = this.getDirectConversion(element, tagName);
      if (directConversion !== null) {
        return directConversion;
      }

      // For other elements, process their children
      let result = '';
      for (const child of element.childNodes) {
        result += this.processNode(child);
      }
      
      // Apply element-specific formatting to the processed children
      return this.wrapWithElementFormatting(result, tagName);
    }

    return '';
  }

  /**
   * Get direct conversion for elements that should be processed as a whole
   */
  private static getDirectConversion(element: HTMLElement, tagName: string): string | null {
    const text = element.textContent?.trim() || '';
    
    switch (tagName) {
      case 'code':
        return `\`${text}\``;
      case 'pre':
        return `\n\`\`\`\n${text}\n\`\`\`\n\n`;
      case 'ul':
        return this.convertList(element, false);
      case 'ol':
        return this.convertList(element, true);
      case 'a':
        const href = element.getAttribute('href');
        if (href && href.startsWith('http')) {
          return `[${text}](${href})`;
        }
        return text;
      case 'img':
        const src = element.getAttribute('src');
        const alt = element.getAttribute('alt') || 'Image';
        if (src) {
          return `![${alt}](${src})`;
        }
        return '';
      case 'br':
        return '\n';
      case 'hr':
        return '\n---\n\n';
      default:
        return null; // Let recursive processing handle this
    }
  }

  /**
   * Wrap processed content with element-specific formatting
   */
  private static wrapWithElementFormatting(content: string, tagName: string): string {
    const trimmedContent = content.trim();
    if (!trimmedContent) return '';

    switch (tagName) {
      case 'h1':
        return `\n# ${trimmedContent}\n\n`;
      case 'h2':
        return `\n## ${trimmedContent}\n\n`;
      case 'h3':
        return `\n### ${trimmedContent}\n\n`;
      case 'h4':
        return `\n#### ${trimmedContent}\n\n`;
      case 'h5':
        return `\n##### ${trimmedContent}\n\n`;
      case 'h6':
        return `\n###### ${trimmedContent}\n\n`;
      case 'blockquote':
        return '\n' + trimmedContent.split('\n').filter(Boolean).map(line => `> ${line}`).join('\n') + '\n\n';
      case 'p':
        return `\n${trimmedContent}\n\n`;
      case 'strong':
      case 'b':
        return `**${trimmedContent}**`;
      case 'em':
      case 'i':
        return `*${trimmedContent}*`;
      case 'li':
        return ''; // Handled by ul/ol conversion
      default:
        return content;
    }
  }


  /**
   * Convert lists to Markdown
   */
  private static convertList(listElement: HTMLElement, ordered: boolean): string {
    let markdown = '\n';
    let itemIndex = 1;
    
    for (const item of Array.from(listElement.children)) {
      if (item.tagName.toLowerCase() === 'li') {
        const prefix = ordered ? `${itemIndex++}. ` : '- ';
        let itemContent = '';
        
        for (const child of Array.from(item.childNodes)) {
          itemContent += this.processNode(child);
        }
        
        // Handle nested lists by indenting them
        const processedContent = itemContent.trim().replace(/\n/g, '\n  ');
        markdown += `${prefix}${processedContent}\n`;
      }
    }
    
    return markdown + '\n';
  }

  /**
   * Escape special Markdown characters in text
   */
  private static escapeMarkdown(text: string): string {
    // Escape common Markdown special characters (but not - and . which are too aggressive)
    return text
      .replace(/\\/g, '\\\\')
      .replace(/\*/g, '\\*')
      .replace(/_/g, '\\_')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/#/g, '\\#')
      .replace(/\+/g, '\\+')
      .replace(/!/g, '\\!');
  }

  /**
   * Clean up the final Markdown
   */
  private static cleanupMarkdown(markdown: string): string {
    return markdown
      // Remove excessive whitespace
      .replace(/\n{3,}/g, '\n\n')
      // Remove trailing spaces
      .replace(/ +$/gm, '')
      // Trim the entire string
      .trim();
  }

  /**
   * Create a complete Markdown document with metadata
   */
  static createMarkdownDocument(title: string, content: string, url: string, timestamp: string): string {
    const frontMatter = `---
title: "${title.replace(/"/g, '\\"')}"
url: "${url}"
clipped: "${timestamp}"
source: "Personal Web Clipper"
---

`;

    return frontMatter + `# ${title}\n\n${content}\n\n---\n\n**Source:** [${url}](${url})  \n**Clipped:** ${new Date(timestamp).toLocaleString()}`;
  }
}