# TalentHub Server — Architecture

## Overview

Modular monolith with domain-driven modules, layered architecture, and async worker support.

```
                   ┌─────────────────────────────────┐
                   │          HTTP / WebSocket         │
                   └──────────┬──────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       ┌──────────┐   ┌──────────┐   ┌──────────┐
       │   Auth   │   │   Jobs   │   │  Apps    │  ◄── Modules
       │ Module   │   │ Module   │   │ Module   │
       └────┬─────┘   └────┬─────┘   └────┬─────┘
            │              │              │
            ▼              ▼              ▼
       ┌─────────────────────────────────────┐
       │          Service Layer               │
       │   (business logic, orchestration)    │
       └─────────────────────────────────────┘
            │              │              │
            ▼              ▼              ▼
       ┌─────────────────────────────────────┐
       │         Repository Layer             │
       │   (data access, Prisma queries)      │
       └─────────────────────────────────────┘
            │              │              │
            ▼              ▼              ▼
       ┌─────────────────────────────────────┐
       │          Shared Infrastructure       │
       │  Config │ Logger │ Errors │ Events   │
       │  Prisma │ Redis  │ Queue  │ WS       │
       └─────────────────────────────────────┘
```

## Directory Structure

```
Server/
├── src/                          # Legacy entry (preserved)
├── modules/
│   ├── auth/                     # Authentication & user management
│   │   ├── auth.controller.ts    # HTTP handlers
│   │   ├── auth.service.ts       # Business logic
│   │   ├── auth.repository.ts    # Data access (Prisma)
│   │   ├── auth.dto.ts           # Zod schemas & TypeScript types
│   │   └── auth.routes.ts        # Express router
│   ├── jobs/                     # Job postings
│   │   ├── jobs.controller.ts
│   │   ├── jobs.service.ts
│   │   ├── jobs.repository.ts
│   │   ├── jobs.dto.ts
│   │   └── jobs.routes.ts
│   └── applications/             # Job applications
│       ├── applications.controller.ts
│       ├── applications.service.ts
│       ├── applications.repository.ts
│       ├── applications.dto.ts
│       └── applications.routes.ts
├── shared/
│   ├── config/
│   │   └── config.ts             # Typed env config
│   ├── logger/
│   │   └── logger.ts             # Winston logger
│   ├── errors/
│   │   ├── AppError.ts           # Base error class
│   │   ├── NotFoundError.ts
│   │   ├── UnauthorizedError.ts
│   │   ├── ForbiddenError.ts
│   │   └── ValidationError.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts     # JWT + RBAC
│   │   ├── error.middleware.ts    # Global error handler
│   │   ├── validate.middleware.ts # Zod validation
│   │   └── upload.middleware.ts   # Multer + Cloudinary
│   ├── database/
│   │   ├── prisma.ts             # PrismaClient singleton
│   │   └── redis.ts              # Upstash Redis client
│   ├── events/
│   │   └── eventBus.ts           # EventEmitter event bus
│   └── types/
│       └── index.ts              # Shared types & Express augmentation
├── services/
│   ├── email/
│   │   └── email.service.ts      # Nodemailer email service
│   └── file/
│       └── file.service.ts       # Cloudinary file service
├── workers/
│   ├── queue.ts                  # BullMQ queue definitions
│   └── processors/
│       ├── email.processor.ts    # Email worker
│       └── index.ts              # Worker bootstrapper
├── websocket/
│   ├── socket.ts                 # Socket.io setup
│   └── handlers/
│       └── index.ts              # WS event handlers
├── index.ts                      # Entry point (new modular)
├── Dockerfile
├── docker-compose.yml
├── architecture.md
├── migration-plan.md
└── implementation-report.md
```

## Layers

### 1. Module Layer
Each domain has its own module with 5 files:
- **DTO**: Zod validation schemas + TypeScript interfaces
- **Repository**: Prisma queries (no business logic)
- **Service**: Business logic, calls repositories, emits events
- **Controller**: Parses request, delegates to service, sends response
- **Routes**: Express router wiring middleware → controller

### 2. Shared Layer
Cross-cutting concerns shared by all modules:
- **Config**: Typed environment variable access with defaults
- **Logger**: Winston with console transport (extensible to files/external)
- **Errors**: Custom error classes extending `AppError`
- **Middleware**: Auth, error handling, validation, file upload
- **Database**: PrismaClient + Upstash Redis singletons
- **Events**: Typed event bus (EventEmitter-based)

### 3. Service Layer
Standalone services that can be injected into modules:
- **Email**: Nodemailer-based email sending
- **File**: Cloudinary upload abstraction

### 4. Worker Layer
BullMQ-based async job processing:
- **Queue**: Job definitions and queue configuration
- **Processors**: Worker processes for email, notifications, etc.

### 5. WebSocket Layer
Socket.io server for real-time communication:
- Connection management with JWT auth
- Room-based subscription (job updates, application status changes)

## Data Flow

```
Request → Route → Middleware (auth, validation, upload)
         → Controller (parse, validate DTO)
         → Service (business logic, emit events)
         → Repository (Prisma queries)
         → Response JSON

Events → EventBus → Listeners (email, notifications, WS broadcast)
Jobs   → BullMQ   → Workers (async email, file processing)
```

## Error Handling

```
Controller / Service throws
  → AppError or subclass
  → Global error middleware catches
  → Logs with structured context
  → Returns consistent JSON: { status: false, message, errors? }
```

## Events

| Event | Payload | Listeners |
|-------|---------|-----------|
| `user.registered` | `{ userId, email, name }` | Email OTP |
| `user.verified` | `{ userId, email, name }` | Welcome email |
| `job.created` | `{ jobId, employerId }` | WS notification |
| `application.submitted` | `{ appId, jobId, userId }` | Email to employer, WS |
| `application.status.updated` | `{ appId, status }` | Email to applicant, WS |

## WebSocket Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `application:status` | Server→Client | `{ appId, status, jobTitle }` |
| `job:new` | Server→Client | `{ jobId, title }` |
| `notification` | Server→Client | `{ type, message }` |
| `subscribe:job` | Client→Server | `{ jobId }` |
| `subscribe:user` | Client→Server | `{ userId }` |
