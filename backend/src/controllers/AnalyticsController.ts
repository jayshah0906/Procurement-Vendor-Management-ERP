import { Request, Response, NextFunction } from "express";
import { DashboardService } from "../services/DashboardService";

export class AnalyticsController {
  static async getVendorPerformance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId || "";
      const result = await DashboardService.getVendorPerformance(orgId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSpendAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId || "";
      const result = await DashboardService.getSpendAnalysis(orgId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getRfqConversion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId || "";
      const result = await DashboardService.getRfqConversion(orgId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
