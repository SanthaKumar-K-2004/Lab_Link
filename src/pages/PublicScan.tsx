import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Package, MapPin, Calendar, Tag, Building2, 
  CheckCircle, AlertTriangle, Wrench, User, ArrowLeft
} from "lucide-react";

export default function PublicScanPage() {
  const { id, unitId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) fetchItem();
    else if (unitId) fetchUnit();
  }, [id, unitId]);

  const fetchItem = async () => {
    setIsLoading(true);
    const { data: item, error } = await supabase
      .from("items")
      .select(`
        id, name, description, item_code, serial_number,
        status, current_quantity, image_url,
        purchase_date, warranty_until,
        lab_location, shelf_location,
        category:categories(name),
        department:departments(name)
      `)
      .eq("id", id)
      .single();

    if (item) {
      // Get unit count
      const { count } = await supabase
        .from("item_units")
        .select("id", { count: "exact" })
        .eq("item_id", id)
        .eq("status", "available");
      
      setData({ ...item, available_units: count || 0 });
      
      // Log scan activity via rate-limited SECURITY DEFINER RPC
      try {
        await supabase.rpc("log_public_scan", { p_item_id: id });
      } catch (logErr) {
        console.warn("Could not log public scan:", logErr);
      }
    }
    setIsLoading(false);
  };

  const fetchUnit = async () => {
    setIsLoading(true);
    const { data: unit } = await supabase
      .from("item_units")
      .select(`
        *,
        item:items(
          id, name, description, item_code, image_url,
          category:categories(name),
          department:departments(name)
        )
      `)
      .eq("id", unitId)
      .single();

    if (unit) {
      setData({ ...unit.item, unit });
    }
    setIsLoading(false);
  };

  const getStatusDisplay = (status: string) => {
    const config: Record<string, { color: string; icon: any; label: string }> = {
      available: { color: "bg-green-500", icon: CheckCircle, label: "Available" },
      issued: { color: "bg-blue-500", icon: User, label: "Currently Issued" },
      borrowed: { color: "bg-blue-500", icon: User, label: "Currently Borrowed" },
      maintenance: { color: "bg-yellow-500", icon: Wrench, label: "Under Maintenance" },
      under_maintenance: { color: "bg-yellow-500", icon: Wrench, label: "Under Maintenance" },
      damaged: { color: "bg-red-500", icon: AlertTriangle, label: "Damaged" },
    };
    const c = config[status] || { color: "bg-gray-500", icon: Package, label: status };
    const Icon = c.icon;
    return (
      <div className={`${c.color} text-white px-4 py-2 rounded-lg flex items-center gap-2 justify-center`}>
        <Icon className="h-5 w-5" />
        <span className="font-medium">{c.label}</span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading item details...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="bg-slate-800/50 border-slate-700 max-w-md w-full text-center p-8">
          <AlertTriangle className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Item Not Found</h1>
          <p className="text-slate-400 mb-6">The scanned QR code is invalid or the item has been removed.</p>
          <Button onClick={() => navigate("/")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" /> Go to Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)} className="text-white">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <Badge className="bg-primary/20 text-primary">QR Scan Result</Badge>
        </div>

        {/* Main Image */}
        <Card className="bg-slate-800/50 border-slate-700 overflow-hidden">
          <div className="aspect-video bg-slate-700 flex items-center justify-center">
            {data.image_url ? (
              <img src={data.image_url} alt={data.name} className="w-full h-full object-cover" />
            ) : (
              <Package className="h-20 w-20 text-slate-500" />
            )}
          </div>
        </Card>

        {/* Status */}
        <div>{getStatusDisplay(data.unit?.status || data.status)}</div>

        {/* Item Info */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-xl">{data.name}</CardTitle>
            {data.unit && (
              <Badge className="bg-blue-500/20 text-blue-400 w-fit">
                Unit: {data.unit.unit_serial_number}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-slate-300">
                <Tag className="h-4 w-4 text-slate-400" />
                <span className="text-sm">{data.item_code || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Building2 className="h-4 w-4 text-slate-400" />
                <span className="text-sm">{data.category?.name || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span className="text-sm">{data.department?.name || "N/A"}</span>
              </div>
              {data.available_units !== undefined && (
                <div className="flex items-center gap-2 text-slate-300">
                  <Package className="h-4 w-4 text-slate-400" />
                  <span className="text-sm">{data.available_units} available</span>
                </div>
              )}
            </div>

            {data.description && (
              <div className="pt-3 border-t border-slate-700">
                <div className="text-slate-400 text-xs uppercase mb-1">Description</div>
                <p className="text-slate-300 text-sm">{data.description}</p>
              </div>
            )}

            {(data.purchase_date || data.warranty_until) && (
              <div className="pt-3 border-t border-slate-700 grid grid-cols-2 gap-3">
                {data.purchase_date && (
                  <div>
                    <div className="text-slate-400 text-xs">Purchase Date</div>
                    <div className="text-slate-300 text-sm flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {data.purchase_date}
                    </div>
                  </div>
                )}
                {data.warranty_until && (
                  <div>
                    <div className="text-slate-400 text-xs">Warranty Until</div>
                    <div className="text-slate-300 text-sm flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {data.warranty_until}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action */}
        <Button 
          className="w-full bg-gradient-to-r from-primary to-secondary"
          onClick={() => navigate(`/auth`)}
        >
          Login to View More Details
        </Button>

        {/* Footer */}
        <div className="text-center text-slate-500 text-xs pt-4">
          Powered by LabLink • Digital Lab Inventory System
        </div>
      </div>
    </div>
  );
}
