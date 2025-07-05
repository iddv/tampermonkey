// ==UserScript==
// @name         IDDV's Tampermonkey Collection
// @namespace    https://github.com/iddv/tampermonkey
// @version      1.0.0
// @description  One-click installer for AWS Role Launcher, LLM Judge, Personal Web Clipper, and YouTube Clean Player userscripts
// @author       IDDV
// @match        *://*.amazon.com/*
// @match        *://*.amazonaws.com/*
// @match        *://*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @connect      api.openai.com
// @connect      api.anthropic.com
// @downloadURL  https://github.com/iddv/tampermonkey/raw/main/dist/tampermonkey-collection.user.js
// @updateURL    https://github.com/iddv/tampermonkey/raw/main/dist/tampermonkey-collection.user.js
// @require      https://github.com/iddv/tampermonkey/raw/main/dist/aws-role-federation.user.js
// @require      https://github.com/iddv/tampermonkey/raw/main/dist/llm-judge.user.js
// @require      https://github.com/iddv/tampermonkey/raw/main/dist/personal-web-clipper.user.js
// @require      https://github.com/iddv/tampermonkey/raw/main/dist/youtube-clean-player.user.js
// ==/UserScript==

(function() {
    'use strict';
    
    // Collection script loaded - individual scripts will initialize themselves
    console.log('🚀 IDDV Tampermonkey Collection loaded successfully!');
    console.log('📦 Included scripts: AWS Role Launcher, LLM Judge, Personal Web Clipper, YouTube Clean Player');
    
    // Optional: Add a menu command to show info about loaded scripts
    if (typeof GM_registerMenuCommand !== 'undefined') {
        GM_registerMenuCommand('ℹ️ About Collection', () => {
            alert('IDDV Tampermonkey Collection v1.0.0\n\nLoaded Scripts:\n• AWS Role Launcher - Quick AWS role switching\n• LLM Judge - AI content evaluation\n• Personal Web Clipper - Save articles to local Markdown files\n• YouTube Clean Player - Clean YouTube experience\n\nRepository: https://github.com/iddv/tampermonkey');
        });
    }
})();
