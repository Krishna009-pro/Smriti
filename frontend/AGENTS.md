# Smriti OS — Frontend

This is the Smriti OS frontend — a refinery Mission Control console built with TanStack Start, React, and Tailwind CSS.

## Stack
- **Framework**: TanStack Start (SSR) + TanStack Router
- **UI**: React 19 + Radix UI + shadcn/ui components
- **Styling**: Tailwind CSS v4
- **Build**: Vite 8

## Development

Start the backend first from the project root:
```bash
backend\.venv\Scripts\python -m uvicorn backend.main:app --port 8000 --reload
```

Then start the frontend:
```bash
npm run dev
```

The app runs at **http://localhost:8080**.
