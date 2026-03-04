# Skratch — Real-time Collaborative Whiteboard

A lightweight, real-time collaborative whiteboard built with Next.js, Fabric.js, and Socket.IO. No account needed — just create a room and share the link.

## Features

- 🎨 **Drawing Tools** — Freehand pen, rectangle, circle, line, text, eraser
- 🔄 **Real-time Sync** — All changes broadcast instantly via WebSocket
- 👆 **Live Cursors** — See other users' cursors with name labels
- ↩️ **Undo / Redo** — Per-user history (Ctrl+Z / Ctrl+Y)
- 🎯 **Pan & Zoom** — Spacebar+drag to pan, scroll to zoom
- 🎨 **Brush Controls** — 12 color presets, size slider, opacity slider
- 📸 **Export PNG** — Download canvas as image
- 🧹 **Clear Canvas** — Wipe everything (with confirmation)
- 🔗 **Room System** — Create room, share link, join instantly

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router) |
| Canvas | Fabric.js v6 |
| Real-time | Socket.IO |
| Backend | Node.js + Express |
| Shared Types | npm workspace (`shared/`) |
| Styling | Tailwind CSS |
| Testing | Vitest |

## Project Structure

```
skratch/
├── shared/           # Shared types & constants (single source of truth)
├── frontend/         # Next.js application
│   ├── src/app/      # Pages (landing, room)
│   ├── src/components/
│   │   ├── whiteboard/   # Whiteboard, Toolbar, BrushControls, CursorOverlay
│   │   └── room/         # RoomHeader
│   └── src/hooks/    # useWhiteboard, useSocket, useUndoRedo
└── backend/          # Express + Socket.IO server
    ├── src/handlers/ # drawHandler, cursorHandler, roomHandler
    └── tests/        # Vitest unit tests
```

## Architecture

The codebase follows a clean **separation of concerns**:

- **`useWhiteboard`** — Pure canvas logic (Fabric.js). No socket awareness.
- **`useSocket`** — Pure networking logic (Socket.IO). No canvas awareness.
- **`Whiteboard.tsx`** — Orchestrator — connects the two hooks without coupling.
- **Backend handlers** — Each handles one domain (draw, cursor, room).
- **`RoomManager`** — In-memory state with a clean interface. Can be swapped to Redis without changing handlers.

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install & Run

```bash
# Install all dependencies (root + all workspaces)
npm install

# Build shared types
npm run build -w shared

# Start both frontend and backend
npm run dev
```

- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:4000

### Environment Variables

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_WS_URL=http://localhost:4000
```

**Backend** (`backend/.env`):
```env
PORT=4000
CORS_ORIGIN=http://localhost:3000
ROOM_CLEANUP_INTERVAL_MS=60000
ROOM_IDLE_TTL_MS=300000
```

### Run Tests

```bash
npm run test -w backend
```

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `V` | Select tool |
| `P` | Pen (freehand) |
| `R` | Rectangle |
| `C` | Circle |
| `L` | Line |
| `T` | Text |
| `E` | Eraser |
| `Space` + drag | Pan |
| `Scroll` | Zoom |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |

## Scalability

Currently uses in-memory state. To scale horizontally:

1. Replace `roomManager.ts` with a Redis-backed implementation
2. Add `@socket.io/redis-adapter` to `index.ts`
3. Frontend and all handlers remain **unchanged**

## License

MIT
