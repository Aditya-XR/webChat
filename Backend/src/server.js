import express from "express";
import 'dotenv/config'
import cors from "cors";
import * as http from "node:http";
import connectDB from "./database/db.js";
import cookieParser from "cookie-parser";
import userRouter from "./routes/user.routes.js";
import messageRouter from "./routes/messageRoutes.js";
import { initSocket } from "./socket.js";

//creating Express app and HTTP server
const app = express();
const server = http.createServer(app);
const isVercelDeployment = Boolean(process.env.VERCEL);
const PORT = process.env.PORT || 5000;

const dbConnectionPromise = connectDB().catch((err) => {
    console.log(" //server.js// MONGO DB connection failed !!!!", err);
    throw err;
});

// Initilizing socket.io server
if (!isVercelDeployment) {
    initSocket(server, process.env.CORS_ORIGIN);
}

//middleware setup
app.use(async (req, res, next) => {
    try {
        await dbConnectionPromise;
        next();
    } catch (error) {
        next(error);
    }
});
app.use(express.json({limit: "5mb"}));
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));
app.use(cookieParser());

app.use("/api/status", (req, res) => res.send("Server is running"));

//routes import
app.use("/api/v1/users", userRouter);
app.use("/api/v1/messages", messageRouter);
//http://localhost:8000/api/v1/users/

app.use((err, req, res, next) => {
    console.error(err);

    if (res.headersSent) {
        return next(err);
    }

    const statusCode = err.statusCode || 500;

    res.status(statusCode).json({
        success: false,
        message: err.message || "Internal server error",
        errors: err.errors || [],
    });
});

if (!isVercelDeployment) {
    dbConnectionPromise
        .then(() => {
            server.listen(PORT, () => {
                console.log(`Server is running on port: ${PORT} //server.js`);
            });
        })
        .catch(() => {
            process.exitCode = 1;
        });
}


export default app;
