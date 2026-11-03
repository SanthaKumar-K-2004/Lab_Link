import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ImageZoomModal } from "@/components/ui/ImageZoomModal";
import { BorrowRequestDialog } from "@/components/ui/BorrowRequestDialog";
import { ReportIssueDialog } from "@/components/ui/ReportIssueDialog";
import { MaintenanceLogCard } from "@/components/ui/MaintenanceLogCard";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  MoreVertical,
  Edit,
  Trash2,
  QrCode,
  Share2,
  Download,
  Wrench,
  History,
  Package,
  MapPin,
  Calendar,
  DollarSign,
  Shield,
  User,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  Printer,
  Tag,
  Building2,
  Hash,
  Layers,
  AlertCircle,
  HandHeart,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  ExternalLink,
  Info,
  Box,
  Barcode,
  CalendarDays,
  Award,
  Store,
  Ruler,
  FileText,
} from "lucide-react";
import QRCode from "qrcode";

// Types
interface ItemUnit {
  id: string;
  unit_serial_number: string;
  unit_number: number;
  qr_code_data: string;
  status: string;
  condition: string;
  current_holder_id: string | null;
  issued_date: string | null;
  due_date: string | null;
}

interface ActivityLog {
  id: string;
  action: string;
  description: string;
  created_at: string;
  performed_by: string;
  performer?: { full_name: string } | null;
}

interface ItemData {
  id: string;
  name: string;
  item_code: string;
  serial_number: string | null;
  description: string | null;
  status: string;
  condition: string;
  current_quantity: number;
  minimum_quantity: number;
  unit: string | null;
  lab_location: string | null;
  storage_location: string | null;
  shelf_location: string | null;
  image_url: string | null;
  sub_images: string[] | null;
  purchase_date: string | null;
  purchase_price: number | null;
  supplier_name: string | null;
  warranty_until: string | null;
  brand: string | null;
  model_number: string | null;
  item_type: string | null;
  is_borrowable: boolean;
  department_id: string | null;
  category_id: string | null;
  category?: { name: string; color_hex: string | null } | null;
  department?: { name: string } | null;
  creator?: { full_name: string } | null;
}

// Skeleton Loading Component
function ItemDetailSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-24 rounded-xl" />
        <div className="flex-1">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>

      {/* Main content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left - Image Gallery */}
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="w-16 h-16 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Right - Details */}
        <div className="lg:col-span-3 space-y-4">
          <Skeleton className="h-24 rounded-2xl" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

// Status Badge Component with Premium Styling
function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<
    string,
    { icon: React.ElementType; bgClass: string; textClass: string }
  > = {
    available: {
      icon: CheckCircle,
      bgClass: "bg-emerald-500/10",
      textClass: "text-emerald-600 dark:text-emerald-400",
    },
    issued: {
      icon: User,
      bgClass: "bg-blue-500/10",
      textClass: "text-blue-600 dark:text-blue-400",
    },
    borrowed: {
      icon: User,
      bgClass: "bg-sky-500/10",
      textClass: "text-sky-600 dark:text-sky-400",
    },
    maintenance: {
      icon: Wrench,
      bgClass: "bg-amber-500/10",
      textClass: "text-amber-600 dark:text-amber-400",
    },
    under_maintenance: {
      icon: Wrench,
      bgClass: "bg-amber-500/10",
      textClass: "text-amber-600 dark:text-amber-400",
    },
    damaged: {
      icon: AlertTriangle,
      bgClass: "bg-red-500/10",
      textClass: "text-red-600 dark:text-red-400",
    },
    archived: {
      icon: XCircle,
      bgClass: "bg-gray-500/10",
      textClass: "text-gray-600 dark:text-gray-400",
    },
  };

  const config = statusConfig[status] || {
    icon: Package,
    bgClass: "bg-gray-500/10",
    textClass: "text-gray-600",
  };
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${config.bgClass} ${config.textClass} border border-current/20`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="capitalize">{status.replace(/_/g, " ")}</span>
    </span>
  );
}

// Condition Badge Component
function ConditionBadge({ condition }: { condition: string }) {
  const conditionConfig: Record<string, { color: string }> = {
    excellent: {
      color:
        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
    good: {
      color:
        "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    },
    fair: {
      color:
        "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    },
    poor: {
      color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    },
  };

  const config = conditionConfig[condition] || {
    color: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize border ${config.color}`}
    >
      {condition}
    </span>
  );
}

// Info Card Component - Modern Glass Design
function InfoCard({
  icon: Icon,
  label,
  value,
  className = "",
  valueClassName = "",
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div
      className={`group relative p-4 rounded-xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-lg transition-all duration-300 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground mb-0.5">
            {label}
          </p>
          <p
            className={`text-sm font-semibold text-foreground truncate ${valueClassName}`}
          >
            {value || <span className="text-muted-foreground/50">—</span>}
          </p>
        </div>
      </div>
    </div>
  );
}

// Image Gallery Component
function ImageGallery({
  mainImage,
  subImages,
  itemName,
  onImageClick,
}: {
  mainImage: string | null;
  subImages: string[] | null;
  itemName: string;
  onImageClick: (url: string) => void;
}) {
  const [selectedImage, setSelectedImage] = useState<string | null>(mainImage);
  const [currentIndex, setCurrentIndex] = useState(0);

  const allImages = [mainImage, ...(subImages || [])].filter(
    Boolean,
  ) as string[];

  useEffect(() => {
    setSelectedImage(mainImage);
    setCurrentIndex(0);
  }, [mainImage]);

  const handleImageSelect = (url: string, index: number) => {
    setSelectedImage(url);
    setCurrentIndex(index);
  };

  const handlePrevious = () => {
    if (allImages.length > 0) {
      const newIndex = (currentIndex - 1 + allImages.length) % allImages.length;
      setSelectedImage(allImages[newIndex]);
      setCurrentIndex(newIndex);
    }
  };

  const handleNext = () => {
    if (allImages.length > 0) {
      const newIndex = (currentIndex + 1) % allImages.length;
      setSelectedImage(allImages[newIndex]);
      setCurrentIndex(newIndex);
    }
  };

  return (
    <div className="space-y-4">
      {/* Main Image Container */}
      <div className="relative group">
        <div
          className="aspect-square w-full rounded-2xl bg-gradient-to-br from-muted/50 to-muted overflow-hidden cursor-zoom-in border border-border/50 shadow-lg"
          onClick={() => selectedImage && onImageClick(selectedImage)}
        >
          {selectedImage ? (
            <img
              src={selectedImage}
              alt={itemName}
              className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/40">
              <Package className="h-24 w-24 mb-4" />
              <span className="text-sm font-medium">No Image Available</span>
            </div>
          )}

          {/* Navigation Arrows */}
          {allImages.length > 1 && (
            <>
              <button
                title="Previous image"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevious();
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                title="Next image"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* Image Counter */}
          {allImages.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs font-medium">
              {currentIndex + 1} / {allImages.length}
            </div>
          )}

          {/* Zoom Hint */}
          {selectedImage && (
            <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-sm text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              <ExternalLink className="h-3 w-3" />
              Click to zoom
            </div>
          )}
        </div>
      </div>

      {/* Thumbnail Strip */}
      {allImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {allImages.map((url, index) => (
            <button
              key={index}
              onClick={() => handleImageSelect(url, index)}
              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                currentIndex === index
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-border/50 hover:border-primary/50"
              }`}
            >
              <img
                src={url}
                alt={`${itemName} - ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// QR Section Component
function QRSection({
  qrDataUrl,
  itemName,
  itemCode,
  onDownload,
  onShare,
  onPrint,
}: {
  qrDataUrl: string;
  itemName: string;
  itemCode: string;
  onDownload: () => void;
  onShare: () => void;
  onPrint: () => void;
}) {
  return (
    <div className="p-5 rounded-2xl bg-gradient-to-br from-card to-card/80 border border-border/50 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <QrCode className="h-4 w-4 text-primary" />
        </div>
        <h3 className="font-semibold text-foreground">QR Code</h3>
      </div>

      <div className="flex flex-col items-center">
        {qrDataUrl && (
          <div className="p-3 bg-white rounded-xl shadow-inner mb-4">
            <img
              src={qrDataUrl}
              alt="QR Code"
              className="w-32 h-32 md:w-36 md:h-36"
            />
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={onDownload}
            className="flex items-center gap-1.5 text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onShare}
            className="flex items-center gap-1.5 text-xs"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onPrint}
            className="flex items-center gap-1.5 text-xs"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </Button>
        </div>
      </div>
    </div>
  );
}

// Availability Card Component
function AvailabilityCard({
  availableCount,
  totalCount,
  issuedCount,
  maintenanceCount,
}: {
  availableCount: number;
  totalCount: number;
  issuedCount: number;
  maintenanceCount: number;
}) {
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (progressRef.current) {
      const percentage =
        totalCount > 0 ? Math.round((availableCount / totalCount) * 100) : 0;
      progressRef.current.style.width = `${percentage}%`;
    }
  }, [availableCount, totalCount]);

  return (
    <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-emerald-600" />
          Availability
        </h3>
        <span className="text-2xl font-bold text-emerald-600">
          {totalCount > 0 ? Math.round((availableCount / totalCount) * 100) : 0}
          %
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden mb-4">
        <div
          ref={progressRef}
          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
        />
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="p-2 rounded-lg bg-emerald-500/10">
          <div className="text-lg font-bold text-emerald-600">
            {availableCount}
          </div>
          <div className="text-xs text-muted-foreground">Available</div>
        </div>
        <div className="p-2 rounded-lg bg-blue-500/10">
          <div className="text-lg font-bold text-blue-600">{issuedCount}</div>
          <div className="text-xs text-muted-foreground">Issued</div>
        </div>
        <div className="p-2 rounded-lg bg-amber-500/10">
          <div className="text-lg font-bold text-amber-600">
            {maintenanceCount}
          </div>
          <div className="text-xs text-muted-foreground">Maintenance</div>
        </div>
      </div>
    </div>
  );
}

// Main Component
export default function ItemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [item, setItem] = useState<ItemData | null>(null);
  const [units, setUnits] = useState<ItemUnit[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [imageZoomOpen, setImageZoomOpen] = useState(false);
  const [selectedZoomImage, setSelectedZoomImage] = useState<string | null>(
    null,
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [borrowDialogOpen, setBorrowDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  // Role detection
  const userRole = profile?.role || "student";
  const isAdmin = userRole === "admin";
  const isStaff = userRole === "staff";
  const isTechnician = userRole === "technician";
  const isStudent = userRole === "student";
  const canManage = isAdmin || isStaff;
  const canViewSensitive = isAdmin || isStaff || isTechnician;

  useEffect(() => {
    if (id) {
      fetchItem();
      fetchUnits();
      if (canViewSensitive) {
        fetchActivityLogs();
      }
    }
  }, [id, canViewSensitive]);

  useEffect(() => {
    // Subscribe to real-time updates
    const channel = supabase
      .channel(`item-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "items", filter: `id=eq.${id}` },
        () => fetchItem(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "item_units",
          filter: `item_id=eq.${id}`,
        },
        () => fetchUnits(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const fetchItem = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("items")
      .select(
        `
        *,
        category:categories(name, color_hex),
        department:departments(name),
        creator:profiles!items_created_by_fkey(full_name)
      `,
      )
      .eq("id", id)
      .single();

    if (data) {
      setItem(data as unknown as ItemData);
      // Generate QR code
      const qrUrl = `${window.location.origin}/scan/${id}`;
      const dataUrl = await QRCode.toDataURL(qrUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: "#1e293b",
          light: "#ffffff",
        },
      });
      setQrDataUrl(dataUrl);
    }
    setIsLoading(false);
  };

  const fetchUnits = async () => {
    const { data } = await supabase
      .from("item_units")
      .select("*")
      .eq("item_id", id)
      .order("unit_number");

    if (data) setUnits(data);
  };

  const fetchActivityLogs = async () => {
    const { data } = await supabase
      .from("activity_logs")
      .select(`*`)
      .eq("entity_id", id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      const logs: ActivityLog[] = data.map((log) => ({
        id: log.id,
        action: log.action,
        description: log.description || "",
        created_at: log.created_at,
        performed_by: log.performed_by,
        performer: null,
      }));
      setActivityLogs(logs);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this item? This action cannot be undone.",
      )
    )
      return;

    const { error } = await supabase.from("items").delete().eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } else {
      toast({
        title: "Item Deleted",
        description: "The item has been permanently removed.",
      });
      navigate("/items");
    }
  };

  const downloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `QR-${item?.item_code || id}.png`;
    link.click();
    toast({
      title: "QR Downloaded",
      description: "QR code saved to your device.",
    });
  };

  const shareQR = async () => {
    const url = `${window.location.origin}/scan/${id}`;
    if (navigator.share) {
      await navigator.share({ title: `QR: ${item?.name}`, url });
    } else {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link Copied!",
        description: "QR scan link copied to clipboard.",
      });
    }
  };

  const printQR = () => {
    if (!qrDataUrl) return;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>QR Code - ${item?.name}</title></head>
          <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;font-family:system-ui,-apple-system,sans-serif;">
            <div style="padding:32px;border:1px solid #e5e7eb;border-radius:16px;text-align:center;">
              <img src="${qrDataUrl}" alt="QR Code" style="width:200px;height:200px;"/>
              <p style="margin-top:16px;font-size:12px;color:#6b7280;">${item?.item_code}</p>
              <p style="font-size:18px;font-weight:600;margin-top:8px;color:#1e293b;">${item?.name}</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleBorrow = () => {
    setBorrowDialogOpen(true);
  };

  const handleReportIssue = () => {
    setReportDialogOpen(true);
  };

  const handleImageZoom = (url: string) => {
    setSelectedZoomImage(url);
    setImageZoomOpen(true);
  };

  // Calculate unit stats
  const availableCount = units.filter((u) => u.status === "available").length;
  const issuedCount = units.filter(
    (u) => u.status === "issued" || u.status === "borrowed",
  ).length;
  const maintenanceCount = units.filter(
    (u) => u.status === "maintenance" || u.status === "under_maintenance",
  ).length;
  const totalUnits = units.length;

  // Get formatted location
  const getLocation = () => {
    const parts = [
      item?.lab_location,
      item?.storage_location,
      item?.shelf_location,
    ].filter(Boolean);
    return parts.join(" • ") || null;
  };

  // Render loading state
  if (isLoading) {
    return (
      <DashboardLayout
        title="Item Details"
        subtitle="Loading..."
        userRole={userRole as "admin" | "staff" | "student" | "technician"}
      >
        <ItemDetailSkeleton />
      </DashboardLayout>
    );
  }

  // Render not found state
  if (!item) {
    return (
      <DashboardLayout
        title="Item Not Found"
        userRole={userRole as "admin" | "staff" | "student" | "technician"}
      >
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
            <Package className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Item Not Found</h2>
          <p className="text-muted-foreground mb-8 max-w-md">
            The item you're looking for doesn't exist or has been removed from
            the inventory.
          </p>
          <Button onClick={() => navigate("/catalog")} size="lg">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Browse
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Menu items for three-dot menu
  const menuItems = (
    <>
      <DropdownMenuItem onClick={downloadQR}>
        <Download className="h-4 w-4 mr-2" /> Download QR
      </DropdownMenuItem>
      <DropdownMenuItem onClick={shareQR}>
        <Share2 className="h-4 w-4 mr-2" /> Share QR Code
      </DropdownMenuItem>
      <DropdownMenuItem onClick={printQR}>
        <Printer className="h-4 w-4 mr-2" /> Print QR
      </DropdownMenuItem>
      {canViewSensitive && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Wrench className="h-4 w-4 mr-2" /> Maintenance Log
          </DropdownMenuItem>
          <DropdownMenuItem>
            <History className="h-4 w-4 mr-2" /> Activity History
          </DropdownMenuItem>
        </>
      )}
      {isAdmin && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate(`/items/${id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" /> Edit Item
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleDelete}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" /> Delete Item
          </DropdownMenuItem>
        </>
      )}
    </>
  );

  return (
    <DashboardLayout
      title={item.name}
      subtitle={item.item_code}
      userRole={userRole as "admin" | "staff" | "student" | "technician"}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="gap-2 hover:bg-muted/80"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back</span>
          </Button>

          <div className="flex items-center gap-3">
            <StatusBadge status={item.status} />

            {/* Desktop dropdown menu */}
            <div className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {menuItems}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mobile drawer menu */}
            <div className="md:hidden">
              <Drawer open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <DrawerTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DrawerTrigger>
                <DrawerContent>
                  <DrawerHeader className="text-left">
                    <DrawerTitle>Options</DrawerTitle>
                    <DrawerDescription>
                      Choose an action for this item
                    </DrawerDescription>
                  </DrawerHeader>
                  <div className="px-4 pb-4 space-y-1">
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        downloadQR();
                        setMobileMenuOpen(false);
                      }}
                    >
                      <Download className="h-4 w-4 mr-3" /> Download QR
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        shareQR();
                        setMobileMenuOpen(false);
                      }}
                    >
                      <Share2 className="h-4 w-4 mr-3" /> Share QR Code
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        printQR();
                        setMobileMenuOpen(false);
                      }}
                    >
                      <Printer className="h-4 w-4 mr-3" /> Print QR
                    </Button>
                    {canViewSensitive && (
                      <>
                        <div className="border-t border-border my-2" />
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                        >
                          <Wrench className="h-4 w-4 mr-3" /> Maintenance Log
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                        >
                          <History className="h-4 w-4 mr-3" /> Activity History
                        </Button>
                      </>
                    )}
                    {isAdmin && (
                      <>
                        <div className="border-t border-border my-2" />
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => {
                            navigate(`/items/${id}/edit`);
                            setMobileMenuOpen(false);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-3" /> Edit Item
                        </Button>
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-destructive"
                          onClick={() => {
                            handleDelete();
                            setMobileMenuOpen(false);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-3" /> Delete Item
                        </Button>
                      </>
                    )}
                  </div>
                  <DrawerFooter>
                    <DrawerClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DrawerClose>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
            </div>
          </div>
        </div>

        {/* Main Layout - Responsive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column - Image Gallery & QR */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <ImageGallery
              mainImage={item.image_url}
              subImages={item.sub_images}
              itemName={item.name}
              onImageClick={handleImageZoom}
            />

            {/* QR Code Section */}
            <QRSection
              qrDataUrl={qrDataUrl}
              itemName={item.name}
              itemCode={item.item_code}
              onDownload={downloadQR}
              onShare={shareQR}
              onPrint={printQR}
            />

            {/* Action Buttons - Desktop */}
            <div className="hidden lg:flex flex-col gap-3">
              {isStudent && item.is_borrowable && (
                <Button
                  size="lg"
                  className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 gap-2"
                  onClick={handleBorrow}
                >
                  <HandHeart className="h-5 w-5" />
                  Request to Borrow
                </Button>
              )}
              <Button
                variant="outline"
                size="lg"
                className="w-full gap-2"
                onClick={handleReportIssue}
              >
                <AlertCircle className="h-5 w-5" />
                Report an Issue
              </Button>
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="lg:col-span-3 space-y-6">
            {/* Title Section - Mobile Only */}
            <div className="lg:hidden">
              <h1 className="text-2xl font-bold text-foreground mb-1">
                {item.name}
              </h1>
              <p className="text-sm text-muted-foreground font-mono">
                {item.item_code}
              </p>
            </div>

            {/* Title Section - Desktop */}
            <div className="hidden lg:block p-6 rounded-2xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {item.name}
              </h1>
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-sm text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                  {item.item_code}
                </span>
                {item.category && (
                  <Badge variant="secondary" className="gap-1">
                    <Tag className="h-3 w-3" />
                    {item.category.name}
                  </Badge>
                )}
                {item.department && (
                  <Badge variant="outline" className="gap-1">
                    <Building2 className="h-3 w-3" />
                    {item.department.name}
                  </Badge>
                )}
              </div>
            </div>

            {/* Quick Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <InfoCard
                icon={Hash}
                label="Serial Number"
                value={item.serial_number}
              />
              <InfoCard
                icon={Tag}
                label="Category"
                value={item.category?.name}
              />
              <InfoCard
                icon={Building2}
                label="Department"
                value={item.department?.name}
              />
              <InfoCard icon={MapPin} label="Location" value={getLocation()} />
              <InfoCard
                icon={Layers}
                label="Quantity"
                value={`${item.current_quantity || 0} ${item.unit || "pcs"}`}
              />
              <InfoCard
                icon={Shield}
                label="Condition"
                value={<ConditionBadge condition={item.condition} />}
              />
            </div>

            {/* Description */}
            {item.description && (
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Description
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Tabs for Additional Info */}
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="w-full grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 h-auto p-1 bg-muted/50">
                <TabsTrigger
                  value="details"
                  className="text-xs sm:text-sm py-2"
                >
                  Details
                </TabsTrigger>
                <TabsTrigger value="units" className="text-xs sm:text-sm py-2">
                  Units ({totalUnits})
                </TabsTrigger>
                {canViewSensitive && (
                  <TabsTrigger
                    value="maintenance"
                    className="text-xs sm:text-sm py-2"
                  >
                    Maintenance
                  </TabsTrigger>
                )}
                {canViewSensitive && (
                  <TabsTrigger
                    value="history"
                    className="text-xs sm:text-sm py-2"
                  >
                    History
                  </TabsTrigger>
                )}
                {isAdmin && (
                  <TabsTrigger
                    value="analytics"
                    className="text-xs sm:text-sm py-2"
                  >
                    Analytics
                  </TabsTrigger>
                )}
              </TabsList>

              {/* Details Tab */}
              <TabsContent value="details" className="mt-4 space-y-4">
                {/* Availability Card - Visible to all */}
                <AvailabilityCard
                  availableCount={availableCount}
                  totalCount={totalUnits || item.current_quantity}
                  issuedCount={issuedCount}
                  maintenanceCount={maintenanceCount}
                />

                {/* Purchase & Warranty - Staff/Admin only */}
                {canViewSensitive && (
                  <Card className="border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-primary" />
                        Purchase & Warranty
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">
                            Purchase Date
                          </p>
                          <p className="font-medium">
                            {item.purchase_date
                              ? new Date(
                                  item.purchase_date,
                                ).toLocaleDateString()
                              : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">
                            Purchase Price
                          </p>
                          <p className="font-medium">
                            ₹{item.purchase_price?.toLocaleString() || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">
                            Supplier
                          </p>
                          <p className="font-medium">
                            {item.supplier_name || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">
                            Warranty Until
                          </p>
                          <p className="font-medium">
                            {item.warranty_until
                              ? new Date(
                                  item.warranty_until,
                                ).toLocaleDateString()
                              : "—"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Additional Details - Staff/Admin only */}
                {canViewSensitive && (
                  <Card className="border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Info className="h-4 w-4 text-primary" />
                        Additional Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">
                            Brand
                          </p>
                          <p className="font-medium">{item.brand || "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">
                            Model
                          </p>
                          <p className="font-medium">
                            {item.model_number || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">
                            Shelf Location
                          </p>
                          <p className="font-medium">
                            {item.shelf_location || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">
                            Item Type
                          </p>
                          <p className="font-medium capitalize">
                            {item.item_type || "—"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Units Tab */}
              <TabsContent value="units" className="mt-4">
                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      Individual Units
                    </CardTitle>
                    <CardDescription>
                      Each unit has a unique serial number and QR code
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                      {units.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                          <Box className="h-12 w-12 mx-auto mb-3 opacity-30" />
                          <p className="font-medium">No units generated yet</p>
                          <p className="text-xs mt-1">
                            Units will appear here once created
                          </p>
                        </div>
                      ) : (
                        units.map((unit) => (
                          <div
                            key={unit.id}
                            className="flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 rounded-xl transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Barcode className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <span className="font-mono text-sm font-medium">
                                  {unit.unit_serial_number}
                                </span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <StatusBadge status={unit.status} />
                                  <ConditionBadge condition={unit.condition} />
                                </div>
                              </div>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-9 w-9"
                              onClick={() => {
                                const qrUrl = `${window.location.origin}/scan/unit/${unit.id}`;
                                QRCode.toDataURL(qrUrl, { width: 256 }).then(
                                  (url) => {
                                    const link = document.createElement("a");
                                    link.href = url;
                                    link.download = `QR-${unit.unit_serial_number}.png`;
                                    link.click();
                                    toast({
                                      title: "QR Downloaded",
                                      description: `Downloaded QR for ${unit.unit_serial_number}`,
                                    });
                                  },
                                );
                              }}
                            >
                              <QrCode className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Maintenance Tab - Staff/Admin/Technician only */}
              {canViewSensitive && (
                <TabsContent value="maintenance" className="mt-4">
                  <MaintenanceLogCard itemId={id || ""} />
                </TabsContent>
              )}

              {/* History Tab - Staff/Admin/Technician only */}
              {canViewSensitive && (
                <TabsContent value="history" className="mt-4">
                  <Card className="border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <History className="h-4 w-4 text-primary" />
                        Activity History
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                        {activityLogs.length === 0 ? (
                          <div className="text-center py-12 text-muted-foreground">
                            <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p className="font-medium">
                              No activity logged yet
                            </p>
                            <p className="text-xs mt-1">
                              Activities will appear here when recorded
                            </p>
                          </div>
                        ) : (
                          activityLogs.map((log) => (
                            <div
                              key={log.id}
                              className="flex items-start gap-3 p-3 bg-muted/30 hover:bg-muted/50 rounded-xl transition-colors"
                            >
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Clock className="h-4 w-4 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">
                                  {log.action}
                                  {log.description && (
                                    <span className="font-normal text-muted-foreground">
                                      {" "}
                                      - {log.description}
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {new Date(log.created_at).toLocaleString()}
                                  {log.performer &&
                                    ` by ${log.performer.full_name}`}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* Analytics Tab - Admin only */}
              {isAdmin && (
                <TabsContent value="analytics" className="mt-4">
                  <Card className="border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        Usage Analytics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 text-center border border-emerald-500/20">
                          <div className="text-3xl font-bold text-emerald-600">
                            {availableCount}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Available
                          </div>
                        </div>
                        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 text-center border border-blue-500/20">
                          <div className="text-3xl font-bold text-blue-600">
                            {issuedCount}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Issued
                          </div>
                        </div>
                        <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 text-center border border-amber-500/20">
                          <div className="text-3xl font-bold text-amber-600">
                            {maintenanceCount}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Maintenance
                          </div>
                        </div>
                      </div>
                      <div className="text-center text-muted-foreground py-8 rounded-xl border border-dashed border-border">
                        <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">
                          📊 Detailed charts coming soon!
                        </p>
                        <p className="text-xs mt-1">
                          Usage trends, borrow history, and more
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </div>
        </div>

        {/* Mobile Sticky Bottom Action Bar */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-lg border-t border-border z-50">
          <div className="flex gap-3 max-w-lg mx-auto">
            {isStudent && item.is_borrowable && (
              <Button
                className="flex-1 bg-gradient-to-r from-primary to-primary/80 gap-2"
                onClick={handleBorrow}
              >
                <HandHeart className="h-4 w-4" />
                Borrow
              </Button>
            )}
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={handleReportIssue}
            >
              <AlertCircle className="h-4 w-4" />
              Report Issue
            </Button>
            <Button variant="outline" size="icon" onClick={downloadQR}>
              <QrCode className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Add padding for mobile bottom bar */}
      <div className="lg:hidden h-24" />

      {/* Image Zoom Modal */}
      <ImageZoomModal
        imageUrl={selectedZoomImage}
        altText={item.name}
        isOpen={imageZoomOpen}
        onClose={() => setImageZoomOpen(false)}
      />

      {/* Borrow Request Dialog */}
      <BorrowRequestDialog
        itemId={id || ""}
        itemName={item.name}
        availableQuantity={item.current_quantity}
        isOpen={borrowDialogOpen}
        onClose={() => setBorrowDialogOpen(false)}
        onSuccess={() => fetchItem()}
      />

      {/* Report Issue Dialog */}
      <ReportIssueDialog
        itemId={id || ""}
        itemName={item.name}
        isOpen={reportDialogOpen}
        onClose={() => setReportDialogOpen(false)}
      />
    </DashboardLayout>
  );
}
