# Setting Up CodeRabbit for LearnSpace

CodeRabbit is now configured for comprehensive AI-powered code review. Follow these steps to enable it.

## Quick Setup

### 1. Install CodeRabbit GitHub App

1. Go to https://coderabbit.ai/
2. Click "Sign in with GitHub"
3. Click "Install CodeRabbit"
4. Select your repository: `mrudul-UmassD/LearnSpace`
5. Grant the requested permissions

### 2. Verify Configuration

The repository already includes `.coderabbit.yaml` with:
- Security-focused reviews
- Path-specific instructions for TypeScript, React, API routes, Python runner
- Knowledge base about the project architecture
- Automated review triggers

### 3. Test the Integration

Create a test PR to verify CodeRabbit is working:

```bash
# Create a test branch
git checkout -b test-coderabbit

# Make a small change
echo "# Test CodeRabbit" >> test-coderabbit.md
git add test-coderabbit.md
git commit -m "test: verify CodeRabbit integration"
git push origin test-coderabbit
```

Then:
1. Open a Pull Request on GitHub
2. CodeRabbit should automatically post a review within 1-2 minutes
3. Look for comments from `@coderabbitai`

### 4. Using CodeRabbit

#### In Pull Requests

CodeRabbit automatically reviews:
- All code changes
- Security concerns
- Best practices
- Type safety issues
- Performance implications

#### Interactive Commands

Comment on PRs with these commands:

- `@coderabbitai review` - Trigger a new review
- `@coderabbitai resolve` - Mark conversation as resolved
- `@coderabbitai summary` - Get a high-level summary
- `@coderabbitai help` - Show available commands

#### Review Focus Areas

Based on `.coderabbit.yaml`, CodeRabbit will prioritize:

1. **Security** (Highest Priority)
   - API authentication checks
   - Input validation
   - SQL injection prevention
   - Secret exposure
   - Runner sandbox security

2. **Type Safety**
   - TypeScript `any` usage
   - Null/undefined handling
   - Type assertions

3. **React Best Practices**
   - Hooks usage
   - Component optimization
   - Accessibility

4. **Performance**
   - Database query efficiency
   - Resource limits
   - Memory leaks

## Configuration Details

### Current Settings

```yaml
# Auto-review enabled for all PRs to main branch
reviews:
  auto_review:
    enabled: true
    base_branches:
      - main

# Security and breaking changes trigger "request changes"
request_changes:
  enabled: true
  labels:
    - "needs-work"
    - "security"
```

### Path-Specific Rules

- `app/api/**/*.ts` - Extra security scrutiny
- `lib/security/**/*.ts` - OWASP Top 10 checks
- `services/runner/**/*.py` - Sandbox security focus
- `Dockerfile` and `docker-compose*.yml` - Container security

## Requesting a Full Repository Review

To get CodeRabbit to review the entire codebase:

### Option 1: Via GitHub Issue

1. Go to https://github.com/mrudul-UmassD/LearnSpace/issues
2. Create a new issue with title: "CodeRabbit: Full Repository Review"
3. Tag `@coderabbitai` in the issue body
4. Request: "Please review the entire repository focusing on security and best practices"

### Option 2: Via Pull Request

1. Create a branch and make a small documentation change:
   ```bash
   git checkout -b coderabbit-full-review
   echo "# Requesting full review" >> CODERABBIT_REVIEW_REQUEST.md
   git add CODERABBIT_REVIEW_REQUEST.md
   git commit -m "chore: request CodeRabbit full review"
   git push origin coderabbit-full-review
   ```

2. Open a Pull Request with description:
   ```markdown
   ## Full Repository Review Request
   
   @coderabbitai Please perform a comprehensive review of the entire codebase, focusing on:
   
   - Security vulnerabilities (especially in API routes and runner service)
   - Type safety issues
   - Performance bottlenecks
   - Best practices violations
   - Docker security hardening
   - Database query optimization
   
   Priority areas:
   - `app/api/` - All API routes
   - `lib/security/` - Security utilities
   - `services/runner/` - Python code executor
   - `prisma/schema.prisma` - Database schema
   ```

### Option 3: Manual Trigger via CLI (if installed)

```bash
# Install CodeRabbit CLI (optional)
npm install -g @coderabbitai/cli

# Trigger full review
coderabbit review --full-repo
```

## Expected Review Output

CodeRabbit will provide:

1. **High-Level Summary**
   - Overall code quality score
   - Security rating
   - Major concerns

2. **File-by-File Review**
   - Inline comments on issues
   - Suggestions for improvements
   - Code snippets with fixes

3. **Security Analysis**
   - Authentication gaps
   - Input validation issues
   - Potential vulnerabilities

4. **Performance Insights**
   - Slow queries
   - Memory leaks
   - Inefficient algorithms

## Monitoring Reviews

### GitHub Notifications

You'll receive notifications for:
- CodeRabbit review comments
- Security concerns flagged
- Requested changes

### Review Dashboard

View all CodeRabbit activity:
- https://coderabbit.ai/dashboard
- Filter by repository
- See review history
- Track improvement over time

## Customizing Reviews

Edit `.coderabbit.yaml` to adjust:

```yaml
# Change review tone
tone_instructions: |
  - Be extremely strict on security
  - Allow minor style deviations
  - Focus on critical issues only

# Add new path rules
path_instructions:
  - path: "tests/**/*.ts"
    instructions: |
      - Ensure test coverage is comprehensive
      - Check for edge cases
```

## Troubleshooting

### CodeRabbit Not Reviewing

1. Check GitHub App is installed: https://github.com/settings/installations
2. Verify permissions are granted
3. Ensure `.coderabbit.yaml` is in repo root
4. Check PR is targeting a configured base branch (`main`)

### Reviews Are Too Verbose

Edit `.coderabbit.yaml`:
```yaml
reviews:
  high_level_summary: true
  collapse_walkthrough: true  # Collapse detailed walkthrough
```

### Missing Specific Checks

Add to `knowledge_base` in `.coderabbit.yaml`:
```yaml
knowledge_base:
  - "Always check for proper error handling in API routes"
  - "Verify rate limiting is applied to all execution endpoints"
```

## Best Practices

1. **Review Early**: Open draft PRs to get feedback during development
2. **Address All Comments**: Don't merge until critical issues are resolved
3. **Learn from Reviews**: CodeRabbit's suggestions improve code quality over time
4. **Update Configuration**: Refine `.coderabbit.yaml` based on team needs
5. **Use Labels**: Apply `security`, `performance` labels for focused reviews

## Getting Full Review NOW

Run this command to request an immediate full repository review:

```bash
# Create review request branch
git checkout -b request-full-coderabbit-review
echo "# Full Repository Review Request

@coderabbitai Please perform a comprehensive security and code quality review of the entire LearnSpace repository.

## Focus Areas
1. API security (authentication, input validation, rate limiting)
2. Runner service sandbox security
3. Database query optimization
4. Type safety and error handling
5. Docker security best practices
6. Secret management
7. Performance bottlenecks

Please provide:
- Security vulnerability assessment
- Type safety issues
- Performance improvement suggestions
- Best practices violations
- Actionable recommendations for each issue

Thank you!" > FULL_REVIEW_REQUEST.md

git add FULL_REVIEW_REQUEST.md
git commit -m "chore: request comprehensive CodeRabbit review"
git push origin request-full-coderabbit-review
```

Then open a PR at: https://github.com/mrudul-UmassD/LearnSpace/compare/main...request-full-coderabbit-review

## Support

- CodeRabbit Docs: https://docs.coderabbit.ai/
- GitHub Discussions: https://github.com/coderabbit-ai/coderabbit-discussions
- Email: support@coderabbit.ai
