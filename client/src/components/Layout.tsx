import { Link, useLocation } from "wouter";
import { Shirt, Layers, Tag, Menu, X, PlusCircle } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { label: "Wardrobe", href: "/", icon: Shirt },
    { label: "Outfits", href: "/outfits", icon: Layers },
    { label: "Outfit Builder", href: "/outfit-builder", icon: PlusCircle },
    { label: "Tags", href: "/tags", icon: Tag },
  ];

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 border-b bg-background/80 backdrop-blur-md z-50 flex items-center justify-between px-4">
        <h1 className="text-xl font-serif font-semibold tracking-tight">Digital Wardrobe</h1>
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Nav Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-background pt-20 px-6 space-y-4 animate-in slide-in-from-top-10 fade-in duration-200">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <button
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-4 text-2xl font-serif py-4 border-b border-border/40 w-full text-left",
                  location === item.href ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className="h-6 w-6" />
                {item.label}
              </button>
            </Link>
          ))}
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 fixed h-full border-r bg-sidebar px-6 py-8">
        <div className="mb-12">
          <h1 className="text-2xl font-serif font-bold tracking-tight text-primary">Digital Wardrobe</h1>
          <p className="text-xs text-muted-foreground mt-1 tracking-widest uppercase">Curated Collection</p>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <button
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 group w-full text-left",
                  location === item.href 
                    ? "bg-primary text-primary-foreground shadow-md" 
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-4 w-4 transition-transform group-hover:scale-110")} />
                <span className="font-medium tracking-wide">{item.label}</span>
              </button>
            </Link>
          ))}
        </nav>

        <div className="mt-auto">
          <div className="p-4 bg-secondary/50 rounded-lg border border-border/50">
            <h4 className="font-serif text-sm font-semibold mb-1">Pro Tip</h4>
            <p className="text-xs text-muted-foreground">Tag items by season to easily filter your winter coats.</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 pt-20 lg:pt-8 px-4 lg:px-12 pb-12 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
