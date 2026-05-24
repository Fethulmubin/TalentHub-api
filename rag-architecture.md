# RAG Architecture — Employer Chatbot

## What is RAG?

**Retrieval-Augmented Generation (RAG)** is a pattern that combines information retrieval with text generation. Instead of relying on a model's pre-trained knowledge (which is static and may not know your data), RAG first **retrieves relevant documents** from your database, then uses them as context to generate an answer.

In TalentHub, we use RAG to let employers ask natural-language questions about candidates:

> *"Which applicants fit Node?"*
> → Retrieve chunks about Node.js from all resumes
> → Return structured answer with citations and confidence scores

## Why RAG Instead of Fine-Tuning?

| Approach | Pros | Cons |
|----------|------|------|
| **RAG** (this project) | No training needed, data stays fresh, citations are transparent | Requires embedding pipeline + vector DB |
| **Fine-tuning** | Model internalizes knowledge | Expensive, stale after new resumes, no citations |
| **Keyword search** | Simple, fast | Misses synonyms, no semantic understanding |

RAG gives us **semantic search** (understands "backend developer" ≈ "Node.js + PostgreSQL") with **citations** (points to the exact resume chunk as evidence).

## Architecture

```
Employer Question
     │
     ▼
  "Find me Node.js developers with 5+ years experience"
     │
     ├──► 1. Embed the question
     │         (all-MiniLM-L6-v2 → 384-dim vector)
     │
     ├──► 2. Vector search in pgvector
     │         SELECT * FROM "ResumeEmbedding"
     │         ORDER BY embedding <=> query_vec
     │         LIMIT 10
     │
     ├──► 3. Filter by confidence threshold
     │
     ├──► 4. Build answer with citations
     │
     ▼
Response:
{
  "answer": "Top match is John (5yr exp, React, Node.js, AWS)",
  "citations": [
    {
      "fileName": "john_resume.pdf",
      "chunkText": "5 years of experience building Node.js APIs...",
      "skills": ["Node.js", "React", "AWS"],
      "similarity": 0.91
    }
  ],
  "confidence": 0.85
}
```

## Why Each Piece Exists

### 1. Embedding Model (`all-MiniLM-L6-v2`)

**What it does:** Converts text into a 384-dimensional vector (a list of numbers) that captures semantic meaning.

**Why this model:**
- **Small & fast** (~25MB) — runs locally in Node.js via `@xenova/transformers`
- **384 dimensions** — good balance of precision vs storage cost
- **Cosine similarity** — two vectors pointing in similar directions mean similar content
- **No API key needed** — runs entirely on your server, no external calls

**How it's used:**
```
"Node.js developer"  →  [0.23, -0.45, 0.12, ..., 0.89]  (384 numbers)
"React expert"       →  [0.19, -0.41, 0.15, ..., 0.84]  (similar direction)
"accounting report"  →  [-0.12, 0.33, -0.41, ..., -0.22] (different direction)
```

### 2. Text Chunking (700 tokens, 100 overlap)

**What it does:** Splits long resume text into smaller segments before embedding.

**Why:**
- Embedding models have a maximum input length (all-MiniLM-L6-v2: 512 tokens)
- Chunking by paragraph boundaries preserves semantic units
- **700 token max** stays under the model limit (≈2800 characters)
- **100 token overlap** ensures no context is lost at chunk boundaries — the next chunk starts with the tail of the previous one

### 3. pgvector (PostgreSQL Vector Extension)

**What it does:** Adds vector similarity search directly in PostgreSQL.

**Why PostgreSQL instead of a dedicated vector DB (like Pinecone, Weaviate):**
- **No third-party service** — everything stays in your existing database
- **No data sync** — vectors are stored alongside the resume data in the same transaction
- **IVFFlat index** — approximate nearest neighbor search with configurable accuracy/speed tradeoff (100 lists)
- **Cosine distance** (`<=>` operator) — measures angle between vectors, good for normalized embeddings

The IVFFlat index with 100 lists gives ~10x speedup over brute-force search with minimal accuracy loss for our scale.

### 4. Cosine Similarity Search

```sql
SELECT 1 - (embedding <=> $1::vector) AS similarity
FROM "ResumeEmbedding"
ORDER BY embedding <=> $1::vector
LIMIT 10
```

- `<=>` computes cosine distance (0 = identical, 2 = opposite)
- `1 - distance` converts to similarity score (0..1)
- Results sorted by closest match first

### 5. Confidence & Citations

Every search result includes:
- **similarity** (0-1) — how semantically close the chunk is to the query
- **chunkText** — the actual resume text that matched, so employers can verify
- **minConfidence** filter — employer can set a threshold (default 0.4)

This is the key advantage of RAG over black-box AI: **every answer is traceable to source material.**

## Chatbot Question Types

The chatbot (`modules/chatbot/chatbot.service.ts`) detects question intent and tailors responses:

| Question Pattern | Example | Behavior |
|-----------------|---------|----------|
| **fit/qualified** | "Who fits Node.js?" | Filters by matched skills from query |
| **compare** | "Compare candidate A and B" | Returns side-by-side skill/experience comparison |
| **strongest/best** | "Who has strongest backend?" | Ranks by relevance score, highlights top match |
| **count** | "How many React devs?" | Returns count of matches |
| **general** | "Tell me about candidates" | Returns top 5 with excerpts and scores |

## Answer Generation

Currently, the chatbot uses **template-based answers** — it assembles a response from the retrieved chunks using predefined templates based on question intent:

```typescript
"Top match is {name} with {experience} years experience. Skills: {skills}"
```

This works for structured queries but has no real language generation.

### Future: LLM Integration

For natural conversational answers, replace the template engine with an LLM:

```
System: "You are a recruiting assistant. Answer using ONLY the provided context."
Context: [retrieved chunks]
User: "Which applicants fit Node?"
LLM → "Based on the resumes, John Doe has 5 years of Node.js experience..."
```

The architecture is designed for this swap — just replace `chatbot.service.ts`'s `buildAnswer()` with an LLM call while keeping the retrieval pipeline unchanged.

## API Endpoints

### POST /chat/ask
**Auth:** EMPLOYER  
**Body:**
```json
{
  "question": "Which applicants have strong backend skills?",
  "limit": 10,
  "minConfidence": 0.4
}
```
**Response:**
```json
{
  "status": true,
  "answer": "The strongest match is John (91% relevance) with 5 years of experience. Skills: Node.js, PostgreSQL, React, AWS.",
  "citations": [
    {
      "resumeId": "uuid",
      "fileName": "john_resume.pdf",
      "chunkText": "5 years experience building Node.js microservices...",
      "similarity": 0.91,
      "skills": ["Node.js", "PostgreSQL", "React", "AWS"],
      "yearsExperience": 5
    }
  ],
  "confidence": 0.85,
  "totalResults": 3
}
```

## Data Flow Summary

```
                     ┌──────────────────────┐
                     │   Employer Question   │
                     │  "Find Node.js devs"  │
                     └──────────┬───────────┘
                                │
                     ┌──────────▼───────────┐
                     │  embed query → vec   │
                     │  (384-dim float[])    │
                     └──────────┬───────────┘
                                │
                     ┌──────────▼───────────┐
                     │  pgvector search     │
                     │  ORDER BY <=> query  │
                     └──────────┬───────────┘
                                │
                     ┌──────────▼───────────┐
                     │  Filter + rank       │
                     │  by minConfidence    │
                     └──────────┬───────────┘
                                │
                     ┌──────────▼───────────┐
                     │  Build answer        │
                     │  + citations         │
                     └──────────┬───────────┘
                                │
                     ┌──────────▼───────────┐
                     │  Return JSON          │
                     │  { answer, citations, │
                     │    confidence }       │
                     └──────────────────────┘
```

## Performance Notes

| Operation | Estimated Time | Notes |
|-----------|---------------|-------|
| PDF parse | 200-500ms | Depends on page count |
| Chunk + Embed (per chunk) | 100-300ms | Sequential per resume |
| Embed 10 chunks | 1-3s | Largest bottleneck |
| Vector search (10k embeddings) | <50ms | With IVFFlat index |
| Total pipeline (1 resume) | 3-10s | Async via worker |
| Chat query response | <100ms | Just embed + search |
