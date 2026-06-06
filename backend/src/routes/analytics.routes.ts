import { Router } from "express";
import { AnalyticsController } from "../controllers/AnalyticsController";
import { authenticateToken } from "../middleware/auth";

const router = Router();

router.get("/analytics/vendor-performance", authenticateToken, AnalyticsController.getVendorPerformance);
router.get("/analytics/spend-analysis", authenticateToken, AnalyticsController.getSpendAnalysis);
router.get("/analytics/rfq-conversion", authenticateToken, AnalyticsController.getRfqConversion);
router.get("/analytics/reports", authenticateToken, AnalyticsController.getReportsData);

export default router;
