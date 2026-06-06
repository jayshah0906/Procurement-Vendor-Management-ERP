import { Request, Response, NextFunction } from "express";
import { UserService } from "../services/UserService";

export class UserController {
  static async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId || null;
      const actorId = req.user?.userId || "";
      const result = await UserService.createUser(actorId, orgId, req.body);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId || null;
      const { role_id, vendor_id, status, page, limit } = req.query;

      const filters = {
        role_id: role_id ? parseInt(role_id as string, 10) : undefined,
        vendor_id: vendor_id ? (vendor_id as string) : undefined,
        status: status !== undefined ? status === "true" : undefined,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      };

      const { users, pagination } = await UserService.getUsers(orgId, filters);

      res.status(200).json({
        success: true,
        data: users,
        meta: pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId || null;
      const result = await UserService.getUserById(orgId, req.params.id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId || null;
      const actorId = req.user?.userId || "";
      const result = await UserService.updateUser(actorId, orgId, req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async patchUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId || null;
      const actorId = req.user?.userId || "";
      const result = await UserService.patchUserStatus(actorId, orgId, req.params.id, req.body.is_active);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
