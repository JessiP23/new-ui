from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class Question(BaseModel):
    data: Dict[str, Any]

class Submission(BaseModel):
    id: str
    queueId: str
    labelingTaskId: str
    createdAt: int
    questions: List[Question]
    answers: Dict[str, Dict[str, Any]]

class Judge(BaseModel):
    id: str = None
    name: str
    system_prompt: str
    model: str
    active: bool
    provider: Optional[str] = None
    includeQuestionText: bool = True
    includeAnswerText: bool = True
    includeMetadata: bool = False

class Assignment(BaseModel):
    id: str = None
    question_id: str
    judge_id: str
    queue_id: str