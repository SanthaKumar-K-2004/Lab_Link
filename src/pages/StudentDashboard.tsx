import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { useStudentDashboardStats } from "@/hooks/useStudentDashboardStats";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  Bell,
  BookOpen,
  RotateCcw,
  Search,
  Sparkles,
  FileText,
  TrendingUp,
  CalendarDays,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { formatDistanceToNow, format } from "date-fns";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Line,
  ComposedChart,
} from "recharts";

// Helper component to avoid inline styles for colors
const ColorIndicator = ({
  color,
  className = "",
}: {
  color: string;
  className?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.style.backgroundColor = color;
    }
  }, [color]);
  return <div ref={ref} className={className} />;
};

// Custom tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 backdrop-blur-xl p-4 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 min-w-[140px]">
        <p className="text-sm font-bold text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
          {label}
        </p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div
              key={index}
              className="flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-2">
                <ColorIndicator
                  color={entry.color}
                  className="w-3 h-3 rounded-full shadow-sm"
                />
                <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                  {entry.name}
                </span>
              </div>
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                {entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

// Pie tooltip
const PieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-white dark:bg-gray-800 backdrop-blur-xl p-4 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 min-w-[140px]">
        <div className="flex items-center gap-3 mb-2">
          <ColorIndicator
            color={data.payload.color}
            className="w-4 h-4 rounded-full shadow-sm"
          />
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            {data.name}
          </span>
        </div>
        <span className="text-lg font-bold text-gray-900 dark:text-white">
          {data.value}
        </span>
      </div>
    );
  }
  return null;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "approved":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "rejected":
      return "bg-red-100 text-red-700 border-red-200";
    case "returned":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "collected":
      return "bg-violet-100 text-violet-700 border-violet-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

// Loading skeleton
const ChartSkeleton = () => (
  <div className="h-[220px] w-full flex flex-col items-center justify-center">
    <div className="animate-pulse flex flex-col items-center gap-4">
      <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-full" />
      <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded-full" />
    </div>
  </div>
);

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const stats = useStudentDashboardStats();

  const userInitials =
    stats.fullName
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "ST";

  return (
    <DashboardLayout
      title="Dashboard"
      subtitle="Your personal lab dashboard"
      userRole="student"
    >
      <div className="space-y-8 pb-8">
        {/* Welcome Header */}
        <div className="flex flex-col gap-4 pb-4 pt-2">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative flex-shrink-0">
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/30 flex items-center justify-center">
                <span className="text-white text-base sm:text-lg font-bold">
                  {userInitials}
                </span>
              </div>
              <span className="absolute bottom-0 right-0 h-3 w-3 sm:h-3.5 sm:w-3.5 bg-emerald-500 rounded-full ring-2 ring-white"></span>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground truncate">
                Welcome, {stats.fullName}!
              </h2>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                <p className="text-muted-foreground text-xs sm:text-sm truncate">
                  {stats.email}
                </p>
                {stats.departmentName !== "Not assigned" && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400"
                  >
                    {stats.departmentName}
                  </Badge>
                )}
                {stats.collegeName && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400"
                  >
                    {stats.collegeName}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <Button
              size="sm"
              className="flex-1 sm:flex-none bg-gradient-to-r from-violet-600 to-indigo-500 hover:from-violet-700 hover:to-indigo-600 text-white rounded-xl h-10 sm:h-11 px-3 sm:px-5 shadow-lg shadow-violet-500/30 transition-all hover:shadow-xl hover:shadow-violet-500/40 text-xs sm:text-sm"
              onClick={() => navigate("/catalog")}
            >
              <Search className="h-4 w-4 mr-1.5 sm:mr-2" />
              Browse Catalog
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 sm:flex-none rounded-xl h-10 sm:h-11 px-3 sm:px-5 border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300 dark:border-gray-700 dark:hover:bg-gray-800 text-xs sm:text-sm"
              onClick={() => navigate("/catalog")}
            >
              <BookOpen className="h-4 w-4 mr-1.5 sm:mr-2" />
              My Requests
            </Button>
          </div>
        </div>

        {/* Stats Grid - Primary */}
        <div className="grid gap-3 sm:gap-4 md:gap-5 grid-cols-2 md:grid-cols-4">
          <StatsCard
            title="Active Borrows"
            value={stats.activeBorrows}
            subtitle="Currently borrowed"
            icon={Package}
            variant="primary"
            loading={stats.isLoading}
          />
          <StatsCard
            title="Pending"
            value={stats.pendingRequests}
            subtitle="Awaiting approval"
            icon={Clock}
            variant="warning"
            loading={stats.isLoading}
          />
          <StatsCard
            title="Approved"
            value={stats.approvedRequests}
            subtitle="Ready to collect"
            icon={CheckCircle}
            variant="success"
            loading={stats.isLoading}
          />
          <StatsCard
            title="Total Requests"
            value={stats.totalRequests}
            subtitle="All time"
            icon={FileText}
            variant="info"
            loading={stats.isLoading}
          />
        </div>

        {/* Stats Grid - Secondary */}
        <div className="grid gap-3 sm:gap-4 md:gap-5 grid-cols-2 md:grid-cols-3">
          <StatsCard
            title="Returned"
            value={stats.returnedItems}
            subtitle="Successfully returned"
            icon={RotateCcw}
            variant="success"
            loading={stats.isLoading}
          />
          <StatsCard
            title="Pending Returns"
            value={stats.pendingReturns}
            subtitle="Awaiting verification"
            icon={AlertCircle}
            variant="orange"
            loading={stats.isLoading}
          />
          <StatsCard
            title="Rejected"
            value={stats.rejectedRequests}
            subtitle="Not approved"
            icon={XCircle}
            variant="danger"
            loading={stats.isLoading}
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Borrow Status Distribution - Pie Chart */}
          <div className="dashboard-card animate-fade-in-up">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-3">
                <div className="icon-container orange h-11 w-11 rounded-xl flex items-center justify-center">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-gray-900 dark:text-white">
                    Request Status
                  </span>
                  <p className="text-xs font-normal text-muted-foreground mt-0.5">
                    Distribution of your borrow requests
                  </p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {stats.isLoading ? (
                <ChartSkeleton />
              ) : stats.borrowStatusDistribution.length > 0 ? (
                <>
                  <div className="h-[220px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.borrowStatusDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={4}
                          dataKey="value"
                          cornerRadius={8}
                          animationDuration={1200}
                        >
                          {stats.borrowStatusDistribution.map(
                            (entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.color}
                                strokeWidth={0}
                              />
                            ),
                          )}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {stats.totalRequests}
                      </p>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">
                        Total
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                    {stats.borrowStatusDistribution.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all"
                      >
                        <ColorIndicator
                          color={item.color}
                          className="w-3 h-3 rounded-full shadow-sm"
                        />
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          {item.name}
                        </span>
                        <span className="text-xs font-bold text-gray-900 dark:text-white ml-auto">
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-[220px] w-full flex flex-col items-center justify-center text-center p-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center mb-4 shadow-inner">
                    <Package className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                  </div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    No borrow requests yet
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Browse the catalog to start borrowing
                  </p>
                </div>
              )}
            </CardContent>
          </div>

          {/* Monthly Borrow Trends */}
          <div className="dashboard-card animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 fill-mode-both">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-3">
                <div className="icon-container blue h-11 w-11 rounded-xl flex items-center justify-center">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-gray-900 dark:text-white">
                    My Borrow Trends
                  </span>
                  <p className="text-xs font-normal text-muted-foreground mt-0.5">
                    Last 6 months activity
                  </p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              {stats.isLoading ? (
                <ChartSkeleton />
              ) : stats.monthlyBorrowTrends.some((m) => m.requests > 0) ? (
                <>
                  <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={stats.monthlyBorrowTrends}
                        margin={{ top: 20, right: 20, left: -10, bottom: 10 }}
                      >
                        <defs>
                          <linearGradient
                            id="studentReqGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#8b5cf6"
                              stopOpacity={0.4}
                            />
                            <stop
                              offset="50%"
                              stopColor="#8b5cf6"
                              stopOpacity={0.15}
                            />
                            <stop
                              offset="100%"
                              stopColor="#8b5cf6"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#e5e7eb"
                          strokeOpacity={0.5}
                        />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{
                            fill: "#6b7280",
                            fontSize: 12,
                            fontWeight: 500,
                          }}
                          dy={10}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#6b7280", fontSize: 12 }}
                          width={40}
                          allowDecimals={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="requests"
                          stroke="#8b5cf6"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#studentReqGradient)"
                          name="Requests"
                          animationDuration={1200}
                        />
                        <Line
                          type="monotone"
                          dataKey="approved"
                          stroke="#22c55e"
                          strokeWidth={3}
                          dot={{
                            fill: "#22c55e",
                            r: 5,
                            strokeWidth: 2,
                            stroke: "#fff",
                          }}
                          name="Approved"
                          animationDuration={1200}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex items-center justify-center gap-6 mt-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-violet-500 shadow-sm" />
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        Requests
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm" />
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        Approved
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-[240px] w-full flex flex-col items-center justify-center text-center p-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center mb-4 shadow-inner">
                    <TrendingUp className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                  </div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    No borrow activity yet
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Your monthly trends will appear here
                  </p>
                </div>
              )}
            </CardContent>
          </div>
        </div>

        {/* Bottom Section: Recent Requests, Active Borrows, Quick Actions */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {/* Recent Borrow Requests */}
          <div className="dashboard-card animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200 fill-mode-both">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-3">
                  <div className="icon-container sky h-10 w-10 rounded-xl">
                    <FileText className="h-5 w-5" />
                  </div>
                  My Requests
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                  onClick={() => navigate("/catalog")}
                >
                  View All <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.isLoading ? (
                  Array(4)
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
                ) : stats.recentRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">
                      No borrow requests yet
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3 rounded-lg"
                      onClick={() => navigate("/catalog")}
                    >
                      Browse Catalog
                    </Button>
                  </div>
                ) : (
                  stats.recentRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center gap-3 group p-2 -mx-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/20 flex-shrink-0">
                        <Package className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate group-hover:text-blue-600 transition-colors">
                          {request.itemName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {request.quantity > 1
                            ? `Qty: ${request.quantity} • `
                            : ""}
                          {request.createdAt
                            ? formatDistanceToNow(new Date(request.createdAt), {
                                addSuffix: true,
                              })
                            : ""}
                        </p>
                      </div>
                      <Badge
                        className={`shrink-0 rounded-lg px-2 py-1 text-xs font-semibold border ${getStatusColor(request.status)}`}
                      >
                        {request.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </div>

          {/* Active Borrows */}
          <div className="dashboard-card animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300 fill-mode-both">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-3">
                  <div className="icon-container green h-10 w-10 rounded-xl">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  Active Borrows
                </CardTitle>
                <Badge
                  variant="outline"
                  className="text-xs bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 font-semibold"
                >
                  {stats.activeBorrows} Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.isLoading ? (
                  Array(3)
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
                ) : stats.activeBorrowsList.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">
                      No active borrows
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Items you borrow will appear here
                    </p>
                  </div>
                ) : (
                  stats.activeBorrowsList.map((borrow) => {
                    const isOverdue =
                      borrow.dueDate && new Date(borrow.dueDate) < new Date();
                    return (
                      <div
                        key={borrow.id}
                        className="flex items-center gap-3 group p-2 -mx-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg flex-shrink-0 ${isOverdue ? "bg-gradient-to-br from-red-500 to-red-600 shadow-red-500/20" : "bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/20"}`}
                        >
                          <Package className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate group-hover:text-blue-600 transition-colors">
                            {borrow.itemName}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <CalendarDays className="h-3 w-3" />
                            <span>
                              Due:{" "}
                              {borrow.dueDate
                                ? format(
                                    new Date(borrow.dueDate),
                                    "dd MMM yyyy",
                                  )
                                : "N/A"}
                            </span>
                          </div>
                        </div>
                        {isOverdue && (
                          <Badge className="shrink-0 bg-red-100 text-red-700 border-red-200 rounded-lg px-2 py-1 text-xs font-semibold border">
                            Overdue
                          </Badge>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </div>

          {/* Quick Actions + Notifications */}
          <div className="dashboard-card animate-in fade-in slide-in-from-bottom-4 duration-500 delay-400 fill-mode-both">
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
                  className="w-full justify-start h-14 font-medium rounded-xl border-2 hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200 transition-all"
                  onClick={() => navigate("/catalog")}
                >
                  <div className="icon-container purple h-9 w-9 rounded-lg mr-4">
                    <Search className="h-4 w-4" />
                  </div>
                  Browse Equipment Catalog
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start h-14 font-medium rounded-xl border-2 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all"
                  onClick={() => navigate("/catalog")}
                >
                  <div className="icon-container blue h-9 w-9 rounded-lg mr-4">
                    <FileText className="h-4 w-4" />
                  </div>
                  <span className="flex-1 text-left">My Borrow Requests</span>
                  {stats.pendingRequests > 0 && (
                    <Badge className="bg-amber-600 text-white rounded-lg">
                      {stats.pendingRequests}
                    </Badge>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start h-14 font-medium rounded-xl border-2 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all"
                  onClick={() => navigate("/items")}
                >
                  <div className="icon-container green h-9 w-9 rounded-lg mr-4">
                    <Package className="h-4 w-4" />
                  </div>
                  View Inventory
                </Button>
              </div>

              {/* Notifications Section */}
              {stats.notifications.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2 mb-3">
                    <Bell className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Recent Notifications
                    </span>
                  </div>
                  <div className="space-y-2">
                    {stats.notifications.slice(0, 3).map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-3 rounded-xl text-xs transition-colors ${
                          notif.isRead
                            ? "bg-gray-50 dark:bg-gray-800/50"
                            : "bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800"
                        }`}
                      >
                        <p className="font-semibold text-gray-800 dark:text-gray-200">
                          {notif.title}
                        </p>
                        <p className="text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                          {notif.message}
                        </p>
                        <p className="text-gray-400 dark:text-gray-500 mt-1">
                          {notif.createdAt
                            ? formatDistanceToNow(new Date(notif.createdAt), {
                                addSuffix: true,
                              })
                            : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
