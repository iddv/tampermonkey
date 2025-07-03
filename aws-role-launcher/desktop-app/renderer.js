const { ipcRenderer } = require('electron');

// Function to switch to a specific role
async function switchRole(accountId, roleName, displayName) {
    try {
        console.log(`Switching to role: ${roleName} in account: ${accountId}`);
        await ipcRenderer.invoke('switch-role', accountId, roleName, displayName);
        
        // Show feedback
        showNotification(`Opening ${displayName}...`, 'success');
    } catch (error) {
        console.error('Error switching role:', error);
        showNotification('Error opening role', 'error');
    }
}

// Function to open AWS console directly
async function openConsole() {
    try {
        await ipcRenderer.invoke('open-console');
        showNotification('Opening AWS Console...', 'success');
    } catch (error) {
        console.error('Error opening console:', error);
        showNotification('Error opening console', 'error');
    }
}

// Show notification function
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 10px 15px;
        border-radius: 6px;
        color: white;
        font-size: 12px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
        ${type === 'error' ? 'background: #d32f2f;' : 'background: #2e7d32;'}
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }, 3000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Make functions globally available
window.switchRole = switchRole;
window.openConsole = openConsole;