import { Request, Response, NextFunction } from "express";
import { VendorService } from "../services/VendorService";
import { checkVendorAccess } from "../middleware/auth";
import { vendor_status } from "../generated/prisma/client";

export class VendorController {
  static async createVendor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId || null;
      const actorId = req.user?.userId || "";
      const result = await VendorService.createVendor(actorId, orgId, req.body);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getVendors(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId || null;
      const { status, category_id, page, limit } = req.query;

      // Vendor users can only view themselves
      if (req.user?.vendorId) {
        const result = await VendorService.getVendorById(orgId, req.user.vendorId);
        res.status(200).json({
          success: true,
          data: [result.profile],
          meta: { total: 1, page: 1, limit: 10, pages: 1 },
        });
        return;
      }

      const filters = {
        status: status ? (status as vendor_status) : undefined,
        category_id: category_id ? (category_id as string) : undefined,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      };

      const { vendors, pagination } = await VendorService.getVendors(orgId, filters);

      res.status(200).json({
        success: true,
        data: vendors,
        meta: pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getVendorById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId || null;
      const vendorId = req.params.id;

      // Scoping check
      checkVendorAccess(vendorId, req.user?.vendorId || null);

      const result = await VendorService.getVendorById(orgId, vendorId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateVendor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId || null;
      const actorId = req.user?.userId || "";
      const vendorId = req.params.id;

      // Scoping check
      checkVendorAccess(vendorId, req.user?.vendorId || null);

      const result = await VendorService.updateVendor(actorId, orgId, vendorId, req.body);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async patchVendorStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId || null;
      const actorId = req.user?.userId || "";
      const vendorId = req.params.id;

      const result = await VendorService.patchVendorStatus(actorId, orgId, vendorId, req.body.status);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
