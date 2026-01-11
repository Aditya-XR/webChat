import express from "express";
import 'dotenv/config'
import cors from "cors";
import http from "http";

//creating Express app and HTTP server
const app = express();
const server = http.createServer(app);

//middleware setup
app.use(express.json({limit: "5mb"}));
app.use(cors());

app.use("/api/status", (req, res) => res.send("Server is running"));

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`)
);

export default app;