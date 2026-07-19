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
                    if not message or ("text" not in message and "photo" not in message):
                        continue

                    chat_id = message["chat"]["id"]
                    reply = ""

                    if "photo" in message:
                        # Fetch photo file path and download
                        photo = message["photo"]
                        largest_photo = photo[-1]
                        file_id = largest_photo["file_id"]
                        
                        file_url = f"https://api.telegram.org/bot{bot_token}/getFile"
                        try:
                            file_resp = await client.get(file_url, params={"file_id": file_id})
                            if file_resp.status_code == 200:
                                file_path = file_resp.json().get("result", {}).get("file_path")
                                if file_path:
                                    download_url = f"https://api.telegram.org/file/bot{bot_token}/{file_path}"
                                    img_resp = await client.get(download_url)
                                    if img_resp.status_code == 200:
                                        from backend.services.rag_service import extract_equipment_from_image
                                        eq_id = await extract_equipment_from_image(img_resp.content)
                                        if eq_id:
                                            db = session_factory()
                                            try:
                                                rag_res = await retrieve_and_answer(db, f"How do we fix {eq_id}?")
                                                reply = (
                                                    f"📸 **Identified Equipment:** `{eq_id}` from photo\n\n"
                                                    f"{rag_res['answer']}"
                                                )
                                            except Exception as ex:
                                                reply = f"Error processing query for {eq_id}: {ex}"
                                            finally:
                                                db.close()
                                        else:
                                            reply = "🔍 I inspected the photo but couldn't find a clear equipment tag like P-102 or V-101."
                                    else:
                                        reply = "Error: Failed to download the image file from Telegram."
                                else:
                                    reply = "Error: File path not found in Telegram metadata."
                            else:
                                reply = f"Error: Failed to retrieve file details from Telegram API (HTTP {file_resp.status_code})."
                        except Exception as e:
                            reply = f"Error during photo download: {e}"
                    else:
                        user_text = message["text"]
                        if user_text.strip() == "/start":
                            reply = (
                                "👋 **Welcome to Smriti AI Mobile Copilot!**\n\n"
                                "Ask me troubleshooting or procedure questions about any plant equipment.\n"
                                "• Example: *P-102 pressure drops, what should I check?*\n"
                                "• Or take/send a photo of any equipment tag nameplate!"
                            )
                        else:
                            db = session_factory()
                            try:
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
            import traceback
            print(f"[-] Telegram listener polling error: {e}")
            traceback.print_exc()
            await asyncio.sleep(5)
        
        await asyncio.sleep(1)

    await client.aclose()
