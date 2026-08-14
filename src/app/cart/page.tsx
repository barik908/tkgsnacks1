"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { useCartStore } from "@/store/useCartStore";
import { useAuthStore } from "@/store/useAuthStore";
import { ShoppingCart, Minus, Plus, Trash2, MapPin, User, Phone, Navigation } from "lucide-react";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Link from "next/link";

const DELIVERY_FEE = 50;

export default function CartPage() {
  const { items, updateQuantity, removeItem, clearCart, getTotal, restaurantName } = useCartStore();
  const { user } = useAuthStore();
  const router = useRouter();
  const [step, setStep] = useState<"cart" | "checkout">("cart");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [formData, setFormData] = useState({
    customerName: "",
    customerPhone: "",
    deliveryAddress: "",
    deliveryLandmark: "",
    deliveryInstructions: "",
    paymentMethod: "CASH_ON_DELIVERY" as "CASH_ON_DELIVERY" | "ONLINE",
    useLocation: false,
    latitude: "",
    longitude: "",
  });

  useEffect(() => {
    setMounted(true);
    if (user) {
      setFormData((prev) => ({
        ...prev,
        customerName: user.name || "",
        customerPhone: user.phone || "",
      }));
    }
  }, [user]);

  const subtotal = mounted ? getTotal() : 0;
  const total = subtotal + DELIVERY_FEE;

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("আপনার ব্রাউজার লোকেশন সাপোর্ট করে না");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toString(),
          longitude: pos.coords.longitude.toString(),
          useLocation: true,
        }));
        toast.success("লোকেশন পাওয়া গেছে");
      },
      () => toast.error("লোকেশন নেওয়া সম্ভব হয়নি")
    );
  };

  const handlePlaceOrder = async () => {
    if (!user) {
      toast.error("অর্ডার করতে লগইন করুন");
      router.push("/login");
      return;
    }

    if (user.role !== "CUSTOMER") {
      toast.error("শুধুমাত্র কাস্টমার অর্ডার করতে পারবেন");
      return;
    }

    if (!formData.customerName || !formData.customerPhone || !formData.deliveryAddress) {
      toast.error("সব তথ্য পূরণ করুন");
      return;
    }

    if (items.length === 0) {
      toast.error("কার্ট খালি");
      return;
    }

    setLoading(true);
    try {
      const restaurantId = items[0]?.restaurantId;
      const payload = {
        restaurantId,
        items: items.map((item) => ({
          menuItemId: item.id,
          quantity: item.quantity,
        })),
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        deliveryAddress: formData.deliveryAddress,
        deliveryLandmark: formData.deliveryLandmark || undefined,
        deliveryLatitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        deliveryLongitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
        deliveryInstructions: formData.deliveryInstructions || undefined,
        paymentMethod: formData.paymentMethod,
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "অর্ডার ব্যর্থ");
        return;
      }

      clearCart();
      toast.success("অর্ডার সফলভাবে দেওয়া হয়েছে!");
      router.push(`/orders/${data.data.orderId}`);
    } catch {
      toast.error("সার্ভার ত্রুটি");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <ShoppingCart className="w-20 h-20 text-gray-300 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-500">আপনার কার্ট খালি</h2>
          <p className="text-gray-400 mt-2">রেস্টুরেন্ট থেকে খাবার বেছে নিন</p>
          <Link href="/restaurants" className="inline-flex items-center gap-2 mt-6 bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors">
            রেস্টুরেন্ট দেখুন
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <ShoppingCart className="w-6 h-6 text-orange-500" />
          আপনার কার্ট
        </h1>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Cart Items */}
          <div className="lg:col-span-3 space-y-4">
            {/* Restaurant name */}
            <div className="bg-orange-50 rounded-xl p-3 text-sm font-medium text-orange-700">
              রেস্টুরেন্ট: {restaurantName}
            </div>

            {step === "cart" ? (
              <>
                {items.map((item) => (
                  <div key={item.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 shadow-sm">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{item.name}</h3>
                      <p className="text-orange-500 font-bold mt-1">৳{item.price.toFixed(0)} × {item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-bold">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors">
                        <Plus className="w-4 h-4" />
                      </button>
                      <button onClick={() => removeItem(item.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors ml-2">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-right min-w-[4rem]">
                      <span className="font-bold text-gray-900">৳{(item.price * item.quantity).toFixed(0)}</span>
                    </div>
                  </div>
                ))}

                <Button onClick={() => setStep("checkout")} className="w-full" size="lg">
                  ডেলিভারি তথ্য দিন →
                </Button>
              </>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
                <h2 className="text-lg font-bold text-gray-900">ডেলিভারি তথ্য</h2>

                <Input
                  label="আপনার নাম *"
                  placeholder="পুরো নাম"
                  value={formData.customerName}
                  onChange={(e) => setFormData((p) => ({ ...p, customerName: e.target.value }))}
                />
                <Input
                  label="মোবাইল নম্বর *"
                  type="tel"
                  placeholder="01XXXXXXXXX"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData((p) => ({ ...p, customerPhone: e.target.value }))}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">পূর্ণ ঠিকানা *</label>
                  <textarea
                    placeholder="বাড়ি নম্বর, রাস্তা, এলাকা..."
                    value={formData.deliveryAddress}
                    onChange={(e) => setFormData((p) => ({ ...p, deliveryAddress: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                  />
                </div>
                <Input
                  label="কাছাকাছি পরিচিত স্থান / ল্যান্ডমার্ক"
                  placeholder="পরিচিত স্থানের নাম"
                  value={formData.deliveryLandmark}
                  onChange={(e) => setFormData((p) => ({ ...p, deliveryLandmark: e.target.value }))}
                />

                {/* Live Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">লাইভ লোকেশন</label>
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-colors ${
                      formData.useLocation
                        ? "bg-green-50 border-green-300 text-green-700"
                        : "bg-white border-gray-200 text-gray-600 hover:border-orange-300"
                    }`}
                  >
                    <Navigation className="w-4 h-4" />
                    {formData.useLocation ? "লোকেশন পাওয়া গেছে ✓" : "আমার লোকেশন নিন"}
                  </button>
                  {formData.latitude && (
                    <p className="text-xs text-gray-400 mt-1">
                      {parseFloat(formData.latitude).toFixed(4)}, {parseFloat(formData.longitude).toFixed(4)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">বিশেষ নির্দেশনা (ঐচ্ছিক)</label>
                  <textarea
                    placeholder="ডেলিভারির জন্য বিশেষ নির্দেশনা..."
                    value={formData.deliveryInstructions}
                    onChange={(e) => setFormData((p) => ({ ...p, deliveryInstructions: e.target.value }))}
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">পেমেন্ট পদ্ধতি</label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setFormData((p) => ({ ...p, paymentMethod: "CASH_ON_DELIVERY" }))}
                      className={`flex-1 py-3 rounded-xl border-2 text-sm font-semibold transition-colors ${
                        formData.paymentMethod === "CASH_ON_DELIVERY"
                          ? "border-orange-500 bg-orange-50 text-orange-600"
                          : "border-gray-200 text-gray-600"
                      }`}
                    >
                      💵 ক্যাশ অন ডেলিভারি
                    </button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep("cart")} className="flex-1">
                    ← ফিরে যান
                  </Button>
                  <Button onClick={handlePlaceOrder} isLoading={loading} className="flex-2 flex-1">
                    অর্ডার দিন
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm sticky top-24">
              <h2 className="font-bold text-gray-900 text-lg mb-4">অর্ডার সারসংক্ষেপ</h2>
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.name} × {item.quantity}</span>
                    <span className="font-medium">৳{(item.price * item.quantity).toFixed(0)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t mt-4 pt-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>খাবারের দাম</span>
                  <span>৳{subtotal.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>ডেলিভারি চার্জ</span>
                  <span>৳{DELIVERY_FEE}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 text-lg pt-2 border-t">
                  <span>মোট পরিশোধ</span>
                  <span className="text-orange-500">৳{total.toFixed(0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
