import {Router} from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { getUsersFroSidebar, getMessages, markMessagesAsSeen, sendMessage } from "../controllers/message.controller.js";

const messageRouter = Router();

messageRouter.route("/users").get(verifyJWT, getUsersFroSidebar);
messageRouter.route("/messages/:id").get(verifyJWT, getMessages);
messageRouter.route("/mark-as-seen/:id").put(verifyJWT, markMessagesAsSeen);
messageRouter.route("/send-message/:id").post(verifyJWT, sendMessage);

export default messageRouter;