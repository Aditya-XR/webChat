import { Router } from "express";
import { login, signUp, logout, updateProfile } from "../controllers/user.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";


const router = Router();

router.route("/signUp").post(signUp);
router.route("/login").post(login);
router.route("/logout").post(verifyJWT, logout);
router.route("/update-profile").put(verifyJWT, upload.single("profilePic"), updateProfile);

export default router;