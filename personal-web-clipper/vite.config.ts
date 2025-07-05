import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'Personal Web Clipper & Organizer',
        namespace: 'https://github.com/your-username/tampermonkey-scripts',
        version: '1.1.0',
        description: 'Clip articles and web content to local Markdown files with File System Access API',
        author: 'Tampermonkey Scripts Collection',
        match: [
          'https://*/*',
          'http://*/*'
        ],
        exclude: [
          'https://accounts.google.com/*',
          'https://login.microsoftonline.com/*',
          'https://*.bank*',
          'https://chrome://*',
          'https://moz-extension://*'
        ],
        grant: [
          'GM_setValue',
          'GM_getValue',
          'GM_deleteValue',
          'GM_addStyle',
          'GM_registerMenuCommand',
          'GM_notification'
        ],
        icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzJENzJEMiIvPgo8cGF0aCBkPSJNOSA5SDE1VjE1SDlWOVoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xNyA5SDIzVjE1SDE3VjlaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNOSAxN0gxNVYyM0g5VjE3WiIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTE3IDE3SDIzVjIzSDE3VjE3WiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cg=='
      },
      build: {
        externalGlobals: {
          // Keep dependencies minimal for userscripts
        }
      }
    })
  ],
  build: {
    target: 'es2020',
    minify: false // Recommended for userscripts
  }
});