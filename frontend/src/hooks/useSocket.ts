'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket } from '@/lib/socket';
import {
    EVENTS,
    User,
    WhiteboardObject,
    DrawPayload,
    DrawUpdatePayload,
    DrawDeletePayload,
    CursorMovePayload,
    CursorMoveBroadcast,
    RoomStateBroadcast,
    RoomUsersBroadcast,
    DrawBroadcast,
    DrawUpdateBroadcast,
    DrawDeleteBroadcast,
    CanvasClearBroadcast,
    UserRenamePayload,
} from '@skratch/shared';

interface UseSocketOptions {
    roomId: string;
    onRoomState?: (data: RoomStateBroadcast) => void;
    onRoomUsers?: (data: RoomUsersBroadcast) => void;
    onDrawStart?: (data: DrawBroadcast) => void;
    onDrawUpdate?: (data: DrawUpdateBroadcast) => void;
    onDrawEnd?: (data: DrawBroadcast) => void;
    onDrawDelete?: (data: DrawDeleteBroadcast) => void;
    onCursorMove?: (data: CursorMoveBroadcast) => void;
    onCanvasClear?: (data: CanvasClearBroadcast) => void;
}

export function useSocket(options: UseSocketOptions) {
    const {
        roomId,
        onRoomState,
        onRoomUsers,
        onDrawStart,
        onDrawUpdate,
        onDrawEnd,
        onDrawDelete,
        onCursorMove,
        onCanvasClear,
    } = options;

    const socketRef = useRef<Socket | null>(null);
    const [connected, setConnected] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);

    // Store latest callbacks in refs to avoid re-registering
    const callbacksRef = useRef(options);
    callbacksRef.current = options;

    useEffect(() => {
        const socket = getSocket();
        socketRef.current = socket;

        socket.on('connect', () => {
            setConnected(true);
            // Join the room once connected
            socket.emit(EVENTS.JOIN_ROOM, { roomId });
        });

        socket.on('disconnect', () => {
            setConnected(false);
        });

        socket.on(EVENTS.ROOM_STATE, (data: RoomStateBroadcast) => {
            setUsers(data.users);
            // Find ourselves in the user list
            const me = data.users.find((u) => u.id === socket.id);
            if (me) setCurrentUser(me);
            callbacksRef.current.onRoomState?.(data);
        });

        socket.on(EVENTS.ROOM_USERS, (data: RoomUsersBroadcast) => {
            setUsers(data.users);
            callbacksRef.current.onRoomUsers?.(data);
        });

        socket.on(EVENTS.DRAW_START, (data: DrawBroadcast) => {
            callbacksRef.current.onDrawStart?.(data);
        });

        socket.on(EVENTS.DRAW_UPDATE, (data: DrawUpdateBroadcast) => {
            callbacksRef.current.onDrawUpdate?.(data);
        });

        socket.on(EVENTS.DRAW_END, (data: DrawBroadcast) => {
            callbacksRef.current.onDrawEnd?.(data);
        });

        socket.on(EVENTS.DRAW_DELETE, (data: DrawDeleteBroadcast) => {
            callbacksRef.current.onDrawDelete?.(data);
        });

        socket.on(EVENTS.CURSOR_MOVE, (data: CursorMoveBroadcast) => {
            callbacksRef.current.onCursorMove?.(data);
        });

        socket.on(EVENTS.CANVAS_CLEAR, (data: CanvasClearBroadcast) => {
            callbacksRef.current.onCanvasClear?.(data);
        });

        socket.connect();

        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off(EVENTS.ROOM_STATE);
            socket.off(EVENTS.ROOM_USERS);
            socket.off(EVENTS.DRAW_START);
            socket.off(EVENTS.DRAW_UPDATE);
            socket.off(EVENTS.DRAW_END);
            socket.off(EVENTS.DRAW_DELETE);
            socket.off(EVENTS.CURSOR_MOVE);
            socket.off(EVENTS.CANVAS_CLEAR);
            socket.disconnect();
        };
    }, [roomId]);

    // Emit helpers
    const emitDrawStart = useCallback((payload: Omit<DrawPayload, 'roomId'>) => {
        socketRef.current?.emit(EVENTS.DRAW_START, { roomId, ...payload });
    }, [roomId]);

    const emitDrawUpdate = useCallback((payload: Omit<DrawUpdatePayload, 'roomId'>) => {
        socketRef.current?.emit(EVENTS.DRAW_UPDATE, { roomId, ...payload });
    }, [roomId]);

    const emitDrawEnd = useCallback((payload: Omit<DrawPayload, 'roomId'>) => {
        socketRef.current?.emit(EVENTS.DRAW_END, { roomId, ...payload });
    }, [roomId]);

    const emitDrawDelete = useCallback((payload: Omit<DrawDeletePayload, 'roomId'>) => {
        socketRef.current?.emit(EVENTS.DRAW_DELETE, { roomId, ...payload });
    }, [roomId]);

    const emitCursorMove = useCallback((payload: Omit<CursorMovePayload, 'roomId'>) => {
        socketRef.current?.emit(EVENTS.CURSOR_MOVE, { roomId, ...payload });
    }, [roomId]);

    const emitUserRename = useCallback((name: string) => {
        socketRef.current?.emit(EVENTS.USER_RENAME, { roomId, name } as UserRenamePayload);
    }, [roomId]);

    const emitCanvasClear = useCallback(() => {
        socketRef.current?.emit(EVENTS.CANVAS_CLEAR, { roomId });
    }, [roomId]);

    return {
        socket: socketRef.current,
        connected,
        currentUser,
        users,
        emitDrawStart,
        emitDrawUpdate,
        emitDrawEnd,
        emitDrawDelete,
        emitCursorMove,
        emitUserRename,
        emitCanvasClear,
    };
}
