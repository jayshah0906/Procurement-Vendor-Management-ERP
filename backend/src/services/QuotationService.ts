import { prisma } from "../utils/prisma";
import { NotFoundError, BadRequestError, ForbiddenError } from "../utils/errors";
import { AuditService } from "./AuditService";
import { quotation_status, Prisma } from "../generated/prisma/client";

export class QuotationService {
  static async createQuotation(
    actorId: string,
    organizationId: string,
    vendorId: string | null,
    data: {
      rfq_id: string;
      items: Array<{
        rfq_item_id: string;
        item_name: string;
        quantity: number;
        unit_price: number;
        delivery_days?: number;
      }>;
      notes?: string;
      valid_until?: string;
    }
  ) {
    if (!vendorId) {
      throw new ForbiddenError("Only vendor users can submit quotations");
    }

    // 1. Verify RFQ exists and is open
    const rfq = await prisma.rfqs.findFirst({
      where: { id: data.rfq_id, organization_id: organizationId, deleted_at: null },
    });
    if (!rfq) {
      throw new NotFoundError("RFQ not found");
    }

    if (rfq.status !== "published" && rfq.status !== "quotation_open") {
      throw new BadRequestError("RFQ is not open for bidding");
    }

    if (new Date() > new Date(rfq.deadline)) {
      throw new BadRequestError("RFQ deadline has passed");
    }

    // 2. Verify vendor is invited
    const invite = await prisma.rfq_vendors.findUnique({
      where: { rfq_id_vendor_id: { rfq_id: data.rfq_id, vendor_id: vendorId } },
    });
    if (!invite || invite.deleted_at !== null) {
      throw new ForbiddenError("You have not been invited to submit a quotation for this RFQ");
    }

    return await prisma.$transaction(async (tx) => {
      // 3. Fetch tax settings
      const settings = await tx.organization_settings.findUnique({
        where: { organization_id: organizationId },
      });
      const taxRate = settings?.tax_percentage ? Number(settings.tax_percentage) / 100 : 0.18;

      // 4. Calculate pricing
      let subtotal = 0;
      const itemsData = data.items.map((item) => {
        const totalPrice = item.quantity * item.unit_price;
        subtotal += totalPrice;
        return {
          rfq_item_id: item.rfq_item_id,
          item_name: item.item_name,
          quantity: new Prisma.Decimal(item.quantity),
          unit_price: new Prisma.Decimal(item.unit_price),
          total_price: new Prisma.Decimal(totalPrice),
          delivery_days: item.delivery_days || null,
        };
      });

      const taxAmount = subtotal * taxRate;
      const grandTotal = subtotal + taxAmount;

      // 5. Ensure "QUO" sequence is initialized for this organization
      await tx.document_sequences.upsert({
        where: {
          organization_id_document_type: {
            organization_id: organizationId,
            document_type: "QUO",
          },
        },
        update: {},
        create: {
          organization_id: organizationId,
          document_type: "QUO",
          prefix: "QUO",
          next_value: 1000,
        },
      });

      // 6. Generate document number
      const seqResult = await tx.$queryRawUnsafe<any[]>(
        `SELECT generate_document_number($1::uuid, $2::varchar) AS doc_number`,
        organizationId,
        "QUO"
      );
      const quotationNumber = seqResult[0].doc_number;

      // 7. Create Quotation Header
      const quotation = await tx.quotations.create({
        data: {
          organization_id: organizationId,
          quotation_number: quotationNumber,
          rfq_id: data.rfq_id,
          vendor_id: vendorId,
          subtotal: new Prisma.Decimal(subtotal),
          tax_amount: new Prisma.Decimal(taxAmount),
          grand_total: new Prisma.Decimal(grandTotal),
          notes: data.notes || null,
          valid_until: data.valid_until ? new Date(data.valid_until) : null,
          status: "submitted", // submitted by default, or draft if preferred. Spec POST /quotations has status = submitted
          submitted_at: new Date(),
          created_by: actorId,
        },
      });

      // 8. Create Quotation Items
      const createdItems = await Promise.all(
        itemsData.map((item) =>
          tx.quotation_items.create({
            data: {
              quotation_id: quotation.id,
              ...item,
            },
          })
        )
      );

      // 9. Update RFQ vendor respond state
      await tx.rfq_vendors.update({
        where: { rfq_id_vendor_id: { rfq_id: data.rfq_id, vendor_id: vendorId } },
        data: { responded_at: new Date() },
      });

      // 10. Audit Log
      await AuditService.record(tx, {
        actorId,
        organizationId,
        entityType: "quotations",
        entityId: quotation.id,
        action: "QUOTATION_SUBMITTED",
        newValue: { quotation_number: quotation.quotation_number, grand_total: grandTotal },
      });

      return {
        ...quotation,
        items: createdItems,
      };
    });
  }

  static async getQuotations(
    organizationId: string | null,
    filters: {
      rfq_id?: string;
      vendor_id?: string;
      status?: quotation_status;
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

    if (filters.rfq_id) {
      where.rfq_id = filters.rfq_id;
    }
    if (filters.status) {
      where.status = filters.status;
    }

    // Vendor users can only view their own quotations
    if (userVendorId) {
      where.vendor_id = userVendorId;
    } else if (filters.vendor_id) {
      where.vendor_id = filters.vendor_id;
    }

    const [quotations, total] = await Promise.all([
      prisma.quotations.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          vendors: {
            select: { company_name: true },
          },
          rfqs: {
            select: { rfq_number: true, title: true },
          },
          purchase_orders: {
            select: { id: true, po_number: true, status: true },
          },
        },
      }),
      prisma.quotations.count({ where }),
    ]);

    return {
      quotations: quotations.map((q) => ({
        id: q.id,
        quotation_number: q.quotation_number,
        rfq_id: q.rfq_id,
        rfq_number: q.rfqs?.rfq_number || null,
        rfq_title: q.rfqs?.title || null,
        vendor_id: q.vendor_id,
        vendor_name: q.vendors?.company_name || null,
        vendor: q.vendors ? { company_name: q.vendors.company_name } : null,
        subtotal: q.subtotal,
        tax_amount: q.tax_amount,
        grand_total: q.grand_total,
        delivery_days: q.delivery_days,
        valid_until: q.valid_until,
        status: q.status,
        submitted_at: q.submitted_at,
        created_at: q.created_at,
        purchase_orders: q.purchase_orders || [],
      })),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  static async getQuotationById(organizationId: string | null, quotationId: string, userVendorId: string | null) {
    const quotation = await prisma.quotations.findFirst({
      where: { id: quotationId, organization_id: organizationId, deleted_at: null },
      include: {
        quotation_items: {
          where: { deleted_at: null },
        },
        vendors: {
          select: { company_name: true },
        },
        rfqs: {
          select: { rfq_number: true, title: true, status: true },
        },
      },
    });

    if (!quotation) {
      throw new NotFoundError("Quotation not found");
    }

    // Vendor scoping check
    if (userVendorId && quotation.vendor_id !== userVendorId) {
      throw new ForbiddenError("Access denied: You can only view your own quotations");
    }

    return {
      id: quotation.id,
      quotation_number: quotation.quotation_number,
      rfq_id: quotation.rfq_id,
      rfq_number: quotation.rfqs?.rfq_number || null,
      rfq_title: quotation.rfqs?.title || null,
      vendor_id: quotation.vendor_id,
      vendor_name: quotation.vendors?.company_name || null,
      subtotal: quotation.subtotal,
      tax_amount: quotation.tax_amount,
      grand_total: quotation.grand_total,
      delivery_days: quotation.delivery_days,
      valid_until: quotation.valid_until,
      notes: quotation.notes,
      status: quotation.status,
      submitted_at: quotation.submitted_at,
      created_at: quotation.created_at,
      items: quotation.quotation_items,
    };
  }

  static async updateQuotation(
    actorId: string,
    organizationId: string,
    userVendorId: string | null,
    quotationId: string,
    data: {
      items?: Array<{
        id?: string;
        rfq_item_id: string;
        item_name: string;
        quantity: number;
        unit_price: number;
        delivery_days?: number;
      }>;
      notes?: string;
      valid_until?: string;
    }
  ) {
    const quotation = await prisma.quotations.findFirst({
      where: { id: quotationId, organization_id: organizationId, deleted_at: null },
      include: { quotation_items: { where: { deleted_at: null } } },
    });

    if (!quotation) {
      throw new NotFoundError("Quotation not found");
    }

    // Vendor scoping check
    if (userVendorId && quotation.vendor_id !== userVendorId) {
      throw new ForbiddenError("Access denied: You can only modify your own quotations");
    }

    // Can only edit before under_review/selected/approved
    if (quotation.status !== "draft" && quotation.status !== "submitted") {
      throw new BadRequestError("Quotation can only be updated while in draft or submitted status");
    }

    return await prisma.$transaction(async (tx) => {
      // Calculate version number
      const revisions = await tx.quotation_revisions.findMany({
        where: { quotation_id: quotationId },
        orderBy: { revision_no: "desc" },
        take: 1,
      });
      const nextVersion = revisions.length > 0 ? revisions[0].revision_no + 1 : 2;

      // Update header
      const updated = await tx.quotations.update({
        where: { id: quotationId },
        data: {
          notes: data.notes !== undefined ? data.notes : quotation.notes,
          valid_until: data.valid_until !== undefined ? new Date(data.valid_until) : quotation.valid_until,
        },
      });

      if (data.items) {
        // Soft delete old items not present in update
        const updateIds = data.items.map((i) => i.id).filter(Boolean) as string[];
        await tx.quotation_items.updateMany({
          where: { quotation_id: quotationId, id: { notIn: updateIds } },
          data: { deleted_at: new Date() },
        });

        // Update/insert items
        for (const item of data.items) {
          const totalPrice = item.quantity * item.unit_price;
          if (item.id) {
            await tx.quotation_items.update({
              where: { id: item.id },
              data: {
                item_name: item.item_name,
                quantity: new Prisma.Decimal(item.quantity),
                unit_price: new Prisma.Decimal(item.unit_price),
                total_price: new Prisma.Decimal(totalPrice),
                delivery_days: item.delivery_days || null,
              },
            });
          } else {
            await tx.quotation_items.create({
              data: {
                quotation_id: quotationId,
                rfq_item_id: item.rfq_item_id,
                item_name: item.item_name,
                quantity: new Prisma.Decimal(item.quantity),
                unit_price: new Prisma.Decimal(item.unit_price),
                total_price: new Prisma.Decimal(totalPrice),
                delivery_days: item.delivery_days || null,
              },
            });
          }
        }
      }

      // Fetch fresh items to calculate totals
      const finalItems = await tx.quotation_items.findMany({
        where: { quotation_id: quotationId, deleted_at: null },
      });

      let subtotal = 0;
      for (const item of finalItems) {
        subtotal += Number(item.total_price);
      }

      const settings = await tx.organization_settings.findUnique({
        where: { organization_id: organizationId },
      });
      const taxRate = settings?.tax_percentage ? Number(settings.tax_percentage) / 100 : 0.18;
      const taxAmount = subtotal * taxRate;
      const grandTotal = subtotal + taxAmount;

      const finalQuo = await tx.quotations.update({
        where: { id: quotationId },
        data: {
          subtotal: new Prisma.Decimal(subtotal),
          tax_amount: new Prisma.Decimal(taxAmount),
          grand_total: new Prisma.Decimal(grandTotal),
        },
        include: { quotation_items: { where: { deleted_at: null } } },
      });

      // Revision history snapshot
      const snapshot = {
        quotation: finalQuo,
        items: finalItems,
      };
      await tx.quotation_revisions.create({
        data: {
          quotation_id: quotationId,
          revision_no: nextVersion,
          snapshot: snapshot as any,
          created_by: actorId,
        },
      });

      // Audit Log
      await AuditService.record(tx, {
        actorId,
        organizationId,
        entityType: "quotations",
        entityId: quotationId,
        action: "QUOTATION_UPDATED",
        oldValue: { grand_total: quotation.grand_total },
        newValue: { grand_total: grandTotal },
      });

      return finalQuo;
    });
  }

  static async patchQuotationStatus(
    actorId: string,
    organizationId: string,
    userVendorId: string | null,
    quotationId: string,
    status: quotation_status
  ) {
    const quotation = await prisma.quotations.findFirst({
      where: { id: quotationId, organization_id: organizationId, deleted_at: null },
    });

    if (!quotation) {
      throw new NotFoundError("Quotation not found");
    }

    if (userVendorId && quotation.vendor_id !== userVendorId) {
      throw new ForbiddenError("Access denied: You can only update your own quotations");
    }

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.quotations.update({
        where: { id: quotationId },
        data: { status },
      });

      await AuditService.record(tx, {
        actorId,
        organizationId,
        entityType: "quotations",
        entityId: quotationId,
        action: "QUOTATION_STATUS_PATCHED",
        oldValue: { status: quotation.status },
        newValue: { status },
      });

      return updated;
    });
  }
}
