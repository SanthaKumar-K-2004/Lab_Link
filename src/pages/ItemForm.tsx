import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { 
  ArrowLeft, Save, Package, Tag, MapPin, DollarSign, 
  Calendar, ImageIcon, Info, Shield, Upload, X, Loader2,
  CheckCircle, ChevronRight, Building2, Hash, Barcode, AlertCircle
} from "lucide-react";
import { ImageUpload } from "@/components/ui/ImageUpload";


interface Category {
  id: string;
  name: string;
}

interface Department {
  id: string;
  name: string;
}

const itemTypes = [
  { value: "equipment", label: "Equipment", icon: "🔧" },
  { value: "consumable", label: "Consumable", icon: "📦" },
  { value: "chemical", label: "Chemical", icon: "🧪" },
  { value: "tool", label: "Tool", icon: "🛠️" },
  { value: "glassware", label: "Glassware", icon: "🧫" },
  { value: "electronic", label: "Electronic", icon: "⚡" },
  { value: "furniture", label: "Furniture", icon: "🪑" },
  { value: "other", label: "Other", icon: "📋" },
];

const conditionOptions = [
  { value: "new", label: "New", color: "bg-emerald-500" },
  { value: "excellent", label: "Excellent", color: "bg-green-500" },
  { value: "good", label: "Good", color: "bg-blue-500" },
  { value: "fair", label: "Fair", color: "bg-yellow-500" },
  { value: "poor", label: "Poor", color: "bg-orange-500" },
  { value: "damaged", label: "Damaged", color: "bg-red-500" },
];

const safetyLevels = [
  { value: "low", label: "Low Risk", color: "text-green-500", bg: "bg-green-500/10" },
  { value: "medium", label: "Medium Risk", color: "text-yellow-500", bg: "bg-yellow-500/10" },
  { value: "high", label: "High Risk", color: "text-orange-500", bg: "bg-orange-500/10" },
  { value: "hazardous", label: "Hazardous", color: "text-red-500", bg: "bg-red-500/10" },
];

const statusOptions = [
  { value: "available", label: "Available" },
  { value: "borrowed", label: "Borrowed" },
  { value: "under_maintenance", label: "Under Maintenance" },
  { value: "damaged", label: "Damaged" },
  { value: "archived", label: "Archived" },
];

export default function ItemFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(isEdit);
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    serial_number: "",
    asset_tag: "",
    barcode: "",
    model_number: "",
    brand: "",
    category_id: "",
    department_id: "",
    item_type: "equipment",
    lab_location: "",
    shelf_location: "",
    storage_location: "",
    purchase_date: "",
    purchase_price: "",
    supplier_name: "",
    supplier_contact: "",
    invoice_reference: "",
    warranty_until: "",
    current_quantity: 1,
    reorder_threshold: 1,
    unit: "pcs",
    condition: "good",
    safety_level: "low",
    hazard_type: "",
    storage_requirements: "",
    special_handling_notes: "",
    status: "available",
    is_borrowable: true,
    image_url: "",
    sub_images: [] as string[],
    notes: "",
  });

  useEffect(() => {
    fetchCategories();
    fetchDepartments();
    if (isEdit) {
      fetchItem();
    }
  }, [id]);

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("id, name").order("name");
    if (data) setCategories(data);
  };

  const fetchDepartments = async () => {
    const { data } = await supabase.from("departments").select("id, name").eq("is_active", true).order("name");
    if (data) setDepartments(data);
  };

  const fetchItem = async () => {
    setIsFetching(true);
    const { data } = await supabase.from("items").select("*").eq("id", id).single();
    if (data) {
      setFormData({
        ...formData,
        ...data,
        purchase_date: data.purchase_date || "",
        warranty_until: data.warranty_until || "",
        purchase_price: data.purchase_price?.toString() || "",
        sub_images: data.sub_images || [],
      });
    }
    setIsFetching(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleNumberChange = (name: string, value: number) => {
    setFormData({ ...formData, [name]: value });
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.name.trim()) {
          toast({ variant: "destructive", title: "Required", description: "Item name is required" });
          return false;
        }
        return true;
      case 2:
        if (!formData.department_id) {
          toast({ variant: "destructive", title: "Required", description: "Department is required" });
          return false;
        }
        return true;
      case 5:
        // Image is required for new items
        if (!isEdit && !formData.image_url) {
          toast({ 
            variant: "destructive", 
            title: "Image Required", 
            description: "Please upload at least one image before saving the item" 
          });
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(Math.min(5, currentStep + 1));
    }
  };

  const prevStep = () => {
    setCurrentStep(Math.max(1, currentStep - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Name is required." });
      setCurrentStep(1);
      return;
    }

    if (!formData.department_id) {
      toast({ variant: "destructive", title: "Error", description: "Department is required." });
      setCurrentStep(2);
      return;
    }

    // Validate image is uploaded for new items
    if (!isEdit && !formData.image_url) {
      toast({ 
        variant: "destructive", 
        title: "Image Required", 
        description: "Please upload at least one image before saving the item." 
      });
      setCurrentStep(5);
      return;
    }

    setIsLoading(true);

    // Generate unique item_code for new items if not provided
    const generateItemCode = () => {
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      return `ITM-${timestamp}-${random}`;
    };

    const rawPrice = formData.purchase_price ? parseFloat(formData.purchase_price) : null;
    const parsedPrice = rawPrice !== null && !isNaN(rawPrice) ? rawPrice : null;

    const itemData: any = {
      ...formData,
      purchase_price: parsedPrice,
      purchase_date: formData.purchase_date || null,
      warranty_until: formData.warranty_until || null,
      category_id: formData.category_id || null,
      safety_level: formData.safety_level as "low" | "medium" | "high" | "hazardous",
      status: formData.status as "available" | "borrowed" | "under_maintenance" | "damaged" | "archived",
      condition: formData.condition as "new" | "excellent" | "good" | "fair" | "poor" | "damaged",
    };

    if (isEdit) {
      delete itemData.created_by;
      delete itemData.id;
    } else {
      itemData.created_by = user?.id;
      itemData.item_code = generateItemCode();
    }

    try {
      if (isEdit) {
        const { error } = await supabase.from("items").update(itemData).eq("id", id);
        if (error) throw error;
        toast({ title: "Success!", description: "Item has been updated successfully." });
      } else {
        const { error } = await supabase.from("items").insert([itemData]);
        if (error) throw error;
        toast({ title: "Success!", description: "New item has been added to inventory." });
      }
      navigate("/items");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { num: 1, title: "Basic Info", icon: Info },
    { num: 2, title: "Classification", icon: Tag },
    { num: 3, title: "Purchase", icon: DollarSign },
    { num: 4, title: "Inventory", icon: Package },
    { num: 5, title: "Images", icon: ImageIcon },
  ];

  if (isFetching) {
    return (
      <DashboardLayout title="Loading..." subtitle="Please wait">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title={isEdit ? "Edit Item" : "Add New Item"} 
      subtitle={isEdit ? "Update item information" : "Add a new item to inventory"}
    >
      <div className="space-y-6">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate("/items")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Inventory
        </Button>

        {/* Progress Steps - Horizontal Pills (Scrollable on Mobile) */}
        <div className="flex items-center justify-start sm:justify-center gap-1 p-2 bg-card rounded-xl border overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {steps.map((step, idx) => {
            const isCompleted = currentStep > step.num;
            const isCurrent = currentStep === step.num;
            
            return (
              <div key={step.num} className="flex items-center flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setCurrentStep(step.num)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium transition-all flex-shrink-0 ${
                    isCurrent
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : isCompleted
                      ? "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <div className={`flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full text-xs font-bold ${
                    isCurrent
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : isCompleted
                      ? "bg-green-500 text-white"
                      : "bg-muted-foreground/20"
                  }`}>
                    {isCompleted ? <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" /> : step.num}
                  </div>
                  <span className="hidden sm:inline">{step.title}</span>
                </button>
                {idx < steps.length - 1 && (
                  <div className={`w-4 sm:w-6 h-0.5 mx-0.5 sm:mx-1 flex-shrink-0 ${isCompleted ? "bg-green-500" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <Card>
              <CardHeader className="border-b bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10">
                    <Info className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Basic Information</CardTitle>
                    <CardDescription>Enter the basic details of the item</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">
                      Item Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g., Digital Multimeter"
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">A clear, descriptive name</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brand" className="text-sm font-medium">Brand / Manufacturer</Label>
                    <Input
                      id="brand"
                      name="brand"
                      value={formData.brand}
                      onChange={handleInputChange}
                      placeholder="e.g., Fluke, Keysight"
                      className="h-11"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Detailed description of the item, its features, and specifications..."
                    className="min-h-[120px]"
                  />
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    Identification Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="serial_number" className="text-sm">Serial Number</Label>
                      <Input
                        id="serial_number"
                        name="serial_number"
                        value={formData.serial_number}
                        onChange={handleInputChange}
                        placeholder="S/N-12345"
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="model_number" className="text-sm">Model Number</Label>
                      <Input
                        id="model_number"
                        name="model_number"
                        value={formData.model_number}
                        onChange={handleInputChange}
                        placeholder="Model-ABC"
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="asset_tag" className="text-sm">Asset Tag</Label>
                      <Input
                        id="asset_tag"
                        name="asset_tag"
                        value={formData.asset_tag}
                        onChange={handleInputChange}
                        placeholder="AST-001"
                        className="h-10"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Classification */}
          {currentStep === 2 && (
            <Card>
              <CardHeader className="border-b bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10">
                    <Tag className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Classification & Location</CardTitle>
                    <CardDescription>Categorize and specify the item's location</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Department <span className="text-destructive">*</span>
                    </Label>
                    <Select value={formData.department_id} onValueChange={(v) => handleSelectChange("department_id", v)}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              {dept.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Category</Label>
                    <Select value={formData.category_id} onValueChange={(v) => handleSelectChange("category_id", v)}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Item Type</Label>
                    <Select value={formData.item_type} onValueChange={(v) => handleSelectChange("item_type", v)}>
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {itemTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <span className="mr-2">{type.icon}</span> {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    Storage Location
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="lab_location" className="text-sm">Lab Location</Label>
                      <Input
                        id="lab_location"
                        name="lab_location"
                        value={formData.lab_location}
                        onChange={handleInputChange}
                        placeholder="e.g., Physics Lab - Room 101"
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shelf_location" className="text-sm">Shelf / Rack Location</Label>
                      <Input
                        id="shelf_location"
                        name="shelf_location"
                        value={formData.shelf_location}
                        onChange={handleInputChange}
                        placeholder="e.g., Shelf A-3"
                        className="h-10"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    Safety Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Safety Level</Label>
                      <Select value={formData.safety_level} onValueChange={(v) => handleSelectChange("safety_level", v)}>
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {safetyLevels.map((level) => (
                            <SelectItem key={level.value} value={level.value}>
                              <span className={level.color}>{level.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="special_handling_notes" className="text-sm">Special Handling Notes</Label>
                      <Input
                        id="special_handling_notes"
                        name="special_handling_notes"
                        value={formData.special_handling_notes}
                        onChange={handleInputChange}
                        placeholder="Any special handling requirements"
                        className="h-10"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Purchase & Warranty */}
          {currentStep === 3 && (
            <Card>
              <CardHeader className="border-b bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Purchase & Warranty</CardTitle>
                    <CardDescription>Purchase details and warranty information</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="purchase_date" className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      Purchase Date
                    </Label>
                    <Input
                      id="purchase_date"
                      type="date"
                      name="purchase_date"
                      value={formData.purchase_date}
                      onChange={handleInputChange}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="purchase_price" className="text-sm font-medium">Purchase Price</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                      <Input
                        id="purchase_price"
                        type="number"
                        name="purchase_price"
                        value={formData.purchase_price}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        className="h-11 pl-8"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="warranty_until" className="text-sm font-medium">Warranty Until</Label>
                    <Input
                      id="warranty_until"
                      type="date"
                      name="warranty_until"
                      value={formData.warranty_until}
                      onChange={handleInputChange}
                      className="h-11"
                    />
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-medium mb-4">Supplier Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="supplier_name" className="text-sm">Supplier / Vendor Name</Label>
                      <Input
                        id="supplier_name"
                        name="supplier_name"
                        value={formData.supplier_name}
                        onChange={handleInputChange}
                        placeholder="Vendor name"
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="supplier_contact" className="text-sm">Supplier Contact</Label>
                      <Input
                        id="supplier_contact"
                        name="supplier_contact"
                        value={formData.supplier_contact}
                        onChange={handleInputChange}
                        placeholder="Phone or email"
                        className="h-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoice_reference" className="text-sm font-medium">Invoice Reference</Label>
                  <Input
                    id="invoice_reference"
                    name="invoice_reference"
                    value={formData.invoice_reference}
                    onChange={handleInputChange}
                    placeholder="Invoice number or purchase order reference"
                    className="h-10"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Inventory */}
          {currentStep === 4 && (
            <Card>
              <CardHeader className="border-b bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Inventory & Status</CardTitle>
                    <CardDescription>Stock levels and item status</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="current_quantity" className="text-sm font-medium">Quantity</Label>
                    <Input
                      id="current_quantity"
                      type="number"
                      name="current_quantity"
                      value={formData.current_quantity}
                      onChange={(e) => handleNumberChange("current_quantity", parseInt(e.target.value) || 0)}
                      min={0}
                      className="h-12 text-center text-lg font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reorder_threshold" className="text-sm font-medium">Reorder At</Label>
                    <Input
                      id="reorder_threshold"
                      type="number"
                      name="reorder_threshold"
                      value={formData.reorder_threshold}
                      onChange={(e) => handleNumberChange("reorder_threshold", parseInt(e.target.value) || 0)}
                      min={0}
                      className="h-12 text-center"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit" className="text-sm font-medium">Unit</Label>
                    <Input
                      id="unit"
                      name="unit"
                      value={formData.unit}
                      onChange={handleInputChange}
                      placeholder="pcs"
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Condition</Label>
                    <Select value={formData.condition} onValueChange={(v) => handleSelectChange("condition", v)}>
                      <SelectTrigger className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {conditionOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${opt.color}`} />
                              {opt.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Status</Label>
                  <Select value={formData.status} onValueChange={(v) => handleSelectChange("status", v)}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Available for Borrowing</p>
                      <p className="text-sm text-muted-foreground">Students can request to borrow this item</p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.is_borrowable}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_borrowable: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-sm font-medium">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Any additional notes about this item..."
                    className="min-h-[100px]"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 5: Images */}
          {currentStep === 5 && (
            <Card>
              <CardHeader className="border-b bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10">
                    <ImageIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Images
                      {!isEdit && <span className="text-destructive text-sm font-normal">(Required)</span>}
                    </CardTitle>
                    <CardDescription>Add photos of the item (drag & drop or browse)</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {/* Required Image Warning */}
                {!isEdit && !formData.image_url && (
                  <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-amber-600 dark:text-amber-400">Image Required</p>
                      <p className="text-sm text-muted-foreground">Please upload at least one image to create this item.</p>
                    </div>
                  </div>
                )}
                
                {/* Success indicator when image is uploaded */}
                {formData.image_url && (
                  <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-green-600 dark:text-green-400">Image Uploaded</p>
                      <p className="text-sm text-muted-foreground">Your item image is ready. You can add more images below.</p>
                    </div>
                  </div>
                )}

                <ImageUpload
                  value={formData.image_url}
                  subImages={formData.sub_images}
                  onChange={(url) => setFormData({ ...formData, image_url: url })}
                  onSubImagesChange={(urls) => setFormData({ ...formData, sub_images: urls })}
                  bucketName="item-images"
                  folderPath="items"
                  maxFiles={5}
                  maxSizeMB={5}
                />
              </CardContent>
            </Card>
          )}


          {/* Navigation Footer */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Previous
                </Button>

                <div className="flex items-center gap-2">
                  {steps.map((step) => (
                    <div
                      key={step.num}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        step.num === currentStep
                          ? "bg-primary"
                          : step.num < currentStep
                          ? "bg-green-500"
                          : "bg-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>

                {currentStep < 5 ? (
                  <Button type="button" onClick={nextStep} className="gap-2">
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isLoading || (!isEdit && !formData.image_url)}
                    className="gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : !isEdit && !formData.image_url ? (
                      <>
                        <AlertCircle className="h-4 w-4" />
                        Upload Image First
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        {isEdit ? "Update Item" : "Add Item"}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </DashboardLayout>
  );
}
