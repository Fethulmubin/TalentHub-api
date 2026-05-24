# Resume Processing Service

## Why This Exists

Employers need to search through hundreds of resumes to find the right candidates. Manually reading each PDF is slow and inconsistent. This service converts unstructured PDF resumes into **searchable, structured candidate profiles** using natural language processing and vector embeddings.

## Pipeline Architecture

```
Upload (POST /resume/process)
  │
  ▼
Local PDF saved to uploads/
  │
  ▼
BullMQ Queue (resume-processing)  ──retry 3x──▶  Worker picks up job
  │                                                 │
  ▼                                                 ▼
Response: 202 Accepted                          Parse PDF (pdf-parse)
                                                    │
                                                    ▼
                                              Extract Text
                                                    │
                                                    ▼
                                              Chunk (700 tokens, 100 overlap)
                                                    │
                                                    ▼
                                              Generate Embeddings (384-dim)
                                                    │
                                                    ▼
                                              Store in PostgreSQL + pgvector
                                                    │
                                                    ▼
                                              Extract Skills / Education / Experience
                                                    │
                                                    ▼
                                              Upload PDF to Cloudinary
                                                    │
                                                    ▼
                                              Clean up local file
```

## Database Models

### ResumeProfile
Stores the parsed resume data and processing status.

| Field | Type | Purpose |
|-------|------|---------|
| `id` | UUID | Primary key |
| `userId` | UUID? | Link to User (optional — allows unauthenticated uploads) |
| `fileName` | String | Original filename |
| `fileUrl` | String | Cloudinary URL (set after worker uploads) |
| `rawText` | String | Full extracted text from PDF |
| `skills` | String[] | Extracted skill keywords (PostgreSQL array) |
| `education` | JSON | Array of `{ degree, institution, year }` |
| `yearsExperience` | Float? | Parsed from text patterns like "5 years of experience" |
| `technologies` | String[] | Deduplicated list from skills |
| `projects` | JSON | Array of `{ name, description, technologies }` |
| `summary` | String? | First ~500 chars as auto-summary |
| `status` | String | `PROCESSING` → `COMPLETED` or `FAILED` |

### ResumeEmbedding
One row per 700-token chunk, with a pgvector column for cosine similarity search.

| Field | Type | Purpose |
|-------|------|---------|
| `id` | String | Partition key (`{profileId}-chunk-{index}`) |
| `resumeId` | UUID | FK to ResumeProfile (CASCADE delete) |
| `chunkIndex` | Int | Position in original document |
| `chunkText` | Text | The actual text content for citation |
| `embedding` | vector(384) | pgvector vector — created via raw SQL |

The vector index uses **IVFFlat with cosine distance** (`<=>` operator) and 100 lists for approximate nearest neighbor search.

### CandidateInsight
Structured, queryable facts extracted from each resume.

| Field | Type | Purpose |
|-------|------|---------|
| `id` | UUID | Primary key |
| `resumeId` | UUID | FK to ResumeProfile |
| `insightType` | String | `SKILL`, `EDUCATION`, `EXPERIENCE`, `TECHNOLOGY`, `PROJECT` |
| `label` | String | Human-readable label (e.g. "React", "5 years") |
| `value` | String | Normalized value for filtering |
| `confidence` | Float | 0-1 score of extraction confidence |
| `evidence` | Text | Surrounding text snippet as proof |

## API Endpoints

### POST /resume/process
**Auth:** APPLICANT or EMPLOYER  
**Content-Type:** `multipart/form-data`  
**Body:** `resume` (PDF file)  
**Response 202:**
```json
{
  "status": true,
  "message": "Resume queued for processing",
  "profileId": "uuid"
}
```
Processing is async — the endpoint returns immediately after queueing. Poll `GET /resume/profile/:id` for completion.

### GET /resume/profile/:id
**Auth:** Any authenticated user  
**Response 200:**
```json
{
  "status": true,
  "profile": {
    "id": "uuid",
    "fileName": "resume.pdf",
    "status": "COMPLETED",
    "skills": ["React", "TypeScript", "Node.js"],
    "yearsExperience": 5,
    "insights": [
      { "insightType": "SKILL", "label": "React", "confidence": 0.8, "evidence": "..." }
    ]
  }
}
```

### POST /resume/search
**Auth:** EMPLOYER  
**Body:**
```json
{
  "query": "Node.js developer with 5 years experience",
  "limit": 10,
  "minConfidence": 0.5,
  "filterSkills": ["Node.js", "React"]
}
```
**Response:**
```json
{
  "status": true,
  "results": [
    {
      "resumeId": "uuid",
      "chunkText": "... experience with Node.js and React ...",
      "fileName": "resume.pdf",
      "skills": ["Node.js", "React", "PostgreSQL"],
      "yearsExperience": 5,
      "similarity": 0.89
    }
  ]
}
```

## Skill Extraction

The extraction service (`services/resume/extraction.service.ts`) uses pattern matching against a curated keyword list of ~40 common tech skills. It scans the raw text for:

- **Skills**: Matched against keywords like "React", "TypeScript", "PostgreSQL", etc.
- **Education**: Detected via degree keywords (Bachelor, Master, PhD) followed by institution names
- **Experience**: Extracted via regex `(\d+)\+?\s*years?\s*(?:of\s+)?(?:experience|exp)`
- **Projects**: Lines starting with "Project:" or similar headers

**Limitation:** This is regex-based, not ML-based. For production, replace with an LLM or NER model for higher accuracy.

## Retry & Resilience

- BullMQ retries failed jobs up to **3 times** with exponential backoff (5s initial delay)
- If all retries fail, profile status is set to `FAILED` with the error message
- Local temp files are cleaned up in both success and failure paths
- Cloudinary upload failure is non-fatal — the pipeline continues with local path only

## Events

| Event | When | Payload |
|-------|------|---------|
| `resume.uploaded` | Resume queued | `{ resumeId, fileName }` |
| `resume.processed` | Pipeline complete | `{ resumeId, userId, skills, yearsExperience }` |

WebSocket notifications are broadcast on `resume:processed` and `resume:new-profile`.

## Setup

```bash
# 1. Enable pgvector on your PostgreSQL database
psql your-db -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 2. Run Prisma migration
npx prisma migrate dev --name resume_pipeline

# 3. Start the server
npm run dev
```
