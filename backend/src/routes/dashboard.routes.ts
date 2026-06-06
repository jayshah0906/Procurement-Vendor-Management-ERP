import { Router } from "express";
import { DashboardController } from "../controllers/DashboardController";
import { authenticateToken } from "../middleware/auth";

const router = Router();

router.get("/dashboard/summary", authenticateToken, DashboardController.getSummary);
router.get("/dashboard/procurement-overview", authenticateToken, DashboardController.getProcurementOverview);
router.get("/dashboard/vendor-overview", authenticateToken, DashboardController.getVendorOverview);

export default router;
