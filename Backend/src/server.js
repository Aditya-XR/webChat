import express from "express";
import 'dotenv/config'
import cors from "cors";
import * as http from "node:http";
import connectDB from "./database/db.js";
import cookieParser from "cookie-parser";
import userRouter from "./routes/user.routes.js";
import messageRouter from "./routes/messageRoutes.js";
import { initSocket } from "./socket.js";
import { backfillExistingUsersAsVerified } from "./utils/backfillVerifiedUsers.js";

//creating Express app and HTTP server
const app = express();
const server = http.createServer(app);
const isVercelDeployment = Boolean(process.env.VERCEL);
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

const dbConnectionPromise = connectDB()
    .then(async () => {
        await backfillExistingUsersAsVerified();
    })
    .catch((err) => {
        console.log(" //server.js// MONGO DB connection failed !!!!", err);
        throw err;
    });

// Initilizing socket.io server
if (!isVercelDeployment) {
    initSocket(server, allowedOrigins);
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
app.use(cors(corsOptions));
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
