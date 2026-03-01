from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class UserBase(BaseModel):
    telegram_id: int
    username: Optional[str] = None
    first_name: str

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    energy: int
    last_free_energy: datetime

    class Config:
        from_attributes = True

class CardDraw(BaseModel):
    name: str
    reversed: bool

class ReadingRequest(BaseModel):
    cards: List[CardDraw]

class ReadingResponse(BaseModel):
    id: int
    interpretation: str
    energy_remaining: int

    class Config:
        from_attributes = True

class BuyEnergyResponse(BaseModel):
    invoiceUrl: Optional[str] = None
    status: str
