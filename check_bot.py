import os
import requests
from dotenv import load_dotenv

load_dotenv()
TOKEN = os.environ.get("BOT_TOKEN")
API_URL = f"https://api.telegram.org/bot{TOKEN}"

# Get Webhook Info
webhook_res = requests.get(f"{API_URL}/getWebhookInfo").json()
print("Webhook Info:", webhook_res)

# Get Chat Menu Button
menu_res = requests.get(f"{API_URL}/getChatMenuButton").json()
print("Menu Button:", menu_res)
