import { Router } from "express";
import authController from '../controllers/auth.controller.js'

const router = Router();

router.post("/signin", authController.signin)
router.post("/login", authController.login)

export default router;