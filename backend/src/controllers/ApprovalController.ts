import { Request, Response, NextFunction } from "express";
import { ApprovalService } from "../services/ApprovalService";

export class ApprovalController {
  static async initiateApproval(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = req.user?.userId || "";
      const orgId = req.user?.organizationId || "";
      const result = await ApprovalService.initiateApproval(actorId, orgId, req.body);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getWorkflow(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId || null;
      const result = await ApprovalService.getWorkflow(orgId, req.params.workflow_id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async executeStepAction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = req.user?.userId || "";
      const orgId = req.user?.organizationId || "";
      const { workflow_id, step_id } = req.params;
      const result = await ApprovalService.executeStepAction(actorId, orgId, workflow_id, step_id, req.body);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
