import Link from "next/link";
import { ChefHat, MapPin, Clock, Star, ShoppingBag, Bike, Shield } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { db } from "@/db";
import { restaurants } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function getFeaturedRestaurants() {
  try {
    return await db
      .select({
        id: restaurants.id,
        name: restaurants.name,
        slug: restaurants.slug,
        description: restaurants.description,
        logoUrl: restaurants.logoUrl,
        cuisine: restaurants.cuisine,
        avgRating: restaurants.avgRating,
        totalReviews: restaurants.totalReviews,
        isOpen: restaurants.isOpen,
        openingTime: restaurants.openingTime,
        closingTime: restaurants.closingTime,
      })
      .from(restaurants)
      .where(and(eq(restaurants.status, "APPROVED"), eq(restaurants.isVisible, true)))
      .limit(6);
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const featuredRestaurants = await getFeaturedRestaurants();

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-24">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
              <MapPin className="w-4 h-4" />
              ঠাকুরগাঁও সদর
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              ঘরে বসেই পান <br />
              <span className="text-yellow-200">প্রিয় খাবার</span>
            </h1>
            <p className="text-lg md:text-xl text-orange-50 mb-8 leading-relaxed">
              ঠাকুরগাঁওয়ের সেরা রেস্টুরেন্ট থেকে অর্ডার করুন। দ্রুত ডেলিভারি, তাজা খাবার।
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/restaurants"
                className="inline-flex items-center justify-center gap-2 bg-white text-orange-500 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-orange-50 transition-colors shadow-lg"
              >
                <ShoppingBag className="w-5 h-5" />
                এখনই অর্ডার করুন
              </Link>
              <Link
                href="/register?role=RESTAURANT_OWNER"
                className="inline-flex items-center justify-center gap-2 bg-white/20 text-white border-2 border-white/40 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-white/30 transition-colors"
              >
                <ChefHat className="w-5 h-5" />
                রেস্টুরেন্ট যোগ করুন
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-3 gap-8">
            {[
              { icon: ChefHat, label: "রেস্টুরেন্ট", value: featuredRestaurants.length + "+" },
              { icon: Bike, label: "ডেলিভারি বয়", value: "১০+" },
              { icon: Clock, label: "ডেলিভারি সময়", value: "৩০ মিনিট" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <stat.icon className="w-6 h-6 text-orange-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Restaurants */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">রেস্টুরেন্টসমূহ</h2>
            <p className="text-gray-500 mt-1">ঠাকুরগাঁওয়ের সেরা খাবারের ঠিকানা</p>
          </div>
          <Link href="/restaurants" className="text-orange-500 font-semibold hover:text-orange-600 transition-colors">
            সব দেখুন →
          </Link>
        </div>

        {featuredRestaurants.length === 0 ? (
          <div className="text-center py-20">
            <ChefHat className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-500">এখনো কোনো রেস্টুরেন্ট নেই</h3>
            <p className="text-gray-400 mt-2">শীঘ্রই রেস্টুরেন্ট যুক্ত হবে</p>
            <Link
              href="/api/seed"
              className="mt-4 inline-block text-sm text-orange-500 underline"
            >
              ডেমো ডেটা লোড করুন (POST /api/seed)
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredRestaurants.map((rest) => (
              <Link
                key={rest.id}
                href={`/restaurants/${rest.id}`}
                className="group bg-white rounded-2xl shadow-sm hover:shadow-md border border-gray-100 overflow-hidden transition-all duration-200"
              >
                {/* Restaurant image */}
                <div className="h-44 bg-gradient-to-br from-orange-100 to-amber-100 relative">
                  {rest.logoUrl ? (
                    <img
                      src={rest.logoUrl}
                      alt={rest.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ChefHat className="w-16 h-16 text-orange-300" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        rest.isOpen
                          ? "bg-green-500 text-white"
                          : "bg-gray-500 text-white"
                      }`}
                    >
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
                    <p className="text-sm text-gray-400 mt-2 line-clamp-2">
                      {rest.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <span className="text-sm font-semibold text-gray-700">
                        {parseFloat(rest.avgRating ?? "0").toFixed(1)}
                      </span>
                      <span className="text-xs text-gray-400">
                        ({rest.totalReviews} রিভিউ)
                      </span>
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
      </section>

      {/* How it works */}
      <section className="bg-orange-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 mb-10">
            কিভাবে কাজ করে?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "১",
                title: "রেস্টুরেন্ট বেছে নিন",
                desc: "আপনার পছন্দের রেস্টুরেন্ট এবং খাবার বেছে নিন",
                icon: ChefHat,
              },
              {
                step: "২",
                title: "অর্ডার করুন",
                desc: "কার্টে যোগ করে ঠিকানা দিয়ে অর্ডার দিন",
                icon: ShoppingBag,
              },
              {
                step: "৩",
                title: "ডেলিভারি পান",
                desc: "দ্রুততার সাথে আপনার দরজায় পৌঁছে দেব",
                icon: Bike,
              },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <item.icon className="w-8 h-8 text-white" />
                </div>
                <div className="inline-block bg-orange-100 text-orange-600 text-sm font-bold px-3 py-1 rounded-full mb-3">
                  ধাপ {item.step}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Join as partner */}
      <section className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">আপনার রেস্টুরেন্ট যোগ করুন</h2>
              <p className="text-gray-400 text-lg mb-6">
                TKG Snacks-এ আপনার রেস্টুরেন্ট যুক্ত করুন এবং হাজার হাজার কাস্টমারের কাছে পৌঁছান।
              </p>
              <Link
                href="/register?role=RESTAURANT_OWNER"
                className="inline-flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors"
              >
                <ChefHat className="w-5 h-5" />
                এখনই যোগ দিন
              </Link>
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-4">ডেলিভারি বয় হিসেবে যোগ দিন</h2>
              <p className="text-gray-400 text-lg mb-6">
                নিজের সুবিধামতো কাজ করুন এবং প্রতিটি ডেলিভারিতে আয় করুন।
              </p>
              <Link
                href="/register?role=DELIVERY_BOY"
                className="inline-flex items-center gap-2 bg-white text-gray-900 px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
              >
                <Bike className="w-5 h-5" />
                ডেলিভারি বয় হিসেবে যোগ দিন
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-8 h-8 bg-orange-500 rounded-xl flex items-center justify-center">
              <ChefHat className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-lg">TKG Snacks</span>
          </div>
          <p className="text-gray-500 text-sm">
            ঠাকুরগাঁওয়ের সেরা ফুড ডেলিভারি সার্ভিস
          </p>
          <div className="flex items-center justify-center gap-1 mt-3 text-gray-600 text-xs">
            <Shield className="w-3 h-3" />
            নিরাপদ পেমেন্ট • দ্রুত ডেলিভারি • তাজা খাবার
          </div>
        </div>
      </footer>
    </div>
  );
}
