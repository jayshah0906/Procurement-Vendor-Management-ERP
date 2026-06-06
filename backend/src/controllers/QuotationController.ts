import { Request, Response, NextFunction } from "express";
import { QuotationService } from "../services/QuotationService";
import { quotation_status } from "../generated/prisma/client";

export class QuotationController {
  static async createQuotation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = req.user?.userId || "";
      const orgId = req.user?.organizationId || "";
      const vendorId = req.user?.vendorId || null;
      const result = await QuotationService.createQuotation(actorId, orgId, vendorId, req.body);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getQuotations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId || null;
      const vendorId = req.user?.vendorId || null;
      const { rfq_id, vendor_id, status, page, limit } = req.query;

      const filters = {
        rfq_id: rfq_id ? (rfq_id as string) : undefined,
        vendor_id: vendor_id ? (vendor_id as string) : undefined,
        status: status ? (status as quotation_status) : undefined,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      };

      const { quotations, pagination } = await QuotationService.getQuotations(orgId, filters, vendorId);

      res.status(200).json({
        success: true,
        data: quotations,
        meta: pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getQuotationById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId || null;
      const vendorId = req.user?.vendorId || null;
      const result = await QuotationService.getQuotationById(orgId, req.params.id, vendorId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateQuotation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = req.user?.userId || "";
      const orgId = req.user?.organizationId || "";
      const vendorId = req.user?.vendorId || null;
      const result = await QuotationService.updateQuotation(actorId, orgId, vendorId, req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async patchQuotationStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = req.user?.userId || "";
      const orgId = req.user?.organizationId || "";
      const vendorId = req.user?.vendorId || null;
      const result = await QuotationService.patchQuotationStatus(actorId, orgId, vendorId, req.params.id, req.body.status);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
