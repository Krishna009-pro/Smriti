"use client";

import React, { useState, useEffect } from "react";

const API_BASE = "http://127.0.0.1:8000";

interface Node {
  id: string;
  type: string;
  name: string;
  properties: any;
}

interface Edge {
  id: string;
  source_id: string;
  target_id: string;
  relation_type: string;
  flow_direction: string | null;
  symptom_description: string | null;
  telemetry_signature: any;
  positive_feedback: number;
  negative_feedback: number;
  confidence: number;
  is_compliance_relevant: number;
  source_excerpt: string | null;
  source_type: string | null;
}

interface Metrics {
  retention_pct: number;
  expert_dependency_score: number;
  compliance_count: number;
}

interface Alert {
  id: string;
  equipment_id: string;
  equipment_name: string;
  symptom: string;
  suggested_fix: string;
  confidence: number;
  telemetry: any;
}

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("P-102");
  const [activeEquipment, setActiveEquipment] = useState("P-102");
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    retention_pct: 0,
    expert_dependency_score: 0,
    compliance_count: 0
  });
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const [technicianId, setTechnicianId] = useState("TECH-01");
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  // AI Chat Copilot States
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ sender: "user" | "ai"; text: string }[]>([
    { sender: "ai", text: "Welcome! Ask me about specific equipment (e.g. 'P-102' or 'V-101') to retrieve its connected P&ID topology and troubleshooting logs." }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Fetch metrics and active graph topology
  const fetchMetrics = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/dashboard/metrics`);
      if (res.ok) {
        const data = await res.json();
        setMetrics({
          retention_pct: data.context_retained_pct ? data.context_retained_pct / 100 : 0,
          expert_dependency_score: data.expert_dependency_score ? data.expert_dependency_score / 100 : 0,
          compliance_count: data.compliance_flags_count || 0
        });
      }
    } catch (err) {
      console.error("Failed to fetch dashboard metrics", err);
    }
  };

  const fetchGraphData = async (eqId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/trace/${eqId}`);
      if (res.ok) {
        const data = await res.json();
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
        setActiveEquipment(eqId);
        setErrorMessage("");
      } else {
        setErrorMessage(`Equipment ID "${eqId}" not found in knowledge graph.`);
      }
    } catch (err) {
      setErrorMessage("Connection to Smriti API failed.");
      console.error(err);
    }
  };

  const handleFeedback = async (edgeId: string, outcome: "upvote" | "downvote") => {
    try {
      const apiOutcome = outcome === "upvote" ? "confirmed" : "rejected";
      const res = await fetch(`${API_BASE}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          edge_id: edgeId,
          technician_id: technicianId,
          outcome: apiOutcome,
          note: `Submitted feedback via web console`
        })
      });
      if (res.ok) {
        setStatusMessage("Feedback recorded successfully!");
        setTimeout(() => setStatusMessage(""), 4000);
        // Refresh graph and metrics
        fetchGraphData(activeEquipment);
        fetchMetrics();
      }
    } catch (err) {
      console.error("Feedback submission failed", err);
    }
  };

  // Seed / Ingestion actions
  const triggerIngestion = async () => {
    try {
      setStatusMessage("Triggering P&ID and shift note ingestion...");
      const res1 = await fetch(`${API_BASE}/api/ingest/pid?file_path=dummy_pid.pdf`, { method: "POST" });
      const res2 = await fetch(`${API_BASE}/api/ingest/shift-notes?file_path=dummy_notes.txt`, { method: "POST" });
      if (res1.ok && res2.ok) {
        // Sync vector store after updates
        await fetch(`${API_BASE}/api/vector/sync`, { method: "POST" });
        setStatusMessage("Ingestion pipeline & Vector Store synced successfully!");
        fetchMetrics();
        fetchGraphData(activeEquipment);
      } else {
        setStatusMessage("Ingestion completed with partial errors.");
      }
      setTimeout(() => setStatusMessage(""), 4000);
    } catch (err) {
      console.error("Ingestion request failed", err);
    }
  };

  const sendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    setChatMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, equipment_id: activeEquipment }),
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages((prev) => [...prev, { sender: "ai", text: data.response }]);
      } else {
        setChatMessages((prev) => [...prev, { sender: "ai", text: "Error: Unable to connect to Smriti Copilot." }]);
      }
    } catch (err) {
      setChatMessages((prev) => [...prev, { sender: "ai", text: "Error: Connection lost." }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Telemetry Simulation Trigger
  const triggerSimulation = async () => {
    try {
      setStatusMessage("Triggering telemetry simulation for P-102...");
      const res = await fetch(`${API_BASE}/api/telemetry/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipment_id: "P-102",
          metric: "pressure",
          value: 68.5,
          delta_pct: 18.2
        })
      });
      if (res.ok) {
        setStatusMessage("Simulation reading pushed successfully!");
      }
      setTimeout(() => setStatusMessage(""), 4000);
    } catch (err) {
      console.error("Simulation trigger failed", err);
    }
  };

  // Setup SSE alerts listener
  useEffect(() => {
    fetchMetrics();
    fetchGraphData("P-102");

    const eventSource = new EventSource(`${API_BASE}/api/alerts/stream`);
    
    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        setActiveAlerts((prev) => {
          // Prevent duplicates
          if (prev.some((a) => a.id === parsed.id)) return prev;
          return [parsed, ...prev];
        });
      } catch (err) {
        console.error("Failed to parse SSE event data", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE stream connection error", err);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Simple layout coordinates for topology visualization nodes
  const getNodeCoordinates = (nodeId: string, index: number) => {
    if (nodeId === activeEquipment) {
      return { x: 300, y: 150 };
    }
    const angle = (index * 2 * Math.PI) / Math.max(1, nodes.length - 1);
    const radius = 130;
    return {
      x: 300 + radius * Math.cos(angle),
      y: 150 + radius * Math.sin(angle)
    };
  };

  const nodePositions = nodes.reduce((acc, node, index) => {
    acc[node.id] = getNodeCoordinates(node.id, index);
    return acc;
  }, {} as Record<string, { x: number; y: number }>);

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans p-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-700 pb-4 mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-blue-400">SMRITI OS</h1>
          <p className="text-gray-400 text-xs">Unified Industrial Asset & Operations Memory Brain</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button 
            onClick={triggerIngestion}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-xs font-semibold rounded transition cursor-pointer"
          >
            Re-run Ingest Pipelines
          </button>
          <button 
            onClick={triggerSimulation}
            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-xs font-semibold rounded transition cursor-pointer"
          >
            Simulate P-102 Anomaly
          </button>
          <div className="flex items-center bg-gray-800 rounded px-2.5 py-1 text-xs border border-gray-700">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
            SSE Live Ticker Syncing
          </div>
        </div>
      </header>

      {/* Main Info Board */}
      {statusMessage && (
        <div className="mb-4 p-3 bg-blue-900/60 border border-blue-500/50 text-blue-200 text-sm rounded">
          {statusMessage}
        </div>
      )}

      {/* Grid Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Side: Search, Metrics & Control */}
        <div className="lg:col-span-1 space-y-6">
          {/* Metrics Panel */}
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Operational Health KPIs</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Institutional Context Retained</span>
                  <span className="font-bold text-green-400">{(metrics.retention_pct * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                  <div className="bg-green-500 h-full transition-all duration-500" style={{ width: `${metrics.retention_pct * 100}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Expert Dependency Score</span>
                  <span className="font-bold text-orange-400">{(metrics.expert_dependency_score * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                  <div className="bg-orange-500 h-full transition-all duration-500" style={{ width: `${metrics.expert_dependency_score * 100}%` }}></div>
                </div>
              </div>
              <div className="flex justify-between items-center text-xs pt-1 border-t border-gray-700">
                <span>Compliance / Safety Flags</span>
                <span className="font-bold text-red-400 px-2 py-0.5 bg-red-950/60 border border-red-900 rounded">{metrics.compliance_count}</span>
              </div>
            </div>
          </div>

          {/* Search Box */}
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
            <h2 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Search Equipment Node</h2>
            <form onSubmit={(e) => { e.preventDefault(); fetchGraphData(searchQuery); }} className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. P-102"
                className="bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm flex-1 text-white focus:outline-none focus:border-blue-500"
              />
              <button type="submit" className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition cursor-pointer">
                Trace
              </button>
            </form>
            {errorMessage && <p className="text-red-400 text-xs mt-2">{errorMessage}</p>}
          </div>

          {/* Settings / Persona */}
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 text-xs space-y-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">Technician Context</h2>
            <div>
              <label className="block text-gray-500 mb-1">Technician ID</label>
              <input
                type="text"
                value={technicianId}
                onChange={(e) => setTechnicianId(e.target.value)}
                className="bg-gray-900 border border-gray-700 rounded px-2 py-1 w-full text-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Center: Graph Visualization */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex flex-col h-[400px]">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Interactive Topology Graph</h2>
              <span className="text-xs text-gray-500">Active Node: <strong className="text-blue-400">{activeEquipment}</strong></span>
            </div>
            
            <div className="flex-1 bg-gray-950 rounded border border-gray-800 relative overflow-hidden flex items-center justify-center">
              {nodes.length === 0 ? (
                <p className="text-gray-500 text-sm">No equipment data traced.</p>
              ) : (
                <svg className="w-full h-full" viewBox="0 0 600 300">
                  <defs>
                    <marker id="arrow" viewBox="0 0 10 10" refX="18" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#4B5563" />
                    </marker>
                    <marker id="arrow-blue" viewBox="0 0 10 10" refX="18" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#3B82F6" />
                    </marker>
                  </defs>

                  {/* Draw Edges */}
                  {edges.map((edge) => {
                    const from = nodePositions[edge.source_id];
                    const to = nodePositions[edge.target_id];
                    if (!from || !to) return null;

                    const isFix = edge.relation_type === "has_known_fix";
                    const strokeColor = isFix ? "#10B981" : "#3B82F6";
                    const strokeWidth = isFix ? 2 + edge.confidence * 3 : 2;
                    const strokeDash = isFix ? "4,4" : "0";

                    return (
                      <g key={edge.id}>
                        <line
                          x1={from.x}
                          y1={from.y}
                          x2={to.x}
                          y2={to.y}
                          stroke={strokeColor}
                          strokeWidth={strokeWidth}
                          strokeDasharray={strokeDash}
                          markerEnd={isFix ? undefined : "url(#arrow-blue)"}
                          opacity={isFix ? 0.7 + edge.confidence * 0.3 : 0.8}
                        />
                        {isFix && (
                          <text
                            x={(from.x + to.x) / 2}
                            y={(from.y + to.y) / 2 - 5}
                            fill="#10B981"
                            fontSize="8"
                            textAnchor="middle"
                            fontWeight="bold"
                          >
                            {(edge.confidence * 100).toFixed(0)}%
                          </text>
                        )}
                      </g>
                    );
                  })}

                  {/* Draw Nodes */}
                  {nodes.map((node) => {
                    const pos = nodePositions[node.id];
                    if (!pos) return null;

                    const isActive = node.id === activeEquipment;
                    const isFixNode = node.type === "fix";
                    
                    let nodeColor = "#374151";
                    if (isFixNode) nodeColor = "#064E3B";
                    else if (isActive) nodeColor = "#1E3A8A";

                    return (
                      <g 
                        key={node.id} 
                        transform={`translate(${pos.x}, ${pos.y})`}
                        className="cursor-pointer"
                        onClick={() => {
                          if (!isFixNode) {
                            setSearchQuery(node.id);
                            fetchGraphData(node.id);
                          }
                        }}
                      >
                        <circle
                          r={isActive ? 18 : 14}
                          fill={nodeColor}
                          stroke={isActive ? "#3B82F6" : isFixNode ? "#10B981" : "#9CA3AF"}
                          strokeWidth={isActive ? 3 : 1.5}
                        />
                        <text
                          dy=".3em"
                          textAnchor="middle"
                          fill="#FFFFFF"
                          fontSize={isActive ? "9" : "8"}
                          fontWeight="bold"
                        >
                          {node.id}
                        </text>
                        <text
                          y={isActive ? 28 : 24}
                          textAnchor="middle"
                          fill="#9CA3AF"
                          fontSize="7"
                        >
                          {node.name.length > 18 ? `${node.name.substring(0, 15)}...` : node.name}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Remedies & History */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 h-[400px] flex flex-col">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Remedy Library</h2>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {edges.filter(e => e.relation_type === "has_known_fix").length === 0 ? (
                <p className="text-gray-500 text-xs">No troubleshooting remedies mapped for this node.</p>
              ) : (
                edges.filter(e => e.relation_type === "has_known_fix").map((edge) => {
                  const targetNode = nodes.find(n => n.id === edge.target_id);
                  return (
                    <div key={edge.id} className="bg-gray-900 border border-gray-800 p-3 rounded text-xs space-y-2 relative">
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-emerald-400">{targetNode?.name || edge.target_id}</span>
                        <span className="bg-emerald-950/60 border border-emerald-900 text-emerald-300 font-bold px-1.5 py-0.5 rounded">
                          {(edge.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                      
                      {edge.symptom_description && (
                        <p className="text-gray-400"><strong className="text-gray-500 text-[10px]">SYMPTOM:</strong> {edge.symptom_description}</p>
                      )}

                      {edge.source_excerpt && (
                        <div className="p-1.5 bg-gray-950 text-gray-500 italic text-[10px] rounded border border-gray-800/50">
                          "{edge.source_excerpt}"
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-1.5 border-t border-gray-800/80">
                        <span className="text-[9px] text-gray-500 uppercase">{edge.source_type || "Shift Record"}</span>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleFeedback(edge.id, "upvote")}
                            className="bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded text-green-400 font-medium transition cursor-pointer"
                          >
                            👍 Up
                          </button>
                          <button
                            onClick={() => handleFeedback(edge.id, "downvote")}
                            className="bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded text-red-400 font-medium transition cursor-pointer"
                          >
                            👎 Down
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Alerts Ticker (SSE) */}
      <footer className="mt-8">
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">SSE Real-Time Ticker Alert Stream</h2>
            <button 
              onClick={() => setActiveAlerts([])}
              className="text-xs text-gray-500 hover:text-gray-300 transition cursor-pointer"
            >
              Clear Logs
            </button>
          </div>
          
          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
            {activeAlerts.length === 0 ? (
              <p className="text-gray-600 text-xs italic">No telemetry anomalies reported.</p>
            ) : (
              activeAlerts.map((alert) => (
                <div 
                  key={alert.id} 
                  className="bg-red-950/40 border border-red-900/60 p-3 rounded text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-fade-in"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                      <strong className="text-red-400 uppercase font-bold text-[10px]">ANOMALY ALARM</strong>
                      <span className="text-gray-500">|</span>
                      <span className="font-semibold text-white">{alert.equipment_name} ({alert.equipment_id})</span>
                    </div>
                    <p className="text-gray-300">
                      Symptom: <span className="text-gray-200">{alert.symptom}</span> (pressure drop {alert.telemetry.delta_pct}%)
                    </p>
                  </div>
                  
                  <div className="flex flex-col sm:items-end gap-1.5">
                    <span className="text-[10px] text-gray-400">
                      Remedy: <strong className="text-emerald-400 font-semibold">{alert.suggested_fix}</strong> (confidence {(alert.confidence * 100).toFixed(0)}%)
                    </span>
                    <button
                      onClick={() => {
                        setSearchQuery(alert.equipment_id);
                        fetchGraphData(alert.equipment_id);
                      }}
                      className="px-2 py-0.5 bg-red-800 hover:bg-red-700 text-white rounded text-[10px] font-semibold transition cursor-pointer"
                    >
                      Focus Node
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </footer>

      {/* Floating AI Copilot Chat Button & Widget */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {chatOpen ? (
          <div className="w-80 sm:w-96 h-[450px] bg-gray-900 border border-gray-800 rounded-lg shadow-2xl flex flex-col overflow-hidden animate-fade-in mb-3">
            {/* Header */}
            <div className="bg-gray-950 border-b border-gray-850 px-4 py-3 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-bold text-sm text-gray-200">Smriti AI Copilot</span>
              </div>
              <button 
                onClick={() => setChatOpen(false)}
                className="text-gray-400 hover:text-gray-200 text-xs font-semibold cursor-pointer"
              >
                Hide
              </button>
            </div>
            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-900/50">
              {chatMessages.map((msg, i) => (
                <div 
                  key={i} 
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[85%] rounded px-3 py-2 text-xs leading-relaxed ${
                    msg.sender === "user" 
                      ? "bg-blue-600 text-white" 
                      : "bg-gray-800 border border-gray-700 text-gray-100"
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 border border-gray-700 text-gray-400 max-w-[85%] rounded px-3 py-2 text-xs italic flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce"></span>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce delay-150"></span>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce delay-300"></span>
                    Copilot is thinking...
                  </div>
                </div>
              )}
            </div>
            {/* Input Form */}
            <form onSubmit={sendChatMessage} className="p-3 bg-gray-950 border-t border-gray-800 flex gap-2">
              <input 
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about equipment or failure..."
                className="flex-1 bg-gray-900 border border-gray-750 text-white placeholder-gray-500 text-xs px-3 py-2 rounded focus:outline-none focus:border-blue-500"
              />
              <button 
                type="submit"
                disabled={chatLoading}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded transition disabled:opacity-50 cursor-pointer"
              >
                Send
              </button>
            </form>
          </div>
        ) : null}

        {/* Toggle Button */}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-lg font-bold text-xs transition cursor-pointer hover:scale-105 active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
          {chatOpen ? "Close Assistant" : "Ask Smriti Copilot"}
        </button>
      </div>
    </div>
  );
}
