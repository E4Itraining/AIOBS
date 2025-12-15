# Contributing to AIOBS

Thank you for your interest in contributing to AIOBS! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Issue Guidelines](#issue-guidelines)

---

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please:

- Be respectful and considerate in all interactions
- Welcome newcomers and help them get started
- Focus on constructive feedback
- Avoid discriminatory or offensive language

---

## Getting Started

### Prerequisites

- **Node.js** 18.x or later
- **Python** 3.11 or later
- **Docker** and **Docker Compose** (for full-stack development)
- **Git** for version control

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/aiobs.git
   cd aiobs
   ```
3. Add the upstream remote:
   ```bash
   git remote add upstream https://github.com/your-org/aiobs.git
   ```

---

## Development Setup

### Backend (TypeScript)

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Run linter
npm run lint

# Build for production
npm run build
```

### Visualization (Python)

```bash
cd visualization

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run development server
python run.py
```

### Full Stack (Docker)

```bash
# Start all services
cp .env.example .env
docker-compose up -d

# View logs
docker-compose logs -f

# Rebuild after changes
docker-compose up -d --build
```

---

## Making Changes

### Branch Naming

Use descriptive branch names:

- `feature/` - New features (e.g., `feature/add-drift-alerting`)
- `fix/` - Bug fixes (e.g., `fix/websocket-reconnection`)
- `docs/` - Documentation updates (e.g., `docs/api-reference`)
- `refactor/` - Code refactoring (e.g., `refactor/cognitive-engine`)
- `test/` - Test additions/changes (e.g., `test/causal-analysis`)

### Commit Messages

Follow conventional commit format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code restructuring without behavior changes
- `test`: Adding or modifying tests
- `chore`: Maintenance tasks

Examples:
```
feat(cognitive): add prediction drift detection

fix(websocket): handle reconnection on network failure

docs(api): add WebSocket protocol documentation
```

---

## Coding Standards

### TypeScript (Backend)

- Use TypeScript strict mode
- Define interfaces for all data structures
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions small and focused
- Handle errors explicitly

```typescript
/**
 * Analyzes drift patterns in model predictions
 * @param predictions - Historical prediction data
 * @param window - Analysis window in hours
 * @returns DriftAnalysis with severity and recommendations
 */
export async function analyzeDrift(
  predictions: Prediction[],
  window: number = 24
): Promise<DriftAnalysis> {
  // Implementation
}
```

### Python (Visualization)

- Follow PEP 8 style guidelines
- Use type hints for function parameters and returns
- Write docstrings for modules, classes, and functions
- Use meaningful variable names
- Keep functions focused on single responsibility

```python
async def get_cognitive_metrics(
    service_id: str,
    time_range: TimeRange
) -> CognitiveMetrics:
    """
    Retrieve cognitive metrics for a service.

    Args:
        service_id: Unique identifier for the service
        time_range: Time range for metric aggregation

    Returns:
        CognitiveMetrics containing drift, reliability, and trust scores
    """
    # Implementation
```

### File Organization

- Keep related code together
- Use index files for module exports
- Separate types/interfaces into dedicated files
- Group tests with the code they test

---

## Testing

### Backend Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- --testPathPattern=drift-detector
```

### Writing Tests

- Write tests for all new features
- Include both unit tests and integration tests
- Test edge cases and error conditions
- Use descriptive test names

```typescript
describe('DriftDetector', () => {
  describe('detectDataDrift', () => {
    it('should identify significant distribution shift', async () => {
      // Test implementation
    });

    it('should return low drift score for stable distributions', async () => {
      // Test implementation
    });

    it('should handle empty data gracefully', async () => {
      // Test implementation
    });
  });
});
```

---

## Submitting Changes

### Pull Request Process

1. **Update your branch** with the latest upstream changes:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Ensure all tests pass**:
   ```bash
   npm test
   npm run lint
   ```

3. **Create a pull request** with:
   - Clear title describing the change
   - Description of what changed and why
   - Reference to related issues (e.g., "Fixes #123")
   - Screenshots for UI changes

### PR Template

```markdown
## Summary
Brief description of the changes

## Changes
- Change 1
- Change 2

## Testing
How were these changes tested?

## Related Issues
Fixes #XXX

## Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Code follows style guidelines
- [ ] All tests passing
```

### Review Process

- All PRs require at least one review
- Address reviewer feedback promptly
- Keep discussions focused and professional
- Squash commits before merging if requested

---

## Issue Guidelines

### Bug Reports

Include:
- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node/Python version, Docker version)
- Relevant logs or screenshots

### Feature Requests

Include:
- Clear description of the proposed feature
- Use case and motivation
- Potential implementation approach
- Any related existing functionality

### Issue Labels

- `bug` - Something isn't working
- `enhancement` - New feature request
- `documentation` - Documentation improvements
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed
- `priority: high` - Critical issues
- `priority: low` - Nice to have

---

## Areas for Contribution

### Good First Issues

Look for issues labeled `good first issue` - these are ideal for newcomers:
- Documentation improvements
- Adding test coverage
- Small bug fixes
- UI/UX improvements

### High-Impact Areas

- **Cognitive Metrics**: Drift detection algorithms, hallucination detection
- **Causal Analysis**: Graph algorithms, root cause reasoning
- **Governance**: Audit trail improvements, compliance evidence generation
- **Visualization**: Dashboard components, real-time updates
- **Documentation**: API reference, tutorials, examples

---

## Questions?

- Open a GitHub Discussion for questions
- Check existing issues before creating new ones
- Join our community channels for real-time help

Thank you for contributing to AIOBS!
