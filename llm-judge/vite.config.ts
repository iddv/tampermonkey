import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'LLM Judge',
        namespace: 'https://github.com/your-username/tampermonkey-scripts',
        version: '2.0.0',
        description: 'Evaluate web content using Large Language Models (OpenAI GPT, Anthropic Claude)',
        author: 'Your Name',
        match: ['*://*/*'],
        grant: [
          'GM_setValue',
          'GM_getValue',
          'GM_deleteValue',
          'GM_xmlhttpRequest',
          'GM_registerMenuCommand',
          'GM_addStyle'
        ],
        connect: [
          'api.openai.com',
          'api.anthropic.com'
        ],
        icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzRDQUY1MCIvPgo8cGF0aCBkPSJNOCAxNkMxMiAxNiAxNiAxMiAxNiA4QzE2IDEyIDIwIDE2IDI0IDE2QzIwIDE2IDE2IDIwIDE2IDI0QzE2IDIwIDEyIDE2IDggMTZaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K'
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