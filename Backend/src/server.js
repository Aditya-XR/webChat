import express from "express";
import 'dotenv/config'
import cors from "cors";
import * as http from "node:http";
import connectDB from "./database/db.js";
import cookieParser from "cookie-parser";
import userRouter from "./routes/user.routes.js";
import messageRouter from "./routes/messageRoutes.js";
import {Server} from "socket.io";

//creating Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Initilizing socket.io server
export const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN,
    }
});

// Store online users in a Map for O(1) access
export const userSocketMap = {}; // {userId: socketId}

io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;
    console.log(`User connected: ${userId} with socket id: ${socket.id}`);

    if(userId){
        userSocketMap[userId] = socket.id;
    }

    // emit online users to all clients whenever a user connects or disconnects
    io.emit("online-users", Object.keys(userSocketMap));

    socket.on("disconnect", () => {
        console.log(`User disconnected: ${userId} with socket id: ${socket.id}`);
        if(userId){
            delete userSocketMap[userId];
        }
        // emit updated online users to all clients
        io.emit("online-users", Object.keys(userSocketMap));
    });
});

//middleware setup
app.use(express.json({limit: "5mb"}));
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));
app.use(cookieParser());

app.use("/api/status", (req, res) => res.send("Server is running"));

const PORT = process.env.PORT || 5000;

//Connecting to DB

connectDB()
.then(() => {
    app.listen(process.env.PORT || 5000, () => {
        console.log(`Server is running on port: ${process.env.PORT || 5000} //server.js`);
    })
})
.catch((err) => {
    console.log(" //server.js// MONGO DB connection failed !!!!", err);
})


//routes import
app.use("/api/v1/users", userRouter);
app.use("/api/v1/messages", messageRouter);
//http://localhost:5000/api/v1/users/


export default app;