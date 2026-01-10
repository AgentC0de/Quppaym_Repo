import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  Package,
  Ruler,
  UserCog,
  Building2,
  Scissors,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Orders", href: "/orders", icon: ShoppingBag },
  { name: "Online Orders", href: "/online-orders", icon: ShoppingBag },
  { name: "Measurements", href: "/measurements", icon: Ruler },
  { name: "Inventory", href: "/inventory", icon: Package },
  { name: "Services", href: "/services", icon: Scissors },
  { name: "Employees", href: "/employees", icon: UserCog },
  { name: "Stores", href: "/stores", icon: Building2 },
  { name: "Reports", href: "/reports", icon: BarChart3 },
];

const secondaryNavigation = [
  { name: "Settings", href: "/settings", icon: Settings },
];

interface SidebarContentProps {
  collapsed: boolean;
  onCollapse?: () => void;
  onNavigate?: () => void;
}

function SidebarContent({ collapsed, onCollapse, onNavigate }: SidebarContentProps) {
  const location = useLocation();
  const [viewMode, setViewMode] = useState<"Mobile" | "Tablet" | "Desktop">("Desktop");

  // Update view mode based on window width
  useEffect(() => {
    const update = () => {
      if (typeof window === "undefined") return;
      const w = window.innerWidth;
      if (w >= 1024) setViewMode("Desktop");
      else if (w >= 640) setViewMode("Tablet");
      else setViewMode("Mobile");
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-20 items-center justify-between border-b border-sidebar-border px-4">
        <Link to="/" className="flex items-center gap-3" onClick={onNavigate}>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-accent">
            <span className="font-display text-xl font-bold text-gold">Q</span>
          </div>
          {!collapsed && (
            <span className="font-display text-xl font-semibold tracking-wide text-sidebar-foreground">
              Quppayam
            </span>
          )}
        </Link>
        {onCollapse && (
          <button
            onClick={onCollapse}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-sidebar-accent text-sidebar-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon
                size={20}
                className={cn(
                  "flex-shrink-0 transition-colors",
                  isActive ? "text-gold" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
                )}
              />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Secondary Navigation */}
      <div className="px-3 py-2">
        <div className="text-xs text-muted-foreground">Current view</div>
        <div className="mt-2 flex items-center gap-2">
          <span
            className={cn(
              "inline-block h-2 w-2 rounded-full",
              viewMode === "Desktop" ? "bg-gold" : viewMode === "Tablet" ? "bg-amber-500" : "bg-emerald-500"
            )}
          />
          <span className="text-sm text-sidebar-foreground">{viewMode}</span>
        </div>
      </div>

      <div className="border-t border-sidebar-border px-3 py-4">
        {secondaryNavigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-sidebar-accent text-sidebar-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon
                size={20}
                className={cn(
                  "flex-shrink-0",
                  isActive ? "text-gold" : "text-sidebar-foreground/60"
                )}
              />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

interface AppSidebarProps {
  collapsed: boolean;
  onCollapse: () => void;
}

// Desktop Sidebar
export function AppSidebar({ collapsed, onCollapse }: AppSidebarProps) {
  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 hidden h-screen bg-sidebar transition-all duration-300 ease-in-out lg:block",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <SidebarContent collapsed={collapsed} onCollapse={onCollapse} />
    </aside>
  );
}

// Mobile Sidebar
export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 bg-sidebar p-0">
        <SidebarContent collapsed={false} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}