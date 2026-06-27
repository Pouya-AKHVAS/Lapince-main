import { Router } from "express";
import { register, login, refresh, logoutUser, verifyEmail } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middlewares/access.controller.middleware.ts";
import { authLimiter } from '../middlewares/rate.limiter.middleware.ts';

const router = Router();

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/refresh", refresh); 
router.post("/logout", authMiddleware, logoutUser);
router.get("/verify/:token", verifyEmail);
export default router;