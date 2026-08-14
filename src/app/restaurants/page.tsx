"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import { ChefHat, Star, Clock, Search, Filter } from "lucide-react";

interface Restaurant {
  id: number;
  name: string;
  slug: string;
  description: string;
  logoUrl: string;
  cuisine: string;
  avgRating: string;
  totalReviews: number;
  isOpen: boolean;
  openingTime: string;
  closingTime: string;
  isPartner: boolean;
}

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [filtered, setFiltered] = useState<Restaurant[]>([]);

  useEffect(() => {
    fetch("/api/restaurants")
      .then((r) => r.json())
      .then((d) => {
        setRestaurants(d.data ?? []);
        setFiltered(d.data ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!search) {
      setFiltered(restaurants);
      return;
    }
    const q = search.toLowerCase();
    setFiltered(
      restaurants.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.cuisine ?? "").toLowerCase().includes(q)
      )
    );
  }, [search, restaurants]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <h1 className="text-3xl font-bold text-gray-900">সব রেস্টুরেন্ট</h1>
          <p className="text-gray-500 mt-1">ঠাকুরগাঁওয়ের সেরা খাবারের ঠিকানা</p>

          {/* Search */}
          <div className="mt-4 relative max-w-lg">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="রেস্টুরেন্ট বা খাবার খুঁজুন..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
                <div className="h-44 bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-5 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <ChefHat className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-500">কোনো রেস্টুরেন্ট পাওয়া যায়নি</h3>
            {search && (
              <button onClick={() => setSearch("")} className="mt-3 text-orange-500 underline">
                সার্চ মুছুন
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((rest) => (
              <Link
                key={rest.id}
                href={`/restaurants/${rest.id}`}
                className="group bg-white rounded-2xl shadow-sm hover:shadow-md border border-gray-100 overflow-hidden transition-all duration-200"
              >
                <div className="h-44 bg-gradient-to-br from-orange-100 to-amber-100 relative">
                  {rest.logoUrl ? (
                    <img src={rest.logoUrl} alt={rest.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ChefHat className="w-16 h-16 text-orange-300" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3 flex gap-2">
                    {rest.isPartner && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-500 text-white">
                        পার্টনার
                      </span>
                    )}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${rest.isOpen ? "bg-green-500 text-white" : "bg-gray-500 text-white"}`}>
                      {rest.isOpen ? "খোলা" : "বন্ধ"}
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-gray-900 text-lg group-hover:text-orange-500 transition-colors">
                    {rest.name}
                  </h3>
                  {rest.cuisine && (
                    <p className="text-sm text-gray-500 mt-0.5">{rest.cuisine}</p>
                  )}
                  {rest.description && (
                    <p className="text-sm text-gray-400 mt-2 line-clamp-2">{rest.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <span className="text-sm font-semibold">
                        {parseFloat(rest.avgRating ?? "0").toFixed(1)}
                      </span>
                      <span className="text-xs text-gray-400">({rest.totalReviews})</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      {rest.openingTime} - {rest.closingTime}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
