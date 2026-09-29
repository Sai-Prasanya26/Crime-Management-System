from pydantic import BaseModel
from typing import Generic, TypeVar, List, Optional

T = TypeVar("T")


class StandardListResponse(BaseModel, Generic[T]):
    total: int
    items: List[T]


class ErrorResponse(BaseModel):
    detail: str
    code: Optional[str] = None
