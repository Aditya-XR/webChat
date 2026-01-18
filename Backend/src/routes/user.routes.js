import { Router } from "express";
import { login, signUp } from "../controllers/user.controller.js";

const router = Router();

router.route("/signUp").post(signUp);
router.route("/login").post(login);

export default router;