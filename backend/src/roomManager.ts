import { WhiteboardObject, User } from '@skratch/shared';
import { config } from './config';

interface Room {
    id: string;
    objects: Map<string, WhiteboardObject>;
    users: Map<string, User>;
    lastActivity: number;
}

export class RoomManager {
    private rooms: Map<string, Room> = new Map();

    getRoom(roomId: string): Room | undefined {
        return this.rooms.get(roomId);
    }

    getOrCreateRoom(roomId: string): Room {
        let room = this.rooms.get(roomId);
        if (!room) {
            room = {
                id: roomId,
                objects: new Map(),
                users: new Map(),
                lastActivity: Date.now(),
            };
            this.rooms.set(roomId, room);
        }
        room.lastActivity = Date.now();
        return room;
    }

    addUser(roomId: string, user: User): void {
        const room = this.getOrCreateRoom(roomId);
        room.users.set(user.id, user);
        room.lastActivity = Date.now();
    }

    removeUser(roomId: string, userId: string): void {
        const room = this.rooms.get(roomId);
        if (!room) return;
        room.users.delete(userId);
        room.lastActivity = Date.now();
    }

    getUsers(roomId: string): User[] {
        const room = this.rooms.get(roomId);
        if (!room) return [];
        return Array.from(room.users.values());
    }

    addObject(roomId: string, obj: WhiteboardObject): void {
        const room = this.rooms.get(roomId);
        if (!room) return;
        room.objects.set(obj.objectId, obj);
        room.lastActivity = Date.now();
    }

    updateObject(roomId: string, objectId: string, data: Partial<Record<string, unknown>>): void {
        const room = this.rooms.get(roomId);
        if (!room) return;
        const obj = room.objects.get(objectId);
        if (!obj) return;
        obj.data = { ...obj.data, ...data };
        room.lastActivity = Date.now();
    }

    removeObject(roomId: string, objectId: string): void {
        const room = this.rooms.get(roomId);
        if (!room) return;
        room.objects.delete(objectId);
        room.lastActivity = Date.now();
    }

    getAllObjects(roomId: string): WhiteboardObject[] {
        const room = this.rooms.get(roomId);
        if (!room) return [];
        return Array.from(room.objects.values());
    }

    clearObjects(roomId: string): void {
        const room = this.rooms.get(roomId);
        if (!room) return;
        room.objects.clear();
        room.lastActivity = Date.now();
    }

    updateUserCursor(roomId: string, userId: string, x: number, y: number): void {
        const room = this.rooms.get(roomId);
        if (!room) return;
        const user = room.users.get(userId);
        if (!user) return;
        user.cursor = { x, y };
    }

    renameUser(roomId: string, userId: string, name: string): void {
        const room = this.rooms.get(roomId);
        if (!room) return;
        const user = room.users.get(userId);
        if (!user) return;
        user.name = name;
    }

    /**
     * Find which room a user (socket) belongs to.
     * Returns roomId or undefined.
     */
    findUserRoom(userId: string): string | undefined {
        for (const [roomId, room] of this.rooms) {
            if (room.users.has(userId)) {
                return roomId;
            }
        }
        return undefined;
    }

    /**
     * Remove empty rooms that have been idle longer than the configured TTL.
     */
    cleanup(): void {
        const now = Date.now();
        for (const [roomId, room] of this.rooms) {
            if (room.users.size === 0 && now - room.lastActivity > config.roomIdleTtlMs) {
                this.rooms.delete(roomId);
                console.log(`[cleanup] Room ${roomId} removed (idle)`);
            }
        }
    }

    /** For testing */
    getRoomCount(): number {
        return this.rooms.size;
    }
}

export const roomManager = new RoomManager();
