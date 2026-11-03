import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { BorrowRequestDialog } from "@/components/ui/BorrowRequestDialog";
import {
  ArrowLeft,
  Package,
  MapPin,
  Calendar,
  Shield,
  Tag,
  Hash,
  Layers,
  HandHeart,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Box,
  Barcode,
  Store,
  Ruler,
  FlaskConical,
  LogIn,
  Sparkles,
  Building2,
  CheckCircle,
  AlertTriangle,
  Clock,
  Eye,
  Info,
} from "lucide-react";

/* ---------- types ---------- */
interface ItemData {
  id: string;
  name: string;
  item_code: string;
  serial_number: string | null;
  description: string | null;
  status: string;
  condition: string;
  current_quantity: number;
  reorder_threshold: number | null;
  minimum_quantity?: number | null;
  unit: string | null;
  is_borrowable: boolean;
  image_url: string | null;
  sub_images: string[] | null;
  item_type: string | null;
  safety_level: string | null;
  brand: string | null;
  model_number: string | null;
  storage_location: string | null;
  lab_location: string | null;
  shelf_location: string | null;
  purchase_date: string | null;
  warranty_until: string | null;
  warranty_expiry?: string | null;
  category_id: string | null;
  department_id: string | null;
  category?: { name: string; color_hex: string | null } | null;
  department?: { name: string } | null;
}

interface RelatedItem {
  id: string;
  name: string;
  item_code: string;
  image_url: string | null;
  status: string;
  condition: string;
  current_quantity: number;
  is_borrowable: boolean;
}

/* ---- helpers ---- */
const statusConfig: Record<
  string,
  { color: string; icon: typeof CheckCircle; label: string }
> = {
  available: {
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    icon: CheckCircle,
    label: "Available",
  },
  borrowed: {
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    icon: Clock,
    label: "Borrowed",
  },
  under_maintenance: {
    color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    icon: AlertTriangle,
    label: "Under Maintenance",
  },
  damaged: {
    color: "bg-red-500/10 text-red-600 border-red-500/20",
    icon: AlertTriangle,
    label: "Damaged",
  },
};

const conditionColors: Record<string, string> = {
  excellent:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  good: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  fair: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  poor: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const safetyColors: Record<string, string> = {
  low: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  medium:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  hazardous: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

/* ============================================================= */

export default function PublicItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [item, setItem] = useState<ItemData | null>(null);
  const [relatedItems, setRelatedItems] = useState<RelatedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageZoomOpen, setImageZoomOpen] = useState(false);
  const [borrowDialogOpen, setBorrowDialogOpen] = useState(false);

  // Fetch item
  useEffect(() => {
    if (!id) return;
    const fetchItem = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("items")
        .select(
          `
          *,
          category:categories(name, color_hex),
          department:departments(name)
        `,
        )
        .eq("id", id)
        .single();

      if (!error && data) {
        const itemData = data as unknown as ItemData;
        setItem(itemData);
        setSelectedImage(itemData.image_url);
        setCurrentImageIndex(0);

        // Fetch related items (same category)
        if (itemData.category_id) {
          const { data: related } = await supabase
            .from("items")
            .select(
              "id, name, item_code, image_url, status, condition, current_quantity, is_borrowable",
            )
            .eq("category_id", itemData.category_id)
            .neq("id", id)
            .neq("status", "archived")
            .limit(8);
          setRelatedItems((related || []) as RelatedItem[]);
        }
      }
      setIsLoading(false);
    };
    fetchItem();
  }, [id]);

  const allImages = [item?.image_url, ...(item?.sub_images || [])].filter(
    Boolean,
  ) as string[];

  const handleImageSelect = (url: string, idx: number) => {
    setSelectedImage(url);
    setCurrentImageIndex(idx);
  };

  const handlePrev = () => {
    if (allImages.length <= 1) return;
    const newIdx =
      (currentImageIndex - 1 + allImages.length) % allImages.length;
    setSelectedImage(allImages[newIdx]);
    setCurrentImageIndex(newIdx);
  };

  const handleNext = () => {
    if (allImages.length <= 1) return;
    const newIdx = (currentImageIndex + 1) % allImages.length;
    setSelectedImage(allImages[newIdx]);
    setCurrentImageIndex(newIdx);
  };

  const handleBorrowClick = () => {
    if (!user) {
      // Redirect to login with return URL
      toast({
        title: "Login Required",
        description: "Please sign in to borrow this item.",
      });
      navigate(`/auth?redirect=/catalog/${id}`);
      return;
    }
    setBorrowDialogOpen(true);
  };

  const getLocation = () => {
    const parts = [
      item?.lab_location,
      item?.storage_location,
      item?.shelf_location,
    ].filter(Boolean);
    return parts.join(" → ") || null;
  };

  // Loading state
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (progressRef.current && item) {
      const minStock = Number(item.reorder_threshold ?? item.minimum_quantity ?? 0);
      const currentQty = Number(item.current_quantity ?? 0);
      const targetMax = Math.max(minStock * 2, currentQty, 1);
      const calculatedWidth = (currentQty / targetMax) * 100;
      const safeWidth = Math.min(Math.max(isNaN(calculatedWidth) ? 0 : calculatedWidth, 0), 100);

      progressRef.current.style.width = `${safeWidth}%`;
      progressRef.current.style.backgroundImage =
        currentQty > minStock
          ? "linear-gradient(to right, #10b981, #34d399)"
          : "linear-gradient(to right, #f59e0b, #f87171)";
    }
  }, [item]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="aspect-square rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not found
  if (!item) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
            <Package className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Item Not Found</h2>
          <p className="text-muted-foreground mb-8 max-w-md">
            The item you&apos;re looking for doesn&apos;t exist or has been
            removed.
          </p>
          <Button onClick={() => navigate("/catalog")} size="lg">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Catalog
          </Button>
        </div>
      </div>
    );
  }

  const sc = statusConfig[item.status] || statusConfig.available;
  const StatusIcon = sc.icon;

  /* ---- Info Row Component ---- */
  const InfoRow = ({
    icon: Icon,
    label,
    value,
  }: {
    icon: React.ElementType;
    label: string;
    value: React.ReactNode;
  }) =>
    value ? (
      <div className="flex items-start gap-3 py-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
        </div>
      </div>
    ) : null;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link
            to="/catalog"
            className="hover:text-foreground transition-colors"
          >
            Catalog
          </Link>
          <span>/</span>
          {item.category?.name && (
            <>
              <Link
                to={`/catalog?cat=${item.category_id}`}
                className="hover:text-foreground transition-colors"
              >
                {item.category.name}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-foreground font-medium truncate">
            {item.name}
          </span>
        </nav>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* ---- Left: Image Gallery ---- */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative group">
              <div
                className="aspect-square w-full rounded-2xl bg-gradient-to-br from-muted/50 to-muted overflow-hidden cursor-zoom-in border border-border/50 shadow-lg"
                onClick={() => selectedImage && setImageZoomOpen(true)}
              >
                {selectedImage ? (
                  <img
                    src={selectedImage}
                    alt={item.name}
                    className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/30">
                    <FlaskConical className="h-24 w-24 mb-4" />
                    <span className="text-sm font-medium">
                      No Image Available
                    </span>
                  </div>
                )}

                {/* Nav arrows */}
                {allImages.length > 1 && (
                  <>
                    <button
                      title="Previous image"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrev();
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

                {/* Counter */}
                {allImages.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs font-medium">
                    {currentImageIndex + 1} / {allImages.length}
                  </div>
                )}

                {/* Zoom hint */}
                {selectedImage && (
                  <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-sm text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" /> Click to zoom
                  </div>
                )}
              </div>
            </div>

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {allImages.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => handleImageSelect(url, i)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      currentImageIndex === i
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border/50 hover:border-primary/50"
                    }`}
                  >
                    <img
                      src={url}
                      alt={`${item.name} - ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ---- Right: Item Details ---- */}
          <div className="space-y-6">
            {/* Title + Status */}
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${sc.color}`}
                >
                  <StatusIcon className="h-3.5 w-3.5" />
                  {sc.label}
                </span>
                <Badge
                  variant="outline"
                  className={`capitalize ${conditionColors[item.condition] || ""}`}
                >
                  {item.condition}
                </Badge>
                {item.safety_level && safetyColors[item.safety_level] && (
                  <Badge
                    variant="outline"
                    className={`${safetyColors[item.safety_level]} gap-1`}
                  >
                    <Shield className="h-3 w-3" /> {item.safety_level}
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">
                {item.name}
              </h1>
              <p className="text-sm text-muted-foreground font-mono mt-1">
                {item.item_code}
              </p>
            </div>

            {/* Description */}
            {item.description && (
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4 text-primary" /> Description
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {item.description}
                </p>
              </div>
            )}

            {/* Availability Card */}
            <Card className="border-border/50 overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" /> Availability
                  </h3>
                  <span className="text-2xl font-bold text-primary">
                    {item.current_quantity}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    Unit:{" "}
                    <span className="text-foreground font-medium">
                      {item.unit || "pcs"}
                    </span>
                  </span>
                  <span>•</span>
                  <span>
                    Min Stock:{" "}
                    <span className="text-foreground font-medium">
                      {item.reorder_threshold ?? item.minimum_quantity ?? 0}
                    </span>
                  </span>
                </div>
                {/* Progress */}
                <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    ref={progressRef}
                    className="h-full rounded-full transition-all bg-primary"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Borrow Button */}
            {item.is_borrowable && (
              <Button
                size="lg"
                className="w-full gap-3 h-14 text-base bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-lg shadow-blue-500/25 rounded-xl"
                disabled={
                  item.status !== "available" || item.current_quantity <= 0
                }
                onClick={handleBorrowClick}
              >
                {user ? (
                  <>
                    <HandHeart className="h-5 w-5" /> Borrow This Item
                  </>
                ) : (
                  <>
                    <LogIn className="h-5 w-5" /> Sign In to Borrow
                  </>
                )}
              </Button>
            )}
            {!item.is_borrowable && (
              <div className="p-4 rounded-xl bg-muted/50 border border-border/50 text-center">
                <p className="text-sm text-muted-foreground">
                  This item is{" "}
                  <span className="font-semibold text-foreground">
                    not available for borrowing
                  </span>
                </p>
              </div>
            )}

            <Separator />

            {/* Details Grid */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Item Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:gap-x-4">
                <InfoRow
                  icon={Tag}
                  label="Category"
                  value={item.category?.name}
                />
                <InfoRow
                  icon={Building2}
                  label="Department"
                  value={item.department?.name}
                />
                <InfoRow
                  icon={Layers}
                  label="Item Type"
                  value={item.item_type}
                />
                <InfoRow icon={Store} label="Brand" value={item.brand} />
                <InfoRow
                  icon={Barcode}
                  label="Model Number"
                  value={item.model_number}
                />
                <InfoRow
                  icon={Hash}
                  label="Serial Number"
                  value={item.serial_number}
                />
                <InfoRow icon={Ruler} label="Unit" value={item.unit} />
                <InfoRow icon={MapPin} label="Location" value={getLocation()} />
                <InfoRow
                  icon={Calendar}
                  label="Purchase Date"
                  value={
                    item.purchase_date
                      ? new Date(item.purchase_date).toLocaleDateString()
                      : null
                  }
                />
                <InfoRow
                  icon={Shield}
                  label="Warranty Expiry"
                  value={
                    item.warranty_until || item.warranty_expiry
                      ? (() => {
                          const dateVal = item.warranty_until || (item.warranty_expiry as string);
                          const parsed = new Date(dateVal);
                          return isNaN(parsed.getTime()) ? null : parsed.toLocaleDateString();
                        })()
                      : null
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* ---- Related Items ---- */}
        {relatedItems.length > 0 && (
          <div className="mt-16">
            <h2 className="text-xl font-bold mb-6">Related Items</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {relatedItems.map((rel) => (
                <Card
                  key={rel.id}
                  className="group hover:shadow-lg transition-all cursor-pointer border-border/50 hover:border-primary/30 overflow-hidden rounded-xl"
                  onClick={() => navigate(`/catalog/${rel.id}`)}
                >
                  <div className="aspect-square bg-muted relative overflow-hidden">
                    {rel.image_url ? (
                      <img
                        src={rel.image_url}
                        alt={rel.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FlaskConical className="h-10 w-10 text-muted-foreground/20" />
                      </div>
                    )}
                    {rel.is_borrowable && (
                      <div className="absolute top-2 left-2">
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500 text-white">
                          <HandHeart className="h-2.5 w-2.5" /> Borrow
                        </span>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                      {rel.name}
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono">
                      {rel.item_code}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${conditionColors[rel.condition] || ""}`}
                      >
                        {rel.condition}
                      </Badge>
                      <span className="text-xs font-medium">
                        Qty: {rel.current_quantity}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Image Zoom Modal */}
      {imageZoomOpen && selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setImageZoomOpen(false)}
        >
          <img
            src={selectedImage}
            alt={item.name}
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setImageZoomOpen(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Borrow Dialog (only rendered when user is logged in) */}
      {user && (
        <BorrowRequestDialog
          itemId={id || ""}
          itemName={item.name}
          availableQuantity={item.current_quantity}
          isOpen={borrowDialogOpen}
          onClose={() => setBorrowDialogOpen(false)}
          onSuccess={() => {
            // Refresh item data
            window.location.reload();
          }}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-border/50 bg-muted/30 mt-12">
        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden bg-white">
                <img
                  src="/lablink-logo.jpg"
                  alt="LabLink"
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="font-display text-sm font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                LabLink
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              © 2025 LabLink. A{" "}
              <span className="text-blue-500 font-medium">
                LabLink Solution
              </span>{" "}
              by{" "}
              <span className="font-medium bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                Alphax Heros
              </span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ---- Shared Header Component ---- */
function Header() {
  const { user } = useAuth();
  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-4 lg:px-6">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-600 rounded-lg opacity-75 group-hover:opacity-100 blur-sm transition-opacity" />
            <div className="relative flex h-9 w-9 items-center justify-center rounded-lg overflow-hidden bg-white">
              <img
                src="/lablink-logo.jpg"
                alt="LabLink"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-display text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent leading-tight">
              LabLink
            </span>
            <span className="text-[9px] text-blue-500 -mt-0.5 tracking-wider font-medium">
              CATALOG
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Link to="/catalog">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <Package className="h-4 w-4" /> Catalog
            </Button>
          </Link>
          {user ? (
            <Link to="/dashboard">
              <Button variant="default" size="sm" className="gap-1.5">
                Dashboard
              </Button>
            </Link>
          ) : (
            <Link to="/auth">
              <Button variant="default" size="sm" className="gap-1.5">
                <LogIn className="h-4 w-4" /> Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
