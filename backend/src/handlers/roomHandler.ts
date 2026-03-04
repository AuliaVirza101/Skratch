import { Server, Socket } from 'socket.io';
import { EVENTS, USER_COLORS, User } from '@skratch/shared';
import { roomManager } from '../roomManager';

let userCounter = 0;

function assignUserColor(): string {
    return USER_COLORS[userCounter % USER_COLORS.length];
}

function assignUserName(): string {
    userCounter++;
    return `User ${userCounter}`;
}

export function registerRoomHandlers(io: Server, socket: Socket): void {
    socket.on(EVENTS.JOIN_ROOM, ({ roomId }) => {
        // Create user
        const user: User = {
            id: socket.id,
            name: assignUserName(),
            color: assignUserColor(),
            cursor: { x: 0, y: 0 },
        };

        // Join Socket.IO room
        socket.join(roomId);

        // Add to room manager
        roomManager.addUser(roomId, user);

        // Send current state to the joining user
        const objects = roomManager.getAllObjects(roomId);
        const users = roomManager.getUsers(roomId);
        socket.emit(EVENTS.ROOM_STATE, { objects, users });

        // Broadcast updated user list to everyone else in the room
        socket.to(roomId).emit(EVENTS.ROOM_USERS, { users });

        console.log(`[room] ${user.name} (${socket.id}) joined room ${roomId} — ${users.length} users`);
    });

    socket.on(EVENTS.USER_RENAME, ({ roomId, name }) => {
        roomManager.renameUser(roomId, socket.id, name);
        const users = roomManager.getUsers(roomId);
        io.to(roomId).emit(EVENTS.ROOM_USERS, { users });
        console.log(`[room] ${socket.id} renamed to "${name}" in room ${roomId}`);
    });

    socket.on('disconnect', () => {
        const roomId = roomManager.findUserRoom(socket.id);
        if (!roomId) return;

        roomManager.removeUser(roomId, socket.id);
        const users = roomManager.getUsers(roomId);
        socket.to(roomId).emit(EVENTS.ROOM_USERS, { users });

        console.log(`[room] ${socket.id} left room ${roomId} — ${users.length} users remaining`);
    });
}
