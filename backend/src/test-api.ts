process.env.NODE_ENV = "test";
import app from "./app";
import { Server } from "http";
import { prisma } from "./utils/prisma";

const PORT = 5001;
const BASE_URL = `http://localhost:${PORT}/api/v1`;

// Start test server
let server: Server;

async function runTests() {
  console.log("=================================================");
  console.log("🧪 Starting End-to-End API Integration Tests...");
  console.log("=================================================");

  server = app.listen(PORT, async () => {
    try {
      // 1. Health Check
      console.log("\n1. Running Health Check...");
      const healthRes = await fetch(`http://localhost:${PORT}/health`);
      const healthJson = await healthRes.json() as any;
      assert(healthJson.success === true, "Health check failed");
      console.log("✅ Health check passed!");

      // 2. Login as Manager (Amit Sharma)
      console.log("\n2. Logging in as Procurement Manager (admin@company.com)...");
      const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@company.com", password: "password123" }),
      });
      const loginJson = await loginRes.json() as any;
      assert(loginJson.success === true, "Manager login failed");
      const managerToken = loginJson.data.token;
      const orgId = loginJson.data.user.organization_id;
      console.log(`✅ Login successful! Token received. Org ID: ${orgId}`);

      // Helper for authenticated fetch
      const managerFetch = async (url: string, options: any = {}) => {
        return fetch(`${BASE_URL}${url}`, {
          ...options,
          headers: {
            ...options.headers,
            "Content-Type": "application/json",
            Authorization: `Bearer ${managerToken}`,
          },
        });
      };

      // 3. Create a Vendor
      console.log("\n3. Creating a new vendor (ABC Traders)...");
      const categoryRes = await managerFetch("/categories");
      const categoriesJson = await categoryRes.json() as any;
      let catId: string;
      if (categoriesJson.data && categoriesJson.data.length > 0) {
        catId = categoriesJson.data[0].id;
      } else {
        // Create category
        const createCatRes = await managerFetch("/categories", {
          method: "POST",
          body: JSON.stringify({ name: "Industrial Goods", description: "Hardware & Tools" }),
        });
        const createCatJson = await createCatRes.json() as any;
        catId = createCatJson.data.id;
      }

      const createVendorRes = await managerFetch("/vendors", {
        method: "POST",
        body: JSON.stringify({
          company_name: "ABC Traders",
          gst_number: "29AAACC1234B1Z5",
          contact_person: "Suresh Gowda",
          email: "suresh@abctraders.com",
          phone: "9887766554",
          address: "123 Main St, Bangalore",
          category_id: catId,
        }),
      });
      const createVendorJson = await createVendorRes.json() as any;
      assert(createVendorJson.success === true, "Vendor creation failed");
      const vendorId = createVendorJson.data.id;
      console.log(`✅ Vendor created successfully. Vendor ID: ${vendorId}`);

      // 4. Create a Vendor Portal User for the vendor
      console.log("\n4. Creating a Vendor Portal User for the vendor...");
      const vendorRoleRes = await managerFetch("/roles");
      const rolesJson = await vendorRoleRes.json() as any;
      const vendorRole = rolesJson.data.find((r: any) => r.name === "Vendor");
      assert(vendorRole !== undefined, "Vendor role not found");

      const vendorEmail = `priya-${Date.now()}@vendor.com`;

      const createVendorUserRes = await managerFetch("/users", {
        method: "POST",
        body: JSON.stringify({
          first_name: "Priya",
          last_name: "Verma",
          email: vendorEmail,
          role_id: vendorRole.id,
          vendor_id: vendorId,
          phone: "9123456789",
        }),
      });
      const createVendorUserJson = await createVendorUserRes.json() as any;
      assert(createVendorUserJson.success === true, "Vendor user creation failed");
      console.log(`✅ Vendor user '${vendorEmail}' created successfully.`);

      // 5. Create an RFQ
      console.log("\n5. Creating a new RFQ...");
      const createRfqRes = await managerFetch("/rfqs", {
        method: "POST",
        body: JSON.stringify({
          title: "Procurement of Office Laptops",
          description: "Required 50 units of developer laptops",
          category_id: catId,
          deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
          items: [
            {
              item_name: "Developer Laptop v1",
              description: "16GB RAM, 512GB SSD",
              quantity: 50,
              unit: "NOS",
              estimated_unit_price: 60000,
            },
          ],
        }),
      });
      const createRfqJson = await createRfqRes.json() as any;
      assert(createRfqJson.success === true, "RFQ creation failed");
      const rfqId = createRfqJson.data.id;
      console.log(`✅ RFQ created successfully. RFQ ID: ${rfqId}, RFQ Number: ${createRfqJson.data.rfq_number}`);

      // 6. Invite Vendor
      console.log("\n6. Inviting vendor to the RFQ...");
      const inviteRes = await managerFetch(`/rfqs/${rfqId}/invite`, {
        method: "POST",
        body: JSON.stringify({ vendor_ids: [vendorId] }),
      });
      const inviteJson = await inviteRes.json() as any;
      assert(inviteJson.success === true, "Vendor invitation failed");
      console.log("✅ Vendor invited successfully!");

      // 7. Publish RFQ
      console.log("\n7. Transitioning RFQ status to 'published'...");
      const publishRes = await managerFetch(`/rfqs/${rfqId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "published" }),
      });
      const publishJson = await publishRes.json() as any;
      assert(publishJson.success === true, "RFQ status patch failed");
      console.log("✅ RFQ status updated to published!");

      // 8. Log in as Vendor User
      console.log(`\n8. Logging in as Vendor Portal User (${vendorEmail})...`);
      const vendorLoginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: vendorEmail, password: "password123" }),
      });
      const vendorLoginJson = await vendorLoginRes.json() as any;
      assert(vendorLoginJson.success === true, "Vendor login failed");
      const vendorToken = vendorLoginJson.data.token;
      console.log("✅ Vendor login successful!");

      const vendorFetch = async (url: string, options: any = {}) => {
        return fetch(`${BASE_URL}${url}`, {
          ...options,
          headers: {
            ...options.headers,
            "Content-Type": "application/json",
            Authorization: `Bearer ${vendorToken}`,
          },
        });
      };

      // 9. Fetch RFQ details as Vendor (Scoping Check)
      console.log("\n9. Fetching RFQ details as Vendor...");
      const getRfqRes = await vendorFetch(`/rfqs/${rfqId}`);
      const getRfqJson = await getRfqRes.json() as any;
      assert(getRfqJson.success === true, "Vendor failed to fetch RFQ");
      assert(getRfqJson.data.items[0].estimated_unit_price === null, "Scoping failed: Vendor can see estimated unit price!");
      console.log("✅ RFQ details retrieved. Scoping verified (Estimated prices are null for vendors).");

      // 10. Submit a Quotation
      console.log("\n10. Submitting a Quotation as Vendor...");
      const rfqItemId = getRfqJson.data.items[0].id;
      const subtotal = 50 * 55000;
      const tax = subtotal * 0.18;
      const total = subtotal + tax;

      const submitQuotationRes = await vendorFetch("/quotations", {
        method: "POST",
        body: JSON.stringify({
          rfq_id: rfqId,
          items: [
            {
              rfq_item_id: rfqItemId,
              item_name: "Developer Laptop v1",
              quantity: 50,
              unit_price: 55000,
              delivery_days: 14,
            },
          ],
          subtotal,
          tax_amount: tax,
          grand_total: total,
          notes: "Warranty included",
        }),
      });
      const submitQuotationJson = await submitQuotationRes.json() as any;
      assert(submitQuotationJson.success === true, "Quotation submission failed");
      const quotationId = submitQuotationJson.data.id;
      console.log(`✅ Quotation submitted successfully. ID: ${quotationId}`);

      // 11. Initiate Approval Workflow (as Manager)
      console.log("\n11. Initiating Quotation Approval Workflow...");
      const approver1 = rolesJson.data.find((r: any) => r.name === "Approver");
      const dbApprovers = await prisma.users.findMany({
        where: { role_id: approver1.id },
        orderBy: { email: "asc" },
      });
      assert(dbApprovers.length >= 2, "Need at least 2 approver users in DB");

      const initApprovalRes = await managerFetch("/approvals/initiate", {
        method: "POST",
        body: JSON.stringify({
          entity_type: "quotation",
          entity_id: quotationId,
          approvers: [
            { approver_id: dbApprovers[0].id, level_no: 1 },
            { approver_id: dbApprovers[1].id, level_no: 2 },
          ],
        }),
      });
      const initApprovalJson = await initApprovalRes.json() as any;
      assert(initApprovalJson.success === true, "Approval workflow initiation failed");
      const workflowId = initApprovalJson.data.workflow.id;
      const step1Id = initApprovalJson.data.steps.find((s: any) => s.level_no === 1).id;
      const step2Id = initApprovalJson.data.steps.find((s: any) => s.level_no === 2).id;
      console.log(`✅ Approval workflow initiated. Workflow ID: ${workflowId}`);

      // 12. Approve Step 1 (Log in as Approver 1)
      console.log("\n12. Approving Level 1 step...");
      const app1LoginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "approver1@company.com", password: "password123" }),
      });
      const app1LoginJson = await app1LoginRes.json() as any;
      const app1Token = app1LoginJson.data.token;

      const step1Res = await fetch(`${BASE_URL}/approvals/${workflowId}/steps/${step1Id}/action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${app1Token}`,
        },
        body: JSON.stringify({ action: "approve", remarks: "Prices are reasonable" }),
      });
      const step1Json = await step1Res.json() as any;
      assert(step1Json.success === true, "Step 1 approval failed");
      console.log(`✅ Level 1 approved successfully. Next level: ${step1Json.data.current_level}`);

      // 13. Approve Step 2 (Log in as Approver 2)
      console.log("\n13. Approving Level 2 step...");
      const app2LoginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "approver2@company.com", password: "password123" }),
      });
      const app2LoginJson = await app2LoginRes.json() as any;
      const app2Token = app2LoginJson.data.token;

      const step2Res = await fetch(`${BASE_URL}/approvals/${workflowId}/steps/${step2Id}/action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${app2Token}`,
        },
        body: JSON.stringify({ action: "approve", remarks: "Looks fine" }),
      });
      const step2Json = await step2Res.json() as any;
      assert(step2Json.success === true, "Step 2 approval failed");
      assert(step2Json.data.workflow_status === "approved", "Workflow should be approved");
      console.log("✅ Level 2 approved successfully! Entire quotation workflow fully approved.");

      // 14. Generate Purchase Order (as Manager)
      console.log("\n14. Generating Purchase Order from selected Quotation...");
      const generatePoRes = await managerFetch("/purchase-orders", {
        method: "POST",
        body: JSON.stringify({
          quotation_id: quotationId,
          delivery_date: "2026-08-10",
          shipping_address: "Tech Hub Office, Block A",
          billing_address: "Finance Dept, Block B",
          terms: "Net 30 days payout",
        }),
      });
      const generatePoJson = await generatePoRes.json() as any;
      assert(generatePoJson.success === true, "PO generation failed");
      const poId = generatePoJson.data.id;
      const poItemId = generatePoJson.data.items[0].id;
      console.log(`✅ PO generated. PO ID: ${poId}, PO Number: ${generatePoJson.data.po_number}`);

      // 15. Accept PO (as Vendor)
      console.log("\n15. Accepting PO as Vendor...");
      const acceptPoRes = await vendorFetch(`/purchase-orders/${poId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "accepted" }),
      });
      const acceptPoJson = await acceptPoRes.json() as any;
      assert(acceptPoJson.success === true, "PO accept failed");
      console.log("✅ PO accepted by Vendor!");

      // 16. Submit Goods Receipt (as Manager)
      console.log("\n16. Submitting Goods Receipt (receiving 30 units of laptops)...");
      const receiptRes = await managerFetch(`/purchase-orders/${poId}/receipts`, {
        method: "POST",
        body: JSON.stringify({
          items: [{ item_id: poItemId, received_quantity: 30 }],
        }),
      });
      const receiptJson = await receiptRes.json() as any;
      assert(receiptJson.success === true, "Goods receipt failed");
      console.log(`✅ Goods receipt submitted. Received 30 units successfully.`);

      // 17. Submit Invoice (as Vendor)
      console.log("\n17. Submitting Invoice for the PO...");
      const createInvoiceRes = await vendorFetch("/invoices", {
        method: "POST",
        body: JSON.stringify({
          purchase_order_id: poId,
          invoice_date: "2026-07-20",
          due_date: "2026-08-19",
          subtotal: 30 * 55000,
          cgst: 0,
          sgst: (30 * 55000) * 0.18,
          igst: 0,
          grand_total: (30 * 55000) * 1.18,
        }),
      });
      const createInvoiceJson = await createInvoiceRes.json() as any;
      assert(createInvoiceJson.success === true, "Invoice creation failed");
      const invoiceId = createInvoiceJson.data.id;
      console.log(`✅ Invoice submitted. Invoice ID: ${invoiceId}, Invoice Number: ${createInvoiceJson.data.invoice_number}`);

      // 18. Mark Invoice as Paid (as Manager)
      console.log("\n18. Marking Invoice as Paid...");
      const payRes = await managerFetch(`/invoices/${invoiceId}/mark-paid`, {
        method: "POST",
        body: JSON.stringify({ paid_at: new Date().toISOString() }),
      });
      const payJson = await payRes.json() as any;
      assert(payJson.success === true, "Mark invoice paid failed");
      console.log("✅ Invoice successfully paid!");

      // 19. Retrieve Dashboard Summary
      console.log("\n19. Checking Dashboard Summary...");
      const dashRes = await managerFetch("/dashboard/summary");
      const dashJson = await dashRes.json() as any;
      assert(dashJson.success === true, "Dashboard fetch failed");
      console.log(`✅ Dashboard stats:`, dashJson.data);

      // 20. Retrieve Analytics Vendor Performance
      console.log("\n20. Checking Vendor Performance Analytics Materialized View...");
      const performanceRes = await managerFetch("/analytics/vendor-performance");
      const performanceJson = await performanceRes.json() as any;
      assert(performanceJson.success === true, "Vendor performance fetch failed");
      console.log("✅ Vendor performance metrics:", performanceJson.data);

      // 21. Retrieve Audit Logs & Timeline
      console.log("\n21. Retrieving Audit Log timeline for the PO...");
      const auditRes = await managerFetch(`/audit-logs/purchase_orders/${poId}`);
      const auditJson = await auditRes.json() as any;
      assert(auditJson.success === true, "Audit timeline fetch failed");
      console.log(`✅ Audit Timeline events for PO:`);
      auditJson.data.forEach((evt: any) => {
        console.log(`  - [${evt.timestamp}] ${evt.actor}: ${evt.action}`);
      });

      console.log("\n=================================================");
      console.log("🎉 ALL INTEGRATION TESTS COMPLETED SUCCESSFULLY! 🎉");
      console.log("=================================================");
    } catch (err) {
      console.error("\n❌ TEST FAILED:", err);
      if (server) {
        server.close(async () => {
          console.log("Closing DB connections...");
          const { disconnectDB } = require("./utils/prisma");
          await disconnectDB();
          process.exit(1);
        });
      } else {
        process.exit(1);
      }
    } finally {
      if (server) {
        server.close(async () => {
          console.log("Closing DB connections...");
          const { disconnectDB } = require("./utils/prisma");
          await disconnectDB();
          console.log("Test server stopped.");
          process.exit(0);
        });
      }
    }
  });
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

runTests();
