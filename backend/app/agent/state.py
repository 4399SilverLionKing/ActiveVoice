from typing import List, Literal
import operator
from typing import Annotated
from langchain_core.messages import BaseMessage

from pydantic import BaseModel, Field


class Step(BaseModel):
    title: str = ""
    description: str = ""
    status: Literal["pending", "completed"] = "pending"


class Plan(BaseModel):
    goal: str = ""
    thought: str = ""
    steps: List[Step] = []


class State(BaseModel):
    user_message: str
    plan: Plan = Field(default_factory=Plan)
    messages: Annotated[List[BaseMessage], operator.add] = []
    observations: Annotated[list, operator.add] = []
    final_report: str = ""
