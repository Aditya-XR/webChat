import {Router} from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";
import { getUsersForSidebar, getMessages, markMessagesAsSeen, sendMessage } from "../controllers/message.controller.js";

const messageRouter = Router();

messageRouter.route("/getUsers").get(verifyJWT, getUsersForSidebar);
messageRouter.route("/messages/:id").get(verifyJWT, getMessages);
messageRouter.route("/mark-as-seen/:id").put(verifyJWT, markMessagesAsSeen);
messageRouter.route("/send-message/:id").post(verifyJWT, upload.single("image"), sendMessage);

export default messageRouter;
