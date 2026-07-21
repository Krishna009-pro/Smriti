import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bot, ImageIcon, Send, Sparkles, User, X } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/lib/types'

const Markdown = React.lazy(() => import('react-markdown'))

interface CopilotProps {
  equipmentId: string | null
}

export function Copilot({ equipmentId }: CopilotProps) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [attachmentName, setAttachmentName] = useState<string | null>(null)
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
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
    if ((!question && !attachmentFile) || streaming) return

    const userContent = attachmentFile
      ? question
        ? `${question} [📎 ${attachmentName}]`
        : `[📎 ${attachmentName}]`
      : question

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: userContent,
    }
    const aiId = `a-${Date.now()}`
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: aiId, role: 'assistant', content: '' },
    ])
    setInput('')
    const sentFile = attachmentFile
    setAttachmentFile(null)
    setAttachmentName(null)
    setStreaming(true)

    try {
      let answer: string
      if (sentFile) {
        // Vision path — send image to Gemini vision endpoint
        answer = await api.askVision(sentFile, equipmentId ?? undefined)
      } else {
        // Text RAG path
        answer = await api.askChat(question, equipmentId ?? undefined)
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === aiId ? { ...m, content: answer } : m)),
      )
    } catch (err) {
      const errMsg =
        err instanceof Error ? err.message : 'Unknown error'
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiId
            ? { ...m, content: `Sorry — could not reach the memory index. (${errMsg})` }
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
            className="glass fixed bottom-6 right-6 z-50 flex flex-col overflow-hidden rounded-2xl border border-border shadow-2xl"
            style={{
              width: 'min(calc(100vw - 48px), 420px)',
              height: 'min(calc(100vh - 120px), 580px)',
            }}
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
              {attachmentName && (
                <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-2 py-1.5 text-[11px]">
                  <ImageIcon className="size-3.5 text-teal" />
                  <span className="flex-1 truncate">{attachmentName}</span>
                  <button
                    type="button"
                    aria-label="Remove attachment"
                    onClick={() => { setAttachmentFile(null); setAttachmentName(null) }}
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
                    if (f) {
                      setAttachmentFile(f)
                      setAttachmentName(f.name)
                    }
                    // reset so same file can be re-selected
                    e.target.value = ''
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
                  disabled={streaming || (!input.trim() && !attachmentFile)}
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

function getModeBadge(mode?: string) {
  if (!mode) return null
  const m = mode.toLowerCase()
  if (m.includes('openrouter')) {
    return { label: 'Cloud RAG (OpenRouter)', color: 'border-violet/40 bg-violet/10 text-violet' }
  }
  if (m.includes('vision')) {
    return { label: 'Cloud Vision (Gemini 2.5 Flash)', color: 'border-emerald/40 bg-emerald/10 text-emerald' }
  }
  if (m.includes('cloud') || m.includes('gemini')) {
    return { label: 'Cloud RAG (Google Gemini)', color: 'border-teal/40 bg-teal/10 text-teal' }
  }
  if (m.includes('local') || m.includes('fallback')) {
    return { label: 'Local Memory RAG (Vector Index)', color: 'border-amber/40 bg-amber/10 text-amber' }
  }
  return { label: 'Cloud AI Assistant', color: 'border-border bg-secondary/60 text-muted-foreground' }
}

function AssistantMessage({ content }: { content: string }) {
  // Try to parse JSON content produced by backend RAG/chatbot if any.
  let parsed: any = null
  try {
    parsed = JSON.parse(content)
  } catch (_e) {
    // not JSON
  }

  const rawAnswer = parsed
    ? (parsed.formatted_answer ?? parsed.answer ?? parsed.text ?? '')
    : content

  const edges = parsed
    ? (parsed.retrieved_edges ?? parsed.retrievedEdges ?? parsed.edges ?? [])
    : []

  const mode = parsed?.mode ?? parsed?.retrieval_mode

  const badge = getModeBadge(mode)

  const markdownComponents = {
    p: ({ children }: any) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
    ul: ({ children }: any) => <ul className="mb-2 ml-4 list-disc space-y-1 text-xs">{children}</ul>,
    ol: ({ children }: any) => <ol className="mb-2 ml-4 list-decimal space-y-1 text-xs">{children}</ol>,
    li: ({ children }: any) => <li className="leading-relaxed">{children}</li>,
    strong: ({ children }: any) => <strong className="font-semibold text-foreground">{children}</strong>,
    code: ({ children }: any) => (
      <code className="rounded bg-secondary/80 px-1.5 py-0.5 font-mono text-[11px] text-teal">
        {children}
      </code>
    ),
  }

  return (
    <div className="space-y-2">
      {badge && (
        <div className="mb-1 flex items-center">
          <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-tight', badge.color)}>
            <span className="size-1.5 rounded-full bg-current" />
            {badge.label}
          </span>
        </div>
      )}

      <div className="text-[13px] leading-relaxed">
        <React.Suspense fallback={<div className="text-[13px]">{rawAnswer}</div>}>
          <Markdown components={markdownComponents}>{rawAnswer}</Markdown>
        </React.Suspense>
      </div>

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

      {parsed && (
        <details className="mt-2 text-[11px] text-muted-foreground">
          <summary className="cursor-pointer">Show raw response</summary>
          <pre className="mt-2 max-h-40 overflow-auto text-[11px]">{JSON.stringify(parsed, null, 2)}</pre>
        </details>
      )}
    </div>
  )
}


