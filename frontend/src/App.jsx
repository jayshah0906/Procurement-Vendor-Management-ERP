import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './routes/ProtectedRoute';

// Layouts
import { DashboardLayout } from './components/layout/DashboardLayout';

// Public Pages
import { LandingPage } from './pages/public/LandingPage';
import { LoginPage } from './pages/public/LoginPage';

// ERP Pages
import { DashboardPage } from './pages/erp/DashboardPage';
import { VendorsPage } from './pages/erp/VendorsPage';
import { RFQsPage } from './pages/erp/RFQsPage';
import { QuotationsPage } from './pages/erp/QuotationsPage';
import { ComparisonPage } from './pages/erp/ComparisonPage';
import { ApprovalsPage } from './pages/erp/ApprovalsPage';
import { PurchaseOrdersPage } from './pages/erp/PurchaseOrdersPage';
import { InvoicesPage } from './pages/erp/InvoicesPage';
import { ActivityLogsPage } from './pages/erp/ActivityLogsPage';
import { ReportsPage } from './pages/erp/ReportsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected ERP Routes */}
        <Route path="/erp" element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="vendors" element={<VendorsPage />} />
            <Route path="rfqs" element={<RFQsPage />} />
            <Route path="quotations" element={<QuotationsPage />} />
            <Route path="compare" element={<ComparisonPage />} />
            <Route path="approvals" element={<ApprovalsPage />} />
            <Route path="orders" element={<PurchaseOrdersPage />} />
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="logs" element={<ActivityLogsPage />} />
            <Route path="reports" element={<ReportsPage />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
