import {Router} from "express";
import { requireVerifiedUser, verifyJWT } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";
import { deleteMessage, getUsersForSidebar, getMessages, markMessagesAsSeen, sendMessage } from "../controllers/message.controller.js";
import { createRequestTimeoutMiddleware } from "../middleware/requestTimeout.middleware.js";

const messageRouter = Router();

messageRouter.use(verifyJWT, requireVerifiedUser);

messageRouter.route("/getUsers").get(getUsersForSidebar);
messageRouter.route("/messages/:id").get(getMessages);
messageRouter.route("/mark-as-seen/:id").put(markMessagesAsSeen);
messageRouter.route("/delete-message/:id").put(deleteMessage);
messageRouter.route("/send-message/:id").post(
    createRequestTimeoutMiddleware(),
    upload.single("image"),
    sendMessage
);

export default messageRouter;
