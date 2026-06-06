import { Request, Response, NextFunction } from "express";
import { MasterDataService } from "../services/MasterDataService";

export class MasterDataController {
  // Categories CRUD
  static async getCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId || null;
      const result = await MasterDataService.getCategories(orgId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = req.user?.userId || "";
      const orgId = req.user?.organizationId || null;
      const result = await MasterDataService.createCategory(actorId, orgId, req.body);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = req.user?.userId || "";
      const orgId = req.user?.organizationId || null;
      const result = await MasterDataService.updateCategory(actorId, orgId, req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = req.user?.userId || "";
      const orgId = req.user?.organizationId || null;
      const result = await MasterDataService.deleteCategory(actorId, orgId, req.params.id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // Static lists
  static getUnits(req: Request, res: Response, next: NextFunction): void {
    const result = MasterDataService.getUnits();
    res.status(200).json({
      success: true,
      data: result,
    });
  }

  static getTaxCodes(req: Request, res: Response, next: NextFunction): void {
    const result = MasterDataService.getTaxCodes();
    res.status(200).json({
      success: true,
      data: result,
    });
  }

  static getCurrencies(req: Request, res: Response, next: NextFunction): void {
    const result = MasterDataService.getCurrencies();
    res.status(200).json({
      success: true,
      data: result,
    });
  }
}
