import { Server } from "socket.io";

export const userSocketMap = {}; // { userId: socketId }

let io;

const registerSocketHandlers = () => {
    io.on("connection", (socket) => {
        const userId = socket.handshake.query.userId;
        console.log(`User connected: ${userId} with socket id: ${socket.id}`);

        if (userId) {
            userSocketMap[userId] = socket.id;
        }

        io.emit("online-users", Object.keys(userSocketMap));

        socket.on("disconnect", () => {
            console.log(`User disconnected: ${userId} with socket id: ${socket.id}`);
            if (userId) {
                delete userSocketMap[userId];
            }
            io.emit("online-users", Object.keys(userSocketMap));
        });
    });
};

export const initSocket = (server, corsOrigin) => {
    io = new Server(server, {
        cors: {
            origin: corsOrigin,
        },
    });

    registerSocketHandlers();
    return io;
};

export const getIo = () => {
    if (!io) {
        throw new Error("Socket.IO has not been initialized yet");
    }

    return io;
};
