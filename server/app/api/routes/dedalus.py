from fastapi import APIRouter, BackgroundTasks, Depends
from app.services.job_service import create_job
from app.services.runner_service import enqueue_or_start_job

router = APIRouter(prefix="/dedalus")

@router.post("/run")
async def run_dedalus(payload: dict, background_tasks: BackgroundTasks, current_user=Depends(...)):
    job = await create_job(payload)
    background_tasks.add_task(enqueue_or_start_job, job.id)
    return {"job_id": job.id}