import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  Users,
  QrCode,
  ClipboardList,
  Wrench,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
  Building2,
  Tags,
  History,
  Bell,
  FlaskConical,
  MessageSquare,
  BarChart3,
  FileWarning,
  ShoppingCart,
  Store,
  RefreshCw,
  BookOpen,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface SidebarProps {
  userRole?: "admin" | "staff" | "student" | "technician";
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  onLinkClick?: () => void;
}

const adminNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Package, label: "Inventory", href: "/items" },
  { icon: Users, label: "Users", href: "/users" },
  { icon: Building2, label: "Departments", href: "/departments" },
  { icon: Tags, label: "Categories", href: "/categories" },
  { icon: QrCode, label: "QR Management", href: "/qr-management" },
  { icon: QrCode, label: "Kiosk Mode", href: "/kiosk" },
  { icon: ClipboardList, label: "Requests", href: "/requests" },
  { icon: BarChart3, label: "Borrow Analytics", href: "/borrow-analytics" },
  { icon: FileWarning, label: "Damage Reports", href: "/damage-reports" },
  { icon: Wrench, label: "Maintenance", href: "/maintenance" },
  { icon: FlaskConical, label: "Chemicals", href: "/chemicals" },
  // Finance & Tally
  { icon: ShoppingCart, label: "Purchase Orders", href: "/purchase-orders" },
  { icon: Store, label: "Vendors", href: "/vendors" },
  { icon: RefreshCw, label: "Tally Sync", href: "/tally-sync" },
  { icon: BookOpen, label: "Stock Journal", href: "/stock-journal" },
  {
    icon: TrendingDown,
    label: "Depreciation",
    href: "/equipment-depreciation",
  },
  { icon: History, label: "Audit Logs", href: "/audit-logs" },
  { icon: FileText, label: "Reports", href: "/reports" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

const staffNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Package, label: "Inventory", href: "/items" },
  { icon: QrCode, label: "Scan QR", href: "/scan" },
  { icon: QrCode, label: "Kiosk Mode", href: "/kiosk" },
  { icon: ClipboardList, label: "Requests", href: "/requests" },
  { icon: FileWarning, label: "Damage Reports", href: "/damage-reports" },
  { icon: Wrench, label: "Maintenance", href: "/maintenance" },
  { icon: FileText, label: "Reports", href: "/reports" },
];

const studentNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Package, label: "Browse Catalog", href: "/catalog" },
  { icon: ClipboardList, label: "My Requests", href: "/my-requests" },
  { icon: MessageSquare, label: "Message Center", href: "/messages" },
  { icon: History, label: "History", href: "/history" },
  { icon: Bell, label: "Notifications", href: "/notifications" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

const technicianNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Wrench, label: "Repair Queue", href: "/repairs" },
  { icon: History, label: "History", href: "/history" },
];

export function Sidebar({
  userRole = "admin",
  collapsed: externalCollapsed,
  onCollapsedChange,
  onLinkClick,
}: SidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = externalCollapsed ?? internalCollapsed;
  const setCollapsed = onCollapsedChange ?? setInternalCollapsed;

  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const navItems =
    userRole === "admin"
      ? adminNavItems
      : userRole === "staff"
        ? staffNavItems
        : userRole === "technician"
          ? technicianNavItems
          : studentNavItems;

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Logged out successfully");
      navigate("/auth");
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  const userInitials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || "U";

  const userName = user?.user_metadata?.full_name || user?.email || "User";
  const userEmail = user?.email || "";

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen transition-all duration-300 ease-in-out",
        "bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900",
        "border-r border-white/5",
        collapsed ? "w-20" : "w-64",
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div
          className={cn(
            "flex h-16 items-center border-b border-white/10",
            collapsed ? "justify-center px-2" : "justify-between px-4",
          )}
        >
          <Link to="/dashboard" className="flex items-center gap-3">
            {/* New LabLink Logo */}
            <div className="flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden shadow-lg shadow-blue-500/30">
              <img
                src="/lablink-logo.jpg"
                alt="LabLink"
                className="h-full w-full object-cover"
              />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-xl font-bold text-white">LabLink</span>
                <span className="text-[10px] text-blue-400 -mt-1 tracking-wider">
                  LAB SMART
                </span>
              </div>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all",
              collapsed && "hidden",
            )}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </div>

        {/* Collapse toggle when collapsed */}
        {collapsed && (
          <div className="flex justify-center py-2 border-b border-white/10">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(false)}
              className="text-white/70 hover:text-white hover:bg-white/10 rounded-lg"
            >
              <ChevronLeft className="h-5 w-5 rotate-180" />
            </Button>
          </div>
        )}

        {/* Navigation */}
        <nav
          className={cn(
            "flex-1 overflow-y-auto py-4",
            collapsed ? "px-2" : "px-3",
          )}
        >
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive =
                location.pathname === item.href ||
                (item.href !== "/dashboard" &&
                  location.pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={onLinkClick}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200",
                    collapsed && "justify-center px-2",
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/25"
                      : "text-white/70 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5 flex-shrink-0 transition-transform duration-200",
                      !isActive && "group-hover:scale-110",
                    )}
                  />
                  {!collapsed && <span>{item.label}</span>}
                  {/* Active indicator */}
                  {isActive && !collapsed && (
                    <div className="ml-auto h-2 w-2 rounded-full bg-white shadow-lg shadow-white/50" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User & Logout */}
        <div
          className={cn("border-t border-white/10 p-4", collapsed && "px-2")}
        >
          <div
            className={cn(
              "mb-3 flex items-center gap-3",
              collapsed && "justify-center",
            )}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/25">
              <span className="text-sm font-bold text-white">
                {userInitials}
              </span>
            </div>
            {!collapsed && (
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-semibold text-white">
                  {userName}
                </p>
                <p className="truncate text-xs text-white/50">{userEmail}</p>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className={cn(
              "w-full text-white/70 hover:bg-red-500/20 hover:text-red-400 rounded-xl transition-all",
              collapsed ? "px-2" : "justify-start",
            )}
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && <span className="ml-2">Logout</span>}
          </Button>
        </div>
      </div>
    </aside>
  );
}
