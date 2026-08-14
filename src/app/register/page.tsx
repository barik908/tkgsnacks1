"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChefHat } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/useAuthStore";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

function RegisterForm() {
  const searchParams = useSearchParams();
  const defaultRole = searchParams.get("role") ?? "CUSTOMER";

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: defaultRole,
    vehicleType: "",
    vehicleNumber: "",
    nidNumber: "",
  });
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuthStore();
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error("পাসওয়ার্ড মিলছে না");
      return;
    }

    setLoading(true);
    try {
      // Different endpoint for delivery boy
      const endpoint =
        formData.role === "DELIVERY_BOY"
          ? "/api/delivery/register"
          : "/api/auth/register";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          password: formData.password,
          role: formData.role,
          vehicleType: formData.vehicleType,
          vehicleNumber: formData.vehicleNumber,
          nidNumber: formData.nidNumber,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "রেজিস্ট্রেশন ব্যর্থ");
        return;
      }
      setUser(data.data.user);
      toast.success("রেজিস্ট্রেশন সফল!");

      if (formData.role === "DELIVERY_BOY") {
        toast("আপনার অ্যাকাউন্ট অ্যাডমিন অনুমোদনের অপেক্ষায়", { icon: "ℹ️" });
        router.push("/dashboard/delivery");
      } else if (formData.role === "RESTAURANT_OWNER") {
        router.push("/dashboard/restaurant");
      } else {
        router.push("/");
      }
    } catch {
      toast.error("সার্ভার ত্রুটি");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center">
                <ChefHat className="w-6 h-6 text-white" />
              </div>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-4">নতুন অ্যাকাউন্ট</h1>
            <p className="text-gray-500 mt-1">আজই যোগ দিন TKG Snacks-এ</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                অ্যাকাউন্টের ধরন
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="CUSTOMER">কাস্টমার</option>
                <option value="RESTAURANT_OWNER">রেস্টুরেন্ট মালিক</option>
                <option value="DELIVERY_BOY">ডেলিভারি বয়</option>
              </select>
            </div>

            <Input
              label="পুরো নাম"
              name="name"
              type="text"
              placeholder="আপনার নাম"
              value={formData.name}
              onChange={handleChange}
              required
            />
            <Input
              label="মোবাইল নম্বর"
              name="phone"
              type="tel"
              placeholder="01XXXXXXXXX"
              value={formData.phone}
              onChange={handleChange}
              required
            />
            <Input
              label="পাসওয়ার্ড"
              name="password"
              type="password"
              placeholder="কমপক্ষে ৬ অক্ষর"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <Input
              label="পাসওয়ার্ড নিশ্চিত করুন"
              name="confirmPassword"
              type="password"
              placeholder="পাসওয়ার্ড আবার দিন"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />

            {formData.role === "DELIVERY_BOY" && (
              <>
                <Input
                  label="যানবাহনের ধরন"
                  name="vehicleType"
                  placeholder="মোটরসাইকেল / বাইসাইকেল"
                  value={formData.vehicleType}
                  onChange={handleChange}
                />
                <Input
                  label="যানবাহন নম্বর"
                  name="vehicleNumber"
                  placeholder="যানবাহন নম্বর"
                  value={formData.vehicleNumber}
                  onChange={handleChange}
                />
                <Input
                  label="NID নম্বর"
                  name="nidNumber"
                  placeholder="জাতীয় পরিচয়পত্র নম্বর"
                  value={formData.nidNumber}
                  onChange={handleChange}
                />
              </>
            )}

            <Button type="submit" className="w-full" size="lg" isLoading={loading}>
              রেজিস্ট্রেশন করুন
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-500">
              ইতিমধ্যে অ্যাকাউন্ট আছে?{" "}
              <Link href="/login" className="text-orange-500 font-semibold hover:underline">
                লগইন করুন
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">লোড হচ্ছে...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
