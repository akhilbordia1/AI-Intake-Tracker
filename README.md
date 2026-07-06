# AI Governance Platform

End-to-end AI use-case lifecycle management for enterprise governance. Kanban/table intake tracker, use-case intake form, and a 14-stage governed workflow record (Intake → Improve) with per-stage forms.

Built with [Next.js 16](https://nextjs.org) (App Router, Turbopack), React 19, Tailwind CSS v4.

## Develop

```bash
npm install
npm run dev
```

Open http://localhost:3000.

- `/` — intake tracker (board + table views)
- `/intake` — new use-case intake form
- `/detail` — workflow record with the 14-stage lifecycle

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |
