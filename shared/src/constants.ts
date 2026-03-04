// ============================================================
// Skratch — Shared Constants
// All WebSocket event names — no magic strings
// ============================================================

export const EVENTS = {
    // Client → Server
    JOIN_ROOM: 'join-room',
    LEAVE_ROOM: 'leave-room',
    DRAW_START: 'draw:start',
    DRAW_UPDATE: 'draw:update',
    DRAW_END: 'draw:end',
    DRAW_DELETE: 'draw:delete',
    CURSOR_MOVE: 'cursor:move',
    USER_RENAME: 'user:rename',
    CANVAS_CLEAR: 'canvas:clear',

    // Server → Client
    ROOM_STATE: 'room:state',
    ROOM_USERS: 'room:users',
    ROOM_ERROR: 'room:error',
} as const;

// Default configuration values
export const DEFAULTS = {
    ROOM_CLEANUP_INTERVAL_MS: 60_000,       // 1 minute
    ROOM_IDLE_TTL_MS: 5 * 60_000,           // 5 minutes
    CURSOR_THROTTLE_MS: 50,                 // 20fps
    DRAW_UPDATE_THROTTLE_MS: 33,            // 30fps
    CURSOR_HIDE_TIMEOUT_MS: 3_000,          // 3 seconds
    MAX_UNDO_STEPS: 50,
    ZOOM_MIN: 0.1,
    ZOOM_MAX: 5,
    BRUSH_SIZE_MIN: 1,
    BRUSH_SIZE_MAX: 50,
    BRUSH_OPACITY_MIN: 0.2,
    BRUSH_OPACITY_MAX: 1,
} as const;

// Preset colors for users and color picker
export const USER_COLORS = [
    '#EF4444', // red
    '#F97316', // orange
    '#EAB308', // yellow
    '#22C55E', // green
    '#14B8A6', // teal
    '#3B82F6', // blue
    '#6366F1', // indigo
    '#A855F7', // purple
    '#EC4899', // pink
    '#F43F5E', // rose
] as const;

export const PRESET_COLORS = [
    '#000000', // black
    '#FFFFFF', // white
    '#EF4444', // red
    '#F97316', // orange
    '#EAB308', // yellow
    '#22C55E', // green
    '#14B8A6', // teal
    '#3B82F6', // blue
    '#6366F1', // indigo
    '#A855F7', // purple
    '#EC4899', // pink
    '#6B7280', // gray
] as const;

// Keyboard shortcuts
export const SHORTCUTS: Record<string, string> = {
    v: 'select',
    p: 'freehand',
    r: 'rectangle',
    c: 'circle',
    l: 'line',
    t: 'text',
    e: 'eraser',
} as const;
