import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Page imports
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Items from "./pages/Items";
import ItemForm from "./pages/ItemForm";
import ItemDetail from "./pages/ItemDetail";
import PublicScan from "./pages/PublicScan";
import QRScan from "./pages/QRScan";
import NotFound from "./pages/NotFound";

// Admin pages
import Departments from "./pages/Departments";
import Categories from "./pages/Categories";
import Requests from "./pages/Requests";
import Maintenance from "./pages/Maintenance";
import QRManagement from "./pages/QRManagement";
import Chemicals from "./pages/Chemicals";
import AuditLogs from "./pages/AuditLogs";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import MyRequests from "./pages/MyRequests";
import Notifications from "./pages/Notifications";
import History from "./pages/History";
import Repairs from "./pages/Repairs";
import MessageCenter from "./pages/MessageCenter";
import BorrowAnalytics from "./pages/BorrowAnalytics";
import DamageReports from "./pages/DamageReports";
import KioskMode from "./pages/KioskMode";
import PublicCatalog from "./pages/PublicCatalog";
import PublicItemDetail from "./pages/PublicItemDetail";
import { CommandPalette } from "./components/CommandPalette";
import { PWAUpdatePrompt } from "./components/pwa/PWAUpdatePrompt";

// Tally Integration pages
import TallySync from "./pages/TallySync";
import Vendors from "./pages/Vendors";
import PurchaseOrders from "./pages/PurchaseOrders";
import TallyStockJournal from "./pages/TallyStockJournal";
import EquipmentDepreciation from "./pages/EquipmentDepreciation";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <CommandPalette />
          <PWAUpdatePrompt />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />

            {/* Public Catalog Routes */}
            <Route path="/catalog" element={<PublicCatalog />} />
            <Route path="/catalog/:id" element={<PublicItemDetail />} />

            {/* Public QR Scan Routes */}
            <Route path="/scan/:id" element={<PublicScan />} />
            <Route path="/scan/unit/:unitId" element={<PublicScan />} />

            {/* Kiosk Mode — fullscreen self-checkout */}
            <Route
              path="/kiosk"
              element={
                <ProtectedRoute allowedRoles={["admin", "staff", "student"]}>
                  <KioskMode />
                </ProtectedRoute>
              }
            />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Users />
                </ProtectedRoute>
              }
            />
            <Route
              path="/items"
              element={
                <ProtectedRoute>
                  <Items />
                </ProtectedRoute>
              }
            />
            <Route
              path="/items/new"
              element={
                <ProtectedRoute allowedRoles={["admin", "staff"]}>
                  <ItemForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/items/:id"
              element={
                <ProtectedRoute>
                  <ItemDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/items/:id/edit"
              element={
                <ProtectedRoute allowedRoles={["admin", "staff"]}>
                  <ItemForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/change-password"
              element={<Navigate to="/settings" replace />}
            />

            {/* Admin Routes */}
            <Route
              path="/departments"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Departments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/categories"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Categories />
                </ProtectedRoute>
              }
            />
            <Route
              path="/requests"
              element={
                <ProtectedRoute allowedRoles={["admin", "staff"]}>
                  <Requests />
                </ProtectedRoute>
              }
            />
            <Route
              path="/maintenance"
              element={
                <ProtectedRoute allowedRoles={["admin", "staff", "technician"]}>
                  <Maintenance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/qr-management"
              element={
                <ProtectedRoute allowedRoles={["admin", "staff"]}>
                  <QRManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/scan"
              element={
                <ProtectedRoute allowedRoles={["admin", "staff"]}>
                  <QRScan />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chemicals"
              element={
                <ProtectedRoute allowedRoles={["admin", "staff"]}>
                  <Chemicals />
                </ProtectedRoute>
              }
            />
            <Route
              path="/audit-logs"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AuditLogs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute allowedRoles={["admin", "staff"]}>
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-requests"
              element={
                <ProtectedRoute>
                  <MyRequests />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <Notifications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/browse"
              element={<Navigate to="/catalog" replace />}
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <History />
                </ProtectedRoute>
              }
            />
            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <MessageCenter />
                </ProtectedRoute>
              }
            />
            <Route
              path="/borrow-analytics"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <BorrowAnalytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/repairs"
              element={
                <ProtectedRoute allowedRoles={["admin", "staff", "technician"]}>
                  <Repairs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/damage-reports"
              element={
                <ProtectedRoute allowedRoles={["admin", "staff"]}>
                  <DamageReports />
                </ProtectedRoute>
              }
            />

            {/* Tally Integration Routes */}
            <Route
              path="/tally-sync"
              element={
                <ProtectedRoute allowedRoles={["admin", "staff"]}>
                  <TallySync />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vendors"
              element={
                <ProtectedRoute allowedRoles={["admin", "staff"]}>
                  <Vendors />
                </ProtectedRoute>
              }
            />
            <Route
              path="/purchase-orders"
              element={
                <ProtectedRoute allowedRoles={["admin", "staff"]}>
                  <PurchaseOrders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/stock-journal"
              element={
                <ProtectedRoute allowedRoles={["admin", "staff"]}>
                  <TallyStockJournal />
                </ProtectedRoute>
              }
            />
            <Route
              path="/equipment-depreciation"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <EquipmentDepreciation />
                </ProtectedRoute>
              }
            />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
