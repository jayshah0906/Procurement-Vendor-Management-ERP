import { prisma } from "../utils/prisma";
import { NotFoundError } from "../utils/errors";

export class AuditLogsService {
  static async getAuditLogs(
    organizationId: string,
    filters: {
      entity_type?: string;
      entity_id?: string;
      user_id?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      organization_id: organizationId,
    };

    if (filters.entity_type) {
      where.entity_type = filters.entity_type;
    }
    if (filters.entity_id) {
      where.entity_id = filters.entity_id;
    }
    if (filters.user_id) {
      where.actor_user_id = filters.user_id;
    }

    const [logs, total] = await Promise.all([
      prisma.activity_logs.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          users: {
            select: { first_name: true, last_name: true, email: true },
          },
        },
      }),
      prisma.activity_logs.count({ where }),
    ]);

    return {
      logs: logs.map((log) => ({
        id: log.id.toString(),
        actor_id: log.actor_user_id,
        actor_name: log.users ? `${log.users.first_name} ${log.users.last_name || ""}`.trim() : "System",
        actor_email: log.users?.email || null,
        ip_address: log.ip_address,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        action: log.action,
        old_value: log.old_value,
        new_value: log.new_value,
        created_at: log.created_at,
      })),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  static async getEntityTimeline(organizationId: string, entityType: string, entityId: string) {
    const logs = await prisma.activity_logs.findMany({
      where: {
        organization_id: organizationId,
        entity_type: entityType,
        entity_id: entityId,
      },
      orderBy: { created_at: "asc" },
      include: {
        users: {
          select: { first_name: true, last_name: true },
        },
      },
    });

    if (logs.length === 0) {
      throw new NotFoundError(`No audit logs timeline found for ${entityType} with ID ${entityId}`);
    }

    return logs.map((log) => ({
      id: log.id.toString(),
      action: log.action,
      actor: log.users ? `${log.users.first_name} ${log.users.last_name || ""}`.trim() : "System",
      timestamp: log.created_at,
      details: log.new_value,
    }));
  }
}
