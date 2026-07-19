import httpx
from typing import Dict, Any

class AlertSender:
    def __init__(self, bot_token: str | None = None, chat_id: str | None = None):
        self.bot_token = bot_token
        self.chat_id = chat_id

    async def send_telegram_alert(self, alert_data: Dict[str, Any]) -> bool:
        """
        UC-3 & Spec 15: Push a proactive alert to Telegram Bot API.
        If credentials are not set, fall back to console print.
        """
        eq_id = alert_data.get("equipment_id")
        eq_name = alert_data.get("equipment_name", eq_id)
        symptom = alert_data.get("symptom", "Anomaly detected")
        fix_name = alert_data.get("suggested_fix", "Consult manual")
        confidence = alert_data.get("confidence", 0.0)
        
        telemetry = alert_data.get("telemetry", {})
        metric = telemetry.get("metric", "unknown")
        val = telemetry.get("value", 0.0)
        delta = telemetry.get("delta_pct", 0.0)

        # Build notification text using markdown formatting
        text = (
            f"⚠️ *SMRITI OS: Proactive Alert*\n"
            f"• *Equipment:* {eq_name} (`{eq_id}`)\n"
            f"• *Anomaly:* {symptom} ({metric}={val}, delta={delta:.1f}%)\n"
            f"• *Recommended Remedy:* {fix_name}\n"
            f"• *Remedy Confidence:* {confidence:.2%}"
        )
        
        # Log locally to console
        print(f"\n[ALERT SIGNAL] {eq_name} - {symptom}. Remedy: {fix_name} (Confidence: {confidence:.2f})\n")

        if not self.bot_token or not self.chat_id:
            # Silent fallback if not configured, return True because alert was output to console
            return True
        
        try:
            url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    url,
                    json={
                        "chat_id": self.chat_id,
                        "text": text,
                        "parse_mode": "Markdown"
                    },
                    timeout=5.0
                )
                return response.status_code == 200
        except Exception as e:
            print(f"[-] Telegram alert delivery failed: {e}")
            return False
