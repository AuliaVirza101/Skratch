'use client';

import { useEffect, useRef, useState } from 'react';
import { CursorMoveBroadcast, DEFAULTS } from '@skratch/shared';

interface CursorData extends CursorMoveBroadcast {
    lastUpdate: number;
}

interface CursorOverlayProps {
    cursors: Map<string, CursorData>;
}

export default function CursorOverlay({ cursors }: CursorOverlayProps) {
    const [visibleCursors, setVisibleCursors] = useState<Map<string, CursorData>>(new Map());

    useEffect(() => {
        // Update visible cursors, hiding those that haven't updated in 3s
        const interval = setInterval(() => {
            const now = Date.now();
            const visible = new Map<string, CursorData>();
            cursors.forEach((cursor, userId) => {
                if (now - cursor.lastUpdate < DEFAULTS.CURSOR_HIDE_TIMEOUT_MS) {
                    visible.set(userId, cursor);
                }
            });
            setVisibleCursors(visible);
        }, 100);

        return () => clearInterval(interval);
    }, [cursors]);

    // Also update immediately when cursors change
    useEffect(() => {
        const now = Date.now();
        const visible = new Map<string, CursorData>();
        cursors.forEach((cursor, userId) => {
            if (now - cursor.lastUpdate < DEFAULTS.CURSOR_HIDE_TIMEOUT_MS) {
                visible.set(userId, cursor);
            }
        });
        setVisibleCursors(visible);
    }, [cursors]);

    return (
        <>
            {Array.from(visibleCursors.entries()).map(([userId, cursor]) => (
                <div
                    key={userId}
                    className="remote-cursor"
                    style={{
                        left: cursor.x,
                        top: cursor.y,
                    }}
                >
                    <div
                        className="cursor-dot"
                        style={{ backgroundColor: cursor.color }}
                    />
                    <div
                        className="cursor-label"
                        style={{ backgroundColor: cursor.color }}
                    >
                        {cursor.name}
                    </div>
                </div>
            ))}
        </>
    );
}

export type { CursorData };
