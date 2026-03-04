'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useWhiteboard } from '@/hooks/useWhiteboard';
import Toolbar from './Toolbar';
import BrushControls from './BrushControls';
import CursorOverlay, { type CursorData } from './CursorOverlay';
import RoomHeader from '@/components/room/RoomHeader';
import { SHORTCUTS, DEFAULTS, DrawingTool, CursorMoveBroadcast } from '@skratch/shared';

interface WhiteboardProps {
    roomId: string;
}

export default function Whiteboard({ roomId }: WhiteboardProps) {
    const cursorsRef = useRef<Map<string, CursorData>>(new Map());
    const [cursorVersion, setCursorVersion] = useState(0);
    const throttleRef = useRef<number>(0);
    const [showBrush, setShowBrush] = useState(true);
    const [confirmClear, setConfirmClear] = useState(false);

    // Whiteboard hook — pure canvas logic
    const wb = useWhiteboard({
        canvasElId: 'whiteboard-canvas',
        ownerId: '', // Will be set once socket connects
        onObjectAdded: (objectId, ownerId, data) => {
            socketHook.emitDrawEnd({ objectId, ownerId, data });
        },
        onObjectModified: (objectId, data) => {
            socketHook.emitDrawUpdate({ objectId, data });
        },
        onObjectRemoved: (objectId) => {
            socketHook.emitDrawDelete({ objectId });
        },
    });

    // Socket hook — pure networking logic
    const socketHook = useSocket({
        roomId,
        onRoomState: (data) => {
            wb.loadObjects(data.objects);
        },
        onDrawStart: (data) => {
            wb.addRemoteObject(data.data);
        },
        onDrawUpdate: (data) => {
            wb.updateRemoteObject(data.objectId, data.data);
        },
        onDrawEnd: (data) => {
            wb.addRemoteObject(data.data);
        },
        onDrawDelete: (data) => {
            wb.removeRemoteObject(data.objectId);
        },
        onCursorMove: (data: CursorMoveBroadcast) => {
            cursorsRef.current.set(data.userId, {
                ...data,
                lastUpdate: Date.now(),
            });
            setCursorVersion((v) => v + 1);
        },
        onCanvasClear: () => {
            wb.clearCanvas();
        },
    });

    // Handle keyboard shortcuts for tool selection
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if user is typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            const tool = SHORTCUTS[e.key.toLowerCase()];
            if (tool) {
                wb.setActiveTool(tool as DrawingTool);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [wb]);

    // Throttled cursor emit
    const handleMouseMove = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            const now = Date.now();
            if (now - throttleRef.current < DEFAULTS.CURSOR_THROTTLE_MS) return;
            throttleRef.current = now;

            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            socketHook.emitCursorMove({ x, y });
        },
        [socketHook]
    );

    // Handle clear canvas with confirmation
    const handleClear = useCallback(() => {
        if (!confirmClear) {
            setConfirmClear(true);
            setTimeout(() => setConfirmClear(false), 3000);
            return;
        }
        wb.clearCanvas();
        socketHook.emitCanvasClear();
        setConfirmClear(false);
    }, [confirmClear, wb, socketHook]);

    // Toggle brush controls visibility
    const toolsWithBrush: DrawingTool[] = ['freehand', 'rectangle', 'circle', 'line', 'text'];
    const shouldShowBrush = toolsWithBrush.includes(wb.activeTool);

    // Remove cursor when user disconnects
    useEffect(() => {
        const currentUserIds = new Set(socketHook.users.map((u) => u.id));
        cursorsRef.current.forEach((_, userId) => {
            if (!currentUserIds.has(userId)) {
                cursorsRef.current.delete(userId);
            }
        });
        setCursorVersion((v) => v + 1);
    }, [socketHook.users]);

    if (!socketHook.connected) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner" />
                <p className="loading-text">Connecting to room...</p>
            </div>
        );
    }

    return (
        <div className="room-container">
            <RoomHeader
                roomId={roomId}
                users={socketHook.users}
                connected={socketHook.connected}
            />

            <Toolbar
                activeTool={wb.activeTool}
                onToolChange={wb.setActiveTool}
                onClear={handleClear}
            />

            {shouldShowBrush && (
                <BrushControls
                    color={wb.brushColor}
                    size={wb.brushSize}
                    opacity={wb.brushOpacity}
                    onColorChange={wb.setBrushColor}
                    onSizeChange={wb.setBrushSize}
                    onOpacityChange={wb.setBrushOpacity}
                />
            )}

            <div
                className="canvas-wrapper"
                onMouseMove={handleMouseMove}
            >
                {wb.objectCount === 0 && (
                    <div className="canvas-hint">
                        <p>Start drawing or share the link to invite someone</p>
                        <p className="hint-sub">Use the toolbar on the left to pick your tools</p>
                    </div>
                )}

                <canvas id="whiteboard-canvas" />

                <CursorOverlay cursors={cursorsRef.current} />
            </div>

            {confirmClear && (
                <div className="toast-container">
                    <div className="toast" style={{ borderColor: 'var(--error)' }}>
                        Click Clear again to confirm — this will erase everything for everyone
                    </div>
                </div>
            )}
        </div>
    );
}
