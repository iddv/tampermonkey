# Daily Enhancement Workflow

This document provides a step-by-step process for daily script enhancement based on the AGENT_INSTRUCTIONS.md principles.

## 🌅 Daily Process

### 1. Discovery Phase

- Find recent files in `/research` directory
- Check for new markdown files: `find . -name "*.md" -newer $(date -d "1 day ago" +%Y-%m-%d) -type f`
- Look for research/enhancement files: `find . -name "*research*" -o -name "*enhancement*" -o -name "*idea*" -type f`
- Review recent git activity: `git log --oneline -10`
- Check untracked files: `git status`

### 2. Analysis & Prioritization

- Evaluate user impact and implementation complexity
- Prioritize: 🔴 User issues/security → 🟡 Enhancements → 🟢 Nice-to-have
- Consider alignment with existing scripts
- Check security implications

### 3. Planning Phase

- Create enhancement plan with user need and technical approach
- Research existing implementations and identify files to modify
- Plan implementation steps and quality checklist

### 4. Zen Consultation

- Use `mcp__zen__chat` for UX design decisions
- Get architecture guidance for complex features
- Discuss user workflow considerations
- Review feature interaction patterns

### 5. Implementation Phase

- Read existing code thoroughly
- Edit existing files rather than creating new ones
- Use TodoWrite tool to track implementation steps
- Test incrementally and handle edge cases
- Follow existing code patterns and style

### 6. Quality Assurance

- Run precommit validation: `mcp__zen__precommit`
- Check build processes: `npm run build --prefix llm-judge`
- Verify dist files are updated: `ls -la dist/`
- Test core functionality manually

### 7. Documentation & Release

- Update script-specific README.md files
- Update main project README.md if significant changes
- Create conventional commit with concise message
## 🎯 Weekly Review Process

- Review user feedback and new issues
- Check script performance and reported bugs
- Verify documentation accuracy
- Update security practices

## 🚨 Emergency Response

- Assess impact severity
- Quick fix or rollback decision
- Update documentation/issues if needed
- Conduct root cause analysis
- Implement prevention measures

---

**Remember**: The goal is consistent, high-quality improvements that genuinely help users while maintaining code quality and security standards.