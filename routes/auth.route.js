import { Router } from "express";
import authController from "../controllers/auth.controller.js";
import auth from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/signin", authController.signin);
router.post("/login", authController.login);
router.get('/profile', auth, (req, res) => {
  res.send(req.user)
})

export default router;