import { Prisma } from "../generated/prisma/client";

export class AuditService {
  /**
   * Records a domain-level audit event in the activity_logs table.
   * This MUST be run within an existing Prisma transaction client (tx).
   */
  static async record(
    tx: Prisma.TransactionClient,
    data: {
      actorId: string;
      organizationId: string | null;
      entityType: string;
      entityId: string | null;
      action: string; // e.g., 'AUTH_LOGIN', 'RFQ_CREATED', 'PO_GENERATED'
      oldValue?: any;
      newValue?: any;
      ipAddress?: string;
    }
  ): Promise<void> {
    await tx.activity_logs.create({
      data: {
        organization_id: data.organizationId,
        actor_user_id: data.actorId,
        entity_type: data.entityType,
        entity_id: data.entityId,
        action: data.action,
        old_value: data.oldValue ? JSON.parse(JSON.stringify(data.oldValue)) : null,
        new_value: data.newValue ? JSON.parse(JSON.stringify(data.newValue)) : null,
        ip_address: data.ipAddress || null,
      },
    });
  }
}
