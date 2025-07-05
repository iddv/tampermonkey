# YouTube Clean Player

A performant Tampermonkey userscript that enhances your YouTube viewing experience by removing distractions and unwanted content.

## ✨ Features

- **🔄 Shorts Redirect**: Automatically redirects YouTube Shorts to regular video format
- **🚫 Hide End-screen Suggestions**: Removes distracting video suggestions and overlays
- **📱 Remove Shorts from Feeds**: Hides Shorts from homepage, channel pages, and search results
- **⚙️ Configurable Settings**: Toggle features via Tampermonkey menu commands
- **🚀 Performance Optimized**: Uses YouTube's native navigation events for efficiency
- **🎯 Clean Experience**: Focus on content without distractions

## 🚀 Installation

### One-Click Installation
**[Install YouTube Clean Player](https://github.com/iddv/tampermonkey/raw/main/dist/youtube-clean-player.user.js)**

### Requirements
- [Tampermonkey](https://www.tampermonkey.net/) browser extension

## 🎛️ Configuration

Access settings through the Tampermonkey menu for the script:

- **⚙️ YouTube Clean Player Settings** - View current configuration
- **🔄 Toggle Shorts Redirect** - Enable/disable Shorts redirecting
- **👁️ Toggle Shorts in Feed** - Show/hide Shorts from feeds

### Advanced Configuration

For power users, you can also configure settings via browser console:

```javascript
// Access configuration object
YTCP_API.config.redirectShorts = false;
YTCP_API.config.hideEndScreenSuggestions = true;
YTCP_API.config.removeShortsFromFeed = true;
YTCP_API.config.hideComments = false;
YTCP_API.config.hideSidebar = false;

// Save changes
YTCP_API.saveConfig();

// Refresh page to apply changes
location.reload();
```

## 🔧 How It Works

### Shorts Redirect
- Detects when you visit a YouTube Shorts URL (`/shorts/VIDEO_ID`)
- Automatically redirects to regular video format (`/watch?v=VIDEO_ID`)
- Uses `window.location.replace()` to avoid polluting browser history

### Content Hiding
- Uses efficient CSS injection via `GM_addStyle` to hide unwanted elements
- Targets Shorts shelves, end-screen overlays, and suggestion cards
- Handles various YouTube layouts and framework-specific selectors

### YouTube SPA Navigation
- Listens to YouTube's native `yt-navigate-finish` event
- Handles URL changes without performance-heavy DOM observation
- Ensures redirects work seamlessly during navigation

## 🛠️ Technical Details

### Performance Optimizations
- **CSS-only element hiding**: Uses `GM_addStyle` instead of DOM manipulation
- **Native event handling**: Leverages YouTube's `yt-navigate-finish` event
- **Minimal global pollution**: Exposes only `YTCP_API` object
- **Efficient selectors**: Targets specific YouTube element classes

### Browser Compatibility
- Works in all modern browsers with Tampermonkey support
- Chrome, Firefox, Safari, Edge
- No external dependencies

## 🎯 Targeted Elements

The script removes these types of content:

- **End-screen elements**: `.ytp-ce-element`, `.ytp-cards-teaser`
- **Pause overlays**: `.ytp-pause-overlay`, `.ytp-suggestion-set`
- **Shorts shelves**: `ytd-reel-shelf-renderer`, `ytd-rich-shelf-renderer[is-shorts]`
- **Individual Shorts**: `ytd-video-renderer[is-shorts]`, `ytd-grid-video-renderer[is-shorts]`
- **Shorts tabs**: Channel page Shorts sections

## 🐛 Troubleshooting

### Shorts still appear
- Check if "Toggle Shorts in Feed" is enabled in Tampermonkey menu
- Refresh the page after changing settings
- Clear browser cache if issues persist

### Redirects not working
- Verify "Toggle Shorts Redirect" is enabled
- Check browser console for any error messages
- Ensure Tampermonkey is properly installed and the script is active

### Settings not saving
- Make sure you're using the Tampermonkey menu commands
- If using console, call `YTCP_API.saveConfig()` after changes
- Check that Tampermonkey has permission to store data

## 🔮 Future Enhancements

The script is designed with a config-ready architecture to easily add:

- Hide comments section
- Hide video sidebar
- Custom keyboard shortcuts
- Export/import settings
- Non-intrusive toast notifications
- Advanced content filtering

## 📄 License

MIT License - See the main repository for details.

## 🤝 Contributing

This script is part of the [IDDV Tampermonkey Collection](https://github.com/iddv/tampermonkey). 

Feel free to:
- Report issues
- Suggest features
- Submit pull requests
- Share feedback

---

**Enjoy a cleaner YouTube experience! 🎥✨**