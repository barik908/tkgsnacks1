"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChefHat } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/useAuthStore";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Navbar from "@/components/layout/Navbar";

export default function RestaurantRegisterPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    cuisine: "",
    description: "",
    nidNumber: "",
    tradeLicense: "",
    openingTime: "09:00",
    closingTime: "22:00",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("রেজিস্ট্রেশনের আগে লগইন করুন");
      router.push("/login");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "নিবন্ধন ব্যর্থ");
        return;
      }
      toast.success("রেস্টুরেন্ট নিবন্ধন সফল! অ্যাডমিন অনুমোদনের অপেক্ষায়।");
      router.push("/dashboard/restaurant");
    } catch {
      toast.error("সার্ভার ত্রুটি");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">রেস্টুরেন্ট নিবন্ধন</h1>
              <p className="text-gray-500 text-sm">আপনার রেস্টুরেন্টের তথ্য দিন</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="রেস্টুরেন্টের নাম *" name="name" placeholder="রেস্টুরেন্টের নাম" value={formData.name} onChange={handleChange} required />
            <Input label="মোবাইল নম্বর *" name="phone" type="tel" placeholder="01XXXXXXXXX" value={formData.phone} onChange={handleChange} required />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">ঠিকানা *</label>
              <textarea name="address" value={formData.address} onChange={handleChange} rows={2} placeholder="রেস্টুরেন্টের পূর্ণ ঠিকানা" required className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
            </div>
            <Input label="খাবারের ধরন" name="cuisine" placeholder="যেমন: বাংলাদেশি, চাইনিজ..." value={formData.cuisine} onChange={handleChange} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">বিবরণ</label>
              <textarea name="description" value={formData.description} onChange={handleChange} rows={3} placeholder="আপনার রেস্টুরেন্ট সম্পর্কে সংক্ষিপ্ত বিবরণ" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="খোলার সময়" name="openingTime" type="time" value={formData.openingTime} onChange={handleChange} />
              <Input label="বন্ধের সময়" name="closingTime" type="time" value={formData.closingTime} onChange={handleChange} />
            </div>
            <Input label="NID নম্বর" name="nidNumber" placeholder="জাতীয় পরিচয়পত্র নম্বর" value={formData.nidNumber} onChange={handleChange} />
            <Input label="ট্রেড লাইসেন্স নম্বর" name="tradeLicense" placeholder="ট্রেড লাইসেন্স নম্বর" value={formData.tradeLicense} onChange={handleChange} />

            <div className="bg-yellow-50 rounded-xl p-4 text-sm text-yellow-700">
              <strong>নোট:</strong> নিবন্ধনের পরে আপনার রেস্টুরেন্ট অ্যাডমিনের অনুমোদনের জন্য অপেক্ষা করবে।
            </div>

            <Button type="submit" className="w-full" size="lg" isLoading={loading}>
              নিবন্ধন করুন
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
