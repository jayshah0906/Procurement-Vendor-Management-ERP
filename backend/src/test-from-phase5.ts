import "dotenv/config";
import { prisma, disconnectDB } from "./utils/prisma";
import { quotation_status } from "./generated/prisma/client";

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}/api/v1`;

function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function cleanupAndPrepare(quotationId: string, rfqId: string | null) {
  console.log("\n🧹 Cleaning up old downstream data for this quotation to make the test repeatable...");

  // Find Purchase Orders
  const pos = await prisma.purchase_orders.findMany({
    where: { quotation_id: quotationId }
  });
  const poIds = pos.map(p => p.id);

  if (poIds.length > 0) {
    console.log(`- Deleting items/receipts/invoices/comments/attachments/logs for POs: ${poIds.join(", ")}`);
    // Delete comments
    await prisma.comments.deleteMany({
      where: {
        entity_type: "purchase_orders",
        entity_id: { in: poIds }
      }
    });

    // Delete attachments
    await prisma.attachments.deleteMany({
      where: {
        entity_type: "purchase_orders",
        entity_id: { in: poIds }
      }
    });

    // Delete Invoices
    await prisma.invoices.deleteMany({
      where: { purchase_order_id: { in: poIds } }
    });

    // Delete PO items
    await prisma.purchase_order_items.deleteMany({
      where: { purchase_order_id: { in: poIds } }
    });

    // Delete POs
    await prisma.purchase_orders.deleteMany({
      where: { id: { in: poIds } }
    });
  }

  // Find approval workflows
  const workflows = await prisma.approval_workflows.findMany({
    where: { entity_type: "quotation", entity_id: quotationId }
  });
  const wfIds = workflows.map(w => w.id);

  if (wfIds.length > 0) {
    console.log(`- Deleting approval steps/workflows: ${wfIds.join(", ")}`);
    await prisma.approval_steps.deleteMany({
      where: { workflow_id: { in: wfIds } }
    });
    await prisma.approval_workflows.deleteMany({
      where: { id: { in: wfIds } }
    });
  }

  // Reset Quotation status to submitted
  await prisma.quotations.update({
    where: { id: quotationId },
    data: { status: quotation_status.submitted }
  });

  // Reset RFQ status
  if (rfqId) {
    await prisma.rfqs.update({
      where: { id: rfqId },
      data: { status: "published" }
    });
  }

  console.log("✅ Cleanup complete! Database is now ready for a fresh Phase 5+ run.");
}

async function runTests() {
  console.log("=========================================================");
  console.log("🧪 Starting Automated Test Suite: Phase 5 to Phase 8");
  console.log("=========================================================");

  try {
    // 0. Verify server is running
    console.log(`\n🔍 Verifying server is running on http://localhost:${PORT}...`);
    const healthRes = await fetch(`http://localhost:${PORT}/health`);
    const healthJson = await healthRes.json() as any;
    assert(healthJson.success === true, "Health check failed. Make sure your server is running using `npm start`!");
    console.log("✅ Server is online and healthy!");

    // 1. Find the latest Quotation in the database
    console.log("\n🔍 Fetching latest quotation from database...");
    const latestQuotation = await prisma.quotations.findFirst({
      orderBy: { created_at: "desc" },
      include: {
        quotation_items: true,
        rfqs: true
      }
    });

    if (!latestQuotation) {
      console.log("❌ No quotations found in the database!");
      console.log("Please run Phase 4 first (submit a quotation via Postman or run the full test suite).");
      process.exit(1);
    }

    console.log(`✅ Found quotation! ID: ${latestQuotation.id}, Status: ${latestQuotation.status}, RFQ ID: ${latestQuotation.rfq_id}`);

    // Prepare database state (deleting existing workflows, POs, receipts, invoices for this quotation)
    await cleanupAndPrepare(latestQuotation.id, latestQuotation.rfq_id);

    // 2. Login as Procurement Manager (admin@company.com)
    console.log("\n🔑 Logging in as Procurement Manager (admin@company.com)...");
    const managerLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@company.com", password: "password123" })
    });
    const managerLoginJson = await managerLoginRes.json() as any;
    assert(managerLoginJson.success === true, "Manager login failed");
    const managerToken = managerLoginJson.data.token;
    console.log("✅ Manager logged in successfully!");

    const managerFetch = async (url: string, options: any = {}) => {
      return fetch(`${BASE_URL}${url}`, {
        ...options,
        headers: {
          ...options.headers,
          "Content-Type": "application/json",
          Authorization: `Bearer ${managerToken}`
        }
      });
    };

    // 3. Initiate Approval Workflow (Phase 5)
    console.log("\n🚀 [PHASE 5] Initiating Quotation Approval Workflow...");
    const approverRole = await prisma.roles.findFirst({ where: { name: "Approver" } });
    if (!approverRole) {
      throw new Error("Approver role not found in database");
    }

    const dbApprovers = await prisma.users.findMany({
      where: { role_id: approverRole.id },
      orderBy: { email: "asc" }
    });
    assert(dbApprovers.length >= 2, "At least 2 approvers are required in the database");

    const initApprovalRes = await managerFetch("/approvals/initiate", {
      method: "POST",
      body: JSON.stringify({
        entity_type: "quotation",
        entity_id: latestQuotation.id,
        approvers: [
          { approver_id: dbApprovers[0].id, level_no: 1 },
          { approver_id: dbApprovers[1].id, level_no: 2 }
        ]
      })
    });
    const initApprovalJson = await initApprovalRes.json() as any;
    assert(initApprovalJson.success === true, "Quotation Approval Workflow initiation failed");
    
    const workflowId = initApprovalJson.data.workflow.id;
    const step1Id = initApprovalJson.data.steps.find((s: any) => s.level_no === 1).id;
    const step2Id = initApprovalJson.data.steps.find((s: any) => s.level_no === 2).id;
    console.log(`✅ Workflow initiated successfully! Workflow ID: ${workflowId}`);

    // 4. Approve Step 1 (Approver 1)
    console.log(`\n🔑 Logging in as Approver 1 (${dbApprovers[0].email})...`);
    const app1LoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: dbApprovers[0].email, password: "password123" })
    });
    const app1LoginJson = await app1LoginRes.json() as any;
    assert(app1LoginJson.success === true, "Approver 1 login failed");
    const app1Token = app1LoginJson.data.token;

    console.log("✍️ Approving Level 1 step...");
    const step1Res = await fetch(`${BASE_URL}/approvals/${workflowId}/steps/${step1Id}/action`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${app1Token}`
      },
      body: JSON.stringify({ action: "approve", remarks: "All rates look within standards. Approved at L1." })
    });
    const step1Json = await step1Res.json() as any;
    assert(step1Json.success === true, "Level 1 approval failed");
    console.log(`✅ Level 1 approved successfully! Current workflow level is now: ${step1Json.data.current_level}`);

    // 5. Approve Step 2 (Approver 2)
    console.log(`\n🔑 Logging in as Approver 2 (${dbApprovers[1].email})...`);
    const app2LoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: dbApprovers[1].email, password: "password123" })
    });
    const app2LoginJson = await app2LoginRes.json() as any;
    assert(app2LoginJson.success === true, "Approver 2 login failed");
    const app2Token = app2LoginJson.data.token;

    console.log("✍️ Approving Level 2 step...");
    const step2Res = await fetch(`${BASE_URL}/approvals/${workflowId}/steps/${step2Id}/action`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${app2Token}`
      },
      body: JSON.stringify({ action: "approve", remarks: "Final approval granted. Ready for PO." })
    });
    const step2Json = await step2Res.json() as any;
    assert(step2Json.success === true, "Level 2 approval failed");
    assert(step2Json.data.workflow_status === "approved", "Workflow status should be 'approved'");
    console.log("✅ Level 2 approved successfully! Entire quotation workflow fully approved.");

    // Verify Quotation and RFQ status in DB
    const verifiedQuotation = await prisma.quotations.findUnique({ where: { id: latestQuotation.id } });
    assert(verifiedQuotation?.status === "selected", "Quotation status should be 'selected'");
    console.log("✅ Verified: Quotation status updated to 'selected'!");

    // 6. Generate Purchase Order (Phase 6)
    console.log("\n📦 [PHASE 6] Generating Purchase Order (as Manager)...");
    const generatePoRes = await managerFetch("/purchase-orders", {
      method: "POST",
      body: JSON.stringify({
        quotation_id: latestQuotation.id,
        delivery_date: "2026-08-30",
        shipping_address: "Tech Hub Office, Block A",
        billing_address: "Finance Dept, Block B",
        terms: "Net 30 days payout"
      })
    });
    const generatePoJson = await generatePoRes.json() as any;
    assert(generatePoJson.success === true, "PO generation failed");
    const poId = generatePoJson.data.id;
    const poItemId = generatePoJson.data.items[0].id;
    console.log(`✅ PO generated successfully! PO ID: ${poId}, PO Number: ${generatePoJson.data.po_number}`);

    // 7. Login as Vendor and Accept PO
    console.log(`\n🔍 Finding Vendor User for vendor_id: ${latestQuotation.vendor_id}...`);
    if (!latestQuotation.vendor_id) {
      throw new Error("Quotation is missing a vendor_id");
    }
    const vendorUser = await prisma.users.findFirst({
      where: { vendor_id: latestQuotation.vendor_id }
    });
    if (!vendorUser) {
      throw new Error(`No user found for Vendor ID: ${latestQuotation.vendor_id}`);
    }
    
    console.log(`🔑 Logging in as Vendor User (${vendorUser.email})...`);
    const vendorLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: vendorUser.email, password: "password123" })
    });
    const vendorLoginJson = await vendorLoginRes.json() as any;
    assert(vendorLoginJson.success === true, "Vendor user login failed");
    const vendorToken = vendorLoginJson.data.token;
    console.log("✅ Vendor logged in successfully!");

    const vendorFetch = async (url: string, options: any = {}) => {
      return fetch(`${BASE_URL}${url}`, {
        ...options,
        headers: {
          ...options.headers,
          "Content-Type": "application/json",
          Authorization: `Bearer ${vendorToken}`
        }
      });
    };

    console.log("✍️ Accepting PO (as Vendor)...");
    const acceptPoRes = await vendorFetch(`/purchase-orders/${poId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "accepted" })
    });
    const acceptPoJson = await acceptPoRes.json() as any;
    assert(acceptPoJson.success === true, "PO acceptance failed");
    console.log("✅ Purchase Order accepted by Vendor!");

    // 8. Submit Goods Receipt (Manager)
    console.log("\n🚚 Submitting Goods Receipt (as Manager)...");
    const receivedQty = Number(latestQuotation.quotation_items[0].quantity);
    const receiptRes = await managerFetch(`/purchase-orders/${poId}/receipts`, {
      method: "POST",
      body: JSON.stringify({
        items: [{ item_id: poItemId, received_quantity: receivedQty }]
      })
    });
    const receiptJson = await receiptRes.json() as any;
    assert(receiptJson.success === true, "Goods receipt submission failed");
    console.log(`✅ Goods Receipt submitted successfully! Received all ${receivedQty} units.`);

    // 9. Submit Invoice (Phase 7)
    console.log("\n📄 [PHASE 7] Submitting Invoice (as Vendor)...");
    const createInvoiceRes = await vendorFetch("/invoices", {
      method: "POST",
      body: JSON.stringify({
        purchase_order_id: poId,
        invoice_date: new Date().toISOString().split("T")[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        subtotal: Number(latestQuotation.subtotal),
        cgst: 0,
        sgst: Number(latestQuotation.tax_amount),
        igst: 0,
        grand_total: Number(latestQuotation.grand_total)
      })
    });
    const createInvoiceJson = await createInvoiceRes.json() as any;
    assert(createInvoiceJson.success === true, "Invoice submission failed");
    const invoiceId = createInvoiceJson.data.id;
    console.log(`✅ Invoice submitted successfully! Invoice ID: ${invoiceId}, Invoice Number: ${createInvoiceJson.data.invoice_number}`);

    // 10. Mark Invoice as Paid (Manager)
    console.log("\n💳 Marking Invoice as Paid (as Manager)...");
    const payRes = await managerFetch(`/invoices/${invoiceId}/mark-paid`, {
      method: "POST",
      body: JSON.stringify({ paid_at: new Date().toISOString() })
    });
    const payJson = await payRes.json() as any;
    assert(payJson.success === true, "Marking invoice as paid failed");
    console.log("✅ Invoice marked as Paid successfully!");

    // 11. Collaboration, Audit & Analytics (Phase 8)
    console.log("\n💬 [PHASE 8] Adding Comments & Testing Collaboration...");
    const commentRes = await managerFetch("/comments", {
      method: "POST",
      body: JSON.stringify({
        entity_type: "purchase_orders",
        entity_id: poId,
        comment: "Test comment: All deliverables verified and payment processed."
      })
    });
    const commentJson = await commentRes.json() as any;
    assert(commentJson.success === true, "Comment creation failed");
    console.log("✅ Audit-friendly comment added successfully!");

    // Verify Audit Timeline
    console.log("\n🕒 Fetching Audit Timeline for the PO...");
    const auditRes = await managerFetch(`/audit-logs/purchase_orders/${poId}`);
    const auditJson = await auditRes.json() as any;
    assert(auditJson.success === true, "Audit timeline fetch failed");
    console.log("✅ Audit events retrieved. Timeline:");
    auditJson.data.forEach((evt: any) => {
      console.log(`  - [${evt.timestamp}] ${evt.actor}: ${evt.action}`);
    });

    // Check Dashboard Summary
    console.log("\n📊 Fetching Dashboard Summary...");
    const dashRes = await managerFetch("/dashboard/summary");
    const dashJson = await dashRes.json() as any;
    assert(dashJson.success === true, "Dashboard fetch failed");
    console.log("✅ Dashboard data retrieved successfully!");
    console.log(`  - Total PO Amount (Selected): ${dashJson.data.totalPoAmount || 0}`);
    console.log(`  - Completed POs: ${dashJson.data.completedPosCount || 0}`);

    // Check Vendor Performance Analytics
    console.log("\n📈 Fetching Vendor Performance Analytics...");
    const performanceRes = await managerFetch("/analytics/vendor-performance");
    const performanceJson = await performanceRes.json() as any;
    assert(performanceJson.success === true, "Vendor performance analytics fetch failed");
    console.log("✅ Vendor Performance Analytics retrieved successfully!");
    console.log(JSON.stringify(performanceJson.data, null, 2));

    console.log("\n=========================================================");
    console.log("🎉 ALL INTEGRATION TESTS FOR PHASES 5-8 PASSED SUCCESSFULLY! 🎉");
    console.log("=========================================================");

  } catch (error) {
    console.error("\n❌ TEST FAILED:", error);
    process.exit(1);
  } finally {
    console.log("\n🔌 Disconnecting from Database...");
    await disconnectDB();
    console.log("👋 Done!");
    process.exit(0);
  }
}

runTests();
