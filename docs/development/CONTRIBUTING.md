# Contributing to Claude Code Executor

Thank you for your interest in contributing! 🎉

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/yourusername/claude-code-executor/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - System information (OS, Python version, Docker version)
   - Logs if applicable

### Suggesting Features

1. Check [existing feature requests](https://github.com/yourusername/claude-code-executor/issues?q=is%3Aissue+is%3Aopen+label%3Aenhancement)
2. Create a new issue with:
   - Clear use case
   - Proposed solution
   - Alternative solutions considered
   - Impact on existing functionality

### Code Contributions

#### Setup Development Environment

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/claude-code-executor.git
cd claude-code-executor

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set up pre-commit hooks (if available)
pre-commit install
```

#### Making Changes

1. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following our coding standards:
   - Python: Follow PEP 8
   - JavaScript: Use consistent formatting
   - Write clear commit messages
   - Add comments for complex logic
   - Update documentation if needed

3. Test your changes:
   ```bash
   # Run the application
   ./start.sh
   
   # Test manually in browser
   # TODO: Add automated tests
   ```

4. Commit your changes:
   ```bash
   git add .
   git commit -m "feat: add amazing new feature"
   ```
   
   Commit message format:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation
   - `refactor:` for code refactoring
   - `test:` for adding tests
   - `chore:` for maintenance

5. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

6. Create a Pull Request:
   - Go to the original repository
   - Click "New Pull Request"
   - Select your fork and branch
   - Fill in the PR template
   - Link any related issues

#### Pull Request Guidelines

- Keep PRs focused on a single feature/fix
- Update README.md if you change functionality
- Add comments explaining complex code
- Ensure the application still runs
- Respond to review feedback promptly

### Code Style

#### Python
```python
# Use type hints
def execute_code(language: str, code: str) -> tuple[str, int]:
    pass

# Clear function names
def get_or_create_container(conversation_id: int) -> Container:
    pass

# Docstrings for public functions
def stream_completion(messages: List[Dict]) -> AsyncGenerator:
    """
    Stream completion from Claude API.
    
    Args:
        messages: List of message dictionaries
        
    Yields:
        Text chunks as they arrive
    """
    pass
```

#### JavaScript
```javascript
// Use async/await
async function sendMessage() {
    const response = await fetch('/api/send');
}

// Clear variable names
const executionResults = [];

// Comment complex logic
// Parse SSE stream and update UI in real-time
for (const line of lines) {
    // ...
}
```

### Documentation

- Update README.md for user-facing changes
- Add inline comments for complex code
- Update API documentation if you add endpoints
- Include examples for new features

### Testing

Currently, we don't have automated tests (contributions welcome!).

For now, please manually test:
- Code execution in all supported languages
- File creation and download
- Conversation management (create, delete, switch)
- Model switching
- Output insertion
- Error handling

### Questions?

- Open a [Discussion](https://github.com/yourusername/claude-code-executor/discussions)
- Comment on relevant issues
- Reach out to maintainers

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the code, not the person
- Help others learn and grow

## Recognition

Contributors will be:
- Listed in GitHub contributors
- Mentioned in release notes for significant contributions
- Appreciated in our community! 🙏

Thank you for making Claude Code Executor better! 🚀
