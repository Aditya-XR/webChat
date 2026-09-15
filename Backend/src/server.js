import express from "express";
import 'dotenv/config'
import cors from "cors";
import * as http from "node:http";
import connectDB from "./database/db.js";
import cookieParser from "cookie-parser";
import userRouter from "./routes/user.routes.js";
import messageRouter from "./routes/messageRoutes.js";
import contactRouter from "./routes/contact.routes.js";
import { initSocket } from "./socket.js";
import { backfillExistingUsersAsVerified } from "./utils/backfillVerifiedUsers.js";
import { backfillExistingContacts } from "./utils/backfillExistingContacts.js";

//creating Express app and HTTP server
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

const getAllowedOrigins = () => {
    const allowedOrigins = new Set(["http://localhost:5173", "http://127.0.0.1:5173"]);
    const configuredOrigins = [process.env.CORS_ORIGIN, process.env.FRONTEND_URL];

    configuredOrigins.forEach((value) => {
        if (typeof value !== "string") {
            return;
        }

        value
            .split(",")
            .map((origin) => origin.trim())
            .filter((origin) => origin.length > 0 && origin !== "*")
            .forEach((origin) => allowedOrigins.add(origin));
    });

    return Array.from(allowedOrigins);
};

const allowedOrigins = getAllowedOrigins();
const corsOptions = {
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
        }

        callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
};

// Initializing socket.io server
initSocket(server, allowedOrigins);

// Middleware setup
app.use(express.json({ limit: "5mb" }));
app.use(cors(corsOptions));
app.use(cookieParser());

app.use("/api/status", (req, res) => res.send("Server is running"));

// Routes
app.use("/api/v1/users", userRouter);
app.use("/api/v1/messages", messageRouter);
app.use("/api/v1/contacts", contactRouter);

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

// Database connection and server initialization
connectDB()
    .then(async () => {
        await backfillExistingUsersAsVerified();
        await backfillExistingContacts();
        server.listen(PORT, () => {
            console.log(`Server is running on port: ${PORT} //server.js`);
        });
    })
    .catch((err) => {
        console.error(" //server.js// MONGO DB connection failed !!!!", err);
        process.exit(1);
    });

export { app, server };
export default app;
