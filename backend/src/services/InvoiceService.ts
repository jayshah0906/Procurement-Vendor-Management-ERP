import { prisma } from "../utils/prisma";
import { NotFoundError, BadRequestError, ForbiddenError } from "../utils/errors";
import { AuditService } from "./AuditService";
import { invoice_status, Prisma } from "../generated/prisma/client";

export class InvoiceService {
  static async createInvoice(
    actorId: string,
    organizationId: string,
    userVendorId: string | null,
    data: {
      purchase_order_id: string;
      invoice_date: string;
      due_date: string;
      subtotal: number;
      cgst?: number;
      sgst?: number;
      igst?: number;
      grand_total: number;
    }
  ) {
    // 1. Verify PO exists
    const po = await prisma.purchase_orders.findFirst({
      where: { id: data.purchase_order_id, organization_id: organizationId, deleted_at: null },
    });

    if (!po) {
      throw new NotFoundError("Purchase Order not found");
    }

    // If submitted by vendor user, verify they own the PO
    if (userVendorId && po.vendor_id !== userVendorId) {
      throw new ForbiddenError("You can only submit invoices for your own Purchase Orders");
    }

    return await prisma.$transaction(async (tx) => {
      // 2. Generate unique Invoice Number
      const seqResult = await tx.$queryRawUnsafe<any[]>(
        `SELECT generate_document_number($1::uuid, $2::varchar) AS doc_number`,
        organizationId,
        "INV"
      );
      const invoiceNumber = seqResult[0].doc_number;

      // 3. Create Invoice Header
      const invoice = await tx.invoices.create({
        data: {
          organization_id: organizationId,
          invoice_number: invoiceNumber,
          purchase_order_id: data.purchase_order_id,
          vendor_id: po.vendor_id,
          subtotal: new Prisma.Decimal(data.subtotal),
          cgst: new Prisma.Decimal(data.cgst || 0),
          sgst: new Prisma.Decimal(data.sgst || 0),
          igst: new Prisma.Decimal(data.igst || 0),
          grand_total: new Prisma.Decimal(data.grand_total),
          status: "pending", // pending by default
          invoice_date: new Date(data.invoice_date),
          due_date: new Date(data.due_date),
        },
      });

      // 4. Audit Log
      await AuditService.record(tx, {
        actorId,
        organizationId,
        entityType: "invoices",
        entityId: invoice.id,
        action: "INVOICE_CREATED",
        newValue: { invoice_number: invoice.invoice_number, grand_total: data.grand_total },
      });

      return invoice;
    });
  }

  static async getInvoices(
    organizationId: string | null,
    filters: {
      status?: invoice_status;
      vendor_id?: string;
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

    if (userVendorId) {
      where.vendor_id = userVendorId;
    } else if (filters.vendor_id) {
      where.vendor_id = filters.vendor_id;
    }

    const [invoices, total] = await Promise.all([
      prisma.invoices.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          vendors: {
            select: { company_name: true },
          },
          purchase_orders: {
            select: { po_number: true },
          },
        },
      }),
      prisma.invoices.count({ where }),
    ]);

    return {
      invoices: invoices.map((inv) => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        purchase_order_id: inv.purchase_order_id,
        po_number: inv.purchase_orders?.po_number || null,
        vendor_id: inv.vendor_id,
        vendor_name: inv.vendors?.company_name || null,
        subtotal: inv.subtotal,
        cgst: inv.cgst,
        sgst: inv.sgst,
        igst: inv.igst,
        grand_total: inv.grand_total,
        status: inv.status,
        invoice_date: inv.invoice_date,
        due_date: inv.due_date,
        paid_at: inv.paid_at,
        created_at: inv.created_at,
      })),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  static async getInvoiceById(organizationId: string | null, invoiceId: string, userVendorId: string | null) {
    const invoice = await prisma.invoices.findFirst({
      where: { id: invoiceId, organization_id: organizationId, deleted_at: null },
      include: {
        vendors: {
          select: { company_name: true, email: true, phone: true, address: true },
        },
        purchase_orders: {
          select: { po_number: true, status: true, total_amount: true },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundError("Invoice not found");
    }

    if (userVendorId && invoice.vendor_id !== userVendorId) {
      throw new ForbiddenError("Access denied: You can only view your own Invoices");
    }

    return {
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      purchase_order_id: invoice.purchase_order_id,
      po_number: invoice.purchase_orders?.po_number || null,
      vendor_id: invoice.vendor_id,
      vendor_name: invoice.vendors?.company_name || null,
      vendor_details: invoice.vendors,
      subtotal: invoice.subtotal,
      cgst: invoice.cgst,
      sgst: invoice.sgst,
      igst: invoice.igst,
      grand_total: invoice.grand_total,
      status: invoice.status,
      invoice_date: invoice.invoice_date,
      due_date: invoice.due_date,
      sent_at: invoice.sent_at,
      paid_at: invoice.paid_at,
      created_at: invoice.created_at,
    };
  }

  static async patchInvoiceStatus(
    actorId: string,
    organizationId: string,
    invoiceId: string,
    status: invoice_status
  ) {
    const invoice = await prisma.invoices.findFirst({
      where: { id: invoiceId, organization_id: organizationId, deleted_at: null },
    });

    if (!invoice) {
      throw new NotFoundError("Invoice not found");
    }

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.invoices.update({
        where: { id: invoiceId },
        data: {
          status,
          sent_at: status === "sent" ? new Date() : invoice.sent_at,
        },
      });

      await AuditService.record(tx, {
        actorId,
        organizationId,
        entityType: "invoices",
        entityId: invoiceId,
        action: "INVOICE_STATUS_PATCHED",
        oldValue: { status: invoice.status },
        newValue: { status },
      });

      return updated;
    });
  }

  static async markPaid(actorId: string, organizationId: string, invoiceId: string, paidAt: string) {
    const invoice = await prisma.invoices.findFirst({
      where: { id: invoiceId, organization_id: organizationId, deleted_at: null },
    });

    if (!invoice) {
      throw new NotFoundError("Invoice not found");
    }

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.invoices.update({
        where: { id: invoiceId },
        data: {
          status: "paid",
          paid_at: new Date(paidAt),
        },
      });

      await AuditService.record(tx, {
        actorId,
        organizationId,
        entityType: "invoices",
        entityId: invoiceId,
        action: "INVOICE_PAID",
        oldValue: { status: invoice.status },
        newValue: { status: "paid", paid_at: paidAt },
      });

      return updated;
    });
  }
}
