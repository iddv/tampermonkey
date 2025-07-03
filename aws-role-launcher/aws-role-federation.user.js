// ==UserScript==
// @name         AWS Role Federation Helper
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  One-click AWS role federation for multiple accounts and roles
// @author       You
// @match        https://console.aws.amazon.com/*
// @match        https://*.console.aws.amazon.com/*
// @match        https://signin.aws.amazon.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// ==/UserScript==

(function() {
    'use strict';

    // Configuration object to store accounts and roles
    const CONFIG_KEY = 'aws_federation_config';
    
    // Default configuration structure
    const defaultConfig = {
        accounts: [
            {
                name: "Production",
                accountId: "123456789012",
                roles: [
                    { name: "ReadOnly", roleName: "ReadOnlyRole" },
                    { name: "Admin", roleName: "AdminRole" }
                ]
            },
            {
                name: "Development", 
                accountId: "210987654321",
                roles: [
                    { name: "ReadOnly", roleName: "ReadOnlyRole" },
                    { name: "Admin", roleName: "AdminRole" }
                ]
            }
        ]
    };

    // Load configuration from storage
    function loadConfig() {
        const stored = GM_getValue(CONFIG_KEY);
        return stored ? JSON.parse(stored) : defaultConfig;
    }

    // Save configuration to storage
    function saveConfig(config) {
        GM_setValue(CONFIG_KEY, JSON.stringify(config));
    }

    // Create the federation UI
    function createFederationUI() {
        // Check if UI already exists
        if (document.getElementById('aws-federation-ui')) {
            return;
        }

        const config = loadConfig();
        
        // Create main container
        const container = document.createElement('div');
        container.id = 'aws-federation-ui';
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: #232f3e;
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 12px;
            transition: all 0.3s ease;
        `;

        // Create toggle button (main button)
        const toggleBtn = document.createElement('button');
        toggleBtn.textContent = '🔄 Roles';
        toggleBtn.style.cssText = `
            background: #ff9900;
            border: none;
            color: #232f3e;
            padding: 12px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            font-size: 13px;
            box-shadow: 0 2px 8px rgba(255,153,0,0.3);
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 6px;
        `;
        
        toggleBtn.addEventListener('mouseover', () => {
            toggleBtn.style.background = '#ffb84d';
            toggleBtn.style.transform = 'translateY(-1px)';
        });
        
        toggleBtn.addEventListener('mouseout', () => {
            toggleBtn.style.background = '#ff9900';
            toggleBtn.style.transform = 'translateY(0)';
        });
        
        // Create header for expanded view
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            border-bottom: 1px solid #444;
            padding: 15px 15px 8px 15px;
        `;
        
        const title = document.createElement('h3');
        title.textContent = 'AWS Role Federation';
        title.style.cssText = 'margin: 0; color: #ff9900; font-size: 14px;';
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = `
            background: none;
            border: 1px solid #666;
            color: white;
            width: 24px;
            height: 24px;
            cursor: pointer;
            border-radius: 3px;
            font-size: 12px;
        `;
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        
        // Create content area
        const content = document.createElement('div');
        content.id = 'federation-content';
        content.style.cssText = `
            padding: 0 15px 15px 15px;
            min-width: 250px;
            max-height: 400px;
            overflow-y: auto;
            display: none;
        `;
        
        // Create accounts and roles
        config.accounts.forEach(account => {
            const accountDiv = document.createElement('div');
            accountDiv.style.cssText = 'margin-bottom: 15px;';
            
            const accountHeader = document.createElement('div');
            accountHeader.textContent = `${account.name} (${account.accountId})`;
            accountHeader.style.cssText = `
                font-weight: bold;
                color: #ff9900;
                margin-bottom: 5px;
                font-size: 13px;
            `;
            
            const rolesDiv = document.createElement('div');
            rolesDiv.style.cssText = 'margin-left: 10px;';
            
            account.roles.forEach(role => {
                const roleBtn = document.createElement('button');
                roleBtn.textContent = role.name;
                roleBtn.style.cssText = `
                    display: block;
                    width: 100%;
                    margin: 3px 0;
                    padding: 6px 10px;
                    background: #146eb4;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 11px;
                `;
                
                roleBtn.addEventListener('mouseover', () => {
                    roleBtn.style.background = '#1f7bbf';
                });
                
                roleBtn.addEventListener('mouseout', () => {
                    roleBtn.style.background = '#146eb4';
                });
                
                roleBtn.addEventListener('click', () => {
                    switchRole(account.accountId, role.roleName, account.name, role.name);
                });
                
                rolesDiv.appendChild(roleBtn);
            });
            
            accountDiv.appendChild(accountHeader);
            accountDiv.appendChild(rolesDiv);
            content.appendChild(accountDiv);
        });
        
        // Add configuration button
        const configBtn = document.createElement('button');
        configBtn.textContent = 'Configure Accounts';
        configBtn.style.cssText = `
            width: 100%;
            padding: 8px;
            background: #666;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 10px;
            font-size: 11px;
        `;
        
        configBtn.addEventListener('click', showConfigDialog);
        content.appendChild(configBtn);
        
        // Toggle functionality
        let isExpanded = false;
        toggleBtn.addEventListener('click', () => {
            if (isExpanded) {
                // Collapse
                content.style.display = 'none';
                header.style.display = 'none';
                container.style.padding = '0';
                container.style.background = 'transparent';
                container.style.boxShadow = 'none';
                isExpanded = false;
            } else {
                // Expand
                content.style.display = 'block';
                header.style.display = 'flex';
                container.style.padding = '0';
                container.style.background = '#232f3e';
                container.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                isExpanded = true;
            }
        });
        
        closeBtn.addEventListener('click', () => {
            // Collapse when close button is clicked
            content.style.display = 'none';
            header.style.display = 'none';
            container.style.padding = '0';
            container.style.background = 'transparent';
            container.style.boxShadow = 'none';
            isExpanded = false;
        });
        
        // Build the container structure
        container.appendChild(toggleBtn);
        container.appendChild(header);
        container.appendChild(content);
        document.body.appendChild(container);
    }

    // Switch to specified role
    function switchRole(accountId, roleName, accountName, roleDisplayName) {
        console.log(`Switching to role: ${roleName} in account: ${accountId}`);
        
        // Show loading indicator
        showNotification(`Switching to ${roleDisplayName} in ${accountName}...`, 'info');
        
        // Construct the role switch URL
        const roleArn = `arn:aws:iam::${accountId}:role/${roleName}`;
        const switchRoleUrl = `https://signin.aws.amazon.com/switchrole?` +
            `account=${accountId}&` +
            `roleName=${roleName}&` +
            `displayName=${encodeURIComponent(accountName + ' - ' + roleDisplayName)}`;
        
        // Navigate to role switch URL
        window.location.href = switchRoleUrl;
    }

    // Show notification
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 20px;
            padding: 10px 15px;
            border-radius: 4px;
            color: white;
            z-index: 10001;
            font-family: Arial, sans-serif;
            font-size: 12px;
            ${type === 'error' ? 'background: #d32f2f;' : 'background: #2e7d32;'}
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    // Show configuration dialog
    function showConfigDialog() {
        const config = loadConfig();
        
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            z-index: 10002;
            display: flex;
            justify-content: center;
            align-items: center;
        `;
        
        // Create modal content
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white;
            padding: 20px;
            border-radius: 8px;
            width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            font-family: Arial, sans-serif;
        `;
        
        modal.innerHTML = `
            <h2 style="margin-top: 0; color: #232f3e;">Configure AWS Accounts & Roles</h2>
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Configuration JSON:</label>
                <textarea id="config-textarea" style="width: 100%; height: 300px; font-family: monospace; font-size: 12px; padding: 10px; border: 1px solid #ccc; border-radius: 4px;">${JSON.stringify(config, null, 2)}</textarea>
            </div>
            <div style="text-align: right;">
                <button id="cancel-config" style="margin-right: 10px; padding: 8px 15px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
                <button id="save-config" style="padding: 8px 15px; background: #146eb4; color: white; border: none; border-radius: 4px; cursor: pointer;">Save</button>
            </div>
            <div style="margin-top: 15px; padding: 10px; background: #f5f5f5; border-radius: 4px; font-size: 11px;">
                <strong>Configuration Format:</strong><br>
                • accounts: Array of account objects<br>
                • Each account needs: name, accountId, roles array<br>
                • Each role needs: name (display), roleName (actual IAM role name)
            </div>
        `;
        
        // Add event listeners
        modal.querySelector('#cancel-config').addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
        
        modal.querySelector('#save-config').addEventListener('click', () => {
            try {
                const newConfig = JSON.parse(modal.querySelector('#config-textarea').value);
                saveConfig(newConfig);
                showNotification('Configuration saved successfully!', 'success');
                document.body.removeChild(overlay);
                
                // Refresh the UI
                const existingUI = document.getElementById('aws-federation-ui');
                if (existingUI) {
                    existingUI.parentNode.removeChild(existingUI);
                }
                setTimeout(createFederationUI, 100);
            } catch (error) {
                showNotification('Invalid JSON configuration!', 'error');
            }
        });
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
            }
        });
    }

    // Initialize the script
    function init() {
        // Wait for page to load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
            return;
        }
        
        // Create UI after a short delay to ensure page is ready
        setTimeout(createFederationUI, 1000);
    }

    // Start the script
    init();
})();