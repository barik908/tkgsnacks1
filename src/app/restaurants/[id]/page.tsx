"use client";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { useCartStore } from "@/store/useCartStore";
import { ChefHat, Star, Clock, Plus, Minus, ShoppingCart, MapPin, Phone } from "lucide-react";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";

interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: string;
  images: string[];
  isAvailable: boolean;
  isVeg: boolean;
  preparationTime: number;
  categoryId: number | null;
}

interface Category {
  id: number;
  name: string;
  isActive: boolean;
}

interface Restaurant {
  id: number;
  name: string;
  description: string;
  logoUrl: string;
  coverUrl: string;
  cuisine: string;
  address: string;
  phone: string;
  avgRating: string;
  totalReviews: number;
  isOpen: boolean;
  openingTime: string;
  closingTime: string;
  categories: Category[];
  menuItems: MenuItem[];
}

export default function RestaurantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const { addItem, items, updateQuantity, removeItem } = useCartStore();
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/restaurants/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setRestaurant(d.data);
          if (d.data.categories?.length > 0) {
            setActiveCategory(d.data.categories[0].id);
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-48 bg-gray-200 rounded-2xl" />
            <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <ChefHat className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-500">রেস্টুরেন্ট পাওয়া যায়নি</h2>
        </div>
      </div>
    );
  }

  const filteredItems = activeCategory
    ? restaurant.menuItems.filter((m) => m.categoryId === activeCategory)
    : restaurant.menuItems;

  const getCartQuantity = (itemId: number) => {
    const cartItem = items.find((i) => i.id === itemId);
    return cartItem?.quantity ?? 0;
  };

  const handleAdd = (item: MenuItem) => {
    addItem({
      id: item.id,
      name: item.name,
      price: parseFloat(item.price),
      quantity: 1,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
    });
    toast.success(`${item.name} কার্টে যুক্ত হয়েছে`);
  };

  const cartTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const cartCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const cartRestaurantId = items[0]?.restaurantId;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Restaurant Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 bg-gradient-to-br from-orange-100 to-amber-100 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden">
              {restaurant.logoUrl ? (
                <img src={restaurant.logoUrl} alt={restaurant.name} className="w-full h-full object-cover" />
              ) : (
                <ChefHat className="w-12 h-12 text-orange-400" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{restaurant.name}</h1>
                  {restaurant.cuisine && (
                    <p className="text-gray-500 mt-1">{restaurant.cuisine}</p>
                  )}
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${restaurant.isOpen ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {restaurant.isOpen ? "খোলা আছে" : "এখন বন্ধ"}
                </span>
              </div>
              {restaurant.description && (
                <p className="text-gray-600 mt-2 text-sm">{restaurant.description}</p>
              )}
              <div className="flex flex-wrap gap-4 mt-3">
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="font-semibold">{parseFloat(restaurant.avgRating ?? "0").toFixed(1)}</span>
                  <span className="text-gray-400">({restaurant.totalReviews} রিভিউ)</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Clock className="w-4 h-4 text-orange-400" />
                  {restaurant.openingTime} - {restaurant.closingTime}
                </div>
                {restaurant.address && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 text-orange-400" />
                    {restaurant.address}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-6">
          {/* Left: Categories + Menu */}
          <div className="flex-1">
            {/* Category tabs */}
            {restaurant.categories.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-3 mb-6">
                <button
                  onClick={() => setActiveCategory(null)}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    activeCategory === null
                      ? "bg-orange-500 text-white"
                      : "bg-white text-gray-600 border border-gray-200 hover:border-orange-300"
                  }`}
                >
                  সব
                </button>
                {restaurant.categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      activeCategory === cat.id
                        ? "bg-orange-500 text-white"
                        : "bg-white text-gray-600 border border-gray-200 hover:border-orange-300"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}

            {/* Menu items */}
            <div className="space-y-3">
              {filteredItems.filter((m) => m.isAvailable).map((item) => {
                const qty = getCartQuantity(item.id);
                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 shadow-sm"
                  >
                    <div className="w-20 h-20 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl flex-shrink-0 overflow-hidden">
                      {item.images && item.images.length > 0 ? (
                        <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ChefHat className="w-8 h-8 text-orange-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <h3 className="font-semibold text-gray-900">{item.name}</h3>
                        {item.isVeg && (
                          <span className="flex-shrink-0 text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-medium">ভেজ</span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="font-bold text-orange-500 text-lg">৳{parseFloat(item.price).toFixed(0)}</span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.preparationTime} মিনিট
                        </span>
                      </div>
                    </div>

                    {/* Add to cart */}
                    <div className="flex-shrink-0">
                      {qty === 0 ? (
                        <button
                          onClick={() => handleAdd(item)}
                          disabled={!restaurant.isOpen}
                          className="flex items-center gap-1.5 bg-orange-500 text-white px-4 py-2 rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-4 h-4" />
                          যোগ করুন
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              if (qty === 1) removeItem(item.id);
                              else updateQuantity(item.id, qty - 1);
                            }}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-orange-100 text-orange-600 hover:bg-orange-200 transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-bold text-gray-900">{qty}</span>
                          <button
                            onClick={() => handleAdd(item)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredItems.filter((m) => m.isAvailable).length === 0 && (
                <div className="text-center py-12">
                  <ChefHat className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">এই ক্যাটাগরিতে কোনো আইটেম নেই</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Cart Summary (Desktop) */}
          {cartCount > 0 && cartRestaurantId === restaurant.id && (
            <div className="hidden lg:block w-80 flex-shrink-0">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sticky top-24">
                <h3 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-orange-500" />
                  আপনার কার্ট
                </h3>
                <div className="space-y-3 mb-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium text-gray-900">{item.name}</span>
                        <span className="text-gray-400"> × {item.quantity}</span>
                      </div>
                      <span className="font-semibold text-gray-900">৳{(item.price * item.quantity).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-3 mb-4">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>খাবারের মোট</span>
                    <span className="font-semibold">৳{cartTotal.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 mt-1">
                    <span>ডেলিভারি চার্জ</span>
                    <span className="font-semibold">৳৫০</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 mt-2 text-base">
                    <span>মোট</span>
                    <span className="text-orange-500">৳{(cartTotal + 50).toFixed(0)}</span>
                  </div>
                </div>
                <Button className="w-full" onClick={() => router.push("/cart")}>
                  চেকআউট করুন
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile cart bar */}
      {cartCount > 0 && cartRestaurantId === restaurant.id && (
        <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-white border-t shadow-xl p-4 z-40">
          <button
            onClick={() => router.push("/cart")}
            className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-between px-6"
          >
            <span className="bg-white/20 px-2 py-0.5 rounded-lg text-sm">{cartCount} আইটেম</span>
            <span>কার্ট দেখুন</span>
            <span>৳{(cartTotal + 50).toFixed(0)}</span>
          </button>
        </div>
      )}
    </div>
  );
}
