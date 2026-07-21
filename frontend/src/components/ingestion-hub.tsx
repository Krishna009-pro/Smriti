import { motion } from 'framer-motion'
import { FileUp, UploadCloud, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { GlassCard } from '@/components/glass-card'
import { useToast } from '@/components/toast'
import { cn } from '@/lib/utils'

type DocType = 'pid' | 'shift_notes'

const DOC_TYPES: { value: DocType; label: string }[] = [
  { value: 'pid', label: 'P&ID' },
  { value: 'shift_notes', label: 'Shift Notes' },
]

export function IngestionHub() {
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [docType, setDocType] = useState<DocType>('pid')
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)

  const addFiles = (list: FileList | null) => {
    if (!list) return
    const next = Array.from(list)
    setFiles((prev) => [...prev, ...next])
  }

  const upload = async () => {
    if (files.length === 0) {
      toast({ kind: 'info', title: 'No files selected', description: 'Add a PDF, PNG, or CSV first.' })
      return
    }
    setUploading(true)
    await new Promise((r) => setTimeout(r, 1100))
    setUploading(false)
    toast({
      kind: 'success',
      title: 'Documents queued for embedding',
      description: `${files.length} file(s) sent to the ${
        docType === 'pid' ? 'P&ID' : 'Shift Notes'
      } pipeline.`,
    })
    setFiles([])
  }

  return (
    <GlassCard hoverLift={false} className="flex flex-col p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold">Document Ingestion</h2>
        <p className="text-xs text-muted-foreground">
          Feed new memory into the vector index
        </p>
      </div>

      <div className="mb-3 inline-flex rounded-lg border border-border bg-secondary/40 p-1">
        {DOC_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setDocType(t.value)}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              docType === t.value
                ? 'bg-teal/15 text-teal'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          addFiles(e.dataTransfer.files)
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-8 text-center transition-colors',
          dragging
            ? 'border-teal bg-teal/10'
            : 'border-border bg-background/40 hover:border-teal/40',
        )}
      >
        <motion.div
          animate={dragging ? { y: -4 } : { y: 0 }}
          className="flex size-11 items-center justify-center rounded-full bg-teal/10 text-teal"
        >
          <UploadCloud className="size-5" />
        </motion.div>
        <p className="mt-3 text-xs font-medium">
          Drop files or click to browse
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          PDF, PNG, or CSV
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.png,.csv,image/png,application/pdf,text/csv"
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center justify-between gap-2 rounded-md border border-border bg-secondary/30 px-2.5 py-1.5 text-xs"
            >
              <span className="flex min-w-0 items-center gap-2">
                <FileUp className="size-3.5 shrink-0 text-teal" />
                <span className="truncate">{f.name}</span>
              </span>
              <button
                type="button"
                aria-label={`Remove ${f.name}`}
                onClick={() =>
                  setFiles((prev) => prev.filter((_, idx) => idx !== i))
                }
                className="text-muted-foreground hover:text-critical"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={upload}
        disabled={uploading}
        className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium text-primary-foreground transition-transform hover:scale-[1.01] active:scale-95 disabled:opacity-60"
        style={{
          background: 'linear-gradient(100deg, var(--teal), var(--emerald))',
        }}
      >
        <UploadCloud className={cn('size-4', uploading && 'animate-pulse')} />
        {uploading ? 'Embedding…' : 'Upload & Embed'}
      </button>
    </GlassCard>
  )
}
