import { Router } from "express";
import { ApprovalController } from "../controllers/ApprovalController";
import { authenticateToken } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { initiateApprovalSchema, actionApprovalStepSchema } from "../validators/approval.schema";

const router = Router();

// List all workflows for the org (with optional ?status= filter)
router.get("/approvals", authenticateToken, ApprovalController.listWorkflows);

router.post(
  "/approvals/initiate",
  authenticateToken,
  validate(initiateApprovalSchema),
  ApprovalController.initiateApproval
);

router.get(
  "/approvals/:workflow_id",
  authenticateToken,
  ApprovalController.getWorkflow
);

router.post(
  "/approvals/:workflow_id/steps/:step_id/action",
  authenticateToken,
  validate(actionApprovalStepSchema),
  ApprovalController.executeStepAction
);

export default router;
