import { Router } from "express";
import { login, signUp, googleLogin, logout, updateProfile, getCurrentUser, verifyEmail, requestEmailChange } from "../controllers/user.controller.js";
import { requireVerifiedUser, verifyJWT } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";


const router = Router();

//todo: the APIs must flow REST design principles.

router.route("/signUp").post(signUp);
router.route("/login").post(login);
router.route("/google").post(googleLogin);
router.route("/verify-email").post(verifyEmail);
router.route("/logout").post(verifyJWT, logout);
router.route("/me").get(verifyJWT, getCurrentUser);
router.route("/update-profile").put(verifyJWT, upload.single("profilePic"), updateProfile);
router.route("/request-email-change").post(verifyJWT, requireVerifiedUser, requestEmailChange);

export default router;
