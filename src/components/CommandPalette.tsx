import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/components/auth/ProtectedRoute";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { 
  Package, 
  Users, 
  FlaskConical, 
  LayoutDashboard,
  Settings,
  FileText,
  Wrench,
  ClipboardList,
  FolderTree,
  Building,
  QrCode,
  History,
  Search,
} from "lucide-react";

interface SearchResult {
  id: string;
  type: "item" | "user" | "chemical";
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  path: string;
}

type Role = "admin" | "staff" | "technician" | "student";

interface QuickLink {
  name: string;
  icon: React.ReactNode;
  path: string;
  allowedRoles?: Role[];
}

const quickLinks: QuickLink[] = [
  { name: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, path: "/dashboard", allowedRoles: ["admin", "staff", "technician", "student"] },
  { name: "Items", icon: <Package className="h-4 w-4" />, path: "/items", allowedRoles: ["admin", "staff", "technician", "student"] },
  { name: "Add New Item", icon: <Package className="h-4 w-4" />, path: "/items/new", allowedRoles: ["admin", "staff"] },
  { name: "Users", icon: <Users className="h-4 w-4" />, path: "/users", allowedRoles: ["admin"] },
  { name: "Chemicals", icon: <FlaskConical className="h-4 w-4" />, path: "/chemicals", allowedRoles: ["admin", "staff"] },
  { name: "Borrow Requests", icon: <ClipboardList className="h-4 w-4" />, path: "/requests", allowedRoles: ["admin", "staff"] },
  { name: "My Requests", icon: <ClipboardList className="h-4 w-4" />, path: "/my-requests", allowedRoles: ["admin", "staff", "technician", "student"] },
  { name: "Maintenance", icon: <Wrench className="h-4 w-4" />, path: "/maintenance", allowedRoles: ["admin", "staff", "technician"] },
  { name: "Reports", icon: <FileText className="h-4 w-4" />, path: "/reports", allowedRoles: ["admin", "staff"] },
  { name: "Categories", icon: <FolderTree className="h-4 w-4" />, path: "/categories", allowedRoles: ["admin"] },
  { name: "Departments", icon: <Building className="h-4 w-4" />, path: "/departments", allowedRoles: ["admin"] },
  { name: "QR Management", icon: <QrCode className="h-4 w-4" />, path: "/qr-management", allowedRoles: ["admin", "staff"] },
  { name: "Audit Logs", icon: <History className="h-4 w-4" />, path: "/audit-logs", allowedRoles: ["admin"] },
  { name: "Settings", icon: <Settings className="h-4 w-4" />, path: "/settings", allowedRoles: ["admin", "staff", "technician", "student"] },
];

export function CommandPalette() {
  const navigate = useNavigate();
  const { userRole } = useUserRole();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Keyboard shortcut (Ctrl+K / Cmd+K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Search function
  const performSearch = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const searchResults: SearchResult[] = [];

      // Search items (viewable by all roles)
      const { data: items } = await supabase
        .from("items")
        .select("id, name, item_code")
        .or(`name.ilike.%${query}%,item_code.ilike.%${query}%`)
        .limit(5);

      items?.forEach((item) => {
        searchResults.push({
          id: item.id,
          type: "item",
          title: item.name,
          subtitle: item.item_code,
          icon: <Package className="h-4 w-4 text-primary" />,
          path: `/items/${item.id}`,
        });
      });

      // Search users (only accessible to admin)
      if (userRole === "admin") {
        const { data: users } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
          .limit(5);

        users?.forEach((user) => {
          searchResults.push({
            id: user.id,
            type: "user",
            title: user.full_name || "Unknown",
            subtitle: user.email,
            icon: <Users className="h-4 w-4 text-info" />,
            path: `/users`,
          });
        });
      }

      // Search chemicals (accessible to admin and staff)
      if (userRole && userRole !== "student") {
        const { data: chemicals } = await supabase
          .from("chemicals")
          .select("id, name, cas_number")
          .or(`name.ilike.%${query}%,cas_number.ilike.%${query}%`)
          .limit(5);

        chemicals?.forEach((chem) => {
          searchResults.push({
            id: chem.id,
            type: "chemical",
            title: chem.name,
            subtitle: chem.cas_number || undefined,
            icon: <FlaskConical className="h-4 w-4 text-warning" />,
            path: `/chemicals`,
          });
        });
      }

      setResults(searchResults);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  }, [userRole]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  const handleSelect = (path: string) => {
    setOpen(false);
    setSearchQuery("");
    navigate(path);
  };

  const filteredQuickLinks = quickLinks.filter(link => {
    if (link.allowedRoles) {
      const currentRole = userRole || "student";
      if (!link.allowedRoles.includes(currentRole)) {
        return false;
      }
    }
    return link.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput 
        placeholder="Search items, users, chemicals, or navigate..." 
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList>
        <CommandEmpty>
          {isSearching ? "Searching..." : "No results found."}
        </CommandEmpty>
        
        {/* Search Results */}
        {results.length > 0 && (
          <>
            <CommandGroup heading="Search Results">
              {results.map((result) => (
                <CommandItem
                  key={`${result.type}-${result.id}`}
                  onSelect={() => handleSelect(result.path)}
                  className="cursor-pointer"
                >
                  {result.icon}
                  <div className="ml-2 flex-1">
                    <p className="font-medium">{result.title}</p>
                    {result.subtitle && (
                      <p className="text-xs text-muted-foreground">{result.subtitle}</p>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}
        
        {/* Quick Navigation */}
        <CommandGroup heading="Quick Navigation">
          {filteredQuickLinks.slice(0, 8).map((link) => (
            <CommandItem
              key={link.path}
              onSelect={() => handleSelect(link.path)}
              className="cursor-pointer"
            >
              {link.icon}
              <span className="ml-2">{link.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
