import { prisma } from "../utils/prisma";
import { NotFoundError, BadRequestError, ForbiddenError } from "../utils/errors";
import { AuditService } from "./AuditService";
import { rfq_status, Prisma } from "../generated/prisma/client";

export class RFQService {
  static async createRfq(
    actorId: string,
    organizationId: string,
    data: {
      title: string;
      description?: string;
      category_id: string;
      deadline: string;
      items: Array<{
        item_name: string;
        description?: string;
        quantity: number;
        unit?: string;
        estimated_unit_price?: number;
      }>;
    }
  ) {
    // 1. Verify category exists
    const category = await prisma.procurement_categories.findFirst({
      where: { id: data.category_id, organization_id: organizationId, deleted_at: null },
    });
    if (!category) {
      throw new NotFoundError("Procurement category not found");
    }

    return await prisma.$transaction(async (tx) => {
      // 2. Generate unique RFQ Number using the database sequence function
      const seqResult = await tx.$queryRawUnsafe<any[]>(
        `SELECT generate_document_number($1::uuid, $2::varchar) AS doc_number`,
        organizationId,
        "RFQ"
      );
      if (!seqResult || seqResult.length === 0 || !seqResult[0].doc_number) {
        throw new BadRequestError("Failed to generate RFQ document sequence number");
      }
      const rfqNumber = seqResult[0].doc_number;

      // 3. Calculate total estimated amount
      let totalEstimatedAmount = 0;
      for (const item of data.items) {
        if (item.estimated_unit_price) {
          totalEstimatedAmount += item.quantity * item.estimated_unit_price;
        }
      }

      // 4. Create RFQ Header
      const rfq = await tx.rfqs.create({
        data: {
          organization_id: organizationId,
          rfq_number: rfqNumber,
          category_id: data.category_id,
          title: data.title,
          description: data.description || null,
          deadline: new Date(data.deadline),
          status: "draft",
          total_estimated_amount: new Prisma.Decimal(totalEstimatedAmount),
          created_by: actorId,
        },
      });

      // 5. Create RFQ Items
      const rfqItems = await Promise.all(
        data.items.map((item) =>
          tx.rfq_items.create({
            data: {
              rfq_id: rfq.id,
              item_name: item.item_name,
              description: item.description || null,
              quantity: new Prisma.Decimal(item.quantity),
              unit: item.unit || "NOS",
              estimated_unit_price: item.estimated_unit_price
                ? new Prisma.Decimal(item.estimated_unit_price)
                : null,
            },
          })
        )
      );

      // 6. Save first revision version (snapshot)
      const snapshot = {
        rfq,
        items: rfqItems,
      };
      await tx.rfq_revisions.create({
        data: {
          rfq_id: rfq.id,
          version_no: 1,
          snapshot: snapshot as any,
          created_by: actorId,
        },
      });

      // 7. Write Audit Log
      await AuditService.record(tx, {
        actorId,
        organizationId,
        entityType: "rfqs",
        entityId: rfq.id,
        action: "RFQ_CREATED",
        newValue: { rfq_number: rfq.rfq_number, title: rfq.title, total_estimated_amount: totalEstimatedAmount },
      });

      return {
        ...rfq,
        items: rfqItems,
      };
    });
  }

  static async getRfqList(
    organizationId: string | null,
    filters: {
      status?: rfq_status;
      category_id?: string;
      created_by?: string;
      page?: number;
      limit?: number;
    },
    userVendorId: string | null
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {
      organization_id: organizationId,
      deleted_at: null,
    };

    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.category_id) {
      where.category_id = filters.category_id;
    }
    if (filters.created_by) {
      where.created_by = filters.created_by;
    }

    // Vendor users only see RFQs they are invited to
    if (userVendorId) {
      where.rfq_vendors = {
        some: {
          vendor_id: userVendorId,
          deleted_at: null,
        },
      };
      // Vendor should not see drafts
      if (!filters.status) {
        where.status = {
          in: ["published", "quotation_open", "quotation_closed", "under_review", "approved", "rejected", "converted_to_po"],
        };
      }
    }

    const [rfqs, total] = await Promise.all([
      prisma.rfqs.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          procurement_categories: true,
          users: {
            select: { first_name: true, last_name: true, email: true },
          },
          rfq_vendors: {
            where: { deleted_at: null },
            include: {
              vendors: true,
            },
          },
        },
      }),
      prisma.rfqs.count({ where }),
    ]);

    return {
      rfqs: rfqs.map((r) => {
        // Strip financial estimate if vendor
        const estimatedAmount = userVendorId ? null : r.total_estimated_amount;
        return {
          id: r.id,
          rfq_number: r.rfq_number,
          title: r.title,
          description: r.description,
          deadline: r.deadline,
          status: r.status,
          currency: r.currency,
          total_estimated_amount: estimatedAmount,
          category: r.procurement_categories ? r.procurement_categories.name : null,
          category_id: r.category_id,
          created_by_user: `${r.users.first_name} ${r.users.last_name || ""}`.trim(),
          created_at: r.created_at,
          invited_vendors: r.rfq_vendors.map((rv) => rv.vendors.company_name),
        };
      }),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  static async getRfqById(organizationId: string | null, rfqId: string, userVendorId: string | null) {
    const rfq = await prisma.rfqs.findFirst({
      where: { id: rfqId, organization_id: organizationId, deleted_at: null },
      include: {
        rfq_items: {
          where: { deleted_at: null },
        },
        procurement_categories: true,
        users: {
          select: { first_name: true, last_name: true },
        },
      },
    });

    if (!rfq) {
      throw new NotFoundError("RFQ not found");
    }

    // Vendor scoping check
    if (userVendorId) {
      const invite = await prisma.rfq_vendors.findUnique({
        where: { rfq_id_vendor_id: { rfq_id: rfqId, vendor_id: userVendorId } },
      });
      if (!invite || invite.deleted_at !== null) {
        throw new ForbiddenError("You have not been invited to this RFQ");
      }
    }

    // Strip estimated unit prices and total amount if vendor
    const items = rfq.rfq_items.map((item) => ({
      id: item.id,
      item_name: item.item_name,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      estimated_unit_price: userVendorId ? null : item.estimated_unit_price,
    }));

    return {
      id: rfq.id,
      rfq_number: rfq.rfq_number,
      title: rfq.title,
      description: rfq.description,
      deadline: rfq.deadline,
      status: rfq.status,
      currency: rfq.currency,
      total_estimated_amount: userVendorId ? null : rfq.total_estimated_amount,
      category: rfq.procurement_categories ? rfq.procurement_categories.name : null,
      category_id: rfq.category_id,
      created_by_user: `${rfq.users.first_name} ${rfq.users.last_name || ""}`.trim(),
      created_at: rfq.created_at,
      items,
    };
  }

  static async updateRfq(
    actorId: string,
    organizationId: string,
    rfqId: string,
    data: {
      title?: string;
      description?: string;
      category_id?: string;
      deadline?: string;
      items?: Array<{
        id?: string;
        item_name?: string;
        description?: string;
        quantity?: number;
        unit?: string;
        estimated_unit_price?: number;
      }>;
    }
  ) {
    const rfq = await prisma.rfqs.findFirst({
      where: { id: rfqId, organization_id: organizationId, deleted_at: null },
      include: { rfq_items: { where: { deleted_at: null } } },
    });

    if (!rfq) {
      throw new NotFoundError("RFQ not found");
    }

    if (rfq.status !== "draft") {
      throw new BadRequestError("RFQ can only be updated while in draft status");
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Calculate latest version number
      const revisions = await tx.rfq_revisions.findMany({
        where: { rfq_id: rfqId },
        orderBy: { version_no: "desc" },
        take: 1,
      });
      const nextVersion = revisions.length > 0 ? revisions[0].version_no + 1 : 2;

      // 2. Perform updates to RFQ Header
      const updatedRfq = await tx.rfqs.update({
        where: { id: rfqId },
        data: {
          title: data.title !== undefined ? data.title : rfq.title,
          description: data.description !== undefined ? data.description : rfq.description,
          category_id: data.category_id !== undefined ? data.category_id : rfq.category_id,
          deadline: data.deadline !== undefined ? new Date(data.deadline) : rfq.deadline,
        },
      });

      // 3. Process item mutations if provided
      if (data.items) {
        // Soft delete old items not present in the update
        const updateIds = data.items.map((item) => item.id).filter(Boolean) as string[];
        await tx.rfq_items.updateMany({
          where: { rfq_id: rfqId, id: { notIn: updateIds } },
          data: { deleted_at: new Date() },
        });

        // Update or insert items
        for (const item of data.items) {
          if (item.id) {
            // Update existing
            const dbItem = rfq.rfq_items.find((i) => i.id === item.id);
            if (dbItem) {
              await tx.rfq_items.update({
                where: { id: item.id },
                data: {
                  item_name: item.item_name !== undefined ? item.item_name : dbItem.item_name,
                  description: item.description !== undefined ? item.description : dbItem.description,
                  quantity: item.quantity !== undefined ? new Prisma.Decimal(item.quantity) : dbItem.quantity,
                  unit: item.unit !== undefined ? item.unit : dbItem.unit,
                  estimated_unit_price:
                    item.estimated_unit_price !== undefined
                      ? item.estimated_unit_price
                        ? new Prisma.Decimal(item.estimated_unit_price)
                        : null
                      : dbItem.estimated_unit_price,
                },
              });
            }
          } else {
            // Create new
            await tx.rfq_items.create({
              data: {
                rfq_id: rfqId,
                item_name: item.item_name || "",
                description: item.description || null,
                quantity: new Prisma.Decimal(item.quantity || 1),
                unit: item.unit || "NOS",
                estimated_unit_price: item.estimated_unit_price
                  ? new Prisma.Decimal(item.estimated_unit_price)
                  : null,
              },
            });
          }
        }
      }

      // Fetch items again for snapshot
      const finalItems = await tx.rfq_items.findMany({
        where: { rfq_id: rfqId, deleted_at: null },
      });

      // Recalculate total estimated amount
      let totalEstimatedAmount = 0;
      for (const item of finalItems) {
        if (item.estimated_unit_price) {
          totalEstimatedAmount += Number(item.quantity) * Number(item.estimated_unit_price);
        }
      }

      const finalRfq = await tx.rfqs.update({
        where: { id: rfqId },
        data: { total_estimated_amount: new Prisma.Decimal(totalEstimatedAmount) },
        include: { rfq_items: { where: { deleted_at: null } } },
      });

      // 4. Save revision version
      const snapshot = {
        rfq: finalRfq,
        items: finalItems,
      };
      await tx.rfq_revisions.create({
        data: {
          rfq_id: rfqId,
          version_no: nextVersion,
          snapshot: snapshot as any,
          created_by: actorId,
        },
      });

      // 5. Write Audit Log
      await AuditService.record(tx, {
        actorId,
        organizationId,
        entityType: "rfqs",
        entityId: rfqId,
        action: "RFQ_UPDATED",
        oldValue: { title: rfq.title, total_estimated_amount: rfq.total_estimated_amount },
        newValue: { title: finalRfq.title, total_estimated_amount: totalEstimatedAmount },
      });

      return finalRfq;
    });
  }

  static async patchRfqStatus(actorId: string, organizationId: string, rfqId: string, status: rfq_status) {
    const rfq = await prisma.rfqs.findFirst({
      where: { id: rfqId, organization_id: organizationId, deleted_at: null },
    });

    if (!rfq) {
      throw new NotFoundError("RFQ not found");
    }

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.rfqs.update({
        where: { id: rfqId },
        data: { status },
      });

      await AuditService.record(tx, {
        actorId,
        organizationId,
        entityType: "rfqs",
        entityId: rfqId,
        action: "RFQ_STATUS_PATCHED",
        oldValue: { status: rfq.status },
        newValue: { status },
      });

      return updated;
    });
  }

  static async inviteVendors(actorId: string, organizationId: string, rfqId: string, vendorIds: string[]) {
    const rfq = await prisma.rfqs.findFirst({
      where: { id: rfqId, organization_id: organizationId, deleted_at: null },
    });

    if (!rfq) {
      throw new NotFoundError("RFQ not found");
    }

    if (rfq.status !== "draft" && rfq.status !== "published") {
      throw new BadRequestError("Can only invite vendors to draft or published RFQs");
    }

    return await prisma.$transaction(async (tx) => {
      const invited: string[] = [];

      for (const vendorId of vendorIds) {
        // Verify vendor exists
        const vendor = await tx.vendors.findFirst({
          where: { id: vendorId, organization_id: organizationId, deleted_at: null },
        });

        if (!vendor) {
          throw new NotFoundError(`Vendor ${vendorId} not found`);
        }

        // Upsert invitation entry (in case they were deleted or exist)
        await tx.rfq_vendors.upsert({
          where: { rfq_id_vendor_id: { rfq_id: rfqId, vendor_id: vendorId } },
          update: { deleted_at: null },
          create: { rfq_id: rfqId, vendor_id: vendorId, invited_at: new Date() },
        });

        invited.push(vendor.company_name);
      }

      await AuditService.record(tx, {
        actorId,
        organizationId,
        entityType: "rfqs",
        entityId: rfqId,
        action: "RFQ_VENDORS_INVITED",
        newValue: { vendor_ids: vendorIds, companies: invited },
      });

      return { message: `Successfully invited ${vendorIds.length} vendors to the RFQ` };
    });
  }

  static async getInvitedVendors(organizationId: string | null, rfqId: string) {
    const invites = await prisma.rfq_vendors.findMany({
      where: { rfq_id: rfqId, deleted_at: null },
      include: {
        vendors: {
          select: { id: true, company_name: true, contact_person: true, email: true, phone: true },
        },
      },
    });

    return invites.map((i) => i.vendors);
  }
}
