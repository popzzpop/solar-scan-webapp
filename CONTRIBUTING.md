# Contributing to Solar Scan

Thank you for your interest in contributing to Solar Scan! This document provides guidelines and information for contributors.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)

## 🤝 Code of Conduct

We are committed to providing a welcoming and inspiring community for all. Please read and follow our Code of Conduct.

### Our Standards

- **Be respectful** - Treat everyone with respect and kindness
- **Be inclusive** - Welcome newcomers and help them contribute
- **Be constructive** - Provide helpful feedback and suggestions
- **Be collaborative** - Work together towards common goals

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher
- Git
- Google Cloud Platform account (for Solar API)

### Local Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/solar-scan-webapp.git
   cd solar-scan-webapp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Add your Google Solar API key to .env
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Run tests (when available)**
   ```bash
   npm test
   ```

## 🔄 Development Process

### Branch Strategy

We use **Git Flow** with the following branches:

- `main` - Production-ready code
- `develop` - Development branch for integration
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Critical production fixes
- `release/*` - Release preparation

### Workflow

1. **Create a feature branch**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow coding standards
   - Add tests for new functionality
   - Update documentation as needed

3. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add solar panel capacity calculator"
   ```

4. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

### Commit Message Format

We follow the **Conventional Commits** specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

**Examples:**
```bash
git commit -m "feat(api): add data layers endpoint integration"
git commit -m "fix(ui): resolve map marker positioning issue"
git commit -m "docs: update API configuration guide"
```

## 🔍 Pull Request Process

### Before Submitting

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Tests added/updated and passing
- [ ] Documentation updated
- [ ] No merge conflicts with target branch

### PR Template

When creating a PR, please use this template:

```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] New tests added for new functionality
- [ ] Manual testing completed

## Screenshots (if applicable)
Include screenshots of UI changes.

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Tests added/updated
- [ ] Documentation updated
```

### Review Process

1. **Automated Checks** - GitHub Actions will run tests and linting
2. **Code Review** - At least one maintainer will review your PR
3. **Testing** - Changes will be tested in staging environment
4. **Approval** - PR needs approval before merging

## 🐛 Issue Guidelines

### Bug Reports

Use the bug report template and include:

- **Description** - Clear description of the bug
- **Steps to Reproduce** - Detailed steps to reproduce
- **Expected Behavior** - What should happen
- **Actual Behavior** - What actually happens
- **Environment** - Browser, OS, device info
- **Screenshots** - If applicable

### Feature Requests

Use the feature request template and include:

- **Problem Statement** - What problem does this solve?
- **Proposed Solution** - Your suggested implementation
- **Alternatives** - Other solutions considered
- **Additional Context** - Screenshots, mockups, references

### Issue Labels

- `bug` - Something isn't working
- `enhancement` - New feature or request
- `documentation` - Documentation improvements
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed
- `priority: high/medium/low` - Issue priority
- `status: in-progress` - Currently being worked on

## 📝 Coding Standards

### JavaScript/Node.js

- Use **ES6+** features
- Follow **ESLint** configuration
- Use **Prettier** for formatting
- Write **JSDoc** comments for functions
- Use **async/await** over Promises where possible

### HTML/CSS

- Use **semantic HTML5** elements
- Follow **BEM** methodology for CSS classes
- Use **Tailwind CSS** utility classes
- Ensure **responsive design**
- Maintain **accessibility** standards

### API Development

- Follow **RESTful** conventions
- Use proper **HTTP status codes**
- Implement **error handling**
- Add **input validation**
- Document endpoints with **OpenAPI**

### File Organization

```
src/
├── components/         # Reusable UI components
├── services/          # API services and utilities
├── styles/            # CSS and styling files
├── utils/             # Helper functions
├── tests/             # Test files
└── docs/              # Additional documentation
```

## 🧪 Testing

### Testing Strategy

- **Unit Tests** - Test individual functions/components
- **Integration Tests** - Test API endpoints and services
- **E2E Tests** - Test complete user workflows
- **Manual Testing** - UI/UX testing on different devices

### Writing Tests

```javascript
// Example unit test
describe('Solar Calculator', () => {
  test('calculates annual savings correctly', () => {
    const result = calculateAnnualSavings(1000, 0.12);
    expect(result).toBe(120);
  });
});
```

### Running Tests

```bash
npm test              # Run all tests
npm run test:unit     # Run unit tests only
npm run test:e2e      # Run E2E tests
npm run test:coverage # Generate coverage report
```

## 📚 Documentation

### What to Document

- **API endpoints** - Parameters, responses, examples
- **Functions** - Purpose, parameters, return values
- **Components** - Props, usage examples
- **Setup guides** - Installation, configuration
- **Troubleshooting** - Common issues and solutions

### Documentation Style

- Use clear, concise language
- Provide code examples
- Include screenshots for UI features
- Keep documentation up-to-date with code changes

## 🏷️ Versioning

We use **Semantic Versioning** (SemVer):

- `MAJOR.MINOR.PATCH` (e.g., 1.2.3)
- **MAJOR** - Breaking changes
- **MINOR** - New features (backwards compatible)
- **PATCH** - Bug fixes (backwards compatible)

## 📞 Getting Help

### Community Resources

- **GitHub Discussions** - Ask questions and discuss ideas
- **Issues** - Report bugs and request features
- **Wiki** - Additional documentation and guides

### Maintainer Contact

- Create an issue for bugs or feature requests
- Use GitHub Discussions for general questions
- Tag `@maintainers` in PRs that need urgent attention

## 🎉 Recognition

Contributors will be recognized in:

- **README** - Contributors section
- **Release Notes** - Feature contributors
- **GitHub** - Contributor graphs and statistics

Thank you for contributing to Solar Scan! 🌟

---

This document is living and will be updated as the project evolves. Please check back regularly for changes.