import hmac
import hashlib
import os
from urllib.parse import parse_qsl
from dotenv import load_dotenv
import random

load_dotenv()
BOT_TOKEN = os.getenv("BOT_TOKEN")

def validate_init_data(init_data: str) -> bool:
    """
    Валидация данных, переданных из Telegram Mini App.
    Логика из официальной документации Telegram.
    """
    if not BOT_TOKEN:
        print("WARNING: BOT_TOKEN is not set in .env")
        return False

    if not init_data:
        return False
        
    try:
        # Парсим строку init_data
        parsed_data = dict(parse_qsl(init_data))
        
        # Получаем hash и удаляем его из словаря
        hash_str = parsed_data.pop('hash', '')
        
        # Сортируем ключи по алфавиту
        sorted_keys = sorted(parsed_data.keys())
        
        # Формируем строку data_check_string
        data_check_array = []
        for key in sorted_keys:
            data_check_array.append(f"{key}={parsed_data[key]}")
        data_check_string = "\n".join(data_check_array)
        
        # Создаем secret_key с помощью SHA256 от токена бота 
        # (в Telegram Web App SDK ключ это "WebAppData")
        secret_key = hmac.new(
            key=b"WebAppData", 
            msg=BOT_TOKEN.encode('utf-8'), 
            digestmod=hashlib.sha256
        ).digest()
        
        # Считаем HMAC-SHA-256 от data_check_string с использованием secret_key
        calculated_hash = hmac.new(
            key=secret_key, 
            msg=data_check_string.encode('utf-8'), 
            digestmod=hashlib.sha256
        ).hexdigest()
        
        return calculated_hash == hash_str
    except Exception as e:
        print(f"Error validating init data: {e}")
        return False


def generate_pseudo_ai_reading(cards: list) -> str:
    """
    Здесь в будущем будет запрос к OpenAI / Anthropic.
    Пока используем псевдо-ИИ (на стороне сервера, чтобы было безопаснее менять шаблоны).
    """
    positions = [
        "Прошлое", "Настоящее", "Скрытые влияния",
        "Препятствия", "Окружение", "Совет", "Итог"
    ]
    
    intro_phrases = [
        "Нити судьбы сплелись в удивительный узор.",
        "Я прочитала ваш расклад «Подкова».",
        "Энергии арканов выстроились в ясную картину."
    ]
    
    html = f"<p><strong>{random.choice(intro_phrases)}</strong> Вот что мне удалось расшифровать:</p>"
    
    for i, card in enumerate(cards):
        if i < len(positions):
            pos_name = positions[i]
            card_name = card.name
            is_rev = card.reversed
            rev_text = '<span style="color:#ff6b6b;font-size:0.8em;">(Перевернута)</span>' if is_rev else ''
            
            html += f'''
            <div style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px dashed rgba(212, 175, 55, 0.2);">
                <div style="font-weight: bold; color: var(--gold); margin-bottom: 5px;">
                    {i+1}. {pos_name}: {card_name} {rev_text}
                </div>
                <div>
                    {"<em>Энергия карты искажена или заблокирована.</em> " if is_rev else ""}
                    Ключевое послание аркана: {generate_mystic_phrase()}
                </div>
            </div>
            '''
            
    html += f'<p style="margin-top: 20px; font-style: italic; text-align: center; color: var(--gold-dim);">Помните: карты показывают лишь вероятный путь. Творцом своей судьбы остаетесь вы.</p>'
    return html

def generate_mystic_phrase():
    phrases = [
        "Звезды благосклонны к вам.",
        "Будьте внимательнее к знакам судьбы.",
        "Доверяйте своей интуиции.",
        "Отпустите то, что больше не служит вам.",
        "Впереди вас ждут удивительные открытия.",
        "Вселенная готовит для вас подарок."
    ]
    return random.choice(phrases)
