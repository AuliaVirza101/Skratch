import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a short-ish room ID (8 chars from uuid).
 */
export function generateRoomId(): string {
    return uuidv4().replace(/-/g, '').substring(0, 8);
}
