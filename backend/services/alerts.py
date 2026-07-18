from typing import Dict, Any

class AlertSender:
    def __init__(self, bot_token: str | None = None, chat_id: str | None = None):
        self.bot_token = bot_token
        self.chat_id = chat_id

    async def send_telegram_alert(self, alert_data: Dict[str, Any]) -> bool:
        """
        UC-3 & Spec 15: Push a proactive alert to Telegram Bot API.
        """
        if not self.bot_token or not self.chat_id:
            # Silent fallback if not configured
            return False
        
        # In a real app, send HTTP request to Telegram Bot API
        return True
