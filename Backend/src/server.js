import express from "express";
import 'dotenv/config'
import cors from "cors";
import * as http from "node:http";
import connectDB from "./database/db.js";
//creating Express app and HTTP server
const app = express();
const server = http.createServer(app);

//middleware setup
app.use(express.json({limit: "5mb"}));
app.use(cors());

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




// server.listen(PORT, () => console.log(`Server running on port ${PORT}! //server.js`)
// );

export default app;