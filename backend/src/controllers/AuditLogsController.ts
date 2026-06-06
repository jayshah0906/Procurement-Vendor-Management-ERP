import { Request, Response, NextFunction } from "express";
import { AuditLogsService } from "../services/AuditLogsService";

export class AuditLogsController {
  static async getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId || "";
      const { entity_type, entity_id, user_id, page, limit } = req.query;

      const filters = {
        entity_type: entity_type ? (entity_type as string) : undefined,
        entity_id: entity_id ? (entity_id as string) : undefined,
        user_id: user_id ? (user_id as string) : undefined,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      };

      const { logs, pagination } = await AuditLogsService.getAuditLogs(orgId, filters);

      res.status(200).json({
        success: true,
        data: logs,
        meta: pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getEntityTimeline(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user?.organizationId || "";
      const { entity_type, entity_id } = req.params;
      const result = await AuditLogsService.getEntityTimeline(orgId, entity_type, entity_id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
