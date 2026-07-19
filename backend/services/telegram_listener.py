"""Interactive Telegram Bot Listener for mobile conversational RAG."""
import asyncio
import httpx
from sqlalchemy.orm import sessionmaker
from backend.config import settings
from backend.services.rag_service import retrieve_and_answer

async def start_telegram_listener(session_factory: sessionmaker):
    """
    Background worker that polls Telegram updates and replies to technician questions
    using the Cloud-First, Local-Second RAG pipeline.
    """
    bot_token = settings.telegram_bot_token
    if not bot_token or "your_" in bot_token:
        print("[*] Telegram Bot Token not configured. Interactive bot interface disabled.")
        return

    print("[+] Starting interactive Telegram Copilot listener...")
    last_update_id = 0
    client = httpx.AsyncClient()

    # Seed the initial offset so we don't reply to stale historical messages on restart
    try:
        url = f"https://api.telegram.org/bot{bot_token}/getUpdates"
        resp = await client.get(url, params={"limit": 1}, timeout=5.0)
        if resp.status_code == 200:
            updates = resp.json().get("result", [])
            if updates:
                last_update_id = updates[-1]["update_id"]
    except Exception as e:
        print(f"[-] Initial Telegram offset fetch failed: {e}")

    while True:
        try:
            url = f"https://api.telegram.org/bot{bot_token}/getUpdates"
            params = {"offset": last_update_id + 1, "timeout": 5}
            resp = await client.get(url, params=params, timeout=10.0)

            if resp.status_code == 200:
                result = resp.json().get("result", [])
                for update in result:
                    last_update_id = update["update_id"]
                    message = update.get("message")
                    if not message or "text" not in message:
                        continue

                    chat_id = message["chat"]["id"]
                    user_text = message["text"]

                    # Process command or query
                    if user_text.strip() == "/start":
                        reply = (
                            "👋 **Welcome to Smriti AI Mobile Copilot!**\n\n"
                            "Ask me troubleshooting or procedure questions about any plant equipment.\n"
                            "• Example: *P-102 pressure drops, what should I check?*"
                        )
                    else:
                        # Instantiate session to query DB
                        db = session_factory()
                        try:
                            # Run local-second RAG pipeline
                            rag_res = await retrieve_and_answer(db, user_text)
                            reply = rag_res["answer"]
                        except Exception as ex:
                            reply = f"Error processing query: {ex}"
                        finally:
                            db.close()

                    # Send reply back to Telegram
                    send_url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
                    await client.post(send_url, json={
                        "chat_id": chat_id,
                        "text": reply,
                        "parse_mode": "Markdown"
                    })

        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[-] Telegram listener polling error: {e}")
            await asyncio.sleep(5)
        
        await asyncio.sleep(1)

    await client.aclose()
