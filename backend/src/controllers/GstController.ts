import { Request, Response, NextFunction } from "express";
import { GstService } from "../services/GstService";

export class GstController {
  static async verify(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await GstService.verify(req.params.gstin);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
