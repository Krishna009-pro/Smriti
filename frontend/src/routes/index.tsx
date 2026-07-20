import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Camera,
  ChevronRight,
  Cloud,
  Cog,
  FileDown,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ThumbsDown,
  ThumbsUp,
  Upload,
  X,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: SmritiConsole,
});

const API = "http://127.0.0.1:8000";

type Remedy = {
  edge_id: string;
  symptom: string;
  confidence: number;
};

type Alert = {
  id: string;
  tag: string;
  message: string;
  ts: string;
};

type ChatMsg = { role: "user" | "ai"; text: string };

const INITIAL_REMEDIES: Remedy[] = [
  { edge_id: "e-p102-v101", symptom: "Clear upstream Valve V-101 — suspected partial closure restricting feed flow.", confidence: 0.56 },
  { edge_id: "e-p102-strainer", symptom: "Inspect suction strainer for particulate blockage; last cleaned 42 days ago.", confidence: 0.74 },
  { edge_id: "e-p102-cavitation", symptom: "Check NPSHa against curve — possible cavitation from tank level drop.", confidence: 0.38 },
];

const INITIAL_ALERTS: Alert[] = [
  { id: "a1", tag: "P-102", message: "Pressure dropped 18.2% — Clear upstream V-101", ts: "14:02:11" },
  { id: "a2", tag: "VLV-102a", message: "Position feedback deviation 3.4° from setpoint", ts: "13:58:44" },
];

// ---------- helpers ----------
async function safePost(path: string, body?: unknown) {
  try {
    const r = await fetch(API + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return r.ok;
  } catch {
    return false;
  }
}

// ---------- components ----------
function GlassCard({
  title,
  icon,
  children,
  className = "",
}: {
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={
        "rounded-xl bg-white/5 backdrop-blur-md border border-white/10 shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset,0_20px_40px_-20px_rgba(0,0,0,0.6)] " +
        className
      }
    >
      {title && (
        <div className="flex items-center gap-2 px-5 pt-4 pb-3 border-b border-white/5">
          <div className="text-teal-400">{icon}</div>
          <h3 className="text-[13px] font-semibold tracking-wide text-white uppercase">{title}</h3>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

function ProgressBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "green" | "orange";
}) {
  const pct = Math.round(value * 100);
  const bg = color === "green"
    ? "bg-gradient-to-r from-emerald-500 to-teal-400"
    : "bg-gradient-to-r from-amber-500 to-orange-400";
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-xs font-medium text-white/70">{label}</span>
        <span className="text-lg font-bold text-white tabular-nums">{pct}%</span>
      </div>
      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
        <div
          className={`h-full ${bg} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function confidenceColor(c: number) {
  if (c > 0.7) return { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30" };
  if (c >= 0.4) return { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30" };
  return { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30" };
}

// ---------- topology ----------
type NodeInfo = { id: string; type: string; connections: number };

function TopologyGraph({ onNodeClick, anomalyOn }: { onNodeClick: (id: string) => void; anomalyOn: boolean }) {
  const [hover, setHover] = useState<{ node: NodeInfo; x: number; y: number } | null>(null);

  const nodes: Record<string, NodeInfo> = {
    "VLV-102a": { id: "VLV-102a", type: "Control Valve", connections: 1 },
    "P-102": { id: "P-102", type: "Feed Pump", connections: 2 },
    "V-101": { id: "V-101", type: "Outlet Valve", connections: 1 },
  };

  return (
    <div className="relative h-[520px] w-full rounded-lg grid-bg border border-white/5 overflow-hidden">
      {/* corner labels */}
      <div className="absolute top-3 left-4 text-[10px] tracking-[0.2em] text-white/40 uppercase">Unit / Feed Loop A</div>
      <div className="absolute top-3 right-4 text-[10px] tracking-[0.2em] text-white/40 uppercase">Live · P&amp;ID Overlay</div>
      <div className="absolute bottom-3 left-4 text-[10px] tracking-[0.2em] text-white/30 uppercase">rev 3.14 · schematic</div>

      <svg viewBox="0 0 800 500" className="w-full h-full">
        <defs>
          <linearGradient id="flow-grad" x1="0" x2="1">
            <stop offset="0" stopColor="#0D9488" stopOpacity="0.8" />
            <stop offset="1" stopColor="#10B981" stopOpacity="1" />
          </linearGradient>
          <radialGradient id="pump-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0D9488" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#052E2B" stopOpacity="1" />
          </radialGradient>
        </defs>

        {/* Flow lines */}
        <line
          x1="170" y1="250" x2="360" y2="250"
          stroke="url(#flow-grad)" strokeWidth="3.5"
          className="flow-line"
        />
        <line
          x1="440" y1="250" x2="630" y2="250"
          stroke="url(#flow-grad)" strokeWidth="3.5"
          className="flow-line"
        />

        {/* Arrows */}
        <polygon points="360,250 350,244 350,256" fill="#10B981" />
        <polygon points="630,250 620,244 620,256" fill="#EF4444" opacity="0.9" />

        {/* VLV-102a - blue rounded rect */}
        <g
          className="cursor-pointer"
          onClick={() => onNodeClick("VLV-102a")}
          onMouseEnter={(e) => {
            const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
            setHover({ node: nodes["VLV-102a"], x: 130 * (r.width / 800), y: 210 * (r.height / 500) });
          }}
          onMouseLeave={() => setHover(null)}
        >
          <rect x="70" y="215" width="110" height="70" rx="14"
            fill="rgba(59,130,246,0.15)" stroke="#3B82F6" strokeWidth="1.5" />
          <text x="125" y="248" textAnchor="middle" fill="#93C5FD" fontSize="14" fontWeight="700" fontFamily="Inter">VLV-102a</text>
          <text x="125" y="266" textAnchor="middle" fill="#60A5FA" fontSize="10" fontFamily="Inter">Control Valve</text>
        </g>

        {/* P-102 - teal glowing circle w/ anomaly */}
        <g
          className="cursor-pointer"
          onClick={() => onNodeClick("P-102")}
          onMouseEnter={(e) => {
            const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
            setHover({ node: nodes["P-102"], x: 405 * (r.width / 800), y: 200 * (r.height / 500) });
          }}
          onMouseLeave={() => setHover(null)}
        >
          {anomalyOn && (
            <>
              <circle cx="400" cy="250" r="70" fill="none" stroke="#EF4444" strokeWidth="1.5" opacity="0.5">
                <animate attributeName="r" from="60" to="90" dur="1.6s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.7" to="0" dur="1.6s" repeatCount="indefinite" />
              </circle>
              <circle cx="400" cy="250" r="62" fill="none" stroke="#EF4444" strokeWidth="2" opacity="0.9" />
            </>
          )}
          <circle cx="400" cy="250" r="52" fill="url(#pump-grad)" stroke="#14B8A6" strokeWidth="2" className="node-glow" />
          <text x="400" y="248" textAnchor="middle" fill="#F0FDFA" fontSize="16" fontWeight="800" fontFamily="Inter">P-102</text>
          <text x="400" y="266" textAnchor="middle" fill="#5EEAD4" fontSize="10" fontFamily="Inter">Feed Pump</text>
          {anomalyOn && (
            <g transform="translate(438, 208)">
              <circle r="9" fill="#EF4444" />
              <text y="4" textAnchor="middle" fill="white" fontSize="12" fontWeight="800" fontFamily="Inter">!</text>
            </g>
          )}
        </g>

        {/* V-101 red diamond */}
        <g
          className="cursor-pointer"
          onClick={() => onNodeClick("V-101")}
          onMouseEnter={(e) => {
            const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
            setHover({ node: nodes["V-101"], x: 640 * (r.width / 800), y: 210 * (r.height / 500) });
          }}
          onMouseLeave={() => setHover(null)}
        >
          <polygon points="690,190 750,250 690,310 630,250"
            fill="rgba(239,68,68,0.15)" stroke="#EF4444" strokeWidth="1.5" />
          <text x="690" y="248" textAnchor="middle" fill="#FCA5A5" fontSize="14" fontWeight="700" fontFamily="Inter">V-101</text>
          <text x="690" y="266" textAnchor="middle" fill="#F87171" fontSize="10" fontFamily="Inter">Outlet Valve</text>
        </g>

        {/* Tag labels below nodes */}
        <text x="400" y="330" textAnchor="middle" fill="#64748B" fontSize="10" fontFamily="Inter" letterSpacing="2">FEED FLOW →</text>
      </svg>

      {hover && (
        <div
          className="absolute pointer-events-none z-10 rounded-lg bg-black/85 border border-teal-500/40 backdrop-blur-md px-3 py-2 text-xs shadow-2xl"
          style={{ left: hover.x, top: hover.y, transform: "translate(-50%, -110%)" }}
        >
          <div className="font-bold text-teal-300">{hover.node.id}</div>
          <div className="text-white/60">{hover.node.type}</div>
          <div className="text-white/40 mt-0.5">Connections: {hover.node.connections}</div>
        </div>
      )}
    </div>
  );
}

// ---------- simple inline markdown renderer ----------
function MarkdownText({ text }: { text: string }) {
  // Split on newlines first, then handle inline markers per segment
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, li) => {
        // Parse inline markdown: **bold**, *italic*, `code`
        const parts: React.ReactNode[] = [];
        const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
        let last = 0;
        let m: RegExpExecArray | null;
        while ((m = regex.exec(line)) !== null) {
          if (m.index > last) parts.push(line.slice(last, m.index));
          if (m[2]) parts.push(<strong key={m.index} className="font-semibold text-white">{m[2]}</strong>);
          else if (m[3]) parts.push(<em key={m.index}>{m[3]}</em>);
          else if (m[4]) parts.push(<code key={m.index} className="bg-white/10 rounded px-1 text-teal-300 text-xs font-mono">{m[4]}</code>);
          last = m.index + m[0].length;
        }
        if (last < line.length) parts.push(line.slice(last));
        return (
          <span key={li}>
            {parts.length > 0 ? parts : line}
            {li < lines.length - 1 && <br />}
          </span>
        );
      })}
    </>
  );
}

// ---------- chat drawer ----------
function ChatDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: "ai", text: "SMRITI Copilot online. Ask about P-102, historical incidents, or upload a schematic photo for analysis." },
  ]);
  const [input, setInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send() {
    const t = input.trim();
    if (!t) return;
    setMessages((m) => [...m, { role: "user", text: t }]);
    setInput("");
    try {
      const r = await fetch(API + "/api/chat/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: t }),
      });
      if (r.ok) {
        const data = await r.json();
        setMessages((m) => [...m, { role: "ai", text: data.answer || data.response }]);
        return;
      }
    } catch {}
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          role: "ai",
          text: "Cross-referencing 3 prior P-102 incidents (2019, 2022, 2024). Suggested action: verify V-101 stem position; historical remedy success 78%.",
        },
      ]);
    }, 700);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setMessages((m) => [...m, { role: "user", text: `📷 Uploaded ${f.name}` }]);
    const fd = new FormData();
    fd.append("file", f);
    try {
      const r = await fetch(API + "/api/chat/vision", { method: "POST", body: fd });
      if (r.ok) {
        const data = await r.json();
        setMessages((m) => [...m, { role: "ai", text: data.response }]);
        return;
      }
    } catch {}
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        { role: "ai", text: "Vision analysis complete: identified pressure gauge PG-207 at 4.2 bar — 22% below expected range." },
      ]);
    }, 900);
  }

  return (
    <div
      className={`fixed bottom-24 right-6 z-40 w-[380px] max-w-[92vw] h-[560px] max-h-[80vh] rounded-2xl bg-[#0B1120]/95 backdrop-blur-xl border border-white/10 shadow-2xl flex flex-col transition-all duration-300 ${
        open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">SMRITI AI Copilot</div>
            <div className="text-[10px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" /> online
            </div>
          </div>
        </div>
        <button onClick={onClose} className="text-white/50 hover:text-white p-1">
          <X size={18} />
        </button>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-blue-600 text-white rounded-br-sm"
                  : "bg-white/5 border border-white/10 text-white/90 rounded-bl-sm"
              }`}
            >
              <MarkdownText text={m.text} />
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-white/10 flex items-center gap-2">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
        <button
          onClick={() => fileRef.current?.click()}
          className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/70"
          title="Upload image"
        >
          <Camera size={16} />
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask SMRITI…"
          className="flex-1 h-9 rounded-lg bg-white/5 border border-white/10 px-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-teal-500/50"
        />
        <button
          onClick={send}
          className="w-9 h-9 rounded-lg bg-teal-600 hover:bg-teal-500 flex items-center justify-center text-white transition-colors"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}

// ---------- uuid polyfill (works on http://localhost) ----------
function genId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ---------- main ----------
function SmritiConsole() {
  const [retention] = useState(0.85);
  const [dependency] = useState(0.12);
  const [complianceCount] = useState(2);

  const [equipmentId, setEquipmentId] = useState("");
  const [technicianId, setTechnicianId] = useState("TECH-01");
  const [ingestType, setIngestType] = useState("pid");
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const [remedies, setRemedies] = useState<Remedy[]>(INITIAL_REMEDIES);
  const [alerts, setAlerts] = useState<Alert[]>(INITIAL_ALERTS);
  type SseState = "connecting" | "connected" | "reconnecting" | "offline";
  const [sseState, setSseState] = useState<SseState>("connecting");
  const [retryIn, setRetryIn] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [anomalyOn, setAnomalyOn] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (t: string) => {
    setToast(t);
    setTimeout(() => setToast(null), 2400);
  };

  // Load real remedy edges from backend on mount
  useEffect(() => {
    async function loadRemedies() {
      try {
        const r = await fetch(`${API}/api/trace/P-102`);
        if (!r.ok) return;
        const data = await r.json();
        const fixEdges = (data.edges ?? [])
          .filter((e: { relation_type: string }) => e.relation_type === "has_known_fix")
          .map((e: { id: string; symptom_description?: string; confidence?: number }) => ({
            edge_id: String(e.id),
            symptom: e.symptom_description ?? "Inspect equipment and verify operating parameters.",
            confidence: typeof e.confidence === "number" ? e.confidence : 0.5,
          }));
        if (fixEdges.length > 0) setRemedies(fixEdges);
      } catch {
        // Keep INITIAL_REMEDIES as fallback
      }
    }
    loadRemedies();
  }, []);

  // SSE stream with exponential backoff auto-reconnect
  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let countdownTimer: ReturnType<typeof setInterval> | null = null;
    let attempts = 0;
    let cancelled = false;

    const clearTimers = () => {
      if (retryTimer) clearTimeout(retryTimer);
      if (countdownTimer) clearInterval(countdownTimer);
      retryTimer = null;
      countdownTimer = null;
    };

    const scheduleReconnect = () => {
      if (cancelled) return;
      attempts += 1;
      setAttempt(attempts);
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s, capped at 30s + small jitter
      const base = Math.min(30000, 1000 * 2 ** (attempts - 1));
      const jitter = Math.floor(Math.random() * 400);
      const delay = base + jitter;
      setSseState("reconnecting");
      let remaining = Math.ceil(delay / 1000);
      setRetryIn(remaining);
      countdownTimer = setInterval(() => {
        remaining -= 1;
        setRetryIn(remaining > 0 ? remaining : 0);
      }, 1000);
      retryTimer = setTimeout(() => {
        clearTimers();
        connect();
      }, delay);
    };

    const connect = () => {
      if (cancelled) return;
      setSseState((s) => (s === "reconnecting" ? "reconnecting" : "connecting"));
      setRetryIn(null);
      try {
        es = new EventSource(API + "/api/alerts/stream");
      } catch {
        scheduleReconnect();
        return;
      }
      es.onopen = () => {
        attempts = 0;
        setAttempt(0);
        setSseState("connected");
        setRetryIn(null);
      };
      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          setAlerts((prev) => [
            {
              id: crypto.randomUUID(),
              tag: data.tag ?? "P-102",
              message: data.message ?? "Anomaly detected",
              ts: new Date().toLocaleTimeString("en-GB").slice(0, 8),
            },
            ...prev,
          ].slice(0, 20));
        } catch {}
      };
      es.onerror = () => {
        es?.close();
        es = null;
        if (cancelled) return;
        scheduleReconnect();
      };
    };

    connect();

    const onOnline = () => {
      // Force an immediate retry when the browser reports it's back online
      clearTimers();
      attempts = 0;
      setAttempt(0);
      es?.close();
      es = null;
      connect();
    };
    const onOffline = () => {
      setSseState("offline");
      clearTimers();
      es?.close();
      es = null;
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      onOffline();
    }

    return () => {
      cancelled = true;
      clearTimers();
      es?.close();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const retryNow = () => {
    // Re-mount effect by bumping a nonce would be cleaner, but simpler: dispatch online event
    if (typeof window !== "undefined") window.dispatchEvent(new Event("online"));
  };



  const simulate = async () => {
    setAnomalyOn(true);
    const ok = await safePost("/api/telemetry/simulate", {
      equipment_id: "P-102",
      metric: "pressure",
      value: 50.0,
      delta_pct: 20.0,
    });
    const newAlert: Alert = {
      id: genId(),
      tag: "P-102",
      message: "Pressure dropped 18.2% — Clear upstream V-101",
      ts: new Date().toLocaleTimeString("en-GB").slice(0, 8),
    };
    setAlerts((a) => [newAlert, ...a].slice(0, 20));
    showToast(ok ? "Simulation dispatched" : "Simulated locally (offline)");
  };

  const rerunIngest = async () => {
    const ok = await safePost("/api/vector/sync");
    showToast(ok ? "Ingest pipelines re-running" : "Queued locally (offline)");
  };

  const trace = async (id: string) => {
    if (!id) return;
    showToast(`Tracing ${id}…`);
    try {
      await fetch(`${API}/api/trace/${id}`);
    } catch {}
  };

  const upload = async () => {
    if (!file) {
      showToast("Select a file first");
      return;
    }
    const endpoint = ingestType === "pid" ? "/api/ingest/upload/pid" : "/api/ingest/upload/shift-notes";
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await fetch(API + endpoint, { method: "POST", body: fd });
      showToast(r.ok ? `Ingested ${file.name}` : "Upload failed");
    } catch {
      showToast(`Queued ${file.name} (offline)`);
    }
  };

  const vote = async (edge_id: string, outcome: "up" | "down") => {
    await safePost("/api/feedback", {
      edge_id,
      technician_id: technicianId,
      outcome: outcome === "up" ? "confirmed" : "rejected",
    });
    setRemedies((r) =>
      r.map((x) =>
        x.edge_id === edge_id
          ? { ...x, confidence: Math.max(0, Math.min(1, x.confidence + (outcome === "up" ? 0.04 : -0.04))) }
          : x,
      ),
    );
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  };

  const complianceHref = `${API}/api/compliance/export/P-102`;

  return (
    <div className="min-h-screen bg-[#070A13] text-white relative overflow-x-hidden">
      {/* ambient background glow */}
      <div className="pointer-events-none fixed inset-0 opacity-60">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-teal-600/10 blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full bg-emerald-600/5 blur-3xl" />
      </div>

      {/* HEADER */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#070A13]/80 border-b border-white/10">
        <div className="mx-auto max-w-[1600px] px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/30">
              <Cog size={18} className="text-white" />
            </div>
            <div>
              <div className="text-[15px] font-extrabold tracking-tight text-white leading-tight">SMRITI OS</div>
              <div className="text-[10.5px] text-white/50 tracking-wide uppercase">Institutional Memory Platform</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={simulate}
              className="h-9 px-4 rounded-lg bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-purple-500/20 transition-all hover:scale-[1.02]"
            >
              <Zap size={13} /> Simulate P-102 Anomaly
            </button>
            <button
              onClick={rerunIngest}
              className="h-9 px-4 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02]"
            >
              <RefreshCw size={13} /> Re-run Ingest Pipelines
            </button>
            <SseIndicator state={sseState} attempt={attempt} retryIn={retryIn} onRetry={retryNow} />

          </div>
        </div>
      </header>

      {/* MAIN GRID */}
      <main className="mx-auto max-w-[1600px] px-6 py-6 grid grid-cols-1 lg:grid-cols-4 gap-5 relative">
        {/* LEFT COLUMN */}
        <div className="space-y-5 lg:col-span-1">
          <GlassCard title="Operational Health KPIs" icon={<Activity size={14} />}>
            <div className="space-y-5">
              <ProgressBar label="Institutional Context Retained" value={retention} color="green" />
              <ProgressBar label="Expert Dependency Score" value={dependency} color="orange" />
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-medium text-white/70">Compliance Flags</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold">
                  <ShieldAlert size={12} /> {complianceCount}
                </span>
              </div>
              <a
                href={complianceHref}
                target="_blank"
                rel="noreferrer"
                className="w-full h-9 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <FileDown size={13} /> Export Compliance Audit PDF
              </a>
            </div>
          </GlassCard>

          <GlassCard title="Search Equipment Node" icon={<Search size={14} />}>
            <div className="flex gap-2">
              <input
                value={equipmentId}
                onChange={(e) => setEquipmentId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && trace(equipmentId)}
                placeholder="e.g. P-102"
                className="flex-1 h-9 rounded-lg bg-white/5 border border-white/10 px-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-teal-500/50"
              />
              <button
                onClick={() => trace(equipmentId)}
                className="h-9 px-4 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold text-white flex items-center gap-1"
              >
                Trace <ChevronRight size={13} />
              </button>
            </div>
          </GlassCard>

          <GlassCard title="Document Ingestion Hub" icon={<Upload size={14} />}>
            <div className="space-y-3">
              <select
                value={ingestType}
                onChange={(e) => setIngestType(e.target.value)}
                className="w-full h-9 rounded-lg bg-white/5 border border-white/10 px-3 text-xs text-white focus:outline-none focus:border-teal-500/50"
              >
                <option value="pid" className="bg-[#0B1120]">P&amp;ID PDF / Image Schematic</option>
                <option value="shift-notes" className="bg-[#0B1120]">Shift Log / Spreadsheet / Email</option>
              </select>

              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`relative flex flex-col items-center justify-center h-28 rounded-lg border-2 border-dashed transition-all cursor-pointer ${
                  dragOver
                    ? "border-teal-400 bg-teal-500/10"
                    : "border-white/15 bg-white/[0.02] hover:border-white/30"
                }`}
              >
                <input
                  type="file"
                  accept=".pdf,.txt,.png,.jpg,.jpeg,.csv,.xlsx"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <Cloud size={22} className="text-teal-400 mb-1" />
                <span className="text-[11px] text-white/60 text-center px-2">
                  {file ? file.name : "Drop file or click to browse"}
                </span>
                <span className="text-[9.5px] text-white/30 mt-0.5">.pdf .txt .png .jpg .csv .xlsx</span>
              </label>

              <button
                onClick={upload}
                className="w-full h-9 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Upload size={13} /> Upload &amp; Ingest Asset Data
              </button>
            </div>
          </GlassCard>

          <GlassCard title="Technician Context" icon={<Cog size={14} />}>
            <input
              value={technicianId}
              onChange={(e) => setTechnicianId(e.target.value)}
              placeholder="Technician ID"
              className="w-full h-9 rounded-lg bg-white/5 border border-white/10 px-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-teal-500/50"
            />
            <div className="mt-2 text-[10.5px] text-white/40">
              Feedback + traces will attribute to <span className="text-teal-400 font-semibold">{technicianId || "—"}</span>
            </div>
          </GlassCard>
        </div>

        {/* CENTER (2 cols) */}
        <div className="lg:col-span-2">
          <GlassCard title="Interactive Topology Graph" icon={<Activity size={14} />}>
            <TopologyGraph onNodeClick={trace} anomalyOn={anomalyOn} />
            <div className="mt-4 grid grid-cols-3 gap-3">
              <MiniStat label="Nodes Tracked" value="147" hint="+3 this shift" />
              <MiniStat label="Active Traces" value="12" hint="live" tone="teal" />
              <MiniStat label="Anomalies (24h)" value="4" hint="1 critical" tone="red" />
            </div>
          </GlassCard>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-5 lg:col-span-1">
          <GlassCard title="Remedy Diagnostics Feed" icon={<Zap size={14} />}>
            <div className="text-[11px] uppercase tracking-widest text-teal-400 mb-3 font-bold">
              Active Diagnosis: <span className="text-white">P-102</span>
            </div>
            <div className="space-y-3">
              {remedies.map((r) => {
                const c = confidenceColor(r.confidence);
                return (
                  <div key={r.edge_id} className="rounded-lg bg-white/[0.03] border border-white/10 p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-[12.5px] text-white/85 leading-relaxed flex-1">{r.symptom}</p>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${c.bg} ${c.text} ${c.border}`}>
                        {Math.round(r.confidence * 100)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => vote(r.edge_id, "up")}
                        className="flex items-center gap-1 px-2 h-7 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium transition-colors"
                      >
                        <ThumbsUp size={11} /> Confirm
                      </button>
                      <button
                        onClick={() => vote(r.edge_id, "down")}
                        className="flex items-center gap-1 px-2 h-7 rounded-md bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-[11px] font-medium transition-colors"
                      >
                        <ThumbsDown size={11} /> Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>

          <GlassCard title="Active Alerts Log" icon={<AlertTriangle size={14} />}>
            <div className="space-y-2 max-h-[360px] overflow-y-auto scrollbar-thin pr-1">
              {alerts.length === 0 && (
                <div className="text-xs text-white/40 py-6 text-center">No active alerts</div>
              )}
              {alerts.map((a) => (
                <div
                  key={a.id}
                  className="animate-slide-in rounded-lg bg-red-500/5 border border-red-500/20 p-2.5 flex items-start gap-2"
                >
                  <div className="mt-0.5 w-6 h-6 rounded-md bg-red-500/15 flex items-center justify-center shrink-0">
                    <AlertTriangle size={13} className="text-red-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[11px] font-bold text-red-300">{a.tag}</span>
                      <span className="text-[10px] text-white/40 tabular-nums">{a.ts}</span>
                    </div>
                    <p className="text-[12px] text-white/80 leading-snug">{a.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </main>

      {/* Floating chat button */}
      <button
        onClick={() => setChatOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 shadow-2xl shadow-teal-500/40 flex items-center justify-center hover:scale-105 transition-transform"
        aria-label="Open Copilot"
      >
        <MessageSquare size={22} className="text-white" />
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 border-2 border-[#070A13] text-[9px] font-bold flex items-center justify-center">1</span>
      </button>

      <ChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-in rounded-lg bg-[#0B1120]/95 border border-teal-500/30 backdrop-blur-md px-4 py-2 text-sm text-white shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "teal" | "red";
}) {
  const toneCls =
    tone === "teal" ? "text-teal-300" : tone === "red" ? "text-red-300" : "text-white";
  return (
    <div className="rounded-lg bg-white/[0.03] border border-white/10 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">{label}</div>
      <div className={`text-xl font-bold tabular-nums ${toneCls} mt-0.5`}>{value}</div>
      {hint && <div className="text-[10px] text-white/40 mt-0.5">{hint}</div>}
    </div>
  );
}

function SseIndicator({
  state,
  attempt,
  retryIn,
  onRetry,
}: {
  state: "connecting" | "connected" | "reconnecting" | "offline";
  attempt: number;
  retryIn: number | null;
  onRetry: () => void;
}) {
  const cfg =
    state === "connected"
      ? { dot: "bg-emerald-400", ping: true, label: "SSE Live Connected", tone: "text-white/80", border: "border-white/10" }
      : state === "connecting"
      ? { dot: "bg-teal-400", ping: true, label: "SSE Connecting…", tone: "text-white/80", border: "border-white/10" }
      : state === "reconnecting"
      ? {
          dot: "bg-amber-400",
          ping: true,
          label: `Reconnecting${retryIn != null ? ` in ${retryIn}s` : "…"}${attempt > 1 ? ` · attempt ${attempt}` : ""}`,
          tone: "text-amber-200",
          border: "border-amber-500/30",
        }
      : { dot: "bg-red-500", ping: false, label: "SSE Offline", tone: "text-red-200", border: "border-red-500/30" };

  const showRetry = state === "reconnecting" || state === "offline";

  return (
    <div className={`h-9 pl-3 pr-2 rounded-lg bg-white/5 border ${cfg.border} flex items-center gap-2`}>
      <span className="relative flex h-2 w-2">
        {cfg.ping && (
          <span className={`absolute inline-flex h-full w-full rounded-full ${cfg.dot} opacity-75 animate-ping`} />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${cfg.dot}`} />
      </span>
      <span className={`text-[11px] font-medium ${cfg.tone} tabular-nums`}>{cfg.label}</span>
      {showRetry && (
        <button
          onClick={onRetry}
          className="ml-1 h-6 px-2 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-semibold text-white/80 flex items-center gap-1"
          title="Retry now"
        >
          <RefreshCw size={10} /> Retry
        </button>
      )}
    </div>
  );
}

