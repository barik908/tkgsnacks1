"use client";
import { useAuthStore } from "@/store/useAuthStore";
import { useCartStore } from "@/store/useCartStore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, User, LogOut, ChefHat, Bike, LayoutDashboard, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

export default function Navbar() {
  const { user, logout, fetchMe } = useAuthStore();
  const { getItemCount } = useCartStore();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchMe();
  }, []);

  const cartCount = mounted ? getItemCount() : 0;

  const handleLogout = async () => {
    await logout();
    toast.success("লগআউট সফল");
    router.push("/");
    router.refresh();
  };

  const getDashboardLink = () => {
    if (!user) return "/login";
    switch (user.role) {
      case "ADMIN": return "/dashboard/admin";
      case "RESTAURANT_OWNER": return "/dashboard/restaurant";
      case "DELIVERY_BOY": return "/dashboard/delivery";
      default: return "/profile";
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-xl text-gray-900">TKG</span>
              <span className="font-bold text-xl text-orange-500"> Snacks</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/restaurants" className="text-gray-600 hover:text-orange-500 font-medium transition-colors">
              রেস্টুরেন্ট
            </Link>
            {user ? (
              <>
                <Link
                  href={getDashboardLink()}
                  className="flex items-center gap-1.5 text-gray-600 hover:text-orange-500 font-medium transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  ড্যাশবোর্ড
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-gray-600 hover:text-red-500 font-medium transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  লগআউট
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-gray-600 hover:text-orange-500 font-medium transition-colors">
                  লগইন
                </Link>
                <Link
                  href="/register"
                  className="bg-orange-500 text-white px-4 py-2 rounded-xl font-semibold hover:bg-orange-600 transition-colors"
                >
                  রেজিস্ট্রেশন
                </Link>
              </>
            )}
            <Link href="/cart" className="relative">
              <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-orange-50 hover:bg-orange-100 transition-colors">
                <ShoppingCart className="w-5 h-5 text-orange-500" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </div>
            </Link>
          </nav>

          {/* Mobile */}
          <div className="flex md:hidden items-center gap-3">
            <Link href="/cart" className="relative">
              <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-orange-50">
                <ShoppingCart className="w-5 h-5 text-orange-500" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </div>
            </Link>
            <button onClick={() => setMenuOpen(!menuOpen)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100">
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <Link href="/restaurants" onClick={() => setMenuOpen(false)} className="block py-2.5 px-4 rounded-xl hover:bg-gray-50 text-gray-700 font-medium">রেস্টুরেন্ট</Link>
            {user ? (
              <>
                <Link href={getDashboardLink()} onClick={() => setMenuOpen(false)} className="block py-2.5 px-4 rounded-xl hover:bg-gray-50 text-gray-700 font-medium">ড্যাশবোর্ড</Link>
                <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="w-full text-left py-2.5 px-4 rounded-xl hover:bg-red-50 text-red-500 font-medium">লগআউট</button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMenuOpen(false)} className="block py-2.5 px-4 rounded-xl hover:bg-gray-50 text-gray-700 font-medium">লগইন</Link>
                <Link href="/register" onClick={() => setMenuOpen(false)} className="block py-2.5 px-4 rounded-xl bg-orange-500 text-white font-semibold text-center">রেজিস্ট্রেশন</Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
