# Execution Service

## Overview
The Execution Service provides a secure, isolated Docker-based sandbox for running candidate code submissions during interviews. It creates ephemeral containers per execution, injects test cases, captures output, and reports results.

## Architecture

### Docker Sandbox
- **Image selection**: Language-specific lightweight Alpine images (node:18-alpine, python:3.11-alpine, etc.)
- **Resource limits**: 256MB memory, 0.5 CPU core per container
- **Security**: No network access (`NetworkMode: "none"`), read-only root filesystem, auto-remove after execution
- **Timeout**: 30-second hard limit per execution

### Supported Languages
JavaScript, TypeScript, Python, Java, C++, C, Go, Rust, Ruby

### Test Execution Flow
1. Code is wrapped with test runner harness
2. Container is created with language-specific command
3. Code is piped via stdin to the container
4. Output is captured and parsed for `[TEST_RESULT]` markers
5. Container is force-removed (even on timeout)
6. Results are mapped back to test cases

### Test Result Format
Parsed from stdout lines matching:
```
[TEST_RESULT] index=0 passed=true actual="6" expected="6"
```

### Output Parsing
- Filters non-printable characters from Docker stream output
- Handles missing results (counts as failures)
- Reports execution errors and timeout errors

## Configuration
Configured via `shared/config/config.ts`:
```typescript
docker: {
  socketPath: "/var/run/docker.sock",
  memoryLimit: 256 * 1024 * 1024,   // 256MB
  cpuQuota: 50000,                    // 0.5 CPU
  cpuPeriod: 100000,
  execTimeout: 30000,                 // 30s
}
```

## Requirements
- Docker daemon must be running on the host
- The `dockerode` npm package (v4+)
- The Node.js process must have permissions to access `/var/run/docker.sock`
