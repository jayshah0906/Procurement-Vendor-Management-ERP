import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, ROLES } from './routes/ProtectedRoute';

// Layouts
import { DashboardLayout } from './components/layout/DashboardLayout';

// Public Pages
import { LandingPage } from './pages/public/LandingPage';
import { LoginPage } from './pages/public/LoginPage';
import { SignupPage } from './pages/public/SignupPage';

// ERP Pages
import { DashboardPage } from './pages/erp/DashboardPage';
import { VendorsPage } from './pages/erp/VendorsPage';
import { RFQsPage } from './pages/erp/RFQsPage';
import { QuotationsPage } from './pages/erp/QuotationsPage';
import { QuotationSubmitPage } from './pages/erp/QuotationSubmitPage';
import { ComparisonPage } from './pages/erp/ComparisonPage';
import { ApprovalsPage } from './pages/erp/ApprovalsPage';
import { PurchaseOrdersPage } from './pages/erp/PurchaseOrdersPage';
import { PurchaseOrderDetailPage } from './pages/erp/PurchaseOrderDetailPage';
import { InvoicesPage } from './pages/erp/InvoicesPage';
import { ActivityLogsPage } from './pages/erp/ActivityLogsPage';
import { ReportsPage } from './pages/erp/ReportsPage';
import { NotFoundPage } from './pages/errors/NotFoundPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Protected ERP Routes */}
        <Route path="/erp" element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />

            {/* Dashboard: All authenticated users */}
            <Route path="dashboard" element={<DashboardPage />} />

            {/* Vendor Management & Purchase Orders: Procurement Manager & Officer only */}
            <Route element={<ProtectedRoute allowedRoles={[ROLES.PROCUREMENT_MANAGER, ROLES.PROCUREMENT_OFFICER]} />}>
              <Route path="vendors" element={<VendorsPage />} />
              <Route path="compare" element={<ComparisonPage />} />
              <Route path="orders" element={<PurchaseOrdersPage />} />
              <Route path="orders/:id" element={<PurchaseOrderDetailPage />} />
            </Route>

            {/* RFQs: Procurement Manager, Officer, Vendor */}
            <Route element={<ProtectedRoute allowedRoles={[ROLES.PROCUREMENT_MANAGER, ROLES.PROCUREMENT_OFFICER, ROLES.VENDOR]} />}>
              <Route path="rfqs" element={<RFQsPage />} />
            </Route>

            {/* Quotations: Procurement Manager, Officer, Vendor */}
            <Route element={<ProtectedRoute allowedRoles={[ROLES.PROCUREMENT_MANAGER, ROLES.PROCUREMENT_OFFICER, ROLES.VENDOR]} />}>
              <Route path="quotations" element={<QuotationsPage />} />
            </Route>

            {/* Submit Bid: Vendor only (or Manager for testing) */}
            <Route element={<ProtectedRoute allowedRoles={[ROLES.PROCUREMENT_MANAGER, ROLES.VENDOR]} />}>
              <Route path="quotations/submit/:rfqId" element={<QuotationSubmitPage />} />
            </Route>

            {/* Approvals: Procurement Manager, Approver */}
            <Route element={<ProtectedRoute allowedRoles={[ROLES.PROCUREMENT_MANAGER, ROLES.APPROVER]} />}>
              <Route path="approvals" element={<ApprovalsPage />} />
              <Route path="approvals/:workflowId" element={<ApprovalsPage />} />
            </Route>

            {/* Invoices: Procurement Manager, Officer, Vendor */}
            <Route element={<ProtectedRoute allowedRoles={[ROLES.PROCUREMENT_MANAGER, ROLES.PROCUREMENT_OFFICER, ROLES.VENDOR]} />}>
              <Route path="invoices" element={<InvoicesPage />} />
            </Route>

            {/* Reports & Audit Logs: Procurement Manager only */}
            <Route element={<ProtectedRoute allowedRoles={[ROLES.PROCUREMENT_MANAGER]} />}>
              <Route path="reports" element={<ReportsPage />} />
              <Route path="logs" element={<ActivityLogsPage />} />
            </Route>
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
