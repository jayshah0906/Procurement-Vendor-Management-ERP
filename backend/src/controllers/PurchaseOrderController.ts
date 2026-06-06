import { Request, Response, NextFunction } from "express";
import { PurchaseOrderService } from "../services/PurchaseOrderService";
import { po_status } from "../generated/prisma/client";

export class PurchaseOrderController {
  static async createPurchaseOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = req.user?.userId || "";
      const orgId = req.user?.organizationId || "";
      const result = await PurchaseOrderService.createPurchaseOrder(actorId, orgId, req.body);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPurchaseOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId || null;
      const vendorId = req.user?.vendorId || null;
      const { vendor_id, status, page, limit } = req.query;

      const filters = {
        vendor_id: vendor_id ? (vendor_id as string) : undefined,
        status: status ? (status as po_status) : undefined,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      };

      const { purchase_orders, pagination } = await PurchaseOrderService.getPurchaseOrders(orgId, filters, vendorId);

      res.status(200).json({
        success: true,
        data: purchase_orders,
        meta: pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPurchaseOrderById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId || null;
      const vendorId = req.user?.vendorId || null;
      const result = await PurchaseOrderService.getPurchaseOrderById(orgId, req.params.id, vendorId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async patchPurchaseOrderStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId || "";
      const result = await PurchaseOrderService.patchPurchaseOrderStatus(req.user!, orgId, req.params.id, req.body.status);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async submitGoodsReceipt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = req.user?.userId || "";
      const orgId = req.user?.organizationId || "";
      const vendorId = req.user?.vendorId || null;
      const result = await PurchaseOrderService.submitGoodsReceipt(actorId, orgId, req.params.id, vendorId, req.body);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getGoodsReceipts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId || null;
      const result = await PurchaseOrderService.getGoodsReceipts(orgId, req.params.id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
