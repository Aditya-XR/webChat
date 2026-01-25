import { Router } from "express";
import { login, signUp, logout } from "../controllers/user.controller.js";
import { verifyJWT } from "../middleware/auth.middleware.js";


const router = Router();

router.route("/signUp").post(signUp);
router.route("/login").post(login);
router.route("/logout").post(verifyJWT, logout);

export default router;