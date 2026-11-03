import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useUserRole } from "@/components/auth/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Package,
  CheckCircle,
  Clock,
  AlertTriangle,
  Wrench,
  Users,
  QrCode,
  ArrowRight,
  FlaskConical,
  FileText,
  Plus,
  Search,
  Activity,
  TrendingUp,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import StudentDashboard from "@/pages/StudentDashboard";

export default function Dashboard() {
  const { userRole, loading } = useUserRole();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Route students to the dedicated student dashboard without firing heavy admin queries
  if (userRole === "student") {
    return <StudentDashboard />;
  }

  return <AdminStaffDashboardView userRole={userRole} />;
}

function AdminStaffDashboardView({
  userRole,
}: {
  userRole: "admin" | "staff" | "student" | "technician" | null;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const stats = useDashboardStats();

  const userName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Admin";
  const userInitials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <DashboardLayout
      title="Dashboard"
      subtitle="Welcome back! Here's your lab overview."
      userRole={
        (userRole as "admin" | "staff" | "student" | "technician") || "admin"
      }
    >
      <div className="space-y-8 pb-8">
        {/* Welcome Header - Professional Clean Design */}
        <div className="flex flex-col gap-4 pb-4 pt-2">
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Professional Avatar */}
            <div className="relative flex-shrink-0">
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-blue-600 shadow-md flex items-center justify-center">
                <span className="text-white text-base sm:text-lg font-bold">
                  {userInitials}
                </span>
              </div>
              <span className="absolute bottom-0 right-0 h-3 w-3 sm:h-3.5 sm:w-3.5 bg-emerald-500 rounded-full ring-2 ring-white"></span>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground truncate">
                Welcome back, {userName}!
              </h2>
              <p className="text-muted-foreground text-xs sm:text-sm truncate">
                Here's what's happening in your lab today
              </p>
            </div>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <Button
              size="sm"
              className="flex-1 sm:flex-none bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl h-10 sm:h-11 px-3 sm:px-5 shadow-lg shadow-blue-500/30 transition-all hover:shadow-xl hover:shadow-blue-500/40 text-xs sm:text-sm"
              onClick={() => navigate("/items/new")}
            >
              <Plus className="h-4 w-4 mr-1.5 sm:mr-2" />
              Add Item
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 sm:flex-none rounded-xl h-10 sm:h-11 px-3 sm:px-5 border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 dark:border-gray-700 dark:hover:bg-gray-800 text-xs sm:text-sm"
              onClick={() => navigate("/scan")}
            >
              <QrCode className="h-4 w-4 mr-1.5 sm:mr-2" />
              Scan QR
            </Button>
          </div>
        </div>

        {/* Stats Grid - Primary Row */}
        <div className="grid gap-3 sm:gap-4 md:gap-5 grid-cols-2 md:grid-cols-4">
          <StatsCard
            title="Total Items"
            value={stats.totalItems}
            subtitle="In inventory"
            icon={Package}
            variant="primary"
            loading={stats.isLoading}
            link="/items"
            trend={{ value: 12, isPositive: true }}
          />
          <StatsCard
            title="Available"
            value={stats.availableItems}
            subtitle="Ready to issue"
            icon={CheckCircle}
            variant="success"
            loading={stats.isLoading}
            link="/items?status=available"
          />
          <StatsCard
            title="Borrowed"
            value={stats.borrowedItems}
            subtitle="Currently issued"
            icon={Clock}
            variant="orange"
            loading={stats.isLoading}
            link="/items?status=borrowed"
          />
          <StatsCard
            title="Maintenance"
            value={stats.maintenanceItems}
            subtitle="Under repair"
            icon={Wrench}
            variant="warning"
            loading={stats.isLoading}
            link="/maintenance"
          />
        </div>

        {/* Stats Grid - Secondary Row */}
        <div className="grid gap-3 sm:gap-4 md:gap-5 grid-cols-2 md:grid-cols-4">
          {["admin", "staff"].includes(userRole || "") && (
            <StatsCard
              title="Pending Requests"
              value={stats.pendingRequests}
              subtitle="Needs approval"
              icon={FileText}
              variant="info"
              loading={stats.isLoading}
              link="/requests"
            />
          )}
          <StatsCard
            title="Low Stock"
            value={stats.lowStockItems}
            subtitle="Below threshold"
            icon={AlertTriangle}
            variant="danger"
            loading={stats.isLoading}
            link="/items?filter=low_stock"
          />
          <StatsCard
            title="Chemicals"
            value={stats.totalChemicals}
            subtitle={`${stats.expiringChemicals} expiring soon`}
            icon={FlaskConical}
            variant="info"
            loading={stats.isLoading}
            link="/chemicals"
          />
          {userRole === "admin" && (
            <StatsCard
              title="Total Users"
              value={stats.totalUsers}
              subtitle="Registered"
              icon={Users}
              variant="primary"
              loading={stats.isLoading}
              link="/users"
            />
          )}
        </div>

        {/* Charts Section - All Real Data */}
        <DashboardCharts
          monthlyTrends={stats.monthlyTrends}
          categoryDistribution={stats.categoryDistribution}
          weeklyUsage={stats.weeklyUsage}
          itemStatusDistribution={stats.itemStatusDistribution}
          maintenanceTrends={stats.maintenanceTrends}
          dailyUsageReports={stats.dailyUsageReports}
          studentActivity={stats.studentActivity}
          isLoading={stats.isLoading}
        />

        {/* Bottom Section */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {/* Top Borrowed Items */}
          <div className="dashboard-card animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-3">
                  <div className="icon-container sky h-10 w-10 rounded-xl">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  Top Borrowed
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                  onClick={() => navigate("/items")}
                >
                  View All <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.isLoading ? (
                  Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-4 animate-pulse"
                      >
                        <div className="h-10 w-10 rounded-xl bg-gray-100" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-2/3 bg-gray-100 rounded-lg" />
                          <div className="h-3 w-1/2 bg-gray-100 rounded-lg" />
                        </div>
                      </div>
                    ))
                ) : stats.topBorrowed.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">
                      No data available
                    </p>
                  </div>
                ) : (
                  stats.topBorrowed.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 group p-2 -mx-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-500/20">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate group-hover:text-blue-600 transition-colors">
                          {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.category}
                        </p>
                      </div>
                      <Badge className="shrink-0 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg px-3 py-1.5 font-semibold">
                        {item.count}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </div>

          {/* Recent Activity */}
          <div className="dashboard-card animate-in fade-in slide-in-from-bottom-4 duration-500 delay-400 fill-mode-both">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-3">
                  <div className="icon-container green h-10 w-10 rounded-xl">
                    <Activity className="h-5 w-5" />
                  </div>
                  Recent Activity
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                  onClick={() => navigate("/audit-logs")}
                >
                  View All <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.isLoading ? (
                  Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-4 animate-pulse"
                      >
                        <div className="h-3 w-3 rounded-full bg-gray-100" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-full bg-gray-100 rounded-lg" />
                          <div className="h-3 w-2/3 bg-gray-100 rounded-lg" />
                        </div>
                      </div>
                    ))
                ) : stats.recentActivity.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">
                      No recent activity
                    </p>
                  </div>
                ) : (
                  stats.recentActivity.map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-4 group p-2 -mx-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div
                        className={`mt-0.5 h-3 w-3 rounded-full shrink-0 ring-4 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 ${
                          activity.action.includes("create")
                            ? "bg-emerald-500 ring-emerald-100"
                            : activity.action.includes("update")
                              ? "bg-blue-500 ring-blue-100"
                              : activity.action.includes("delete")
                                ? "bg-red-500 ring-red-100"
                                : "bg-orange-500 ring-orange-100"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold leading-tight group-hover:text-blue-600 transition-colors">
                          {activity.action}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {activity.entity_type} •{" "}
                          {formatDistanceToNow(new Date(activity.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </div>

          {/* Quick Actions */}
          <div className="dashboard-card animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500 fill-mode-both">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold flex items-center gap-3">
                <div className="icon-container purple h-10 w-10 rounded-xl">
                  <Sparkles className="h-5 w-5" />
                </div>
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start h-14 font-medium rounded-xl border-2 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all"
                  onClick={() => navigate("/items/new")}
                >
                  <div className="icon-container blue h-9 w-9 rounded-lg mr-4">
                    <Plus className="h-4 w-4" />
                  </div>
                  Add New Item
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start h-14 font-medium rounded-xl border-2 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-all"
                  onClick={() => navigate("/scan")}
                >
                  <div className="icon-container orange h-9 w-9 rounded-lg mr-4">
                    <QrCode className="h-4 w-4" />
                  </div>
                  Scan QR Code
                </Button>
                {["admin", "staff"].includes(userRole || "") && (
                  <Button
                    variant="outline"
                    className="w-full justify-start h-14 font-medium rounded-xl border-2 hover:bg-sky-50 hover:text-sky-600 hover:border-sky-200 transition-all"
                    onClick={() => navigate("/requests")}
                  >
                    <div className="icon-container sky h-9 w-9 rounded-lg mr-4">
                      <FileText className="h-4 w-4" />
                    </div>
                    <span className="flex-1 text-left">Review Requests</span>
                    {stats.pendingRequests > 0 && (
                      <Badge className="bg-sky-600 text-white rounded-lg">
                        {stats.pendingRequests}
                      </Badge>
                    )}
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="w-full justify-start h-14 font-medium rounded-xl border-2 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all"
                  onClick={() => navigate("/items")}
                >
                  <div className="icon-container green h-9 w-9 rounded-lg mr-4">
                    <Search className="h-4 w-4" />
                  </div>
                  Search Inventory
                </Button>
                {userRole === "admin" && (
                  <Button
                    variant="outline"
                    className="w-full justify-start h-14 font-medium rounded-xl border-2 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 transition-all"
                    onClick={() => navigate("/users")}
                  >
                    <div className="icon-container purple h-9 w-9 rounded-lg mr-4">
                      <Users className="h-4 w-4" />
                    </div>
                    Manage Users
                  </Button>
                )}
              </div>
            </CardContent>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
