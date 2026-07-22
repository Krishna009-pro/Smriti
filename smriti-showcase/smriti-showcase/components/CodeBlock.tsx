"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/cn";

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
  className?: string;
  copyable?: boolean;
}

function highlight(code: string, language?: string): string {
  if (!language || language === "text") {
    return escapeHtml(code);
  }
  let html = escapeHtml(code);
  if (["bash", "sh", "shell"].includes(language)) {
    html = html
      .replace(/(^|\n)(#.*)/g, '$1<span class="text-fg-subtle">$2</span>')
      .replace(/(^|\n)(\$\s.*)/g, '$1<span class="text-primary-300">$2</span>')
      .replace(/\b(npm|npx|docker|kubectl|helm|git|curl|python|pip|uv|export|cd)\b/g, '<span class="text-secondary">$1</span>');
  } else if (["json", "jsonc"].includes(language)) {
    html = html
      .replace(/(&quot;[^&]*?&quot;)(\s*:)/g, '<span class="text-secondary">$1</span>$2')
      .replace(/:\s*(&quot;[^&]*?&quot;)/g, ': <span class="text-success">$1</span>')
      .replace(/\b(true|false|null)\b/g, '<span class="text-warning">$1</span>')
      .replace(/\b(\d+\.?\d*)\b/g, '<span class="text-warning">$1</span>');
  } else if (["yaml", "yml"].includes(language)) {
    html = html
      .replace(/(^|\n)(\s*#.*)/g, '$1<span class="text-fg-subtle">$2</span>')
      .replace(/(^|\n)(\s*)([\w.-]+)(:)/g, '$1$2<span class="text-secondary">$3</span>$4')
      .replace(/:\s(.*)/g, ': <span class="text-success">$1</span>');
  } else if (["python", "py"].includes(language)) {
    html = html
      .replace(/(^|\n)(#.*)/g, '$1<span class="text-fg-subtle">$2</span>')
      .replace(/\b(def|class|return|import|from|if|else|elif|for|while|try|except|with|as|async|await|raise|yield|lambda|pass|None|True|False)\b/g, '<span class="text-secondary">$1</span>')
      .replace(/(&quot;[^&]*?&quot;|&#39;[^&]*?&#39;)/g, '<span class="text-success">$1</span>');
  } else if (["typescript", "ts", "tsx", "javascript", "js"].includes(language)) {
    html = html
      .replace(/(\/\/.*)/g, '<span class="text-fg-subtle">$1</span>')
      .replace(/\b(const|let|var|function|return|if|else|for|while|import|from|export|default|async|await|new|class|extends|implements|interface|type|enum|public|private|readonly|void|null|undefined|true|false)\b/g, '<span class="text-secondary">$1</span>')
      .replace(/(&quot;[^&]*?&quot;|&#39;[^&]*?&#39;|`[^`]*?`)/g, '<span class="text-success">$1</span>');
  }
  return html;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function CodeBlock({
  code,
  language = "text",
  title,
  className,
  copyable = true,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-bg-soft/80",
        className
      )}
    >
      {title && (
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <span className="font-mono text-xs text-fg-muted">{title}</span>
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-error/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
          </div>
        </div>
      )}
      {copyable && (
        <button
          onClick={handleCopy}
          className="absolute right-3 top-3 z-10 rounded-md border border-border bg-surface/80 p-1.5 text-fg-muted opacity-0 transition-opacity hover:text-fg group-hover:opacity-100"
          aria-label="Copy code"
        >
          {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
        </button>
      )}
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed">
        <code
          className="font-mono text-fg"
          dangerouslySetInnerHTML={{ __html: highlight(code, language) }}
        />
      </pre>
    </div>
  );
}
