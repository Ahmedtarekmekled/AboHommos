import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  Menu,
  X,
  ShoppingCart,
  User,
  LogOut,
  Store,
  LayoutDashboard,
  ChevronDown,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AR } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth, useCart } from "@/store";
import { getInitials } from "@/lib/utils";

const navLinks = [
  { href: "/", label: AR.nav.home },
  { href: "/categories", label: AR.nav.categories },
  { href: "/shops", label: AR.nav.shops },
  { href: "/products", label: AR.nav.products },
];

export function Header() {
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { cartItemCount } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="sticky top-0 z-50 glass border-b">
      <div className="container-app">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Store className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl hidden sm:block">
              {AR.app.name}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "nav-link",
                  location.pathname === link.href && "active"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Search - Desktop */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={AR.products.search}
                className="pr-10 bg-muted/50"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Search Toggle - Mobile */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSearchOpen(!searchOpen)}
            >
              <Search className="h-5 w-5" />
            </Button>

            {/* Cart */}
            <Link to="/cart">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {cartItemCount > 0 && (
                  <Badge
                    className="absolute -top-1 -left-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    variant="default"
                  >
                    {cartItemCount}
                  </Badge>
                )}
              </Button>
            </Link>

            {/* User Menu */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 px-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.avatar_url || undefined} />
                      <AvatarFallback>
                        {user?.full_name ? getInitials(user.full_name) : "م"}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="h-4 w-4 hidden sm:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span>{user?.full_name}</span>
                      <span className="text-xs text-muted-foreground font-normal">
                        {user?.role === "SHOP_OWNER"
                          ? "صاحب متجر"
                          : user?.role === "ADMIN"
                          ? "مدير"
                          : "عميل"}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/account" className="cursor-pointer">
                      <User className="ml-2 h-4 w-4" />
                      {AR.nav.account}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/orders" className="cursor-pointer">
                      <ShoppingCart className="ml-2 h-4 w-4" />
                      {AR.nav.orders}
                    </Link>
                  </DropdownMenuItem>
                  {(user?.role === "SHOP_OWNER" || user?.role === "ADMIN") && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/dashboard" className="cursor-pointer">
                          <LayoutDashboard className="ml-2 h-4 w-4" />
                          {AR.dashboard.title}
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-destructive"
                  >
                    <LogOut className="ml-2 h-4 w-4" />
                    {AR.nav.logout}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    {AR.nav.login}
                  </Button>
                </Link>
                <Link to="/register" className="hidden sm:block">
                  <Button size="sm">{AR.nav.register}</Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Search */}
        {searchOpen && (
          <div className="py-3 md:hidden animate-fade-in">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={AR.products.search}
                className="pr-10"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="py-4 lg:hidden border-t animate-fade-in">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "px-4 py-3 rounded-lg transition-colors",
                    location.pathname === link.href
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
