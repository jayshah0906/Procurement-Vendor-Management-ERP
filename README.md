# ∞ VendorBridge ERP

**VendorBridge** is a comprehensive Procurement and Vendor Management ERP built to streamline sourcing, automate RFQs, simplify vendor onboarding, and accelerate approval workflows. It features role-based access control, real-time analytics, and secure document management.

---

## 🌟 Key Features

* **Role-Based Access Control**: Tailored experiences and permissions for:
  * **Procurement Managers**: Full oversight, advanced reporting, and final approvals.
  * **Procurement Officers**: RFQ creation, vendor management, and PO generation.
  * **Approvers**: Review and approve/reject workflows and purchase orders.
  * **Vendors**: Onboarding, profile management, quotation submission, and invoice tracking.
* **Vendor Lifecycle Management**: Digital KYC, document uploads, and performance tracking.
* **RFQ Automation**: Create, broadcast, and manage Requests for Quotations seamlessly.
* **Smart Quotation Comparison**: Easily compare vendor bids and select the most optimal quote.
* **Automated Approval Workflows**: Hierarchical, rule-based approvals to ensure compliance.
* **Purchase Orders & Invoices**: End-to-end PO generation, tracking, and GST-compliant invoicing.
* **Interactive Dashboard**: Spend analytics, recent activity logs, and actionable insights.

---

## 🛠️ Technology Stack

### Frontend
* **Framework**: React 19 + Vite
* **Styling**: Tailwind CSS v4, Framer Motion (Animations)
* **State Management**: Zustand (Global state), TanStack React Query (Server state)
* **Routing**: React Router v7
* **Forms & Validation**: React Hook Form, Zod
* **Icons & Charts**: Phosphor Icons, Lucide React, Recharts

### Backend
* **Runtime & Framework**: Node.js, Express, TypeScript
* **Database & ORM**: PostgreSQL, Prisma ORM
* **Authentication**: JWT (JSON Web Tokens), bcrypt (Password hashing)
* **Validation**: Zod
* **File Uploads**: Multer

---

## 🚀 Getting Started

### Prerequisites
* Node.js (v18+)
* PostgreSQL installed and running

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Procurement-Vendor-Management-ERP
```

### 2. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Set up environment variables
# Create a .env file based on the provided schema and configure your DATABASE_URL

# Apply database migrations & generate Prisma client
npm run prisma:generate
npm run prisma:pull

# Start the development server
npm run dev
```

### 3. Frontend Setup
```bash
cd ../frontend

# Install dependencies
npm install

# Create environment file (.env)
# Set VITE_API_URL=http://localhost:5000/api/v1 (or your configured backend port)

# Start the frontend Vite development server
npm run dev
```

### 4. Access the Application
Open your browser and navigate to the frontend URL (usually `http://localhost:5173` or `http://localhost:5175`).

---

## 📁 Project Structure

```text
├── backend/                  # Express/TypeScript Backend Server
│   ├── prisma/               # Prisma schema and migrations
│   ├── src/                  # Controllers, Routes, Services, Middlewares
│   ├── package.json
│   └── ...
├── frontend/                 # React/Vite Frontend Application
│   ├── src/
│   │   ├── api/              # Axios API integrations
│   │   ├── assets/           # Static assets, images, and videos
│   │   ├── components/       # Reusable UI components & layouts
│   │   ├── pages/            # Public & Protected pages
│   │   ├── routes/           # React Router configurations & Protected routes
│   │   └── store/            # Zustand global state stores
│   ├── package.json
│   └── ...
└── README.md                 # Project Documentation
```

---

## 🛡️ Security & Authentication
* The application employs JWT-based authentication with role-based middleware guarding sensitive API routes.
* Passwords are securely hashed using `bcrypt` before database storage.
* Frontend protected routes ensure users can only access views designated for their specific role.

---

## 📝 License
This project is licensed under the [MIT License](LICENSE).
