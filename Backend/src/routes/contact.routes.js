import { Router } from "express";
import {
    searchUsers,
    sendInvite,
    getPendingRequests,
    acceptInvite,
    rejectInvite,
    blockContact,
    unblockContact,
    getBlockedContacts,
} from "../controllers/contact.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";

const router = Router();

// All contact routes require authentication
router.use(verifyJWT);

router.route("/search").get(searchUsers);
router.route("/requests").get(getPendingRequests);
router.route("/invite/:recipientId").post(sendInvite);
router.route("/accept/:contactId").put(acceptInvite);
router.route("/reject/:contactId").delete(rejectInvite);
router.route("/block/:userId").post(blockContact);
router.route("/unblock/:userId").post(unblockContact);
router.route("/blocked").get(getBlockedContacts);

export default router;

