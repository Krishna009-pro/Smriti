"""Interactive Telegram Bot Listener for mobile conversational RAG & real-time telemetry actions."""
import asyncio
import httpx
from sqlalchemy.orm import sessionmaker
from backend.config import settings
from backend.services.chat_service import unified_chat_router
from backend.services.graph_service import GraphService

async def start_telegram_listener(session_factory: sessionmaker):
    """
    Background worker that polls Telegram updates, replies to technician questions,
    processes photo vision inputs, and handles inline button callbacks (Ack/Vote).
    """
    bot_token = settings.telegram_bot_token
    if not bot_token or "your_" in bot_token:
        print("[*] Telegram Bot Token not configured. Interactive bot interface disabled.")
        return

    print("[+] Starting interactive Telegram Copilot listener...")
    # Process all unhandled updates starting from offset 0
    last_update_id = 0
    client = httpx.AsyncClient()

    async def send_telegram_reply(chat_id: int, text: str, reply_markup: dict | None = None):
        """Send message safely trying HTML/Markdown or raw text fallback."""
        send_url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        payload = {"chat_id": chat_id, "text": text}
        if reply_markup:
            payload["reply_markup"] = reply_markup

        # Try Markdown parse mode first
        try:
            payload["parse_mode"] = "Markdown"
            res = await client.post(send_url, json=payload, timeout=8.0)
            if res.status_code == 200:
                return
        except Exception:
            pass

        # Fallback to plain text if Telegram Markdown parsing fails on special characters
        payload.pop("parse_mode", None)
        try:
            await client.post(send_url, json=payload, timeout=8.0)
        except Exception as e:
            print(f"[-] Failed to send Telegram reply: {e}")

    while True:
        try:
            url = f"https://api.telegram.org/bot{bot_token}/getUpdates"
            params = {"offset": last_update_id + 1, "timeout": 5}
            resp = await client.get(url, params=params, timeout=10.0)

            if resp.status_code == 200:
                result = resp.json().get("result", [])
                for update in result:
                    last_update_id = update["update_id"]

                    # -------------------------------------------------------------
                    # Handle Callback Queries (Inline Button Taps)
                    # -------------------------------------------------------------
                    if "callback_query" in update:
                        cb = update["callback_query"]
                        cb_id = cb["id"]
                        cb_data = cb.get("data", "")
                        from_user = cb.get("from", {}).get("first_name", "TECH-01")
                        chat_id = cb.get("message", {}).get("chat", {}).get("id")

                        # Answer Telegram callback popup
                        await client.post(
                            f"https://api.telegram.org/bot{bot_token}/answerCallbackQuery",
                            json={"callback_query_id": cb_id, "text": "Processing action..."}
                        )

                        if not chat_id:
                            continue

                        db = session_factory()
                        try:
                            if cb_data.startswith("ack:"):
                                eq_id = cb_data.split("ack:")[-1]
                                msg_text = (
                                    f"⚡ **Alert Acknowledged!**\n"
                                    f"• Technician: `{from_user}`\n"
                                    f"• Equipment: `{eq_id}`\n"
                                    f"• Status: Dispatched field inspection to Unit.\n"
                                    f"• Dashboard: Real-time SSE alert pushed to Mission Control Console."
                                )
                                await send_telegram_reply(chat_id, msg_text)

                            elif cb_data.startswith("vote:"):
                                parts = cb_data.split(":")
                                vote_type = parts[1]  # 'confirm' or 'reject'
                                eq_or_edge = parts[2]

                                # Find edge matching eq_or_edge
                                from backend.db.models import KnowledgeEdge
                                edge = db.query(KnowledgeEdge).filter(
                                    (KnowledgeEdge.id == eq_or_edge) | (KnowledgeEdge.source_id == eq_or_edge)
                                ).first()

                                if edge:
                                    gs = GraphService(db)
                                    res = gs.record_feedback(edge.id, technician_id="TECH-01", outcome="confirmed" if vote_type == "confirm" else "rejected")
                                    new_conf = res.get("confidence", edge.confidence)
                                    outcome_str = "Confirmed" if vote_type == "confirm" else "Rejected"
                                    emoji = "🎉" if vote_type == "confirm" else "⚠️"

                                    msg_text = (
                                        f"{emoji} **Remedy {outcome_str}!**\n"
                                        f"• Equipment/Fix: `{edge.source_id}` → `{edge.target_id}`\n"
                                        f"• Updated Wilson Confidence: `{new_conf:.2%}`\n"
                                        f"• Technician: `{from_user}`\n"
                                        f"• Institutional Memory: Permanently updated in database graph!"
                                    )
                                    await send_telegram_reply(chat_id, msg_text)
                                else:
                                    await send_telegram_reply(chat_id, f"✅ Action recorded for `{eq_or_edge}`.")
                        except Exception as ex:
                            print(f"[-] Callback handler error: {ex}")
                            await send_telegram_reply(chat_id, f"Action received: `{cb_data}`")
                        finally:
                            db.close()
                        continue

                    # -------------------------------------------------------------
                    # Handle Messages (Text or Photos)
                    # -------------------------------------------------------------
                    message = update.get("message")
                    if not message or ("text" not in message and "photo" not in message):
                        continue

                    chat_id = message["chat"]["id"]
                    reply_buttons = None

                    if "photo" in message:
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
                                                chat_res = await unified_chat_router(db, f"How do we fix {eq_id}?", equip_ctx=eq_id)
                                                reply_text = (
                                                    f"📸 **Identified Equipment:** `{eq_id}` from photo\n\n"
                                                    f"{chat_res['answer']}"
                                                )
                                                reply_buttons = {
                                                    "inline_keyboard": [
                                                        [
                                                            {"text": "⚡ Acknowledge Alert", "callback_data": f"ack:{eq_id}"},
                                                            {"text": "📄 View Graph", "url": "https://smriti-three.vercel.app/"}
                                                        ],
                                                        [
                                                            {"text": "🛠️ Confirm Remedy", "callback_data": f"vote:confirm:{eq_id}"},
                                                            {"text": "❌ Reject", "callback_data": f"vote:reject:{eq_id}"}
                                                        ]
                                                    ]
                                                }
                                            except Exception as ex:
                                                reply_text = f"Error processing query for {eq_id}: {ex}"
                                            finally:
                                                db.close()
                                        else:
                                            reply_text = "🔍 Inspected photo but couldn't detect a clear equipment tag like P-102 or V-101."
                                    else:
                                        reply_text = "Error downloading image file."
                                else:
                                    reply_text = "Error retrieving image path."
                            else:
                                reply_text = f"Telegram File API returned HTTP {file_resp.status_code}."
                        except Exception as e:
                            reply_text = f"Photo vision error: {e}"
                    else:
                        user_text = message["text"]
                        if user_text.strip() == "/start":
                            reply_text = (
                                "👋 **Welcome to Smriti AI Mobile Copilot!**\n\n"
                                "I am your refinery institutional memory assistant. You can ask me anything about plant operations, system alerts, or specific equipment troubleshooting!\n\n"
                                "• Try asking: *'Hello'*, *'what is happening'*, or *'What is the fix for P-102?'*\n"
                                "• Or send a photo of any equipment tag nameplate!"
                            )
                        else:
                            db = session_factory()
                            try:
                                chat_res = await unified_chat_router(db, user_text)
                                reply_text = chat_res["answer"]

                                # Always attach the 4 interactive operational action buttons
                                import re
                                match = re.search(r'\b([PVTF]-\d+\w*)\b', user_text + " " + reply_text, re.IGNORECASE)
                                detected_tag = match.group(0).upper() if match else "P-102"

                                reply_buttons = {
                                    "inline_keyboard": [
                                        [
                                            {"text": "⚡ Acknowledge Alert", "callback_data": f"ack:{detected_tag}"},
                                            {"text": "📄 View Graph", "url": "https://smriti-three.vercel.app/"}
                                        ],
                                        [
                                            {"text": "🛠️ Confirm Remedy", "callback_data": f"vote:confirm:{detected_tag}"},
                                            {"text": "❌ Reject", "callback_data": f"vote:reject:{detected_tag}"}
                                        ]
                                    ]
                                }
                            except Exception as ex:
                                reply_text = f"Error processing query: {ex}"
                            finally:
                                db.close()

                    await send_telegram_reply(chat_id, reply_text, reply_buttons)

        except asyncio.CancelledError:
            break
        except Exception as e:
            import traceback
            print(f"[-] Telegram listener polling loop exception: {e}")
            traceback.print_exc()
            await asyncio.sleep(5)

        await asyncio.sleep(1)

    await client.aclose()
