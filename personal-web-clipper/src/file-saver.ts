/**
 * File System Access API wrapper for saving files locally
 */

export class FileSaver {
  /**
   * Check if File System Access API is supported
   */
  static isSupported(): boolean {
    return 'showSaveFilePicker' in window;
  }

  /**
   * Save content as a file using File System Access API
   */
  static async saveMarkdownFile(content: string, suggestedName: string): Promise<boolean> {
    if (!this.isSupported()) {
      this.fallbackSave(content, suggestedName);
      return false;
    }

    try {
      // Clean the filename for cross-platform compatibility
      const cleanName = this.sanitizeFilename(suggestedName);
      
      const fileHandle = await (window as any).showSaveFilePicker({
        suggestedName: `${cleanName}.md`,
        types: [{
          description: 'Markdown files',
          accept: {
            'text/markdown': ['.md'],
            'text/plain': ['.txt']
          }
        }]
      });

      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();

      return true;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // User cancelled the save dialog
        return false;
      }
      
      console.error('Error saving file:', error);
      // Fallback to download
      this.fallbackSave(content, suggestedName);
      return false;
    }
  }

  /**
   * Fallback method for browsers that don't support File System Access API
   */
  private static fallbackSave(content: string, suggestedName: string): void {
    const cleanName = this.sanitizeFilename(suggestedName);
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${cleanName}.md`;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  /**
   * Sanitize filename for cross-platform compatibility
   */
  private static sanitizeFilename(filename: string): string {
    // Remove or replace characters that are invalid in filenames
    return filename
      .replace(/[<>:"/\\|?*]/g, '-')  // Replace invalid chars with dash
      .replace(/\s+/g, ' ')          // Normalize whitespace
      .replace(/\.+$/, '')           // Remove trailing dots
      .trim()                        // Remove leading/trailing spaces
      .substring(0, 100);            // Limit length
  }

  /**
   * Save selected text as a highlight/note
   */
  static async saveHighlight(selectedText: string, context: string, url: string): Promise<boolean> {
    const timestamp = new Date().toISOString();
    const content = `# Web Highlight

**URL:** [${url}](${url})  
**Date:** ${new Date().toLocaleString()}  
**Context:** ${context}

## Selected Text

> ${selectedText.split('\n').join('\n> ')}

---

*Saved with Personal Web Clipper*
`;

    const filename = `highlight-${new Date().toISOString().split('T')[0]}-${Date.now()}`;
    return this.saveMarkdownFile(content, filename);
  }
}