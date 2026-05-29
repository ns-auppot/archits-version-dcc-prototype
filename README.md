# DCC Prototype

## Local Development

### Prerequisites

- Node.js installed
- GitHub Desktop configured to push to this repo

### Start Dev Server

```bash
npm run dev
```

Opens at `http://localhost:5173` with hot reload.

### Edit → Iterate Loop

1. Edit files in `src/` with any editor (VS Code, Cursor, etc.)
2. Browser auto-refreshes on save
3. Repeat until happy

### Ship to GitHub Pages

1. Run `npm run sync-companion` in terminal (syncs UX Companion widget)
2. Open GitHub Desktop — review changed files and diffs
3. Write commit message → click **Commit to main**
4. Click **Push origin** — GitHub Pages deploys automatically

### Project Structure

| Path | Purpose |
|------|---------|
| `src/` | Application source code |
| `public/` | Static assets (including vendored `ux-companion.js`) |
| `dist/` | Built output (don't edit directly) |
| `scripts/` | Build/sync scripts |
