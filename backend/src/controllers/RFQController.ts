import { Request, Response, NextFunction } from "express";
import { RFQService } from "../services/RFQService";
import { rfq_status } from "../generated/prisma/client";

export class RFQController {
  static async createRfq(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = req.user?.userId || "";
      const orgId = req.user?.organizationId || "";
      const result = await RFQService.createRfq(actorId, orgId, req.body);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getRfqs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId || null;
      const vendorId = req.user?.vendorId || null;
      const { status, category_id, created_by, page, limit } = req.query;

      const filters = {
        status: status ? (status as rfq_status) : undefined,
        category_id: category_id ? (category_id as string) : undefined,
        created_by: created_by ? (created_by as string) : undefined,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      };

      const { rfqs, pagination } = await RFQService.getRfqList(orgId, filters, vendorId);

      res.status(200).json({
        success: true,
        data: rfqs,
        meta: pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getRfqById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId || null;
      const vendorId = req.user?.vendorId || null;
      const result = await RFQService.getRfqById(orgId, req.params.id, vendorId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateRfq(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = req.user?.userId || "";
      const orgId = req.user?.organizationId || "";
      const result = await RFQService.updateRfq(actorId, orgId, req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async patchRfqStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = req.user?.userId || "";
      const orgId = req.user?.organizationId || "";
      const result = await RFQService.patchRfqStatus(actorId, orgId, req.params.id, req.body.status);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async inviteVendors(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = req.user?.userId || "";
      const orgId = req.user?.organizationId || "";
      const result = await RFQService.inviteVendors(actorId, orgId, req.params.id, req.body.vendor_ids);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getInvitedVendors(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId || null;
      const result = await RFQService.getInvitedVendors(orgId, req.params.id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
