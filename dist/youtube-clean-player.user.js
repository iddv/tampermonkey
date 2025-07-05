// ==UserScript==
// @name         YouTube Clean Player
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Enhanced YouTube experience with configurable Shorts redirect, better settings UI, and distraction removal
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
    
    // Configuration object with persistent storage
    const CONFIG = {
        autoRedirect: GM_getValue('ytcp_autoRedirect', true), // Default ON per zen recommendation
        hideEndScreenSuggestions: GM_getValue('ytcp_hideEndScreenSuggestions', true),
        removeShortsFromFeed: GM_getValue('ytcp_removeShortsFromFeed', true),
        hideComments: GM_getValue('ytcp_hideComments', false),
        hideSidebar: GM_getValue('ytcp_hideSidebar', false)
    };
    
    // Save config to storage
    function saveConfig() {
        Object.keys(CONFIG).forEach(key => {
            GM_setValue(`ytcp_${key}`, CONFIG[key]);
        });
    }
    
    // Add enhanced CSS styles
    function addCleaningStyles() {
        const styles = [];
        
        if (CONFIG.hideEndScreenSuggestions) {
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

        // Add settings modal and redirect button styles
        styles.push(`
            /* Settings Modal */
            .ytcp-settings-backdrop {
                position: fixed;
                top: 0; left: 0;
                width: 100vw; height: 100vh;
                background-color: rgba(0, 0, 0, 0.7);
                z-index: 10000;
                display: none;
                align-items: center;
                justify-content: center;
                font-family: "Roboto", "Arial", sans-serif;
            }
            .ytcp-settings-modal {
                background-color: #282828;
                color: #fff;
                padding: 24px;
                border-radius: 12px;
                width: 420px;
                max-width: 90vw;
            }
            .ytcp-settings-modal h2 {
                margin: 0 0 24px 0;
                font-size: 20px;
                font-weight: 400;
            }
            .ytcp-settings-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
                font-size: 14px;
            }
            .ytcp-settings-row:last-of-type {
                margin-bottom: 24px;
            }
            .ytcp-switch { 
                position: relative; 
                display: inline-block; 
                width: 50px; 
                height: 28px; 
            }
            .ytcp-switch input { 
                opacity: 0; 
                width: 0; 
                height: 0; 
            }
            .ytcp-slider { 
                position: absolute; 
                cursor: pointer; 
                top: 0; left: 0; right: 0; bottom: 0; 
                background-color: #ccc; 
                transition: .3s; 
                border-radius: 28px; 
            }
            .ytcp-slider:before { 
                position: absolute; 
                content: ""; 
                height: 20px; 
                width: 20px; 
                left: 4px; 
                bottom: 4px; 
                background-color: white; 
                transition: .3s; 
                border-radius: 50%; 
            }
            input:checked + .ytcp-slider { 
                background-color: #3ea6ff; 
            }
            input:checked + .ytcp-slider:before { 
                transform: translateX(22px); 
            }
            .ytcp-close-btn {
                background-color: #3ea6ff;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 8px 16px;
                cursor: pointer;
                font-size: 14px;
                float: right;
            }
            .ytcp-close-btn:hover {
                background-color: #1976d2;
            }
            .ytcp-note {
                font-size: 12px; 
                color: #aaa; 
                margin-top: 8px;
                line-height: 1.3;
            }

            /* Redirect Button */
            .ytcp-redirect-button {
                position: fixed;
                bottom: 85px;
                right: 20px;
                z-index: 9998;
                background-color: #ff0000;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 10px 16px;
                font-size: 14px;
                font-family: "Roboto", "Arial", sans-serif;
                font-weight: 500;
                cursor: pointer;
                box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                transition: background-color 0.3s;
            }
            .ytcp-redirect-button:hover {
                background-color: #cc0000;
            }
        `);
        
        if (styles.length > 0) {
            GM_addStyle(styles.join('\n'));
        }
    }

    // Shorts redirect handler
    function handleShortsRedirect() {
        if (!CONFIG.autoRedirect) return;
        
        const currentUrl = window.location.href;
        
        if (currentUrl.includes('/shorts/')) {
            const videoId = currentUrl.match(/\/shorts\/([^?&]+)/)?.[1];
            if (videoId) {
                const newUrl = `https://www.youtube.com/watch?v=${videoId}`;
                console.log('YouTube Clean Player: Auto-redirecting Shorts to regular video');
                window.location.replace(newUrl);
                return;
            }
        }
    }

    // Inject "View as Video" button for manual redirect
    function injectRedirectButton() {
        // Prevent duplicate buttons
        if (document.querySelector('.ytcp-redirect-button')) return;

        const button = document.createElement('button');
        button.className = 'ytcp-redirect-button';
        button.textContent = '📺 View as Video';
        button.title = 'Convert this Short to regular video format (Shift+V)';
        
        button.addEventListener('click', () => {
            const currentUrl = window.location.href;
            if (currentUrl.includes('/shorts/')) {
                const videoId = currentUrl.match(/\/shorts\/([^?&]+)/)?.[1];
                if (videoId) {
                    const newUrl = `https://www.youtube.com/watch?v=${videoId}`;
                    window.location.replace(newUrl);
                }
            }
        });

        document.body.appendChild(button);
    }

    // Remove redirect button (cleanup)
    function removeRedirectButton() {
        const button = document.querySelector('.ytcp-redirect-button');
        if (button) {
            button.remove();
        }
    }

    // Create settings modal
    function createSettingsModal() {
        // Prevent duplicate modals
        if (document.querySelector('#ytcp-settings-backdrop')) return;

        const backdrop = document.createElement('div');
        backdrop.id = 'ytcp-settings-backdrop';
        backdrop.className = 'ytcp-settings-backdrop';
        
        backdrop.innerHTML = `
            <div class="ytcp-settings-modal">
                <h2>🎥 Clean Player Settings</h2>
                <div class="ytcp-settings-row">
                    <label for="ytcp-auto-redirect">Auto-redirect all Shorts</label>
                    <label class="ytcp-switch">
                        <input type="checkbox" id="ytcp-auto-redirect" ${CONFIG.autoRedirect ? 'checked' : ''}>
                        <span class="ytcp-slider"></span>
                    </label>
                </div>
                <div class="ytcp-settings-row">
                    <label for="ytcp-hide-suggestions">Hide end-screen suggestions</label>
                    <label class="ytcp-switch">
                        <input type="checkbox" id="ytcp-hide-suggestions" ${CONFIG.hideEndScreenSuggestions ? 'checked' : ''}>
                        <span class="ytcp-slider"></span>
                    </label>
                </div>
                <div class="ytcp-settings-row">
                    <label for="ytcp-remove-shorts">Remove Shorts from feeds</label>
                    <label class="ytcp-switch">
                        <input type="checkbox" id="ytcp-remove-shorts" ${CONFIG.removeShortsFromFeed ? 'checked' : ''}>
                        <span class="ytcp-slider"></span>
                    </label>
                </div>
                <div class="ytcp-settings-row">
                    <label for="ytcp-hide-comments">Hide comments section</label>
                    <label class="ytcp-switch">
                        <input type="checkbox" id="ytcp-hide-comments" ${CONFIG.hideComments ? 'checked' : ''}>
                        <span class="ytcp-slider"></span>
                    </label>
                </div>
                <div class="ytcp-settings-row">
                    <label for="ytcp-hide-sidebar">Hide video sidebar</label>
                    <label class="ytcp-switch">
                        <input type="checkbox" id="ytcp-hide-sidebar" ${CONFIG.hideSidebar ? 'checked' : ''}>
                        <span class="ytcp-slider"></span>
                    </label>
                </div>
                <div class="ytcp-note">
                    💡 When auto-redirect is off, a "View as Video" button will appear on Shorts.<br>
                    ⌨️ Keyboard shortcut: <strong>Shift+V</strong> to manually convert any Short.
                </div>
                <button class="ytcp-close-btn" id="ytcp-close-settings">Close</button>
                <div style="clear: both;"></div>
            </div>
        `;

        // Close modal when clicking backdrop
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                closeSettingsModal();
            }
        });

        // Setup toggle handlers and close button
        const closeBtn = backdrop.querySelector('#ytcp-close-settings');
        closeBtn.addEventListener('click', closeSettingsModal);

        // Add change listeners for all toggles
        ['auto-redirect', 'hide-suggestions', 'remove-shorts', 'hide-comments', 'hide-sidebar'].forEach(setting => {
            const checkbox = backdrop.querySelector(`#ytcp-${setting}`);
            checkbox.addEventListener('change', updateConfigFromUI);
        });

        document.body.appendChild(backdrop);
    }

    // Update config from UI toggles
    function updateConfigFromUI() {
        const newConfig = {
            autoRedirect: document.querySelector('#ytcp-auto-redirect').checked,
            hideEndScreenSuggestions: document.querySelector('#ytcp-hide-suggestions').checked,
            removeShortsFromFeed: document.querySelector('#ytcp-remove-shorts').checked,
            hideComments: document.querySelector('#ytcp-hide-comments').checked,
            hideSidebar: document.querySelector('#ytcp-hide-sidebar').checked
        };

        // Update global config
        Object.assign(CONFIG, newConfig);
        saveConfig();
        
        console.log('YouTube Clean Player: Settings updated. Refresh page to apply all changes.');
    }

    // Close settings modal
    function closeSettingsModal() {
        const backdrop = document.querySelector('#ytcp-settings-backdrop');
        if (backdrop) {
            backdrop.style.display = 'none';
        }
    }

    // Show settings modal
    function showSettingsModal() {
        createSettingsModal();
        const backdrop = document.querySelector('#ytcp-settings-backdrop');
        if (backdrop) {
            backdrop.style.display = 'flex';
        }
    }

    // Setup settings menu injection with MutationObserver
    function setupSettingsMenu() {
        const menuButton = document.querySelector('#button.ytd-topbar-menu-button-renderer');
        if (!menuButton || menuButton.dataset.ytcpListenerAttached) {
            return;
        }

        menuButton.addEventListener('click', () => {
            const observer = new MutationObserver((mutations, obs) => {
                // Try multiple selectors for robustness
                const menu = document.querySelector('tp-yt-paper-listbox#items') || 
                            document.querySelector('ytd-menu-popup-renderer tp-yt-paper-listbox') ||
                            document.querySelector('[role="menu"] [role="menuitem"]')?.parentElement;
                
                if (menu) {
                    injectMenuItem(menu);
                    obs.disconnect();
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            // Fallback timeout in case MutationObserver fails
            setTimeout(() => observer.disconnect(), 2000);
        });

        menuButton.dataset.ytcpListenerAttached = 'true';
    }

    // Inject settings menu item
    function injectMenuItem(menu) {
        // Check if our item is already there
        if (document.querySelector('#ytcp-settings-menu-item')) {
            return;
        }

        // Try to find an existing item to clone for styling
        const originalItem = menu.querySelector('a.ytd-compact-link-renderer') || 
                           menu.querySelector('[role="menuitem"]') ||
                           menu.querySelector('tp-yt-paper-item');
        
        if (originalItem) {
            const settingsItem = originalItem.cloneNode(true);
            settingsItem.id = 'ytcp-settings-menu-item';
            settingsItem.href = '#';
            
            // Update text content
            const textElement = settingsItem.querySelector('yt-formatted-string') || 
                              settingsItem.querySelector('.text') ||
                              settingsItem;
            if (textElement) {
                textElement.textContent = '🎥 Clean Player Settings';
            }

            settingsItem.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                showSettingsModal();
                // Close YouTube menu
                document.body.click();
            });

            menu.appendChild(settingsItem);
        }
    }

    // Keyboard shortcuts
    function setupKeyboardShortcuts() {
        // Only attach once
        if (window.ytcpKeyboardAttached) return;
        
        document.addEventListener('keydown', (e) => {
            // Shift+V to manually convert any Short
            if (e.shiftKey && e.key.toLowerCase() === 'v') {
                if (window.location.pathname.startsWith('/shorts/')) {
                    const videoId = window.location.href.match(/\/shorts\/([^?&]+)/)?.[1];
                    if (videoId) {
                        window.location.replace(`https://www.youtube.com/watch?v=${videoId}`);
                    }
                }
            }
        });
        
        window.ytcpKeyboardAttached = true;
    }

    // Register legacy menu commands for compatibility
    function registerMenuCommands() {
        GM_registerMenuCommand('🎥 Clean Player Settings', showSettingsModal);
        GM_registerMenuCommand('🔄 Toggle Auto-redirect', () => {
            CONFIG.autoRedirect = !CONFIG.autoRedirect;
            saveConfig();
            alert(`Auto-redirect ${CONFIG.autoRedirect ? 'enabled' : 'disabled'}. Refresh page to apply.`);
        });
    }

    // Handle page-specific logic
    function handlePageLogic() {
        const isShorts = window.location.pathname.startsWith('/shorts/');
        
        if (isShorts) {
            if (CONFIG.autoRedirect) {
                handleShortsRedirect();
            } else {
                // Add manual redirect button after a delay to ensure page is loaded
                setTimeout(injectRedirectButton, 500);
            }
        } else {
            // Clean up redirect button when not on Shorts
            removeRedirectButton();
        }
    }

    // Main initialization function
    function init() {
        console.log('YouTube Clean Player v0.2 loaded');
        
        // Always add base styles
        addCleaningStyles();
        
        // Handle current page
        handlePageLogic();

        // Setup UI components
        setupSettingsMenu();
        setupKeyboardShortcuts();
        registerMenuCommands();
        
        // Make API available for console access
        window.YTCP_API = {
            config: CONFIG,
            saveConfig: saveConfig,
            showSettings: showSettingsModal,
            forceRedirect: () => {
                if (window.location.pathname.startsWith('/shorts/')) {
                    const videoId = window.location.pathname.split('/shorts/')[1];
                    if (videoId) {
                        window.location.replace(`https://www.youtube.com/watch?v=${videoId}`);
                    }
                }
            }
        };
    }

    // Handle YouTube SPA navigation
    function handleNavigation() {
        // Re-run page logic on navigation
        setTimeout(handlePageLogic, 100);
    }

    // Start the script
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Handle YouTube SPA navigation with native event
    window.addEventListener('yt-navigate-finish', handleNavigation);
    
})();