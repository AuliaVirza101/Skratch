import { Server, Socket } from 'socket.io';
import { EVENTS } from '@skratch/shared';
import { roomManager } from '../roomManager';

export function registerDrawHandlers(io: Server, socket: Socket): void {
    socket.on(EVENTS.DRAW_START, (payload) => {
        const { roomId, objectId, ownerId, data } = payload;
        roomManager.addObject(roomId, { objectId, ownerId, data });
        socket.to(roomId).emit(EVENTS.DRAW_START, { userId: socket.id, ...payload });
    });

    socket.on(EVENTS.DRAW_UPDATE, (payload) => {
        const { roomId, objectId, data } = payload;
        roomManager.updateObject(roomId, objectId, data);
        socket.to(roomId).emit(EVENTS.DRAW_UPDATE, { userId: socket.id, ...payload });
    });

    socket.on(EVENTS.DRAW_END, (payload) => {
        const { roomId, objectId, ownerId, data } = payload;
        roomManager.addObject(roomId, { objectId, ownerId, data });
        socket.to(roomId).emit(EVENTS.DRAW_END, { userId: socket.id, ...payload });
    });

    socket.on(EVENTS.DRAW_DELETE, (payload) => {
        const { roomId, objectId } = payload;
        roomManager.removeObject(roomId, objectId);
        socket.to(roomId).emit(EVENTS.DRAW_DELETE, { userId: socket.id, ...payload });
    });

    socket.on(EVENTS.CANVAS_CLEAR, (payload) => {
        const { roomId } = payload;
        roomManager.clearObjects(roomId);
        socket.to(roomId).emit(EVENTS.CANVAS_CLEAR, { userId: socket.id });
    });
}
