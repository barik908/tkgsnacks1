"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import {
  LayoutDashboard, Users, ChefHat, ShoppingBag, Bike, Settings,
  LogOut, CheckCircle, XCircle, Eye, EyeOff, TrendingUp, Menu,
  AlertTriangle, Star, RefreshCw
} from "lucide-react";
import toast from "react-hot-toast";
import { formatDateTime, formatCurrency } from "@/lib/utils";

type AdminTab = "dashboard" | "restaurants" | "delivery" | "orders" | "customers" | "settings";

interface Stats {
  orders: { total: number; delivered: number; active: number; revenue: string };
  restaurants: { total: number; approved: number; pending: number };
  customers: { total: number };
  deliveryBoys: { total: number; approved: number; pending: number };
}

interface Restaurant {
  id: number;
  name: string;
  status: string;
  isVisible: boolean;
  isOpen: boolean;
  isPartner: boolean;
  phone: string;
  cuisine: string;
  createdAt: string;
  owner?: { name: string; phone: string };
  avgRating: string;
  totalReviews: number;
}

interface DeliveryBoy {
  id: number;
  status: string;
  isOnline: boolean;
  totalDeliveries: number;
  cashInHand: string;
  user?: { name: string; phone: string };
  vehicleType: string;
}

interface Order {
  id: number;
  orderNumber: string;
  status: string;
  total: string;
  customerName: string;
  restaurantId: number;
  createdAt: string;
}

interface Setting {
  id: number;
  key: string;
  value: string;
  description: string;
}

export default function AdminDashboard() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [stats, setStats] = useState<Stats | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [deliveryBoys, setDeliveryBoys] = useState<DeliveryBoy[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editSetting, setEditSetting] = useState<{ key: string; value: string } | null>(null);
  const [assignDelivery, setAssignDelivery] = useState<{ orderId: number; dbId: string }>({ orderId: 0, dbId: "" });

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    if (user.role !== "ADMIN") { router.push("/"); return; }
    loadAll();
  }, [user]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [statsRes, restsRes, dbsRes, ordersRes, settingsRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/restaurants"),
        fetch("/api/admin/delivery-boys"),
        fetch("/api/orders"),
        fetch("/api/admin/settings"),
      ]);
      const [statsData, restsData, dbsData, ordersData, settingsData] = await Promise.all([
        statsRes.json(), restsRes.json(), dbsRes.json(), ordersRes.json(), settingsRes.json()
      ]);
      if (statsData.success) setStats(statsData.data);
      if (restsData.success) setRestaurants(restsData.data);
      if (dbsData.success) setDeliveryBoys(dbsData.data);
      if (ordersData.success) setOrders(ordersData.data);
      if (settingsData.success) setSettings(settingsData.data);
    } catch { toast.error("ডেটা লোড হয়নি"); }
    finally { setLoading(false); }
  };

  const updateRestaurant = async (id: number, data: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/restaurants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const d = await res.json();
      setRestaurants((prev) => prev.map((r) => r.id === id ? { ...r, ...d.data } : r));
      toast.success("আপডেট হয়েছে");
    } else toast.error("আপডেট ব্যর্থ");
  };

  const updateDeliveryBoy = async (id: number, data: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/delivery-boys/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setDeliveryBoys((prev) => prev.map((d) => d.id === id ? { ...d, ...data } : d));
      toast.success("আপডেট হয়েছে");
    } else toast.error("আপডেট ব্যর্থ");
  };

  const saveSetting = async () => {
    if (!editSetting) return;
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editSetting),
    });
    if (res.ok) {
      setSettings((prev) => prev.map((s) => s.key === editSetting.key ? { ...s, value: editSetting.value } : s));
      setEditSetting(null);
      toast.success("সেটিং সংরক্ষণ হয়েছে");
    }
  };

  const doAssignDelivery = async () => {
    if (!assignDelivery.orderId || !assignDelivery.dbId) { toast.error("অর্ডার ও ডেলিভারি বয় নির্বাচন করুন"); return; }
    const res = await fetch("/api/admin/assign-delivery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: assignDelivery.orderId, deliveryBoyId: parseInt(assignDelivery.dbId) }),
    });
    if (res.ok) {
      toast.success("ডেলিভারি বয় অ্যাসাইন হয়েছে");
      setAssignDelivery({ orderId: 0, dbId: "" });
      loadAll();
    } else {
      const d = await res.json();
      toast.error(d.message || "অ্যাসাইন ব্যর্থ");
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
    </div>
  );

  const tabs: { id: AdminTab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: "dashboard", label: "ড্যাশবোর্ড", icon: LayoutDashboard },
    { id: "restaurants", label: "রেস্টুরেন্ট", icon: ChefHat, badge: stats?.restaurants.pending },
    { id: "delivery", label: "ডেলিভারি বয়", icon: Bike, badge: stats?.deliveryBoys.pending },
    { id: "orders", label: "অর্ডার", icon: ShoppingBag },
    { id: "settings", label: "সেটিং", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform lg:translate-x-0 lg:static lg:z-auto ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-5 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-gray-900 text-sm">TKG Snacks</div>
              <div className="text-xs text-orange-500 font-medium">Admin Panel</div>
            </div>
          </div>
        </div>

        <nav className="p-3 space-y-1 mt-2">
          {tabs.map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              onClick={() => { setTab(id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors relative ${tab === id ? "bg-orange-50 text-orange-600" : "text-gray-600 hover:bg-gray-50"}`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {badge ? (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {badge}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-4 left-0 right-0 px-3">
          <button onClick={() => { logout(); router.push("/"); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">
            <LogOut className="w-4 h-4" />
            লগআউট
          </button>
        </div>
      </div>

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex-1 min-w-0">
        <header className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100">
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-gray-900">{tabs.find((t) => t.id === tab)?.label}</h1>
          <button onClick={loadAll} className="ml-auto p-2 rounded-xl hover:bg-gray-100 transition-colors" title="রিফ্রেশ">
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </header>

        <div className="p-4 sm:p-6">
          {/* Dashboard */}
          {tab === "dashboard" && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "মোট অর্ডার", value: stats.orders.total, sub: `${stats.orders.delivered} ডেলিভারি`, icon: ShoppingBag, color: "bg-blue-50 text-blue-500" },
                  { label: "মোট আয়", value: `৳${parseFloat(stats.orders.revenue || "0").toFixed(0)}`, sub: "সব সময়", icon: TrendingUp, color: "bg-green-50 text-green-500" },
                  { label: "রেস্টুরেন্ট", value: stats.restaurants.approved, sub: `${stats.restaurants.pending} পেন্ডিং`, icon: ChefHat, color: "bg-orange-50 text-orange-500" },
                  { label: "কাস্টমার", value: stats.customers.total, sub: "নিবন্ধিত", icon: Users, color: "bg-purple-50 text-purple-500" },
                ].map((s, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>
                      <s.icon className="w-5 h-5" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                    <div className="text-sm font-medium text-gray-600 mt-0.5">{s.label}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* Pending approvals */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    অনুমোদনের অপেক্ষায়
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between p-3 bg-orange-50 rounded-xl">
                      <span className="text-sm font-medium text-orange-700">রেস্টুরেন্ট</span>
                      <span className="font-bold text-orange-600">{stats.restaurants.pending}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-blue-50 rounded-xl">
                      <span className="text-sm font-medium text-blue-700">ডেলিভারি বয়</span>
                      <span className="font-bold text-blue-600">{stats.deliveryBoys.pending}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="font-bold text-gray-900 mb-3">ডেলিভারি বয় পরিসংখ্যান</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">মোট</span>
                      <span className="font-semibold">{stats.deliveryBoys.total}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">অনুমোদিত</span>
                      <span className="font-semibold text-green-600">{stats.deliveryBoys.approved}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">পেন্ডিং</span>
                      <span className="font-semibold text-yellow-600">{stats.deliveryBoys.pending}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Restaurants Tab */}
          {tab === "restaurants" && (
            <div className="space-y-4">
              {restaurants.map((rest) => (
                <div key={rest.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-gray-900">{rest.name}</h3>
                      <p className="text-sm text-gray-500">{rest.cuisine} • {rest.phone}</p>
                      {rest.owner && (
                        <p className="text-xs text-gray-400 mt-0.5">মালিক: {rest.owner.name} ({rest.owner.phone})</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge status={rest.status} />
                      {!rest.isVisible && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">লুকানো</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    {parseFloat(rest.avgRating ?? "0").toFixed(1)} ({rest.totalReviews} রিভিউ)
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {rest.status === "PENDING" && (
                      <>
                        <Button size="sm" onClick={() => updateRestaurant(rest.id, { status: "APPROVED" })}>
                          <CheckCircle className="w-4 h-4" />
                          অনুমোদন
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => updateRestaurant(rest.id, { status: "REJECTED" })}>
                          <XCircle className="w-4 h-4" />
                          প্রত্যাখ্যান
                        </Button>
                      </>
                    )}
                    {rest.status === "APPROVED" && (
                      <Button size="sm" variant="danger" onClick={() => updateRestaurant(rest.id, { status: "SUSPENDED" })}>
                        স্থগিত
                      </Button>
                    )}
                    {rest.status === "SUSPENDED" && (
                      <Button size="sm" onClick={() => updateRestaurant(rest.id, { status: "APPROVED" })}>
                        পুনরায় সক্রিয়
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={rest.isVisible ? "outline" : "secondary"}
                      onClick={() => updateRestaurant(rest.id, { isVisible: !rest.isVisible })}
                    >
                      {rest.isVisible ? <><EyeOff className="w-4 h-4" /> লুকান</> : <><Eye className="w-4 h-4" /> দেখান</>}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updateRestaurant(rest.id, { isPartner: !rest.isPartner })}
                    >
                      {rest.isPartner ? "পার্টনার ✓" : "পার্টনার করুন"}
                    </Button>
                  </div>
                </div>
              ))}

              {restaurants.length === 0 && (
                <div className="text-center py-20 bg-white rounded-2xl border">
                  <ChefHat className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400">কোনো রেস্টুরেন্ট নেই</p>
                </div>
              )}
            </div>
          )}

          {/* Delivery Boys Tab */}
          {tab === "delivery" && (
            <div className="space-y-4">
              {/* Assign delivery */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="font-bold text-gray-900 mb-3">ডেলিভারি অ্যাসাইন করুন</h3>
                <div className="flex gap-3 flex-wrap">
                  <select
                    className="flex-1 min-w-[200px] px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
                    value={assignDelivery.orderId}
                    onChange={(e) => setAssignDelivery((p) => ({ ...p, orderId: parseInt(e.target.value) }))}
                  >
                    <option value="0">অর্ডার নির্বাচন করুন</option>
                    {orders.filter((o) => ["PLACED", "ACCEPTED", "PREPARING", "READY_FOR_PICKUP"].includes(o.status)).map((o) => (
                      <option key={o.id} value={o.id}>#{o.orderNumber} - {o.customerName}</option>
                    ))}
                  </select>
                  <select
                    className="flex-1 min-w-[200px] px-4 py-2.5 rounded-xl border border-gray-200 text-sm"
                    value={assignDelivery.dbId}
                    onChange={(e) => setAssignDelivery((p) => ({ ...p, dbId: e.target.value }))}
                  >
                    <option value="">ডেলিভারি বয় নির্বাচন</option>
                    {deliveryBoys.filter((d) => d.status === "APPROVED").map((d) => (
                      <option key={d.id} value={d.id}>{d.user?.name} ({d.vehicleType})</option>
                    ))}
                  </select>
                  <Button onClick={doAssignDelivery}>অ্যাসাইন করুন</Button>
                </div>
              </div>

              {deliveryBoys.map((dboy) => (
                <div key={dboy.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-gray-900">{dboy.user?.name}</h3>
                      <p className="text-sm text-gray-500">{dboy.user?.phone} • {dboy.vehicleType}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge status={dboy.status} />
                      {dboy.isOnline && (
                        <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">অনলাইন</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                    <div className="bg-gray-50 rounded-xl p-2 text-center">
                      <div className="text-gray-500">ডেলিভারি</div>
                      <div className="font-bold">{dboy.totalDeliveries}</div>
                    </div>
                    <div className="bg-orange-50 rounded-xl p-2 text-center">
                      <div className="text-gray-500">হাতে নগদ</div>
                      <div className="font-bold text-orange-600">৳{parseFloat(dboy.cashInHand ?? "0").toFixed(0)}</div>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {dboy.status === "PENDING" && (
                      <>
                        <Button size="sm" onClick={() => updateDeliveryBoy(dboy.id, { status: "APPROVED" })}>
                          <CheckCircle className="w-4 h-4" />
                          অনুমোদন
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => updateDeliveryBoy(dboy.id, { status: "REJECTED" })}>
                          <XCircle className="w-4 h-4" />
                          প্রত্যাখ্যান
                        </Button>
                      </>
                    )}
                    {dboy.status === "APPROVED" && (
                      <Button size="sm" variant="danger" onClick={() => updateDeliveryBoy(dboy.id, { status: "SUSPENDED" })}>
                        স্থগিত
                      </Button>
                    )}
                    {dboy.status === "SUSPENDED" && (
                      <Button size="sm" onClick={() => updateDeliveryBoy(dboy.id, { status: "APPROVED" })}>
                        পুনরায় সক্রিয়
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {deliveryBoys.length === 0 && (
                <div className="text-center py-20 bg-white rounded-2xl border">
                  <Bike className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400">কোনো ডেলিভারি বয় নেই</p>
                </div>
              )}
            </div>
          )}

          {/* Orders Tab */}
          {tab === "orders" && (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-gray-900">#{order.orderNumber}</div>
                      <div className="text-sm text-gray-500">{order.customerName} • {formatDateTime(order.createdAt)}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge status={order.status} />
                      <span className="font-bold text-orange-500">৳{parseFloat(order.total).toFixed(0)}</span>
                    </div>
                  </div>
                </div>
              ))}
              {orders.length === 0 && (
                <div className="text-center py-20 bg-white rounded-2xl border">
                  <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400">কোনো অর্ডার নেই</p>
                </div>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {tab === "settings" && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="font-bold text-gray-900 text-lg mb-4">প্ল্যাটফর্ম সেটিং</h2>
                <div className="space-y-3">
                  {settings.map((setting) => (
                    <div key={setting.key} className="p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-sm font-medium text-gray-700">{setting.description || setting.key}</div>
                        <button
                          onClick={() => setEditSetting({ key: setting.key, value: setting.value })}
                          className="text-xs text-orange-500 hover:underline"
                        >
                          সম্পাদনা
                        </button>
                      </div>
                      {editSetting?.key === setting.key ? (
                        <div className="flex gap-2 mt-2">
                          <input
                            className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm"
                            value={editSetting.value}
                            onChange={(e) => setEditSetting({ ...editSetting, value: e.target.value })}
                          />
                          <Button size="sm" onClick={saveSetting}>সংরক্ষণ</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditSetting(null)}>বাতিল</Button>
                        </div>
                      ) : (
                        <div className="font-bold text-gray-900">{setting.value}</div>
                      )}
                    </div>
                  ))}

                  {settings.length === 0 && (
                    <p className="text-gray-400 text-center py-8">
                      সেটিং লোড হয়নি। প্রথমে{" "}
                      <button
                        onClick={async () => {
                          await fetch("/api/seed", { method: "POST" });
                          loadAll();
                          toast.success("ডেমো ডেটা যোগ হয়েছে");
                        }}
                        className="text-orange-500 underline"
                      >
                        ডেমো ডেটা সিড
                      </button>{" "}
                      করুন
                    </p>
                  )}
                </div>
              </div>

              {/* Seed button */}
              <div className="bg-orange-50 rounded-2xl border border-orange-200 p-5">
                <h3 className="font-semibold text-orange-800 mb-2">ডেমো ডেটা সিড</h3>
                <p className="text-orange-600 text-sm mb-3">ডেমো রেস্টুরেন্ট, মেনু এবং ব্যবহারকারী তৈরি করুন</p>
                <Button
                  onClick={async () => {
                    const res = await fetch("/api/seed", { method: "POST" });
                    const d = await res.json();
                    if (res.ok) {
                      toast.success("সিড সম্পন্ন হয়েছে!");
                      loadAll();
                    } else {
                      toast.error(d.message);
                    }
                  }}
                >
                  ডেমো ডেটা লোড করুন
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
