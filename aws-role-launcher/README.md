# 🚀 AWS Role Launcher

Quick access to AWS accounts and roles from anywhere - multiple launcher options including Tampermonkey script, browser bookmarklet, HTML launcher, and desktop application.

## 📋 Overview

This collection provides several ways to quickly switch between AWS roles without navigating through the AWS console manually. Perfect for developers and administrators who frequently switch between different AWS accounts and roles.

## 🎯 Features

- **One-click role switching** - No more manual navigation
- **Multiple launcher options** - Choose what works best for your workflow
- **Clean, professional interface** - AWS-themed design
- **Support for multiple accounts** - Manage multiple AWS accounts easily
- **Configurable roles** - ReadOnly, Admin, or custom roles
- **Cross-platform compatibility** - Works on Linux, Windows, and macOS

## 📁 Files Structure

```
aws-role-launcher/
├── README.md                           # This file
├── aws-role-federation.user.js         # Tampermonkey script (in-console widget)
├── aws-launcher.html                   # Standalone HTML launcher
├── aws-launcher-bookmarklet.js         # Browser bookmarklet
└── desktop-app/                        # Electron desktop application
    ├── package.json
    ├── main.js
    ├── index.html
    ├── style.css
    └── renderer.js
```

## 🚀 Quick Start Options

### Option 1: HTML Launcher (Recommended)
**Best for**: Quick setup, beautiful interface, can be bookmarked

1. Open `aws-launcher.html` in your browser
2. Bookmark the page or create a desktop shortcut
3. Click role buttons to launch AWS with pre-filled switching details

### Option 2: Browser Bookmarklet
**Best for**: Universal access from any webpage

1. Copy the content from `aws-launcher-bookmarklet.js`
2. Create a new bookmark in your browser
3. Set name to "🚀 AWS Launcher"
4. Paste the JavaScript code as the URL
5. Click the bookmark from any webpage

### Option 3: Tampermonkey Script
**Best for**: Integration within AWS console

1. Install [Tampermonkey](https://www.tampermonkey.net/) browser extension
2. Copy content from `aws-role-federation.user.js`
3. Create new script in Tampermonkey dashboard
4. Paste and save the script
5. Widget appears in bottom-left of AWS console pages

### Option 4: Desktop Application
**Best for**: Native app experience, taskbar integration

```bash
cd desktop-app
npm install
npm start

# To build executable
npm run dist
```

## ⚙️ Configuration

All launchers use the same configuration format. Update the accounts array in each file:

```javascript
const accounts = [
    {
        name: "Production Account",
        accountId: "111111111111",
        roles: [
            { name: "ReadOnly", roleName: "ReadOnlyRole" },
            { name: "Admin", roleName: "AdminRole" }
        ]
    },
    {
        name: "Development Account",
        accountId: "222222222222", 
        roles: [
            { name: "Developer", roleName: "DeveloperRole" },
            { name: "Admin", roleName: "AdminRole" }
        ]
    }
];
```

### Default Configuration
- **Account ID**: `164859598862`
- **Account Name**: "My AWS Account"
- **Roles**: ReadOnlyRole, AdminRole

## 🔧 Prerequisites

### AWS IAM Setup
You need proper IAM roles and permissions configured:

1. **IAM Roles**: Create roles with appropriate policies
   - `ReadOnlyRole` with `ReadOnlyAccess` policy
   - `AdminRole` with `AdministratorAccess` policy

2. **Trust Relationships**: Roles must trust your account
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": {
           "AWS": "arn:aws:iam::YOUR_ACCOUNT_ID:root"
         },
         "Action": "sts:AssumeRole"
       }
     ]
   }
   ```

3. **User Permissions**: Your IAM user needs `sts:AssumeRole` permission
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": "sts:AssumeRole",
         "Resource": [
           "arn:aws:iam::ACCOUNT_ID:role/ReadOnlyRole",
           "arn:aws:iam::ACCOUNT_ID:role/AdminRole"
         ]
       }
     ]
   }
   ```

## 🎨 Interface Preview

### HTML Launcher
- Beautiful gradient AWS-themed interface
- Account cards with role buttons
- Hover effects and smooth animations
- Responsive design

### Tampermonkey Widget
- Bottom-left collapsible button
- Expandable role selection menu
- Clean integration with AWS console

### Desktop App
- Native window with AWS branding
- System tray integration
- Cross-platform executable

## 🔒 Security

- **No credentials stored** - All launchers only generate AWS URLs
- **Standard AWS authentication** - Uses your existing AWS session
- **Role-based access** - Respects IAM permissions and trust policies
- **Secure URLs** - All switching goes through AWS's official endpoints

## 🛠️ Development

### Adding New Accounts
1. Update the `accounts` array in your chosen launcher
2. Ensure IAM roles exist in the target accounts
3. Configure proper trust relationships

### Customizing Interface
- **Colors**: Modify CSS variables for theming
- **Layout**: Adjust grid/flex layouts in stylesheets
- **Icons**: Replace emoji icons with custom SVGs

### Building Desktop App
```bash
cd desktop-app
npm install
npm run build    # Development build
npm run dist     # Production executable
```

## 📱 Platform Support

| Platform | HTML Launcher | Bookmarklet | Tampermonkey | Desktop App |
|----------|---------------|-------------|--------------|-------------|
| Linux    | ✅            | ✅          | ✅           | ✅ (AppImage) |
| Windows  | ✅            | ✅          | ✅           | ✅ (.exe) |
| macOS    | ✅            | ✅          | ✅           | ✅ (.dmg) |

## 🐛 Troubleshooting

### Role Switching Fails
- Verify account IDs are correct (12 digits)
- Check role names match exactly (case-sensitive)
- Ensure trust relationships are configured
- Confirm user has `sts:AssumeRole` permission

### Widget Not Appearing (Tampermonkey)
- Ensure Tampermonkey is enabled
- Check script matches correct URLs
- Refresh AWS console page
- Verify no JavaScript errors in console

### Desktop App Won't Start
- Install Node.js (version 16+)
- Run `npm install` in desktop-app directory
- Check for dependency conflicts

## 📄 License

MIT License - Feel free to modify and distribute.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with your AWS setup
5. Submit a pull request

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Verify AWS IAM configuration
3. Test role switching manually in AWS console first
4. Open an issue with error details and configuration