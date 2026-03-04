import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { config } from './config';
import { roomManager } from './roomManager';
import { registerRoomHandlers } from './handlers/roomHandler';
import { registerDrawHandlers } from './handlers/drawHandler';
import { registerCursorHandlers } from './handlers/cursorHandler';

const app = express();
app.use(cors({ origin: config.corsOrigin }));

// Health check endpoint
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', rooms: roomManager.getRoomCount() });
});

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: config.corsOrigin,
        methods: ['GET', 'POST'],
    },
});

// Register handlers for each new connection
io.on('connection', (socket) => {
    console.log(`[ws] Client connected: ${socket.id}`);

    registerRoomHandlers(io, socket);
    registerDrawHandlers(io, socket);
    registerCursorHandlers(io, socket);
});

// Room cleanup interval
setInterval(() => {
    roomManager.cleanup();
}, config.roomCleanupIntervalMs);

server.listen(config.port, () => {
    console.log(`[server] Skratch backend running on port ${config.port}`);
    console.log(`[server] CORS origin: ${config.corsOrigin}`);
});
