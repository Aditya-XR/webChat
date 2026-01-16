import { Router } from "express";
import { signUp } from "../controllers/user.controller.js";

const router = Router();

router.route("/signUp").post(signUp);

export default router;