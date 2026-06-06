import { Router } from "express";
import { AuditLogsController } from "../controllers/AuditLogsController";
import { authenticateToken } from "../middleware/auth";

const router = Router();

router.get("/audit-logs", authenticateToken, AuditLogsController.getAuditLogs);
router.get("/audit-logs/:entity_type/:entity_id", authenticateToken, AuditLogsController.getEntityTimeline);

export default router;
