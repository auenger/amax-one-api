# Checklist: feat-error-passthrough

## Completion Checklist

### Development
- [ ] All tasks completed
- [ ] Code self-tested

### Code Quality
- [ ] Code style follows conventions (Go formatting)
- [ ] No sensitive info leakage in error responses

### Testing
- [ ] Go build passes
- [ ] Manual test: upstream error passthrough (Claude format)
- [ ] Manual test: upstream error passthrough (OpenAI format)
- [ ] Manual test: 429 error includes upstream message
- [ ] Manual test: error logging in non-debug mode

### Documentation
- [ ] spec.md technical solution filled
