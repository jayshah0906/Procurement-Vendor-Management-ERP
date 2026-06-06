import { Request, Response, NextFunction } from "express";
import { InvoiceService } from "../services/InvoiceService";
import { invoice_status } from "../generated/prisma/client";

export class InvoiceController {
  static async createInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = req.user?.userId || "";
      const orgId = req.user?.organizationId || "";
      const vendorId = req.user?.vendorId || null;
      const result = await InvoiceService.createInvoice(actorId, orgId, vendorId, req.body);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId || null;
      const vendorId = req.user?.vendorId || null;
      const { status, vendor_id, page, limit } = req.query;

      const filters = {
        status: status ? (status as invoice_status) : undefined,
        vendor_id: vendor_id ? (vendor_id as string) : undefined,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      };

      const { invoices, pagination } = await InvoiceService.getInvoices(orgId, filters, vendorId);

      res.status(200).json({
        success: true,
        data: invoices,
        meta: pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getInvoiceById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId || null;
      const vendorId = req.user?.vendorId || null;
      const result = await InvoiceService.getInvoiceById(orgId, req.params.id, vendorId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async patchInvoiceStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = req.user?.userId || "";
      const orgId = req.user?.organizationId || "";
      const result = await InvoiceService.patchInvoiceStatus(actorId, orgId, req.params.id, req.body.status);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async markPaid(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = req.user?.userId || "";
      const orgId = req.user?.organizationId || "";
      const result = await InvoiceService.markPaid(actorId, orgId, req.params.id, req.body.paid_at);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
