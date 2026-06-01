# Interview Service

## Overview
The Interview Service provides an autonomous AI-powered interview experience for evaluating job candidates. It includes coding challenges, oral question answering, real-time collaboration via WebSockets, and automated evaluation.

## Architecture

### Backend Module Structure (5-file pattern)
```
modules/interview/
  interview.dto.ts           - DTO types and interfaces
  interview.repository.ts    - Prisma database access
  interview.service.ts       - Business logic
  interview.controller.ts    - Request handlers
  interview.routes.ts        - Express route definitions
  interview.execution.ts     - Docker code execution sandbox
  interview.evaluation.ts    - Coding and oral scoring algorithms
```

### Database Models (Prisma)
- **InterviewSession** - Core session with phase, timing, scores, transcript
- **InterviewQuestion** - Coding/oral questions per session
- **CodingSubmission** - Candidate code with execution results
- **TestResult** - Individual test case results per submission

### Session Phases
`GREETING` → `CODING` → `ORAL` → `EVALUATION` → `COMPLETED`

## REST API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/interview/sessions` | Create new session |
| GET | `/interview/sessions` | List user's sessions |
| GET | `/interview/sessions/:id` | Get session details |
| PATCH | `/interview/sessions/:id/status` | Update phase/status |
| POST | `/interview/sessions/:id/start` | Start session (generates challenge) |
| POST | `/interview/sessions/:id/submit` | Submit code for execution |
| POST | `/interview/sessions/:id/voice` | Submit voice transcript |
| POST | `/interview/sessions/:id/evaluate` | Finalize evaluation |

## WebSocket Events
| Event | Direction | Description |
|-------|-----------|-------------|
| `interview:join` | C→S | Join session room |
| `interview:leave` | C→S | Leave session room |
| `interview:code:update` | C→S | Broadcast code changes |
| `interview:code:sync` | S→C | Receive code sync |
| `interview:submit` | C→S | Submit code for execution |
| `interview:result` | S→C | Execution results |
| `interview:evaluation` | C→S | Request final evaluation |
| `interview:evaluation:result` | S→C | Final evaluation results |
| `interview:voice:transcript` | C→S | Submit voice transcript |
| `interview:voice:evaluated` | S→C | Voice evaluation result |
| `interview:error` | S→C | Error notification |

## Event Bus Events
- `interview.started` - Session started
- `interview.completed` - Session completed with scores
- `code.submitted` - Code evaluated
- `oral.response.submitted` - Oral response scored

## BullMQ Queue
Queue name: `interview`
Job types: `evaluate`, `timeout`, `reminder`
