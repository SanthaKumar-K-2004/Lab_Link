import { useState, useEffect, useRef, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  QrCode, 
  Camera, 
  Search, 
  Package, 
  CheckCircle2, 
  XCircle, 
  Clock,
  AlertCircle,
  ArrowRight,
  Loader2,
  CameraOff
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import jsQR from "jsqr";

interface ScannedItem {
  id: string;
  name: string;
  item_code: string;
  status: string;
  current_quantity: number;
  storage_location?: string;
  category?: { name: string };
  department?: { name: string };
}

export default function QRScan() {
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [scannedItem, setScannedItem] = useState<ScannedItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [recentScans, setRecentScans] = useState<ScannedItem[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  
  const navigate = useNavigate();
  const RECENT_SCANS_KEY = "lablink_recent_scans";

  // Load user scan history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SCANS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentScans(parsed);
        }
      }
    } catch (error) {
      console.error("Error loading recent scans from localStorage:", error);
    }
  }, []);

  const recordRecentScan = (item: ScannedItem) => {
    setRecentScans((prev) => {
      // Omit physical shelf/storage coordinates from localStorage to prevent physical asset location disclosure (SEC-07)
      const sanitizedItem: ScannedItem = {
        id: item.id,
        name: item.name,
        item_code: item.item_code,
        status: item.status,
        current_quantity: item.current_quantity,
        category: item.category,
        department: item.department,
      };
      const filtered = prev.filter((i) => i.id !== item.id || i.name !== item.name);
      const updated = [sanitizedItem, ...filtered].slice(0, 10);
      try {
        localStorage.setItem(RECENT_SCANS_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error("Error saving scan to localStorage:", err);
      }
      return updated;
    });
  };

  const clearRecentScans = () => {
    try {
      localStorage.removeItem(RECENT_SCANS_KEY);
      setRecentScans([]);
      toast.success("Recent scan history cleared");
    } catch (err) {
      console.error("Error clearing recent scans:", err);
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsScanning(true);
        requestAnimationFrame(scanFrame);
      }
    } catch (error) {
      console.error("Camera error:", error);
      setCameraError("Unable to access camera. Please check permissions.");
      toast.error("Camera access denied");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setIsScanning(false);
  };

  const scanFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    
    if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      
      if (code && code.data) {
        stopCamera();
        handleScan(code.data);
        return;
      }
    }
    
    animationRef.current = requestAnimationFrame(scanFrame);
  }, [isScanning]);

  useEffect(() => {
    if (isScanning) {
      animationRef.current = requestAnimationFrame(scanFrame);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isScanning, scanFrame]);

  const handleScan = async (code: string) => {
    setIsLoading(true);
    
    try {
      // Parse QR data - might be JSON, URL (/scan/:id or /scan/unit/:unitId), LABLINK format, or item code/ID
      let searchId = code.trim();
      let isUnitScan = false;
      let unitId = "";

      // 1. Check for /scan/unit/:unitId URL structure
      if (searchId.includes("/scan/unit/")) {
        const parts = searchId.split("/scan/unit/");
        unitId = parts[parts.length - 1].split("?")[0].split("#")[0].replace(/\/+$/, "").trim();
        isUnitScan = true;
      } else if (searchId.includes("/scan/")) {
        const parts = searchId.split("/scan/");
        searchId = parts[parts.length - 1].split("?")[0].split("#")[0].replace(/\/+$/, "").trim();
        if (searchId.startsWith("unit/")) {
          unitId = searchId.replace(/^unit\//, "").trim();
          isUnitScan = true;
        }
      } else if (searchId.startsWith("LABLINK:")) {
        const parts = searchId.split(":");
        if (parts.length >= 2) {
          if (parts[1] === "unit" && parts[2]) {
            unitId = parts[2].trim();
            isUnitScan = true;
          } else {
            searchId = parts[1].trim();
          }
        }
      } else if (searchId.startsWith("unit/")) {
        unitId = searchId.replace(/^unit\//, "").trim();
        isUnitScan = true;
      }

      // Check if data is JSON payload
      try {
        const parsed = JSON.parse(code);
        if (parsed.unit_id) {
          unitId = parsed.unit_id;
          isUnitScan = true;
        } else {
          searchId = parsed.id || parsed.item_code || searchId;
        }
      } catch {
        // Not JSON, use extracted searchId/unitId
      }

      // 2. If it's a specific unit scan, query item_units joining items
      if (isUnitScan && unitId) {
        const isUnitUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(unitId);
        let unitQuery = supabase
          .from("item_units")
          .select("id, unit_serial_number, unit_number, status, current_location, item:items(id, name, item_code, status, current_quantity, storage_location, category:categories(name), department:departments(name))");

        if (isUnitUUID) {
          unitQuery = unitQuery.or(`id.eq.${unitId},unit_serial_number.eq.${unitId}`);
        } else {
          unitQuery = unitQuery.eq("unit_serial_number", unitId);
        }

        const { data: unitRecord } = await unitQuery.maybeSingle();

        if (unitRecord && unitRecord.item) {
          const parentItem = unitRecord.item as any;
          const foundUnit: ScannedItem = {
            id: parentItem.id,
            name: `${parentItem.name} (Unit #${unitRecord.unit_number || unitRecord.unit_serial_number})`,
            item_code: parentItem.item_code,
            status: unitRecord.status || parentItem.status,
            current_quantity: parentItem.current_quantity,
            storage_location: unitRecord.current_location || parentItem.storage_location,
            category: parentItem.category,
            department: parentItem.department,
          };
          setScannedItem(foundUnit);
          toast.success("Unit found!", { description: foundUnit.name });
          recordRecentScan(foundUnit);
          return;
        }
      }
      
      // 3. General item search (validate UUID format to prevent Postgres 22P02 error)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchId);
      
      let query = supabase
        .from("items")
        .select("id, name, item_code, status, current_quantity, storage_location, category:categories(name), department:departments(name)");

      if (isUUID) {
        query = query.or(`id.eq.${searchId},item_code.eq.${searchId}`);
      } else {
        query = query.eq("item_code", searchId);
      }

      const { data, error } = await query.maybeSingle();

      if (data) {
        const item = data as ScannedItem;
        setScannedItem(item);
        toast.success("Item found!", {
          description: item.name
        });
        recordRecentScan(item);
        return;
      }

      // 4. Fallback: check item_units in case searchId matches unit_serial_number or unit UUID
      let fallbackUnitQuery = supabase
        .from("item_units")
        .select("id, unit_serial_number, unit_number, status, current_location, item:items(id, name, item_code, status, current_quantity, storage_location, category:categories(name), department:departments(name))");

      if (isUUID) {
        fallbackUnitQuery = fallbackUnitQuery.or(`id.eq.${searchId},unit_serial_number.eq.${searchId}`);
      } else {
        fallbackUnitQuery = fallbackUnitQuery.eq("unit_serial_number", searchId);
      }

      const { data: fallbackUnit } = await fallbackUnitQuery.maybeSingle();
      if (fallbackUnit && fallbackUnit.item) {
        const parentItem = fallbackUnit.item as any;
        const foundUnit: ScannedItem = {
          id: parentItem.id,
          name: `${parentItem.name} (Unit #${fallbackUnit.unit_number || fallbackUnit.unit_serial_number})`,
          item_code: parentItem.item_code,
          status: fallbackUnit.status || parentItem.status,
          current_quantity: parentItem.current_quantity,
          storage_location: fallbackUnit.current_location || parentItem.storage_location,
          category: parentItem.category,
          department: parentItem.department,
        };
        setScannedItem(foundUnit);
        toast.success("Unit found!", { description: foundUnit.name });
        recordRecentScan(foundUnit);
        return;
      }

      toast.error("Item not found", {
        description: `No item or unit found with code: ${searchId}`
      });
      setScannedItem(null);
    } catch (error) {
      console.error("Error scanning item:", error);
      toast.error("Error scanning item");
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSearch = () => {
    if (manualCode.trim()) {
      handleScan(manualCode.trim());
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      available: { color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: <CheckCircle2 className="w-3 h-3" /> },
      borrowed: { color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: <Clock className="w-3 h-3" /> },
      under_maintenance: { color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: <AlertCircle className="w-3 h-3" /> },
      damaged: { color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: <XCircle className="w-3 h-3" /> },
    };
    
    const config = statusConfig[status] || statusConfig.available;
    return (
      <Badge className={`${config.color} gap-1`}>
        {config.icon}
        {status.replace("_", " ")}
      </Badge>
    );
  };

  return (
    <DashboardLayout title="QR Scanner" subtitle="Scan item QR codes">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            QR Code Scanner
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Scan item QR codes to quickly view or manage inventory items
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Scanner Section */}
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="icon-container blue h-10 w-10 rounded-xl flex items-center justify-center">
                  <QrCode className="h-5 w-5" />
                </div>
                Scan QR Code
              </CardTitle>
              <CardDescription>
                Use camera or enter code manually
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="camera" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="camera" className="flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Camera
                  </TabsTrigger>
                  <TabsTrigger value="manual" className="flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    Manual Entry
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="camera" className="space-y-4">
                  <div className="relative aspect-square max-h-[300px] rounded-xl overflow-hidden border-2 border-dashed border-blue-300 dark:border-blue-700 bg-gray-900">
                    {isScanning ? (
                      <>
                        <video
                          ref={videoRef}
                          className="absolute inset-0 w-full h-full object-cover"
                          playsInline
                          muted
                        />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-48 h-48 border-2 border-blue-500 rounded-2xl animate-pulse" />
                        </div>
                        <canvas ref={canvasRef} className="hidden" />
                      </>
                    ) : cameraError ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                        <CameraOff className="w-12 h-12 text-red-400 mb-3" />
                        <p className="text-sm text-red-400">{cameraError}</p>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <Camera className="w-16 h-16 text-gray-400 mb-4" />
                        <p className="text-sm text-gray-400 mb-4">
                          Click to start scanning
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {isScanning ? (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={stopCamera}
                    >
                      Stop Scanner
                    </Button>
                  ) : (
                    <Button 
                      className="w-full"
                      onClick={startCamera}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Start Scanner
                    </Button>
                  )}
                </TabsContent>
                
                <TabsContent value="manual" className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter item code or ID..."
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
                    />
                    <Button onClick={handleManualSearch} disabled={isLoading}>
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Enter the item code printed below the QR code
                  </p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Scanned Item Result */}
          <Card className="dashboard-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="icon-container green h-10 w-10 rounded-xl flex items-center justify-center">
                  <Package className="h-5 w-5" />
                </div>
                Scanned Item
              </CardTitle>
              <CardDescription>
                Item details will appear here after scanning
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : scannedItem ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {scannedItem.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Code: {scannedItem.item_code}
                      </p>
                    </div>
                    {getStatusBadge(scannedItem.status)}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <p className="text-gray-500 dark:text-gray-400">Category</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {scannedItem.category?.name || "—"}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <p className="text-gray-500 dark:text-gray-400">Quantity</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {scannedItem.current_quantity}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <p className="text-gray-500 dark:text-gray-400">Department</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {scannedItem.department?.name || "—"}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <p className="text-gray-500 dark:text-gray-400">Location</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {scannedItem.storage_location || "—"}
                      </p>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full"
                    onClick={() => navigate(`/items/${scannedItem.id}`)}
                  >
                    View Full Details
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <QrCode className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No item scanned yet
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Scan a QR code to see item details
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Scans */}
        <Card className="dashboard-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Scans</CardTitle>
              <CardDescription>
                Your recent QR scan history
              </CardDescription>
            </div>
            {recentScans.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearRecentScans}>
                Clear History
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {recentScans.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {recentScans.map((item) => (
                  <button
                    key={`${item.id}-${item.name}`}
                    onClick={() => navigate(`/items/${item.id}`)}
                    className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all text-left group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono text-gray-400">
                        {item.item_code}
                      </span>
                      {getStatusBadge(item.status)}
                    </div>
                    <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                      {item.name}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {item.category?.name || "Uncategorized"}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                No recent scans yet. Scanned items will appear here.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
