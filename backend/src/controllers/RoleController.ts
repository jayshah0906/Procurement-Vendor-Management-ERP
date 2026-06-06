import { Request, Response, NextFunction } from "express";
import { UserService } from "../services/UserService";

export class RoleController {
  static async getRoles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await UserService.getRoles();
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getRoleById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = parseInt(req.params.id, 10);
      const result = await UserService.getRoleById(id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = req.user?.userId || "";
      const orgId = req.user?.organizationId || null;
      const result = await UserService.createRole(actorId, orgId, req.body);
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = req.user?.userId || "";
      const orgId = req.user?.organizationId || null;
      const id = parseInt(req.params.id, 10);
      const result = await UserService.updateRole(actorId, orgId, id, req.body);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actorId = req.user?.userId || "";
      const orgId = req.user?.organizationId || null;
      const id = parseInt(req.params.id, 10);
      const result = await UserService.deleteRole(actorId, orgId, id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await UserService.getPermissions();
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
