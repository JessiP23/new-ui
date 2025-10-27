# AI Judge platform

## What's new in this iteration
- Multi-queue queue management with bulk run support and redirect countdown for smooth end-to-end workflows (`frontend/src/pages/QueuePage.tsx`, `frontend/src/hooks/useRunner.ts`).
- Live diagnostics via SSE with polling fallback to track job progress without refreshing the page (`/diagnostics/live_job_status`, `useRunner`).
- Judge analytics dashboards with rankings, timelines, and interactive filters (`frontend/src/components/dashboard/JudgeAnalyticsSection.tsx`, `frontend/src/hooks/useAnalytics.ts`).
- Upload helper modal, drag-and-drop ingestion, and queue summarisation to validate payloads before submission (`UploadPage`, `useUpload`).
- Reasoning simhash + bucketting for dedupe-friendly analytics and safer replays (`server/app/api/routes/submissions.py`, `runner_service`).

## Coding challenge coverage
| Requirement | Status | Key implementation |
| --- | --- | --- |
| Ingest JSON submissions | **Done** | `UploadPage`, `server/app/api/routes/submissions.py`, simhash dedupe |
| Judge CRUD | **Done** | `JudgesPage`, `server/app/api/routes/judges.py` |
| Assign judges to questions | **Done** | `QueuePage`, `useQueue`, `server/app/api/routes/queue.py` |
| Run evaluations via worker | **Done** | `useRunner`, `server/app/services/queue_service.py`, `worker.py` |
| Persist verdicts & reasoning | **Done** | `runner_service`, `judge_service`, Supabase `evaluations` table |
| Results browsing & filters | **Done** | `ResultsPage`, `useResults`, `server/app/api/routes/evaluations.py` |
| Analytics & insights | **Done** | `DashboardPage`, `useAnalytics`, `analytics_service` |

## Local development
### Prerequisites
- Python 3.11+ (project currently runs on 3.13 via local venv)
- Node.js 20+
- Supabase project (URL + service key) and optional LLM provider API keys (Groq, OpenAI, Anthropic, Gemini)

### Backend API
```bash
cd server
python3 -m venv .venv
source .venv/bin/activate
pip install fastapi "uvicorn[standard]" supabase python-dotenv backoff groq openai anthropic google-generativeai
touch .env  # populate SUPABASE_URL, SUPABASE_KEY, provider keys
uvicorn main:app --reload
```

### Async worker
```bash
cd server
source .venv/bin/activate
python worker.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Verification steps
1. **Static checks** – `npm run lint` (frontend) and `npm run build` for type-safety; `pytest` (backend tests) or `python -m compileall app` for import sanity.
2. **End-to-end smoke test** – Upload sample JSON, assign judges, run a queue, confirm countdown redirect to results.
3. **Analytics sanity** – Load dashboard, adjust timeframe/interval, ensure charts respond and rankings update.
4. **Worker resilience** – Start worker without Groq credentials; it now skips Groq while continuing with other providers.

## Time & tradeoffs
- **Time spent:** `<add total>`
- **Key tradeoffs:** stayed on Supabase/Postgres for both OLTP + analytics; kept polling worker for determinism; frontend hooks favour explicit async control over additional libraries (e.g., React Query).
- **Rollback plan:**
  - Restore strict Groq requirement by reverting `get_groq_client` to raise when `GROQ_API_KEY` is unset.
  - Re-add `attachment_service.py` if attachment uploads return; ensure corresponding routes are reinstated.

---

## System architecture and scaling notes

### High-level overview

The platform delivers a JSON-first evaluation workflow:

1. Operators upload a JSON array of submissions via the React frontend.
2. The FastAPI backend validates and upserts submissions into Supabase/Postgres.
3. Judge assignments are captured per question and stored in Supabase.
4. A background worker dequeues jobs, calls external LLM providers, and persists evaluations.
5. The frontend surfaces live queue progress and results via the same REST API.

### Architecture diagram

```mermaid
graph TD
    subgraph Client
        U[Browser UI]
    end

    subgraph Frontend
        F[React + Vite app]
    end

    subgraph Backend
        A[FastAPI API]
        W[Async Worker]
    end

    subgraph Data
        S[(Supabase Postgres)]
    end

    subgraph Integrations
        L[LLM Providers\n(Groq / OpenAI / Anthropic / Gemini)]
    end

    U -->|JSON upload / navigation| F
    F -->|REST calls| A
    A -->|Upsert submissions / fetch judges| S
    A -->|Enqueue judge jobs| S
    W -->|Poll pending jobs| S
    W -->|Pull prompts & assignments| S
    W -->|Submit prompts| L
    L -->|Verdicts & reasoning| W
    W -->|Persist evaluations| S
    F -->|Results, analytics| A
    A -->|Aggregated metrics| S
```

### Component responsibilities

- **React frontend**
  - Handles JSON ingestion, judge configuration, queue management, and analytics.
  - Uses React Query-style hooks (custom) for API access; Axios client configured via `VITE_API_URL`.
  - Workflow context tracks the user’s current wizard step, remembers the active queue, and now retains the full queue list from the latest upload for multi-queue runs.

- **FastAPI backend**
  - Receives JSON submissions in batches and performs idempotent upserts.
  - Manages judge CRUD, assignments, queue orchestration, and analytics routes.
  - Exposes diagnostics endpoints for job counts and progress (including SSE fallback).

- **Supabase Postgres**
  - Single source of truth for submissions, judges, assignments, jobs, and evaluations.
  - Enables server-side filtering/aggregation while remaining fully managed.

- **Async worker**
  - Polls `judge_jobs`, assembles prompts, calls external LLM providers, and saves verdicts.
  - Handles retries and failure accounting outside of the request lifecycle.

- **LLM providers**
  - External services invoked by the worker. Providers are resolved dynamically from judge configs.

### Data flow summary

1. **Upload** – `/submissions` validates JSON; simhash buckets are computed for deduplication.
2. **Assign judges** – `/queue/assignments` stores per-question judge lists and exposes summaries. When uploads span multiple `queueId` values, the UI surfaces each queue so judges can be assigned per cohort.
3. **Run queue** – `/queue/run` seeds jobs by slicing submissions in batches, respecting configured page size/batch size. Operators can now switch between queues inside the UI before running each one, ensuring every submission batch is evaluated.
4. **Process jobs** – Worker polls jobs, calls providers, and writes evaluations + simhash for reasoning text.
5. **Review results** – `/evaluations` returns paginated evaluations with filter support; analytics endpoints reuse the same source tables.

### Current trade-offs

- **Single Postgres tenant** – All workloads (ingest, jobs, analytics) share the Supabase instance. This simplifies operations but makes IO contention more likely under high load.
- **Polling worker** – The worker polls Supabase rather than reacting to push events. Polling is simple but wastes cycles when the queue is idle and introduces latency between enqueue and execution.
- **Service-role credentials** – The backend relies on Supabase’s service key. Compromise of the API server would expose full DB access; rotate keys regularly and gate deployment.
- **Synchronous ingestion** – `/submissions` performs batched UPSERTs inline; very large batches increase client latency because the API waits for DB writes to finish.
- **Mitigation** – prefer chunked uploads or an async ingestion path (202 + background worker) for very large datasets to reduce timeouts and worker contention.

### Scaling options

| Layer | Scale-up strategy | Notes |
| --- | --- | --- |
| Frontend | Host static bundle on CDN (Vercel, Netlify). Enable HTTP caching for analytics responses. | Stateless by design; horizontal scaling is trivial. |
| FastAPI API | Run behind ASGI server (Uvicorn/Gunicorn) with multiple workers. Add read replicas for Supabase to offload heavy analytics queries. | Ensure idempotent endpoints for safe retry. |
| Worker | Shard job ranges or run multiple worker processes consuming disjoint queue slices. Introduce lease-based locking to avoid double-processing. | Move to task queue (Celery, Dramatiq) if throughput grows. |
| Database | Use Supabase connection pooling, add indexes on `judge_jobs(queue_id, status)` and `evaluations(queue_id, judge_id)`. Partition submissions/evaluations by queue for very large datasets. | Monitor write amplification from frequent upserts. |
| Observability | Add structured logging and metrics for queue depth, eval throughput, and provider latency. | Enables autoscaling triggers and capacity planning. |

### Future improvements

- Swap polling for event-driven tasks (Supabase Functions or a queue broker) to reduce latency.
- Implement per-provider rate limiting and exponential backoff at the worker level.
- Add retryable dead-letter queues so failed evaluations can be inspected separately.
- Introduce caching layer for read-heavy endpoints (results/analytics) once traffic grows.
- Harden multi-tenant boundaries by scoping data access via row-level security instead of service-role keys.

With attachments removed, the ingestion pipeline is purely JSON-based, simplifying validation and storage while keeping the evaluation workflow intact.
