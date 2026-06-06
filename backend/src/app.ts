import express from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Import middlewares
import { errorHandler } from "./middleware/errorHandler";

// Import routes
import authRouter from "./routes/auth.routes";
import userRouter from "./routes/user.routes";
import roleRouter from "./routes/role.routes";
import vendorRouter from "./routes/vendor.routes";
import masterRouter from "./routes/master.routes";
import rfqRouter from "./routes/rfq.routes";
import quotationRouter from "./routes/quotation.routes";
import approvalRouter from "./routes/approval.routes";
import poRouter from "./routes/po.routes";
import invoiceRouter from "./routes/invoice.routes";
import collaborationRouter from "./routes/collaboration.routes";
import dashboardRouter from "./routes/dashboard.routes";
import analyticsRouter from "./routes/analytics.routes";
import auditRouter from "./routes/audit.routes";

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors());

// Parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Mount API Routes (Prefixed with /api/v1 as per spec)
const baseApiPrefix = "/api/v1";

app.use(baseApiPrefix, authRouter);
app.use(baseApiPrefix, userRouter);
app.use(baseApiPrefix, roleRouter);
app.use(baseApiPrefix, vendorRouter);
app.use(baseApiPrefix, masterRouter);
app.use(baseApiPrefix, rfqRouter);
app.use(baseApiPrefix, quotationRouter);
app.use(baseApiPrefix, approvalRouter);
app.use(baseApiPrefix, poRouter);
app.use(baseApiPrefix, invoiceRouter);
app.use(baseApiPrefix, collaborationRouter);
app.use(baseApiPrefix, dashboardRouter);
app.use(baseApiPrefix, analyticsRouter);
app.use(baseApiPrefix, auditRouter);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ success: true, status: "healthy", timestamp: new Date() });
});

// Global Error Handler Middleware
app.use(errorHandler);

// Start the server (only if not imported for tests)
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🚀 VendorBridge ERP Server is running on port ${PORT}`);
    console.log(`🌐 Base URL: http://localhost:${PORT}${baseApiPrefix}`);
    console.log(`===============================================`);
  });
}

export default app;
