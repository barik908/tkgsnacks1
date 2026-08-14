"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { useAuthStore } from "@/store/useAuthStore";
import Badge from "@/components/ui/Badge";
import { User, ShoppingBag, LogOut, ChevronRight } from "lucide-react";
import { formatDateTime, formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

interface Order {
  id: number;
  orderNumber: string;
  status: string;
  total: string;
  createdAt: string;
}

export default function ProfilePage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.role !== "CUSTOMER") {
      router.push("/");
      return;
    }
    fetch("/api/orders")
      .then((r) => r.json())
      .then((d) => {
        setOrders(d.data ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  const handleLogout = async () => {
    await logout();
    toast.success("লগআউট সফল");
    router.push("/");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-orange-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{user.name}</h1>
              <p className="text-gray-500">{user.phone}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-4 flex items-center gap-2 text-red-500 hover:text-red-600 font-medium"
          >
            <LogOut className="w-4 h-4" />
            লগআউট করুন
          </button>
        </div>

        {/* Orders */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-orange-400" />
            আমার অর্ডার
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>এখনো কোনো অর্ডার নেই</p>
              <Link href="/restaurants" className="mt-3 inline-block text-orange-500 underline">
                প্রথম অর্ডার করুন
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50 transition-colors"
                >
                  <div>
                    <div className="font-semibold text-gray-900">#{order.orderNumber}</div>
                    <div className="text-sm text-gray-500 mt-0.5">{formatDateTime(order.createdAt)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge status={order.status} />
                    <span className="font-bold text-gray-900">৳{parseFloat(order.total).toFixed(0)}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
