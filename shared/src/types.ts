// ============================================================
// Skratch — Shared Types
// Single source of truth for frontend & backend
// ============================================================

// --- User ---

export interface User {
    id: string;        // socket.id
    name: string;
    color: string;
    cursor: CursorPosition;
}

export interface CursorPosition {
    x: number;
    y: number;
}

// --- Whiteboard Objects ---

export interface WhiteboardObject {
    objectId: string;
    ownerId: string;   // socket.id of the creator — used for undo/redo isolation
    data: Record<string, unknown>;  // Fabric.js serialized object
}

// --- Room ---

export interface RoomState {
    id: string;
    objects: WhiteboardObject[];
    users: User[];
}

// --- Event Payloads ---

export interface DrawPayload {
    roomId: string;
    objectId: string;
    ownerId: string;
    data: Record<string, unknown>;
}

export interface DrawUpdatePayload {
    roomId: string;
    objectId: string;
    data: Partial<Record<string, unknown>>;
}

export interface DrawDeletePayload {
    roomId: string;
    objectId: string;
}

export interface CursorMovePayload {
    roomId: string;
    x: number;
    y: number;
}

export interface UserRenamePayload {
    roomId: string;
    name: string;
}

export interface CanvasClearPayload {
    roomId: string;
}

export interface JoinRoomPayload {
    roomId: string;
}

// --- Server → Client Broadcast Payloads ---

export interface DrawBroadcast extends DrawPayload {
    userId: string;
}

export interface DrawUpdateBroadcast extends DrawUpdatePayload {
    userId: string;
}

export interface DrawDeleteBroadcast extends DrawDeletePayload {
    userId: string;
}

export interface CursorMoveBroadcast {
    userId: string;
    x: number;
    y: number;
    name: string;
    color: string;
}

export interface RoomUsersBroadcast {
    users: User[];
}

export interface RoomStateBroadcast {
    objects: WhiteboardObject[];
    users: User[];
}

export interface CanvasClearBroadcast {
    userId: string;
}

export interface RoomErrorPayload {
    message: string;
}

// --- Tool Types ---

export type DrawingTool =
    | 'select'
    | 'freehand'
    | 'rectangle'
    | 'circle'
    | 'line'
    | 'text'
    | 'eraser';
