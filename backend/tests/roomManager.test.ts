import { describe, it, expect, beforeEach } from 'vitest';
import { RoomManager } from '../src/roomManager';

describe('RoomManager', () => {
    let manager: RoomManager;

    beforeEach(() => {
        manager = new RoomManager();
    });

    describe('getOrCreateRoom', () => {
        it('should create a new room if it does not exist', () => {
            const room = manager.getOrCreateRoom('room-1');
            expect(room.id).toBe('room-1');
            expect(room.users.size).toBe(0);
            expect(room.objects.size).toBe(0);
            expect(manager.getRoomCount()).toBe(1);
        });

        it('should return existing room if it already exists', () => {
            manager.getOrCreateRoom('room-1');
            const room = manager.getOrCreateRoom('room-1');
            expect(manager.getRoomCount()).toBe(1);
            expect(room.id).toBe('room-1');
        });
    });

    describe('addUser / removeUser', () => {
        it('should add a user to a room', () => {
            const user = { id: 'user-1', name: 'Alice', color: '#EF4444', cursor: { x: 0, y: 0 } };
            manager.addUser('room-1', user);

            const users = manager.getUsers('room-1');
            expect(users).toHaveLength(1);
            expect(users[0].name).toBe('Alice');
        });

        it('should remove a user from a room', () => {
            const user = { id: 'user-1', name: 'Alice', color: '#EF4444', cursor: { x: 0, y: 0 } };
            manager.addUser('room-1', user);
            manager.removeUser('room-1', 'user-1');

            const users = manager.getUsers('room-1');
            expect(users).toHaveLength(0);
        });

        it('should not crash when removing from non-existent room', () => {
            expect(() => manager.removeUser('nope', 'user-1')).not.toThrow();
        });
    });

    describe('addObject / removeObject / getAllObjects', () => {
        it('should add and retrieve objects', () => {
            manager.getOrCreateRoom('room-1');
            manager.addObject('room-1', {
                objectId: 'obj-1',
                ownerId: 'user-1',
                data: { type: 'rect', x: 10, y: 20 },
            });

            const objects = manager.getAllObjects('room-1');
            expect(objects).toHaveLength(1);
            expect(objects[0].objectId).toBe('obj-1');
            expect(objects[0].ownerId).toBe('user-1');
        });

        it('should remove an object', () => {
            manager.getOrCreateRoom('room-1');
            manager.addObject('room-1', {
                objectId: 'obj-1',
                ownerId: 'user-1',
                data: { type: 'rect' },
            });
            manager.removeObject('room-1', 'obj-1');

            expect(manager.getAllObjects('room-1')).toHaveLength(0);
        });
    });

    describe('updateObject', () => {
        it('should partially update an object data', () => {
            manager.getOrCreateRoom('room-1');
            manager.addObject('room-1', {
                objectId: 'obj-1',
                ownerId: 'user-1',
                data: { type: 'rect', x: 10, y: 20, width: 100 },
            });

            manager.updateObject('room-1', 'obj-1', { x: 50, y: 60 });
            const objects = manager.getAllObjects('room-1');
            expect(objects[0].data).toEqual({ type: 'rect', x: 50, y: 60, width: 100 });
        });
    });

    describe('clearObjects', () => {
        it('should remove all objects from a room', () => {
            manager.getOrCreateRoom('room-1');
            manager.addObject('room-1', { objectId: 'obj-1', ownerId: 'u1', data: {} });
            manager.addObject('room-1', { objectId: 'obj-2', ownerId: 'u1', data: {} });
            manager.clearObjects('room-1');

            expect(manager.getAllObjects('room-1')).toHaveLength(0);
        });
    });

    describe('updateUserCursor', () => {
        it('should update cursor position', () => {
            const user = { id: 'user-1', name: 'Alice', color: '#EF4444', cursor: { x: 0, y: 0 } };
            manager.addUser('room-1', user);
            manager.updateUserCursor('room-1', 'user-1', 100, 200);

            const users = manager.getUsers('room-1');
            expect(users[0].cursor).toEqual({ x: 100, y: 200 });
        });
    });

    describe('renameUser', () => {
        it('should rename a user', () => {
            const user = { id: 'user-1', name: 'Alice', color: '#EF4444', cursor: { x: 0, y: 0 } };
            manager.addUser('room-1', user);
            manager.renameUser('room-1', 'user-1', 'Bob');

            const users = manager.getUsers('room-1');
            expect(users[0].name).toBe('Bob');
        });
    });

    describe('findUserRoom', () => {
        it('should find room by user id', () => {
            const user = { id: 'user-1', name: 'Alice', color: '#EF4444', cursor: { x: 0, y: 0 } };
            manager.addUser('room-xyz', user);

            expect(manager.findUserRoom('user-1')).toBe('room-xyz');
        });

        it('should return undefined for unknown user', () => {
            expect(manager.findUserRoom('unknown')).toBeUndefined();
        });
    });

    describe('cleanup', () => {
        it('should remove empty rooms past TTL', async () => {
            manager.getOrCreateRoom('room-old');
            // Manually adjust lastActivity to simulate idle time
            const room = manager.getRoom('room-old')!;
            room.lastActivity = Date.now() - 10 * 60_000; // 10 minutes ago

            manager.cleanup();
            expect(manager.getRoomCount()).toBe(0);
        });

        it('should NOT remove rooms with active users', () => {
            const user = { id: 'user-1', name: 'Alice', color: '#EF4444', cursor: { x: 0, y: 0 } };
            manager.addUser('room-active', user);
            const room = manager.getRoom('room-active')!;
            room.lastActivity = Date.now() - 10 * 60_000;

            manager.cleanup();
            // Room still exists because it has a user
            expect(manager.getRoomCount()).toBe(1);
        });
    });
});
