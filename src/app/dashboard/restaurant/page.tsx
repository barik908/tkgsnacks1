"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import {
  ChefHat, ShoppingBag, Plus, LayoutDashboard, Settings, LogOut,
  CheckCircle, XCircle, Clock, Utensils, ToggleLeft, ToggleRight,
  Star, TrendingUp, Eye, Menu, X
} from "lucide-react";
import toast from "react-hot-toast";
import { formatDateTime, formatCurrency } from "@/lib/utils";

interface Restaurant {
  id: number;
  name: string;
  status: string;
  isOpen: boolean;
  isVisible: boolean;
  avgRating: string;
  totalReviews: number;
  phone: string;
  address: string;
  cuisine: string;
  description: string;
  openingTime: string;
  closingTime: string;
}

interface Order {
  id: number;
  orderNumber: string;
  status: string;
  total: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  createdAt: string;
  items: Array<{ name: string; quantity: number; price: string }>;
}

interface MenuItem {
  id: number;
  name: string;
  price: string;
  isAvailable: boolean;
  categoryId: number | null;
}

interface Category {
  id: number;
  name: string;
  isActive: boolean;
}

type Tab = "dashboard" | "orders" | "menu" | "categories" | "settings";

export default function RestaurantDashboard() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // New item form
  const [showNewItem, setShowNewItem] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", price: "", description: "", categoryId: "", isVeg: false });
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    if (user.role !== "RESTAURANT_OWNER") { router.push("/"); return; }
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const restRes = await fetch("/api/restaurants/my");
      const restData = await restRes.json();
      if (!restData.success) {
        setLoading(false);
        return;
      }
      setRestaurant(restData.data);

      const restId = restData.data.id;
      const [ordersRes, itemsRes, catsRes] = await Promise.all([
        fetch("/api/orders/restaurant"),
        fetch(`/api/menu?restaurantId=${restId}`),
        fetch(`/api/categories?restaurantId=${restId}`),
      ]);

      const [ordersData, itemsData, catsData] = await Promise.all([
        ordersRes.json(),
        itemsRes.json(),
        catsRes.json(),
      ]);

      setOrders(ordersData.data ?? []);
      setMenuItems(itemsData.data ?? []);
      setCategories(catsData.data ?? []);
    } catch (err) {
      toast.error("ডেটা লোড হয়নি");
    } finally {
      setLoading(false);
    }
  };

  const toggleOpen = async () => {
    if (!restaurant) return;
    const res = await fetch(`/api/restaurants/${restaurant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isOpen: !restaurant.isOpen }),
    });
    if (res.ok) {
      setRestaurant((r) => r ? { ...r, isOpen: !r.isOpen } : r);
      toast.success(restaurant.isOpen ? "রেস্টুরেন্ট বন্ধ করা হয়েছে" : "রেস্টুরেন্ট খোলা হয়েছে");
    }
  };

  const updateOrderStatus = async (orderId: number, status: string) => {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o));
      toast.success("অর্ডার স্ট্যাটাস আপডেট হয়েছে");
    } else {
      const d = await res.json();
      toast.error(d.message || "আপডেট ব্যর্থ");
    }
  };

  const createMenuItem = async () => {
    if (!restaurant || !newItem.name || !newItem.price) {
      toast.error("নাম এবং দাম দিন");
      return;
    }
    const res = await fetch("/api/menu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurantId: restaurant.id,
        name: newItem.name,
        price: parseFloat(newItem.price),
        description: newItem.description,
        categoryId: newItem.categoryId ? parseInt(newItem.categoryId) : undefined,
        isVeg: newItem.isVeg,
      }),
    });
    if (res.ok) {
      const d = await res.json();
      setMenuItems((prev) => [...prev, d.data]);
      setNewItem({ name: "", price: "", description: "", categoryId: "", isVeg: false });
      setShowNewItem(false);
      toast.success("মেনু আইটেম যোগ হয়েছে");
    }
  };

  const deleteMenuItem = async (id: number) => {
    if (!confirm("এই আইটেম মুছে ফেলবেন?")) return;
    const res = await fetch(`/api/menu/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMenuItems((prev) => prev.filter((m) => m.id !== id));
      toast.success("মুছে ফেলা হয়েছে");
    }
  };

  const createCategory = async () => {
    if (!restaurant || !newCatName) { toast.error("ক্যাটাগরির নাম দিন"); return; }
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId: restaurant.id, name: newCatName }),
    });
    if (res.ok) {
      const d = await res.json();
      setCategories((prev) => [...prev, d.data]);
      setNewCatName("");
      setShowNewCat(false);
      toast.success("ক্যাটাগরি যোগ হয়েছে");
    }
  };

  const todayOrders = orders.filter(
    (o) => new Date(o.createdAt).toDateString() === new Date().toDateString()
  );
  const pendingOrders = orders.filter((o) => ["PLACED", "ACCEPTED", "PREPARING"].includes(o.status));
  const todayRevenue = todayOrders
    .filter((o) => o.status !== "CANCELLED" && o.status !== "REJECTED")
    .reduce((s, o) => s + parseFloat(o.total), 0);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
    </div>
  );

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "dashboard", label: "ড্যাশবোর্ড", icon: LayoutDashboard },
    { id: "orders", label: "অর্ডার", icon: ShoppingBag },
    { id: "menu", label: "মেনু", icon: Utensils },
    { id: "categories", label: "ক্যাটাগরি", icon: ChefHat },
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
              <div className="text-xs text-gray-500">রেস্টুরেন্ট প্যানেল</div>
            </div>
          </div>
        </div>

        {restaurant && (
          <div className="p-4 border-b">
            <div className="text-sm font-semibold text-gray-900">{restaurant.name}</div>
            <Badge status={restaurant.status} className="mt-1" />
          </div>
        )}

        <nav className="p-3 space-y-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setTab(id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${tab === id ? "bg-orange-50 text-orange-600" : "text-gray-600 hover:bg-gray-50"}`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-4 left-0 right-0 px-3">
          <button
            onClick={() => { logout(); router.push("/"); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            লগআউট
          </button>
        </div>
      </div>

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex-1 min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100">
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-gray-900">
            {tabs.find((t) => t.id === tab)?.label}
          </h1>
          {restaurant && (
            <button
              onClick={toggleOpen}
              className={`ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${restaurant.isOpen ? "bg-green-50 text-green-700 hover:bg-green-100" : "bg-red-50 text-red-700 hover:bg-red-100"}`}
            >
              {restaurant.isOpen ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              {restaurant.isOpen ? "এখন খোলা" : "এখন বন্ধ"}
            </button>
          )}
        </header>

        <div className="p-4 sm:p-6">
          {/* No restaurant registered */}
          {!restaurant && (
            <div className="text-center py-20">
              <ChefHat className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-500">রেস্টুরেন্ট নিবন্ধিত নেই</h2>
              <Link href="/restaurant/register" className="mt-4 inline-block bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors">
                রেস্টুরেন্ট নিবন্ধন করুন
              </Link>
            </div>
          )}

          {/* Pending approval */}
          {restaurant && restaurant.status === "PENDING" && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 mb-6">
              <Clock className="w-8 h-8 text-yellow-500 mb-2" />
              <h3 className="font-bold text-yellow-800">অনুমোদনের অপেক্ষায়</h3>
              <p className="text-yellow-600 text-sm mt-1">আপনার রেস্টুরেন্ট অ্যাডমিনের অনুমোদনের জন্য অপেক্ষা করছে।</p>
            </div>
          )}

          {/* Dashboard Tab */}
          {tab === "dashboard" && restaurant && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "আজকের অর্ডার", value: todayOrders.length, icon: ShoppingBag, color: "bg-blue-50 text-blue-500" },
                  { label: "মুলতুবি অর্ডার", value: pendingOrders.length, icon: Clock, color: "bg-yellow-50 text-yellow-500" },
                  { label: "আজকের আয়", value: `৳${todayRevenue.toFixed(0)}`, icon: TrendingUp, color: "bg-green-50 text-green-500" },
                  { label: "রেটিং", value: parseFloat(restaurant.avgRating ?? "0").toFixed(1), icon: Star, color: "bg-orange-50 text-orange-500" },
                ].map((stat, i) => (
                  <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                    <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Recent orders */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="font-bold text-gray-900 mb-4">সাম্প্রতিক অর্ডার</h2>
                {orders.slice(0, 5).length === 0 ? (
                  <p className="text-gray-400 text-center py-8">কোনো অর্ডার নেই</p>
                ) : (
                  <div className="space-y-3">
                    {orders.slice(0, 5).map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                        <div>
                          <div className="font-medium text-gray-900">#{order.orderNumber}</div>
                          <div className="text-sm text-gray-500">{order.customerName}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge status={order.status} />
                          <span className="font-bold text-gray-900">৳{parseFloat(order.total).toFixed(0)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Orders Tab */}
          {tab === "orders" && restaurant && (
            <div className="space-y-4">
              {orders.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                  <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400">কোনো অর্ডার নেই</p>
                </div>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-bold text-gray-900">#{order.orderNumber}</div>
                        <div className="text-sm text-gray-500">{formatDateTime(order.createdAt)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge status={order.status} />
                        <span className="font-bold text-orange-500">৳{parseFloat(order.total).toFixed(0)}</span>
                      </div>
                    </div>

                    <div className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">{order.customerName}</span> — {order.customerPhone}
                    </div>
                    <div className="text-sm text-gray-500 mb-3">{order.deliveryAddress}</div>

                    {order.items && (
                      <div className="text-sm text-gray-500 mb-3">
                        {order.items.map((i, idx) => (
                          <span key={idx}>{i.name} ×{i.quantity}{idx < order.items.length - 1 ? ", " : ""}</span>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap">
                      {order.status === "PLACED" && (
                        <>
                          <Button size="sm" onClick={() => updateOrderStatus(order.id, "ACCEPTED")}>
                            <CheckCircle className="w-4 h-4" />
                            গ্রহণ করুন
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => updateOrderStatus(order.id, "REJECTED")}>
                            <XCircle className="w-4 h-4" />
                            প্রত্যাখ্যান
                          </Button>
                        </>
                      )}
                      {order.status === "ACCEPTED" && (
                        <Button size="sm" onClick={() => updateOrderStatus(order.id, "PREPARING")}>
                          রান্না শুরু
                        </Button>
                      )}
                      {order.status === "PREPARING" && (
                        <Button size="sm" onClick={() => updateOrderStatus(order.id, "READY_FOR_PICKUP")}>
                          পিকআপের জন্য প্রস্তুত
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Menu Tab */}
          {tab === "menu" && restaurant && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="font-bold text-gray-900">মেনু আইটেম ({menuItems.length})</h2>
                <Button size="sm" onClick={() => setShowNewItem(!showNewItem)}>
                  <Plus className="w-4 h-4" />
                  নতুন আইটেম
                </Button>
              </div>

              {showNewItem && (
                <div className="bg-white rounded-2xl border border-orange-200 p-5 shadow-sm space-y-3">
                  <h3 className="font-semibold text-gray-900">নতুন মেনু আইটেম</h3>
                  <Input label="নাম *" placeholder="খাবারের নাম" value={newItem.name} onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))} />
                  <Input label="দাম (৳) *" type="number" placeholder="0" value={newItem.price} onChange={(e) => setNewItem((p) => ({ ...p, price: e.target.value }))} />
                  <Input label="বিবরণ" placeholder="খাবারের বিবরণ" value={newItem.description} onChange={(e) => setNewItem((p) => ({ ...p, description: e.target.value }))} />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">ক্যাটাগরি</label>
                    <select className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white" value={newItem.categoryId} onChange={(e) => setNewItem((p) => ({ ...p, categoryId: e.target.value }))}>
                      <option value="">ক্যাটাগরি নেই</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="isVeg" checked={newItem.isVeg} onChange={(e) => setNewItem((p) => ({ ...p, isVeg: e.target.checked }))} className="rounded" />
                    <label htmlFor="isVeg" className="text-sm text-gray-700">ভেজেটেরিয়ান</label>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={createMenuItem} className="flex-1">সংরক্ষণ</Button>
                    <Button variant="outline" onClick={() => setShowNewItem(false)} className="flex-1">বাতিল</Button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {menuItems.map((item) => (
                  <div key={item.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between shadow-sm">
                    <div>
                      <div className="font-semibold text-gray-900">{item.name}</div>
                      <div className="text-orange-500 font-bold mt-0.5">৳{parseFloat(item.price).toFixed(0)}</div>
                      {!item.isAvailable && <span className="text-xs text-red-500">অনুপলব্ধ</span>}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          await fetch(`/api/menu/${item.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ isAvailable: !item.isAvailable }),
                          });
                          setMenuItems((prev) => prev.map((m) => m.id === item.id ? { ...m, isAvailable: !m.isAvailable } : m));
                        }}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium ${item.isAvailable ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}
                      >
                        {item.isAvailable ? "উপলব্ধ" : "অনুপলব্ধ"}
                      </button>
                      <button onClick={() => deleteMenuItem(item.id)} className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-500 font-medium hover:bg-red-100">
                        মুছুন
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Categories Tab */}
          {tab === "categories" && restaurant && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="font-bold text-gray-900">ক্যাটাগরি ({categories.length})</h2>
                <Button size="sm" onClick={() => setShowNewCat(!showNewCat)}>
                  <Plus className="w-4 h-4" />
                  নতুন ক্যাটাগরি
                </Button>
              </div>

              {showNewCat && (
                <div className="bg-white rounded-2xl border border-orange-200 p-4 shadow-sm space-y-3">
                  <Input label="ক্যাটাগরির নাম" placeholder="যেমন: বিরিয়ানি" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} />
                  <div className="flex gap-2">
                    <Button onClick={createCategory} className="flex-1">সংরক্ষণ</Button>
                    <Button variant="outline" onClick={() => setShowNewCat(false)} className="flex-1">বাতিল</Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {categories.map((cat) => (
                  <div key={cat.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between shadow-sm">
                    <span className="font-medium text-gray-900">{cat.name}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          await fetch(`/api/categories/${cat.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ isActive: !cat.isActive }),
                          });
                          setCategories((prev) => prev.map((c) => c.id === cat.id ? { ...c, isActive: !c.isActive } : c));
                        }}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium ${cat.isActive ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}
                      >
                        {cat.isActive ? "সক্রিয়" : "নিষ্ক্রিয়"}
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm("মুছে ফেলবেন?")) return;
                          await fetch(`/api/categories/${cat.id}`, { method: "DELETE" });
                          setCategories((prev) => prev.filter((c) => c.id !== cat.id));
                          toast.success("মুছে ফেলা হয়েছে");
                        }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-500 font-medium"
                      >
                        মুছুন
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {tab === "settings" && restaurant && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <h2 className="font-bold text-gray-900 text-lg">রেস্টুরেন্ট সেটিং</h2>
              <div className="grid gap-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="text-sm font-medium text-gray-500">রেস্টুরেন্টের নাম</div>
                  <div className="font-semibold text-gray-900 mt-1">{restaurant.name}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="text-sm font-medium text-gray-500">ফোন</div>
                  <div className="font-semibold text-gray-900 mt-1">{restaurant.phone}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="text-sm font-medium text-gray-500">ঠিকানা</div>
                  <div className="font-semibold text-gray-900 mt-1">{restaurant.address}</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="text-sm font-medium text-gray-500">স্ট্যাটাস</div>
                  <div className="mt-1"><Badge status={restaurant.status} /></div>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="text-sm font-medium text-gray-500">দৃশ্যমানতা</div>
                  <div className="font-semibold text-gray-900 mt-1">{restaurant.isVisible ? "দৃশ্যমান" : "লুকানো (অ্যাডমিন কর্তৃক)"}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
