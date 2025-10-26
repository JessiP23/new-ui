# Besimple AI Judge Platform

Full-stack reference implementation for the Besimple AI Judge take-home. The project pairs a FastAPI backend with a Supabase persistence layer and a React 19 + Vite frontend that guides reviewers from ingestion through results review.

## Challenge alignment

| Requirement | Status | Implementation highlights |
| --- | --- | --- |
| Ingest JSON submissions | ✅ | `/submissions` endpoint streams batched upserts; Upload page validates JSON and surfaces queue IDs |
| Create / edit / deactivate judges | ✅ | Judges page with CRUD + provider/model presets stored in Supabase |
| Assign judges per question | ✅ | Queue page maps questions → judges, now surfaces saved assignment summaries |
| Run AI judges via real LLMs | ✅ | Worker executes Groq/OpenAI/Anthropic/Gemini through provider clients; jobs persisted in `judge_jobs` |
| Persist verdicts + reasoning | ✅ | Evaluations upsert idempotently keyed by submission/question/judge |
| Results view + filters + pass rate | ✅ | Results page streams paginated evaluations, multi-select filters, and backend-derived pass metrics |

> Bonus idea status: private attachments + live analytics dashboards are shipped. Prompt field toggles and rerun tooling remain on deck—see [Trade-offs & future work](#trade-offs--future-work).

## Stack & repository layout

```
.
├── frontend/   # React 19, Tailwind, hooks-driven UI
└── server/     # FastAPI API, Supabase services, async worker
```

- **Frontend:** Vite 7, React Router 7, custom Tailwind components, Axios API client.
- **Backend:** FastAPI, Supabase Python client, async worker orchestrating judge jobs.
- **LLM providers:** Groq required (fallback), optional OpenAI / Anthropic / Gemini when API keys are present.

## Getting started

### 1. Provision Supabase tables

Create the following tables (or mirror in Postgres):

| Table | Key columns |
| --- | --- |
| `submissions` | `id` (PK), `queue_id`, `labeling_task_id`, `created_at`, `data`, `answer_simhash`, `simhash_bucket` |
| `judges` | `id` (PK), `name`, `system_prompt`, `model`, `provider`, `active` |
| `assignments` | `id`, `queue_id`, `question_id`, `judge_id` |
| `judge_jobs` | `id` (PK), `queue_id`, `submission_id`, `question_id`, `judge_id`, `status`, `attempts`, `created_at` |
| `evaluations` | `id`, `queue_id`, `submission_id`, `question_id`, `judge_id`, `verdict`, `reasoning`, `reasoning_simhash`, `created_at`, `updated_at` |

Add indexes on `(queue_id, status)` for `judge_jobs` and `(queue_id, judge_id)` for `evaluations` to keep polling fast.

### 1b. Prepare Supabase storage

- Create a private bucket named `attachments` in **Storage → Buckets**. (To customise the name, set `ATTACHMENTS_BUCKET` in `server/.env`.)
- (Optional) Add explicit RLS policies so future authenticated clients can read/write signed URLs. See [`docs/supabase-storage.md`](docs/supabase-storage.md) for SQL snippets and a full walkthrough.
- Add your frontend origin under **Authentication → Policies → CORS** so signed URLs can be fetched from the browser without preflight issues.

### 2. Backend (FastAPI + worker)

```bash
cd server
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Start the async worker once the API is running:

```bash
cd server
source venv/bin/activate
python worker.py
```

### 3. Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server defaults to `http://localhost:5173` and proxies requests to `VITE_API_URL` (default `http://localhost:8000`).

### Environment variables

Backend `.env` template:

| Key | Required | Notes |
| --- | --- | --- |
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_KEY` | ✅ | Service-role key for privileged writes |
| `GROQ_API_KEY` | ✅ | Minimum viable LLM provider |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` | Optional | Enables additional providers when present |
| `CORS_ALLOW_ORIGINS` | Optional | Defaults to `http://localhost:5173` |
| `UPLOAD_BATCH_SIZE` | Optional | Default 100 |
| `RUN_JUDGES_PER_PAGE` | Optional | Default 25 |
| `JOB_BATCH_SIZE` | Optional | Default 20 |

Frontend `.env` template:

| Key | Required | Notes |
| --- | --- | --- |
| `VITE_API_URL` | ✅ | Base URL for REST calls |

## End-to-end workflow

1. **Upload submissions** – The Upload page validates JSON, previews submission counts, and posts to `/submissions`. Successful uploads advance the workflow to Judges management and remember the last `queueId`.
2. **Configure judges** – CRUD interface for AI judges with provider-specific model presets and reusable prompt templates.
3. **Assign per-question judges** – The Queue page lists detected question IDs and available judges. Saving now surfaces a summary banner (assignments × submissions) so operators understand expected evaluation volume before running.
4. **Run evaluations** – `Run AI Judges` triggers `/queue/run`, which returns `expected_evaluations`. The runner hook seeds progress with that total, streams live SSE updates, and cleanly falls back to polling when SSE is unavailable.
5. **Monitor progress** – Pending/running/done/failed counters stay in sync with `judge_jobs`. Completed evaluation counts arrive via SSE and feed the progress bar plus live status copy.
6. **Inspect results** – Results page applies queue-aware filters, shows aggregate pass rate using backend counts (`pass_count` & `total`), and renders reasoning snippets for quick triage.

## Testing & verification

| Command | Purpose |
| --- | --- |
| `python -m compileall server` | Quick syntax smoke for FastAPI services |
| `npm run build` (frontend) | TypeScript project build + Vite production bundle |

Run those before recording the final demo. Add `npm run lint` for full ESLint coverage when time allows.

## Trade-offs & future work

- **Prompt field toggles** – Expose a per-judge prompt composer with checkboxes for question text, answer text, and metadata. Store preferences alongside judges and adjust `run_single_judge` to assemble prompts accordingly.
- **Queue replays** – Implement a “rerun failed only” option that filters `judge_jobs` by `status='failed'` to conserve LLM spend on retries.
- **Explainability overlays** – Layer SHAP-style explanations or rubric scoring breakdowns on top of the verdict distribution charts to help reviewers diagnose judge behaviour.
- **Concurrency safety** – For large queues, consider moving job creation to Supabase functions or a background queue worker to avoid API timeout on `/queue/run`.
- **Voice-over demo** – Recommended once features are stable: walk through upload → judge CRUD → assignments → run → results, narrating trade-offs and known gaps.

## Attachments & Results filters (this run)

Changes made in this pass (conservative, in-place):

- Frontend `Upload` flow now accepts attachments (images, PDFs, text, zip) alongside the JSON payload. The UI allows per-file mapping to a submission id or a default mapping to the first submission if unspecified.
- Backend already included `POST /submissions/{submission_id}/attachments` and storage helpers; the frontend now uses that endpoint to upload files after creating submissions so binary data is stored in the `attachments` bucket and only metadata (filename, url, content_type, id) lives with the submission row.
- `Results` page filters are now independent of Dashboard state: initial `queue_id` can be read from the URL query param `?queue_id=...` and all filter interactions are local to the Results page (bookmarkable and decoupled from Dashboard controls).

How attachments work (summary):

1. User provides a JSON array of submissions and optionally selects attachments via the Upload page file picker.
2. The Upload UI presents a small mapping helper that lets the operator map each file to a submission id or choose the default "attach to first submission".
3. On Upload, the frontend posts the submissions array to `POST /submissions` (no binaries). After the submissions are persisted, the frontend posts each mapped file to `POST /submissions/{submission_id}/attachments` (multipart form data). The server stores the file in the configured Supabase storage bucket and updates the submission row with attachments metadata (no binary in DB).

Why this approach?

- Minimal backend surface change: we reuse the existing `add_submission_attachments` endpoint and storage helpers. No schema migrations were required.
- Conservative default mapping: attaching to the first submission is predictable and avoids expensive duplicate writes; operators can map files explicitly when needed.
- Attachments are stored as signed URLs in Supabase storage. This keeps DB size small and lets the runner/LLM include the signed URL in prompts or forward it to providers as needed.

Tradeoffs & future work (attachments):

- Automatic mapping heuristics could be improved (filename parsing, embedded metadata, or drag-to-map UI). For now we perform a filename substring match and default to the first submission.
- As an enhancement, consider adding a `attachments` table and foreign keys to submissions for stronger integrity and searchability (pros: indexing, dedup; cons: migration work).
- If you need attachments to be visible to unauthenticated LLM runners, consider making the signed URL TTL short and generating ephemeral provider-facing upload tokens.


## Submission checklist

- [ ] Backend & worker running locally with Supabase credentials set.
- [ ] Frontend passes `npm run build`.
- [ ] Record Loom/MP4 demo covering ingestion → judges → assignments → run → results.
- [ ] Update `Time Spent` + trade-offs in this README before delivery.
- [ ] Provide `.env.sample` files if sharing credentials with reviewers.

---

Questions or ideas? Drop them in the README or `REFactor_SUMMARY.md` so reviewers can trace scope decisions quickly.