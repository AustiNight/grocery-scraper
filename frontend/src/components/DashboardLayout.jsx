import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { cn } from "../lib/utils";
import { 
  LayoutDashboard, 
  ListChecks, 
  Search, 
  BarChart3, 
  ChevronLeft,
  ChevronRight,
  ShoppingCart
} from "lucide-react";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/lists", label: "Shopping Lists", icon: ListChecks },
  { path: "/scraper", label: "Price Scraper", icon: Search },
  { path: "/results", label: "Comparisons", icon: BarChart3 },
];

export const DashboardLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex" data-testid="dashboard-layout">
      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-white border-r border-[#EBE9E0] flex flex-col transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
        data-testid="sidebar"
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-[#EBE9E0]">
          <ShoppingCart className="w-6 h-6 text-[#C8553D] flex-shrink-0" />
          {!collapsed && (
            <span className="ml-3 font-serif text-xl font-semibold text-[#1C1E1C]">
              Grocery Hunt
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
              (item.path !== "/" && location.pathname.startsWith(item.path));
            
            return (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                className={cn(
                  "flex items-center px-4 py-3 mx-2 mb-1 transition-colors duration-200",
                  isActive 
                    ? "bg-[#FAF8F5] border-l-2 border-[#C8553D] text-[#C8553D]" 
                    : "text-[#5C605A] hover:bg-[#FAF8F5] hover:text-[#1C1E1C] border-l-2 border-transparent"
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <span className="ml-3 text-sm font-medium">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="h-12 flex items-center justify-center border-t border-[#EBE9E0] text-[#5C605A] hover:text-[#1C1E1C] hover:bg-[#FAF8F5] transition-colors"
          data-testid="sidebar-toggle"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 glass-header flex items-center px-6 sticky top-0 z-10" data-testid="header">
          <div className="flex-1">
            <p className="overline">AI-Powered Price Comparison</p>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
