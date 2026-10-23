import { Router } from "express";
import { GstController } from "../controllers/GstController";

const router = Router();

// Public: used by the signup page before the vendor has an account
router.get("/gst/verify/:gstin", GstController.verify);

export default router;
