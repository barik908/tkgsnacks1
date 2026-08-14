"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChefHat } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/useAuthStore";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "লগইন ব্যর্থ");
        return;
      }
      setUser(data.data.user);
      toast.success("লগইন সফল!");

      // Redirect based on role
      const role = data.data.user.role;
      if (role === "ADMIN") router.push("/dashboard/admin");
      else if (role === "RESTAURANT_OWNER") router.push("/dashboard/restaurant");
      else if (role === "DELIVERY_BOY") router.push("/dashboard/delivery");
      else router.push("/");
    } catch {
      toast.error("সার্ভার ত্রুটি");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center">
                <ChefHat className="w-6 h-6 text-white" />
              </div>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-4">স্বাগতম!</h1>
            <p className="text-gray-500 mt-1">আপনার অ্যাকাউন্টে লগইন করুন</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="মোবাইল নম্বর"
              type="tel"
              placeholder="01XXXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <Input
              label="পাসওয়ার্ড"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" className="w-full" size="lg" isLoading={loading}>
              লগইন করুন
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-500">
              অ্যাকাউন্ট নেই?{" "}
              <Link href="/register" className="text-orange-500 font-semibold hover:underline">
                রেজিস্ট্রেশন করুন
              </Link>
            </p>
          </div>

          {/* Demo credentials */}
          <div className="mt-6 p-4 bg-orange-50 rounded-xl">
            <p className="text-xs font-semibold text-orange-700 mb-2">ডেমো অ্যাকাউন্ট:</p>
            <div className="space-y-1 text-xs text-orange-600">
              <p>👑 Admin: 01700000001 / admin123456</p>
              <p>🍽️ Restaurant: 01700000002 / owner123456</p>
              <p>👤 Customer: 01700000003 / customer123</p>
              <p>🛵 Delivery: 01700000004 / delivery123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
