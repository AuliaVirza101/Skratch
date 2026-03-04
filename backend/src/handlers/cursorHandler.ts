import { Server, Socket } from 'socket.io';
import { EVENTS } from '@skratch/shared';
import { roomManager } from '../roomManager';

export function registerCursorHandlers(io: Server, socket: Socket): void {
    socket.on(EVENTS.CURSOR_MOVE, (payload) => {
        const { roomId, x, y } = payload;

        roomManager.updateUserCursor(roomId, socket.id, x, y);

        // Get user info for broadcast
        const room = roomManager.getRoom(roomId);
        if (!room) return;
        const user = room.users.get(socket.id);
        if (!user) return;

        socket.to(roomId).emit(EVENTS.CURSOR_MOVE, {
            userId: socket.id,
            x,
            y,
            name: user.name,
            color: user.color,
        });
    });
}
