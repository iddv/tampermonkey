// ==UserScript==
// @name         YouTube Clean Player
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Redirects Shorts, hides end-screen suggestions, and removes Shorts from feeds
// @author       IDDV
// @match        *://www.youtube.com/*
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';
    
    // Configuration object - ready for future enhancement
    const CONFIG = {
        redirectShorts: GM_getValue('redirectShorts', true),
        hideEndScreenSuggestions: GM_getValue('hideEndScreenSuggestions', true),
        removeShortsFromFeed: GM_getValue('removeShortsFromFeed', true),
        hideComments: GM_getValue('hideComments', false),
        hideSidebar: GM_getValue('hideSidebar', false)
    };
    
    // Save config to storage
    function saveConfig() {
        Object.keys(CONFIG).forEach(key => {
            GM_setValue(key, CONFIG[key]);
        });
    }
    
    // Shorts redirect handler
    function handleShortsRedirect() {
        if (!CONFIG.redirectShorts) return;
        
        const currentUrl = window.location.href;
        
        // Redirect Shorts to regular watch URL
        if (currentUrl.includes('/shorts/')) {
            const videoId = currentUrl.match(/\/shorts\/([^?&]+)/)?.[1];
            if (videoId) {
                const newUrl = `https://www.youtube.com/watch?v=${videoId}`;
                console.log('YouTube Clean Player: Redirecting Shorts to regular video:', newUrl);
                window.location.replace(newUrl);
                return;
            }
        }
    }
    
    // Add CSS to hide unwanted elements
    function addCleaningStyles() {
        const styles = [];
        
        if (CONFIG.hideEndScreenSuggestions) {
            // Hide end screen suggestions and overlay elements
            styles.push(`
                .ytp-ce-element,
                .ytp-cards-teaser,
                .ytp-pause-overlay,
                .ytp-scroll-min,
                .ytp-suggestion-set {
                    display: none !important;
                }
            `);
        }
        
        if (CONFIG.removeShortsFromFeed) {
            // Hide Shorts from various feed locations
            styles.push(`
                /* Hide Shorts shelf on homepage */
                ytd-rich-shelf-renderer[is-shorts],
                ytd-reel-shelf-renderer,
                
                /* Hide individual Shorts in feeds */
                ytd-video-renderer[is-shorts],
                ytd-grid-video-renderer[is-shorts],
                
                /* Hide Shorts tab in channel pages */
                tp-yt-paper-tab[aria-label*="Shorts"],
                
                /* Hide Shorts from search results */
                ytd-video-renderer:has([overlay-style="SHORTS"]),
                
                /* Hide "Shorts remixing this video" sections */
                ytd-reel-shelf-renderer:has([title*="Shorts"]) {
                    display: none !important;
                }
            `);
        }
        
        if (CONFIG.hideComments) {
            styles.push(`
                #comments,
                ytd-comments,
                #related #comments {
                    display: none !important;
                }
            `);
        }
        
        if (CONFIG.hideSidebar) {
            styles.push(`
                #secondary,
                #secondary-inner {
                    display: none !important;
                }
                
                #primary {
                    margin-right: 0 !important;
                }
            `);
        }
        
        if (styles.length > 0) {
            GM_addStyle(styles.join('\n'));
        }
    }
    
    
    // Settings menu
    function showSettings() {
        const settings = [
            `YouTube Clean Player Settings:`,
            ``,
            `Current Configuration:`,
            `• Redirect Shorts: ${CONFIG.redirectShorts ? '✅' : '❌'}`,
            `• Hide End-screen Suggestions: ${CONFIG.hideEndScreenSuggestions ? '✅' : '❌'}`,
            `• Remove Shorts from Feed: ${CONFIG.removeShortsFromFeed ? '✅' : '❌'}`,
            `• Hide Comments: ${CONFIG.hideComments ? '✅' : '❌'}`,
            `• Hide Sidebar: ${CONFIG.hideSidebar ? '✅' : '❌'}`,
            ``,
            `To toggle features, use the Tampermonkey menu commands for this script.`,
            `A page refresh may be needed for some changes to apply.`
        ].join('\n');
        
        alert(settings);
    }
    
    // Register menu commands
    GM_registerMenuCommand('⚙️ YouTube Clean Player Settings', showSettings);
    GM_registerMenuCommand('🔄 Toggle Shorts Redirect', () => {
        CONFIG.redirectShorts = !CONFIG.redirectShorts;
        saveConfig();
        alert(`Shorts redirect ${CONFIG.redirectShorts ? 'enabled' : 'disabled'}. Refresh page to apply.`);
    });
    GM_registerMenuCommand('👁️ Toggle Shorts in Feed', () => {
        CONFIG.removeShortsFromFeed = !CONFIG.removeShortsFromFeed;
        saveConfig();
        alert(`Shorts removal from feed ${CONFIG.removeShortsFromFeed ? 'enabled' : 'disabled'}. Refresh page to apply.`);
    });
    
    // Make CONFIG and saveConfig available globally for console access
    window.YT_CLEAN_CONFIG = CONFIG;
    window.YT_CLEAN_SAVE = saveConfig;
    
    // Initialize the script
    function init() {
        console.log('YouTube Clean Player v0.1 loaded');
        
        // Handle immediate Shorts redirect
        handleShortsRedirect();
        
        // Add cleaning styles
        addCleaningStyles();
        
        // Handle navigation changes (YouTube SPA) - use YouTube's native event
        window.addEventListener('yt-navigate-finish', handleShortsRedirect);
    }
    
    // Start the script
    init();
    
})();