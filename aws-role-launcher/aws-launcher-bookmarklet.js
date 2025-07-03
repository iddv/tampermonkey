javascript:(function(){
    const accounts = [
        {name: "My AWS Account", accountId: "164859598862", roles: [
            {name: "ReadOnly", roleName: "ReadOnlyRole"},
            {name: "Admin", roleName: "AdminRole"}
        ]}
    ];
    
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); z-index: 999999; display: flex;
        justify-content: center; align-items: center; font-family: Arial, sans-serif;
    `;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: #232f3e; color: white; padding: 20px; border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5); min-width: 300px;
    `;
    
    let html = '<h2 style="color: #ff9900; margin-top: 0;">🚀 AWS Quick Launch</h2>';
    
    accounts.forEach(account => {
        html += `<div style="margin-bottom: 15px;">
            <div style="color: #ff9900; font-weight: bold; margin-bottom: 8px;">${account.name}</div>`;
        
        account.roles.forEach(role => {
            html += `<button onclick="window.open('https://signin.aws.amazon.com/switchrole?account=${account.accountId}&roleName=${role.roleName}&displayName=${encodeURIComponent(account.name + ' - ' + role.name)}', '_blank')" 
                style="display: block; width: 100%; margin: 4px 0; padding: 10px; 
                background: #146eb4; color: white; border: none; border-radius: 6px; 
                cursor: pointer; font-size: 13px;">${role.name}</button>`;
        });
        html += '</div>';
    });
    
    html += '<button onclick="document.body.removeChild(this.closest(\'.overlay-aws\'))" style="width: 100%; padding: 8px; background: #666; color: white; border: none; border-radius: 6px; cursor: pointer; margin-top: 10px;">Close</button>';
    
    modal.innerHTML = html;
    overlay.className = 'overlay-aws';
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    overlay.onclick = (e) => { if(e.target === overlay) document.body.removeChild(overlay); };
})();