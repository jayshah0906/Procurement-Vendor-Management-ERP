import { Request, Response, NextFunction } from "express";
import { DashboardService } from "../services/DashboardService";

export class DashboardController {
  static async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId || "";
      const vendorId = req.user?.vendorId || null;
      const result = await DashboardService.getSummary(orgId, vendorId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getProcurementOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId || "";
      const vendorId = req.user?.vendorId || null;
      const result = await DashboardService.getProcurementOverview(orgId, vendorId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getVendorOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId || "";
      const result = await DashboardService.getVendorOverview(orgId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
