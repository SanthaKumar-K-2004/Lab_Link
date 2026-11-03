import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  QrCode, Search, Download, RefreshCw, Package, Eye, 
  Printer, Camera, CheckCircle, XCircle, Loader2,
  MoreHorizontal, Zap
} from "lucide-react";
import { Link } from "react-router-dom";
import QRCodeLib from "qrcode";
import { QRPreviewModal } from "@/components/qr/QRPreviewModal";
import { BulkQRPrint } from "@/components/qr/BulkQRPrint";
import { QRScanner } from "@/components/qr/QRScanner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ItemWithQR {
  id: string;
  name: string;
  item_code: string;
  qr_code_data: string | null;
  status: string;
  current_quantity: number;
  storage_location?: string;
  category?: { name: string };
  department?: { name: string };
}

interface Category {
  id: string;
  name: string;
}

export default function QRManagement() {
  const { toast } = useToast();
  const [items, setItems] = useState<ItemWithQR[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  
  // Modal states
  const [previewItem, setPreviewItem] = useState<ItemWithQR | null>(null);
  const [showBulkPrint, setShowBulkPrint] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, []);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("items")
        .select(`
          id, name, item_code, qr_code_data, status, current_quantity, storage_location,
          category:categories(name),
          department:departments(name)
        `)
        .order("name");

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to fetch items",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("id, name")
      .order("name");
    setCategories(data || []);
  };

  const generateQRCode = async (itemId: string, itemCode: string) => {
    // Generate web-compatible URL so both phone cameras and in-app scanners work seamlessly
    return `${window.location.origin}/scan/${itemId}`;
  };

  const handleRegenerateQR = async (item: ItemWithQR) => {
    setRegenerating(item.id);
    try {
      const newQrData = await generateQRCode(item.id, item.item_code);
      
      const { error } = await supabase
        .from("items")
        .update({ qr_code_data: newQrData })
        .eq("id", item.id);

      if (error) throw error;

      toast({ title: "Success", description: "QR code regenerated" });
      fetchItems();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to regenerate QR code",
      });
    } finally {
      setRegenerating(null);
    }
  };

  const handleBulkGenerateQR = async () => {
    const itemsWithoutQR = items.filter(i => !i.qr_code_data);
    if (itemsWithoutQR.length === 0) {
      toast({ title: "Info", description: "All items already have QR codes" });
      return;
    }

    setIsBulkGenerating(true);
    let successCount = 0;
    
    try {
      for (const item of itemsWithoutQR) {
        const qrData = await generateQRCode(item.id, item.item_code);
        
        const { error } = await supabase
          .from("items")
          .update({ qr_code_data: qrData })
          .eq("id", item.id);
        
        if (!error) successCount++;
      }
      
      toast({
        title: "Bulk Generation Complete",
        description: `Generated QR codes for ${successCount} items`,
      });
      fetchItems();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Some QR codes failed to generate",
      });
    } finally {
      setIsBulkGenerating(false);
    }
  };

  const downloadQR = async (item: ItemWithQR) => {
    try {
      const qrData = item.qr_code_data || item.id;
      const dataUrl = await QRCodeLib.toDataURL(qrData, {
        width: 400,
        margin: 2,
        color: { dark: "#000000", light: "#FFFFFF" },
        errorCorrectionLevel: "H",
      });

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `QR-${item.item_code}.png`;
      link.click();

      toast({ title: "Downloaded", description: `QR code for ${item.name}` });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to download QR code",
      });
    }
  };

  const toggleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map(i => i.id)));
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.item_code.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = 
      categoryFilter === "all" || item.category?.name === categoryFilter;
    
    const matchesStatus = 
      statusFilter === "all" || 
      (statusFilter === "with_qr" && item.qr_code_data) ||
      (statusFilter === "without_qr" && !item.qr_code_data);
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const itemsWithQR = items.filter(i => i.qr_code_data).length;
  const itemsWithoutQR = items.filter(i => !i.qr_code_data).length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available": return "bg-green-500/10 text-green-600 border-green-200";
      case "borrowed": return "bg-blue-500/10 text-blue-600 border-blue-200";
      case "under_maintenance": return "bg-yellow-500/10 text-yellow-600 border-yellow-200";
      case "damaged": return "bg-red-500/10 text-red-600 border-red-200";
      default: return "bg-gray-500/10 text-gray-600 border-gray-200";
    }
  };

  return (
    <DashboardLayout title="QR Code Management" subtitle="Generate, preview, and print QR codes for inventory items">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Total Items
              </CardDescription>
              <CardTitle className="text-2xl">{items.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/10">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                With QR Code
              </CardDescription>
              <CardTitle className="text-2xl text-green-600">{itemsWithQR}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/10">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-yellow-600">
                <XCircle className="h-4 w-4" />
                Without QR Code
              </CardDescription>
              <CardTitle className="text-2xl text-yellow-600">{itemsWithoutQR}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/10">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2 text-blue-600">
                <QrCode className="h-4 w-4" />
                Selected
              </CardDescription>
              <CardTitle className="text-2xl text-blue-600">{selectedItems.size}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Controls */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-4 items-end justify-between">
              <div className="flex flex-wrap gap-3 items-end">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-[200px]"
                  />
                </div>
                
                {/* Category Filter */}
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* QR Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="QR Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Items</SelectItem>
                    <SelectItem value="with_qr">With QR</SelectItem>
                    <SelectItem value="without_qr">Without QR</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setShowScanner(true)}>
                  <Camera className="h-4 w-4 mr-2" />
                  Scan QR
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={handleBulkGenerateQR}
                  disabled={isBulkGenerating || itemsWithoutQR === 0}
                >
                  {isBulkGenerating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  Generate All ({itemsWithoutQR})
                </Button>
                
                <Button 
                  onClick={() => setShowBulkPrint(true)}
                  disabled={filteredItems.length === 0}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print QR Sheet
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-primary" />
                  Item QR Codes
                </CardTitle>
                <CardDescription>
                  {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""} 
                  {selectedItems.size > 0 && ` • ${selectedItems.size} selected`}
                </CardDescription>
              </div>
              {selectedItems.size > 0 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedItems(new Set())}
                >
                  Clear Selection
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <QrCode className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">No items found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try adjusting your search or filters
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>QR Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow 
                      key={item.id}
                      className={selectedItems.has(item.id) ? "bg-primary/5" : ""}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedItems.has(item.id)}
                          onCheckedChange={() => toggleSelectItem(item.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{item.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                          {item.item_code}
                        </code>
                      </TableCell>
                      <TableCell>
                        {item.category?.name || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusColor(item.status)}>
                          {item.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.qr_code_data ? (
                          <Badge className="bg-green-500/10 text-green-600 border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Generated
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="h-3 w-3 mr-1" />
                            None
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setPreviewItem(item)}
                            title="Preview QR"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => downloadQR(item)}
                            title="Download QR"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleRegenerateQR(item)}>
                                <RefreshCw className={`h-4 w-4 mr-2 ${regenerating === item.id ? "animate-spin" : ""}`} />
                                Regenerate QR
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link to={`/items/${item.id}`}>
                                  <Package className="h-4 w-4 mr-2" />
                                  View Item Details
                                </Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <QRPreviewModal
        item={previewItem}
        open={!!previewItem}
        onOpenChange={(open) => !open && setPreviewItem(null)}
      />
      
      <BulkQRPrint
        items={selectedItems.size > 0 
          ? filteredItems.filter(i => selectedItems.has(i.id))
          : filteredItems
        }
        open={showBulkPrint}
        onOpenChange={setShowBulkPrint}
      />
      
      <QRScanner
        open={showScanner}
        onOpenChange={setShowScanner}
      />
    </DashboardLayout>
  );
}
