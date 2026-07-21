export type NodeType = 'equipment' | 'valve' | 'tank' | 'fix'
export type EdgeType = 'connects_to' | 'has_known_fix'
export type SourceType = 'shift_note' | 'pid' | 'feedback'
export type SseStatus = 'live' | 'reconnecting' | 'offline'

export interface GraphNode {
  id: string
  label: string
  type: NodeType
  x: number
  y: number
  meta: Record<string, string>
  anomaly?: boolean
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  type: EdgeType
  confidence?: number
}

export interface Remedy {
  id: string
  nodeId: string
  symptom: string
  action: string
  confidence: number
  source: SourceType
  sourceExcerpt: string
  status: 'pending' | 'confirmed' | 'rejected'
}

export interface Trace {
  rootId: string
  nodes: GraphNode[]
  edges: GraphEdge[]
  remedies: Remedy[]
  stats: {
    nodes: number
    activeTraces: number
    anomalies24h: number
    contextRetained: number
    expertDependency: number
    complianceFlags: number
  }
}

export interface Alert {
  id: string
  tag: 'anomaly' | 'ingest' | 'compliance' | 'system'
  severity: 'critical' | 'warning' | 'info'
  message: string
  nodeId?: string
  timestamp: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}
