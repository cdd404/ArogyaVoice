from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, Field

Language = Literal["en", "kn", "te", "hi"]
Confidence = Literal["high", "medium", "low", "unreadable"]


class Medicine(BaseModel):
    medicine_name: str | None = Field(default=None, max_length=200)
    strength: str | None = Field(default=None, max_length=100)
    dosage: str | None = Field(default=None, max_length=200)
    frequency: str | None = Field(default=None, max_length=200)
    timing: str | None = Field(default=None, max_length=200)
    duration: str | None = Field(default=None, max_length=100)
    route: str | None = Field(default=None, max_length=100)
    instructions: str | None = Field(default=None, max_length=1000)
    confidence: Confidence = "unreadable"
    needs_doctor_confirmation: bool = True


class PrescriptionData(BaseModel):
    doctor_name: str | None = Field(default=None, max_length=200)
    prescription_date: str | None = Field(default=None, max_length=100)
    medicines: list[Medicine] = Field(default_factory=list, max_length=30)
    other_instructions: str | None = Field(default=None, max_length=2000)
    status: Literal["needs_review", "verified"] = "needs_review"


class PrescriptionQuestion(BaseModel):
    language: Language
    question: str = Field(min_length=1, max_length=2000)
    prescription: PrescriptionData
    history: list["QuestionTurn"] = Field(default_factory=list, max_length=12)


class QuestionTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class PrescriptionVerification(BaseModel):
    prescription: PrescriptionData

