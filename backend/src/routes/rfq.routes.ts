import { Router } from "express";
import { RFQController } from "../controllers/RFQController";
import { authenticateToken, requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  createRfqSchema,
  updateRfqSchema,
  patchRfqStatusSchema,
  inviteVendorsSchema,
} from "../validators/rfq.schema";

const router = Router();

router.post(
  "/rfqs",
  authenticateToken,
  requirePermission("rfq", "create"),
  validate(createRfqSchema),
  RFQController.createRfq
);

router.get(
  "/rfqs",
  authenticateToken,
  requirePermission("rfq", "view"),
  RFQController.getRfqs
);

router.get(
  "/rfqs/:id",
  authenticateToken,
  requirePermission("rfq", "view"),
  RFQController.getRfqById
);

router.put(
  "/rfqs/:id",
  authenticateToken,
  requirePermission("rfq", "update"),
  validate(updateRfqSchema),
  RFQController.updateRfq
);

router.patch(
  "/rfqs/:id/status",
  authenticateToken,
  requirePermission("rfq", "publish"),
  validate(patchRfqStatusSchema),
  RFQController.patchRfqStatus
);

router.post(
  "/rfqs/:id/invite",
  authenticateToken,
  requirePermission("rfq", "invite"),
  validate(inviteVendorsSchema),
  RFQController.inviteVendors
);

router.get(
  "/rfqs/:id/vendors",
  authenticateToken,
  requirePermission("rfq", "view"),
  RFQController.getInvitedVendors
);

export default router;
