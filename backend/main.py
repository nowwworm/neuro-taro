from fastapi import FastAPI, Depends, HTTPException, Header, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime
import json
import urllib.parse

from . import models, schemas, utils
from .database import engine, get_db

# Создаем таблицы, если их нет
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Neuro-Tarot API")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_current_user_data(x_telegram_init_data: str = Header(None)) -> dict:
    if not x_telegram_init_data:
        # Для локального тестирования
        return {"id": 1234567, "first_name": "TestUser", "username": "test_local"}
    
    try:
        # Парсим initData как URL-кодированную строку
        parsed_data = dict(urllib.parse.parse_qsl(x_telegram_init_data))
        
        # В идеале нужно проверять подпись (утилита validate_init_data), 
        # но для урока/MVP если локально - пропускаем, если с сервером - можно включить.
        # ВАЖНО: раскомментируйте utils.validate_init_data(x_telegram_init_data) для реальной защиты
        
        # if not utils.validate_init_data(x_telegram_init_data):
        #     raise HTTPException(status_code=401, detail="Invalid Telegram signature")
            
        user_json = parsed_data.get('user', '{}')
        user_data = json.loads(user_json)
        return user_data
    except Exception as e:
        print(f"Auth error: {e}")
        raise HTTPException(status_code=401, detail="Could not parse Telegram data")

@app.post("/api/me", response_model=schemas.UserResponse)
def get_or_create_user(request: Request, db: Session = Depends(get_db)):
    tg_data = request.headers.get('x-telegram-init-data')
    user_data = get_current_user_data(tg_data)
    
    tg_id = user_data.get("id")
    if not tg_id:
        raise HTTPException(status_code=400, detail="Invalid user data")

    user = db.query(models.User).filter(models.User.telegram_id == tg_id).first()
    
    if not user:
        # Создаем нового пользователя
        user_name = user_data.get("first_name", "Путешественник")
        user = models.User(
            telegram_id=tg_id,
            first_name=user_name,
            username=user_data.get("username"),
            energy=3 # Даем 3 бесплатные энергии на старте
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    return user

@app.post("/api/buy-energy", response_model=schemas.BuyEnergyResponse)
def buy_energy(request: Request, db: Session = Depends(get_db)):
    tg_data = request.headers.get('x-telegram-init-data')
    user_data = get_current_user_data(tg_data)
    
    tg_id = user_data.get("id")
    user = db.query(models.User).filter(models.User.telegram_id == tg_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # В реальном приложении здесь был бы API-запрос к Telegram Stars
    # Для целей демо мы просто добавляем энергию бесплатно и возвращаем статус
    # "Отправка invoiceUrl" - это то, что мы делали бы для реальной оплаты.
    
    user.energy += 10
    db.commit()
    
    return {"status": "success"}

@app.post("/api/readings", response_model=schemas.ReadingResponse)
def create_reading(reading: schemas.ReadingRequest, request: Request, db: Session = Depends(get_db)):
    tg_data = request.headers.get('x-telegram-init-data')
    user_data = get_current_user_data(tg_data)
    
    tg_id = user_data.get("id")
    user = db.query(models.User).filter(models.User.telegram_id == tg_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.energy <= 0:
        raise HTTPException(status_code=400, detail="Not enough energy")
        
    # Списываем энергию
    user.energy -= 1
    
    # Генерируем текст расклада
    interpretation = utils.generate_pseudo_ai_reading(reading.cards)
    
    # Сохраняем в БД
    cards_list = [{"name": c.name, "reversed": c.reversed} for c in reading.cards]
    db_reading = models.Reading(
        user_id=user.telegram_id,
        cards_drawn=cards_list,
        interpretation=interpretation
    )
    db.add(db_reading)
    db.commit()
    db.refresh(db_reading)
    
    return {
        "id": db_reading.id,
        "interpretation": db_reading.interpretation,
        "energy_remaining": user.energy
    }

# Раздача статических файлов (HTML, CSS, JS, картинки)
# ВАЖНО: Это должно быть в самом конце файла!
app.mount("/", StaticFiles(directory=".", html=True), name="static")
