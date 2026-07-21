import { AnimatePresence, motion } from 'framer-motion'
import { Bot, ImageIcon, Send, Sparkles, User, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/lib/types'

interface CopilotProps {
  equipmentId: string | null
}

export function Copilot({ equipmentId }: CopilotProps) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [attachment, setAttachment] = useState<string | null>(null)
  const [streaming, setStreaming] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'I am the Smriti copilot. Ask about equipment history, symptoms, or known fixes and I will pull the relevant institutional memory.',
    },
  ])
  const fileRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Pre-fill from selected node.
  useEffect(() => {
    if (equipmentId && open) {
      setInput((prev) =>
        prev.trim() === '' ? `What is the known fix for ${equipmentId}?` : prev,
      )
    }
  }, [equipmentId, open])

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, streaming])

  const send = async () => {
    const question = input.trim()
    if (!question || streaming) return

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: attachment ? `${question} [image attached]` : question,
    }
    const aiId = `a-${Date.now()}`
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: aiId, role: 'assistant', content: '' },
    ])
    setInput('')
    setAttachment(null)
    setStreaming(true)

    try {
      const res = await api.askChat(question, equipmentId ?? undefined)
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiId ? { ...m, content: m.content + chunk } : m,
            ),
          )
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiId
            ? { ...m, content: 'Sorry — I could not reach the memory index.' }
            : m,
        ),
      )
    } finally {
      setStreaming(false)
    }
  }

  return (
    <>
      {/* Floating button */}
      <motion.button
        type="button"
        aria-label="Open AI copilot"
        onClick={() => setOpen(true)}
        initial={{ scale: 0 }}
        animate={{ scale: open ? 0 : 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full text-primary-foreground shadow-xl shadow-teal/30"
        style={{
          background: 'linear-gradient(135deg, var(--teal), var(--emerald))',
        }}
      >
        <Sparkles className="size-6" />
        <span className="absolute right-1 top-1 flex size-3">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-75" />
          <span className="relative inline-flex size-3 rounded-full bg-white" />
        </span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="glass fixed bottom-6 right-6 z-50 flex h-[560px] w-[calc(100vw-3rem)] max-w-[380px] flex-col overflow-auto rounded-2xl border border-border shadow-2xl"
            style={{ resize: 'both', minWidth: 280, minHeight: 240 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-violet/15 text-violet">
                  <Bot className="size-4" />
                </div>
                <div className="leading-tight">
                  <p className="text-sm font-semibold">Smriti Copilot</p>
                  <p className="text-[11px] text-muted-foreground">
                    {equipmentId ? (
                      <>
                        Context:{' '}
                        <span className="font-mono text-teal">
                          {equipmentId}
                        </span>
                      </>
                    ) : (
                      'RAG over institutional memory'
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close copilot"
                onClick={() => setOpen(false)}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
            >
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    'flex gap-2',
                    m.role === 'user' ? 'flex-row-reverse' : 'flex-row',
                  )}
                >
                  <div
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-lg',
                      m.role === 'user'
                        ? 'bg-teal/15 text-teal'
                        : 'bg-violet/15 text-violet',
                    )}
                  >
                    {m.role === 'user' ? (
                      <User className="size-3.5" />
                    ) : (
                      <Bot className="size-3.5" />
                    )}
                  </div>
                  <div
                    className={cn(
                      'max-w-[78%] rounded-2xl px-3 py-2 text-xs leading-relaxed',
                      m.role === 'user'
                        ? 'rounded-tr-sm bg-teal/15'
                        : 'rounded-tl-sm border border-border bg-secondary/40',
                    )}
                  >
                    {m.role === 'assistant' ? (
                      <AssistantMessage content={m.content} />
                    ) : m.content ? (
                      m.content
                    ) : (
                      <span className="inline-flex gap-1">
                        <Dot delay={0} />
                        <Dot delay={0.15} />
                        <Dot delay={0.3} />
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="border-t border-border p-3">
              {attachment && (
                <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-2 py-1.5 text-[11px]">
                  <ImageIcon className="size-3.5 text-teal" />
                  <span className="flex-1 truncate">{attachment}</span>
                  <button
                    type="button"
                    aria-label="Remove attachment"
                    onClick={() => setAttachment(null)}
                    className="text-muted-foreground hover:text-critical"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  aria-label="Attach image for vision analysis"
                  onClick={() => fileRef.current?.click()}
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-teal"
                >
                  <ImageIcon className="size-4" />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) setAttachment(f.name)
                  }}
                />
                <textarea
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (
                      e.key === 'Enter' &&
                      !e.shiftKey &&
                      !e.nativeEvent.isComposing &&
                      e.keyCode !== 229
                    ) {
                      e.preventDefault()
                      send()
                    }
                  }}
                  placeholder="Ask the copilot…"
                  className="max-h-24 min-h-9 flex-1 resize-none rounded-lg border border-border bg-background/60 px-3 py-2 text-xs outline-none placeholder:text-muted-foreground focus:border-teal/50"
                />
                <button
                  type="button"
                  aria-label="Send message"
                  onClick={send}
                  disabled={streaming || !input.trim()}
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg text-primary-foreground transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
                  style={{
                    background:
                      'linear-gradient(135deg, var(--teal), var(--emerald))',
                  }}
                >
                  <Send className="size-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function Dot({ delay }: { delay: number }) {
  return (
    <motion.span
      className="inline-block size-1.5 rounded-full bg-muted-foreground"
      animate={{ opacity: [0.3, 1, 0.3] }}
      transition={{ duration: 1, repeat: Infinity, delay }}
    />
  )
}

function AssistantMessage({ content }: { content: string }) {
  // Try to parse JSON content produced by the backend RAG/chatbot.
  // If parsing fails, fall back to raw text display.
  let parsed: any = null
  try {
    parsed = JSON.parse(content)
  } catch (_e) {
    // not JSON — leave parsed as null
  }

  if (!parsed) {
    return <div className="whitespace-pre-wrap">{sanitizeAnswer(content)}</div>
  }

  const rawAnswer = parsed.formatted_answer ?? parsed.answer ?? parsed.text ?? ''
  const answer = sanitizeAnswer(rawAnswer)
  const edges = parsed.retrieved_edges ?? parsed.retrievedEdges ?? parsed.edges ?? []

  return (
    <div>
      <div className="mb-2 text-[13px] whitespace-pre-wrap">{answer}</div>

      {Array.isArray(edges) && edges.length > 0 && (
        <div className="mt-2 rounded-md border border-border bg-background/40 p-2 text-[12px]">
          <div className="mb-1 text-[11px] font-medium text-muted-foreground">References</div>
          <ul className="space-y-1">
            {edges.map((e: any, i: number) => (
              <li key={i} className="flex items-start gap-2">
                <span className="font-mono text-[11px] text-teal">{e.edge_id ?? e.edgeId ?? e.id ?? 'edge'}</span>
                <div className="flex-1">
                  <div className="text-[12px]">{e.fix_name ?? e.fixName ?? e.title ?? JSON.stringify(e)}</div>
                  {typeof e.confidence !== 'undefined' && (
                    <div className="text-[11px] text-muted-foreground">Confidence: {(Number(e.confidence) * 100).toFixed(1)}%</div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <details className="mt-2 text-[11px] text-muted-foreground">
        <summary className="cursor-pointer">Show raw response</summary>
        <pre className="mt-2 max-h-40 overflow-auto text-[11px]">{JSON.stringify(parsed, null, 2)}</pre>
      </details>
    </div>
  )
}

function sanitizeAnswer(text: string) {
  if (!text) return ''
  // Remove code fences and inline code
  let s = text.replace(/```[\s\S]*?```/g, '')
  s = s.replace(/`/g, '')
  // Remove bold/italic markers
  s = s.replace(/\*\*([\s\S]*?)\*\*/g, '$1')
  s = s.replace(/\*([\s\S]*?)\*/g, '$1')
  // Collapse excessive blank lines
  s = s.replace(/\n{3,}/g, '\n\n')
  // Trim whitespace
  return s.trim()
}
