"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Bike, Package, CheckCircle, Clock, LogOut, ToggleLeft, ToggleRight, MapPin, Phone, Navigation } from "lucide-react";
import toast from "react-hot-toast";
import { formatDateTime } from "@/lib/utils";

interface DeliveryBoy {
  id: number;
  status: string;
  isOnline: boolean;
  totalDeliveries: number;
  cashInHand: string;
}

interface Order {
  id: number;
  orderNumber: string;
  status: string;
  total: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryLandmark: string;
  deliveryLatitude: string;
  deliveryLongitude: string;
  verificationCode: string;
  paymentMethod: string;
  createdAt: string;
  restaurant: {
    name: string;
    address: string;
    phone: string;
  };
  items: Array<{ name: string; quantity: number }>;
}

const DELIVERY_TRANSITIONS: Record<string, string> = {
  READY_FOR_PICKUP: "PICKED_UP",
  PICKED_UP: "ON_THE_WAY",
  ON_THE_WAY: "DELIVERED",
};

const TRANSITION_LABELS: Record<string, string> = {
  READY_FOR_PICKUP: "পিকআপ করেছি",
  PICKED_UP: "পথে আছি",
  ON_THE_WAY: "ডেলিভারি সম্পন্ন",
};

export default function DeliveryDashboard() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [dbProfile, setDbProfile] = useState<DeliveryBoy | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    if (user.role !== "DELIVERY_BOY") { router.push("/"); return; }
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [meRes, ordersRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/orders/delivery?type=assigned"),
      ]);
      const meData = await meRes.json();
      const ordersData = await ordersRes.json();

      if (meData.success) setDbProfile(meData.data.deliveryBoy);
      setOrders(ordersData.data ?? []);
    } catch {
      toast.error("ডেটা লোড হয়নি");
    } finally {
      setLoading(false);
    }
  };

  const toggleOnline = async () => {
    if (!dbProfile) return;
    const res = await fetch("/api/delivery/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isOnline: !dbProfile.isOnline }),
    });
    if (res.ok) {
      setDbProfile((p) => p ? { ...p, isOnline: !p.isOnline } : p);
      toast.success(dbProfile.isOnline ? "অফলাইন হয়েছেন" : "অনলাইন হয়েছেন");
    }
  };

  const updateStatus = async (orderId: number, status: string) => {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o));
      if (status === "DELIVERED") toast.success("ডেলিভারি সম্পন্ন!");
      else toast.success("স্ট্যাটাস আপডেট হয়েছে");
      loadData();
    } else {
      const d = await res.json();
      toast.error(d.message || "আপডেট ব্যর্থ");
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
    </div>
  );

  const activeOrders = orders.filter((o) => !["DELIVERED", "CANCELLED", "REJECTED"].includes(o.status));
  const completedOrders = orders.filter((o) => o.status === "DELIVERED");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
              <Bike className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-gray-900 text-sm">{user?.name}</div>
              <div className="text-xs text-gray-500">ডেলিভারি ড্যাশবোর্ড</div>
            </div>
          </div>
          <button onClick={() => { logout(); router.push("/"); }} className="text-gray-400 hover:text-red-500">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Status: Pending approval */}
        {dbProfile?.status === "PENDING" && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5">
            <Clock className="w-8 h-8 text-yellow-500 mb-2" />
            <h3 className="font-bold text-yellow-800">অনুমোদনের অপেক্ষায়</h3>
            <p className="text-yellow-600 text-sm mt-1">আপনার অ্যাকাউন্ট অ্যাডমিন অনুমোদনের অপেক্ষায় আছে।</p>
          </div>
        )}

        {dbProfile?.status === "REJECTED" && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
            <h3 className="font-bold text-red-800">অ্যাকাউন্ট প্রত্যাখ্যাত</h3>
            <p className="text-red-600 text-sm mt-1">আপনার আবেদন প্রত্যাখ্যাত হয়েছে।</p>
          </div>
        )}

        {dbProfile?.status === "APPROVED" && (
          <>
            {/* Online Toggle */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-gray-900">আপনার স্ট্যাটাস</div>
                  <div className={`text-sm mt-0.5 ${dbProfile.isOnline ? "text-green-600" : "text-gray-500"}`}>
                    {dbProfile.isOnline ? "● অনলাইন - অর্ডার পাচ্ছেন" : "○ অফলাইন"}
                  </div>
                </div>
                <button
                  onClick={toggleOnline}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-colors ${
                    dbProfile.isOnline
                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {dbProfile.isOnline ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                  {dbProfile.isOnline ? "অনলাইন" : "অফলাইন"}
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <div className="text-sm text-gray-500">মোট ডেলিভারি</div>
                <div className="text-2xl font-bold text-gray-900 mt-1">{dbProfile.totalDeliveries}</div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <div className="text-sm text-gray-500">হাতে নগদ</div>
                <div className="text-2xl font-bold text-orange-500 mt-1">৳{parseFloat(dbProfile.cashInHand ?? "0").toFixed(0)}</div>
              </div>
            </div>

            {/* Active Orders */}
            <div>
              <h2 className="font-bold text-gray-900 mb-3">সক্রিয় ডেলিভারি ({activeOrders.length})</h2>
              {activeOrders.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400">কোনো সক্রিয় ডেলিভারি নেই</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeOrders.map((order) => (
                    <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="font-bold text-gray-900">#{order.orderNumber}</div>
                        <Badge status={order.status} />
                      </div>

                      {/* Restaurant */}
                      {order.restaurant && (
                        <div className="bg-orange-50 rounded-xl p-3 mb-3">
                          <div className="text-xs text-orange-600 font-medium mb-1">পিকআপ পয়েন্ট</div>
                          <div className="font-semibold text-gray-900 text-sm">{order.restaurant.name}</div>
                          <div className="text-xs text-gray-500">{order.restaurant.address}</div>
                          <a href={`tel:${order.restaurant.phone}`} className="text-xs text-orange-500 flex items-center gap-1 mt-1">
                            <Phone className="w-3 h-3" />
                            {order.restaurant.phone}
                          </a>
                        </div>
                      )}

                      {/* Customer */}
                      <div className="bg-gray-50 rounded-xl p-3 mb-3">
                        <div className="text-xs text-gray-500 font-medium mb-1">ডেলিভারি পয়েন্ট</div>
                        <div className="font-semibold text-gray-900 text-sm">{order.customerName}</div>
                        <div className="text-xs text-gray-600 mt-0.5">{order.deliveryAddress}</div>
                        {order.deliveryLandmark && (
                          <div className="text-xs text-gray-400">কাছে: {order.deliveryLandmark}</div>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <a href={`tel:${order.customerPhone}`} className="text-xs text-blue-500 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {order.customerPhone}
                          </a>
                          {order.deliveryLatitude && (
                            <a
                              href={`https://maps.google.com/?q=${order.deliveryLatitude},${order.deliveryLongitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-green-500 flex items-center gap-1"
                            >
                              <Navigation className="w-3 h-3" />
                              ম্যাপে দেখুন
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Verification Code */}
                      {order.status === "ON_THE_WAY" && (
                        <div className="bg-blue-50 rounded-xl p-3 mb-3 text-center">
                          <div className="text-xs text-blue-600 font-medium">ভেরিফিকেশন কোড নিন</div>
                          <div className="text-2xl font-bold text-blue-700 tracking-widest mt-1">
                            {order.verificationCode}
                          </div>
                        </div>
                      )}

                      {/* Items & Amount */}
                      <div className="flex items-center justify-between text-sm mb-3">
                        <span className="text-gray-500">
                          {order.items?.map((i) => `${i.name} ×${i.quantity}`).join(", ")}
                        </span>
                        <span className="font-bold text-orange-500">৳{parseFloat(order.total).toFixed(0)}</span>
                      </div>

                      {/* Action Button */}
                      {DELIVERY_TRANSITIONS[order.status] && (
                        <Button
                          className="w-full"
                          onClick={() => updateStatus(order.id, DELIVERY_TRANSITIONS[order.status])}
                        >
                          <CheckCircle className="w-4 h-4" />
                          {TRANSITION_LABELS[order.status]}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Completed Today */}
            {completedOrders.length > 0 && (
              <div>
                <h2 className="font-bold text-gray-900 mb-3">সম্পন্ন ডেলিভারি ({completedOrders.length})</h2>
                <div className="space-y-3">
                  {completedOrders.slice(0, 5).map((order) => (
                    <div key={order.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">#{order.orderNumber}</div>
                        <div className="text-sm text-gray-500">{order.customerName}</div>
                      </div>
                      <div className="text-right">
                        <Badge status={order.status} />
                        <div className="text-sm font-bold text-orange-500 mt-1">৳{parseFloat(order.total).toFixed(0)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
