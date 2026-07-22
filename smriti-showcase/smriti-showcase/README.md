# Smriti OS — Industrial Memory Operating System

> Fusing P&ID structural topology with experiential knowledge into a unified graph for heavy industry — manufacturing, energy, and chemicals.

Production-ready Next.js 14 showcase site for **Smriti OS**: an Industrial Memory Operating System that captures, quantifies, and acts on plant knowledge before it walks out the door.

## Features

- **6 pages**: Landing, Architecture, Live Demo, API Reference, Case Study, Deploy
- **Interactive architecture diagram** (React Flow) with path highlighting
- **Controlled demo script**: Ingest → Trace → Alert → Feedback, with a "Simulate Anomaly" button that hits the real backend when configured
- **Live SSE status badge** in the header (green/amber/red pulse)
- **FastMCP tool docs** + copyable Claude Desktop config
- **Dark/light toggle** persisted in localStorage
- **SEO**: JSON-LD SoftwareApplication schema, OG images (dynamic), sitemap, robots
- **Analytics**: Plausible/Umami script tag (env-controlled)
- **Design**: dark-first industrial aesthetic, glassmorphism, Geist Sans/Mono, Framer Motion

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 |
| Motion | Framer Motion |
| Icons | Lucide |
| Graph viz | React Flow + Mermaid |
| Docs | next-mdx-remote |
| Backend (reference) | FastAPI + PostgreSQL Graph (CTE) + FastMCP |

## Quickstart

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env.local
# edit .env.local

# 3. Dev
npm run dev
# → http://localhost:3000
```

## Build

```bash
npm run build
npm start
```

## Deploy

### Vercel (recommended for frontend)

1. Push to GitHub.
2. Import in Vercel — Next.js auto-detected.
3. Set env vars (see `.env.example`).
4. Deploy.

### Docker

```bash
docker compose up -d
```

See [`docker-compose.yml`](./docker-compose.yml) — runs web + API + Neo4j.

### Static export

```bash
# next.config.ts
# output: "export"

npm run build
# → ./out (deploy to any CDN)
```

> Note: static export disables the dynamic OG image route and any server actions. Use Vercel/Docker for full features.

### Kubernetes

```bash
helm repo add smriti https://charts.smriti-os.example.com
helm install smriti-os smriti/showcase -f values.yaml
```

See [Deploy Guide](./app/deploy/page.tsx) for the full `values.yaml`.

## Environment Variables

See [`.env.example`](./.env.example). Key vars:

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | yes | Browser-facing API URL |
| `SMRITI_API_KEY` | yes | Backend API key |
| `NEXT_PUBLIC_ANALYTICS_DOMAIN` | no | Plausible/Umami domain (empty = disabled) |

## Project Structure

```
smriti-showcase/
├── app/
│   ├── layout.tsx          # Root layout, SEO, JSON-LD, analytics
│   ├── page.tsx            # Landing
│   ├── architecture/       # Interactive diagram + sequences + trade-offs
│   ├── demo/               # Controlled demo + simulate anomaly
│   ├── api/                 # OpenAPI + MCP tool docs
│   ├── case-study/         # P-102 walkthrough
│   ├── deploy/             # Docker, env, k8s, quickstart
│   ├── opengraph-image.tsx # Dynamic OG image
│   ├── sitemap.ts
│   └── robots.ts
├── components/             # GlassCard, MetricGauge, StatusPill, CodeBlock, ...
├── docs/
│   ├── architecture.md
│   └── api/openapi.json
├── data/
│   ├── demo-metrics.json
│   └── mcp-config.json
└── .github/workflows/ci.yml
```

## CI

GitHub Actions runs: lint → typecheck → build → deploy preview.

```bash
npm run lint   # (eslint optional)
npm run build  # typecheck + build
```

## License

Apache-2.0
