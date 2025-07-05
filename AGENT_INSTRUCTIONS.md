# Agent Instructions for Tampermonkey Scripts Development

## 🎯 Core Philosophy

**User-Centric Approach**: Always prioritize user feedback and real-world usage over theoretical perfection. When users request changes or express concerns about functionality being "too aggressive" or not matching their workflow, listen carefully and adapt.

**Iterative Enhancement**: Start with working solutions and enhance based on actual usage patterns rather than over-engineering from the start.

## 📋 Daily Workflow Process

### 1. Research & Idea Discovery
- **Check for new context**: Look in project directories for research files, markdown documents, or user feedback
- **Analyze patterns**: Review recent issues, user requests, and enhancement opportunities
- **Prioritize by impact**: Focus on user pain points and frequently requested features

### 2. Idea Evaluation & Planning
- **Select top ideas**: Choose 1-2 most impactful improvements per session
- **Create detailed plan**: Break down complex features into manageable steps
- **Consult with zen**: Always use zen advisor for UX/architecture decisions, especially when users express concerns about current behavior
- **Set clear scope**: Define what will and won't be included

### 3. Implementation Standards
- **Update existing files**: ALWAYS prefer editing existing files over creating new ones
- **Follow established patterns**: Review existing code to match style, naming, and architectural patterns
- **Maintain backward compatibility**: Ensure existing features continue to work
- **Use proper error handling**: Include fallbacks and graceful degradation

### 4. Quality Assurance Pipeline
- **Precommit validation**: ALWAYS run precommit checks before any git operations
- **Build verification**: Ensure all build processes complete successfully
- **Test functionality**: Verify core features work as expected
- **Check dist updates**: Ensure distribution files are properly updated

### 5. Documentation & Release
- **Update README files**: Keep documentation current with new features
- **Create concise commits**: Follow conventional commit format, avoid self-centric messaging
- **Update main README**: Ensure project overview reflects current capabilities

## 🚫 Critical Lessons Learned

### User Experience Priorities
- **Don't be overly aggressive**: Features that "just work" might be too intrusive for daily use
- **Provide user control**: Always include toggles, settings, or manual override options
- **Listen to feedback**: When users say something is "really just when you want to...", they're indicating the need for selective control

### Technical Implementation
- **Security first**: Avoid overly broad @match directives (never use `*://*/*`)
- **Performance matters**: Use efficient selectors, avoid DOM manipulation when CSS will suffice
- **SPA compatibility**: Handle modern web app navigation (YouTube's `yt-navigate-finish` events)
- **Robust injection**: Use MutationObserver with fallback selectors for UI elements

### Development Workflow
- **File organization**: Keep source and dist files synchronized
- **Precommit is mandatory**: Never skip precommit validation - it catches critical issues
- **Conventional commits**: Use clear, concise messages following conventional format
- **Update all documentation**: README files must reflect current functionality

## 🔧 Technical Standards

### Code Quality
```javascript
// ✅ Good: Robust error handling
const videoId = currentUrl.match(/\/shorts\/([^?&]+)/)?.[1];
if (videoId) {
    // Process video ID
}

// ❌ Bad: Fragile string operations
const videoId = window.location.pathname.split('/shorts/')[1];
```

### Security Practices
```javascript
// ✅ Good: Specific match patterns
// @match        *://www.youtube.com/*
// @match        *://aws.amazon.com/*

// ❌ Bad: Overly broad patterns
// @match        *://*/*
```

### User Interface Design
```javascript
// ✅ Good: Configurable with defaults based on user feedback
const CONFIG = {
    autoRedirect: GM_getValue('ytcp_autoRedirect', true), // Default ON per zen recommendation
    // ... other settings
};

// ❌ Bad: Always-on aggressive behavior
function handleAllShorts() {
    // Always redirect without user control
}
```

## 📁 Project Structure Understanding

### Core Scripts
1. **AWS Role Launcher**: Account/role switching tools
2. **LLM Judge**: AI content evaluation
3. **Personal Web Clipper**: Local markdown file creation
4. **YouTube Clean Player**: YouTube experience enhancement

### Key Files
- `/dist/`: Distribution files for installation
- `README.md`: Project overview and installation
- Individual script directories with their own READMEs
- `.github/workflows/`: CI/CD pipeline

## 🤝 Collaboration Protocol

### With Zen Advisor
- **UX decisions**: Always consult zen for user experience improvements
- **Architecture choices**: Get zen input on complex feature design
- **User feedback**: Use zen to interpret and respond to user concerns

### With Users
- **Listen actively**: User feedback reveals real-world usage patterns
- **Implement iteratively**: Start with user-requested core functionality
- **Provide control**: Always include settings/toggles for new behaviors
- **Update promptly**: Address user concerns quickly and effectively

### Code Review Process
- **Precommit validation**: Catches bugs, security issues, incomplete implementations
- **Build verification**: Ensures all components work together
- **Documentation updates**: Keep READMEs current with functionality

## 🎯 Success Metrics

### User Satisfaction
- Features work as expected without being intrusive
- Users can control script behavior to match their workflow
- Scripts enhance rather than hinder the browsing experience

### Code Quality
- Passes all precommit checks
- Builds successfully across all environments
- Follows established patterns and conventions
- Includes proper error handling and fallbacks

### Project Health
- Documentation accurately reflects functionality
- Distribution files are current and accessible
- CI/CD pipeline runs smoothly
- Version control history is clean and meaningful

## 🔄 Continuous Improvement

### Regular Reviews
- Monitor user feedback and GitHub issues
- Review script performance and compatibility
- Update dependencies and security practices
- Refine documentation based on user questions

### Innovation Pipeline
- Check research directories daily for new ideas
- Experiment with emerging web technologies
- Enhance existing scripts based on user patterns
- Explore integration opportunities between scripts

---

**Remember**: The goal is to create tools that genuinely improve users' browsing experience while respecting their autonomy and preferences. When in doubt, provide more user control rather than more automation.