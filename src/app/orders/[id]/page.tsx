"use client";
import { useState, useEffect, use } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Badge from "@/components/ui/Badge";
import { CheckCircle, Clock, MapPin, Phone, ShoppingBag, Bike } from "lucide-react";
import { formatDateTime, formatCurrency, getStatusLabel } from "@/lib/utils";

interface Order {
  id: number;
  orderNumber: string;
  status: string;
  total: string;
  subtotal: string;
  deliveryFee: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryLandmark: string;
  verificationCode: string;
  paymentMethod: string;
  createdAt: string;
  items: Array<{
    id: number;
    name: string;
    price: string;
    quantity: number;
    subtotal: string;
  }>;
  history: Array<{
    id: number;
    toStatus: string;
    createdAt: string;
    note: string;
  }>;
}

const STATUS_STEPS = [
  "PLACED",
  "ACCEPTED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "PICKED_UP",
  "ON_THE_WAY",
  "DELIVERED",
];

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = () => {
      fetch(`/api/orders/${id}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success) setOrder(d.data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    };

    fetchOrder();
    // Poll every 15 seconds for status updates
    const interval = setInterval(fetchOrder, 15000);
    return () => clearInterval(interval);
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/2" />
            <div className="h-48 bg-gray-200 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl font-bold text-gray-500">অর্ডার পাওয়া যায়নি</h2>
          <Link href="/" className="mt-4 inline-block text-orange-500 underline">হোমে ফিরুন</Link>
        </div>
      </div>
    );
  }

  const currentStepIndex = STATUS_STEPS.indexOf(order.status);
  const isTerminal = ["DELIVERED", "CANCELLED", "REJECTED"].includes(order.status);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">

        {/* Success Header */}
        {order.status === "PLACED" && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-green-800">অর্ডার সফলভাবে দেওয়া হয়েছে!</h2>
            <p className="text-green-600 mt-1">রেস্টুরেন্ট শীঘ্রই আপনার অর্ডার গ্রহণ করবে</p>
          </div>
        )}

        {order.status === "DELIVERED" && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-green-800">ডেলিভারি সম্পন্ন!</h2>
            <p className="text-green-600 mt-1">আপনার খাবার পৌঁছে গেছে। আপনাকে ধন্যবাদ!</p>
          </div>
        )}

        {/* Order Header */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-bold text-gray-900">অর্ডার #{order.orderNumber}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{formatDateTime(order.createdAt)}</p>
            </div>
            <Badge status={order.status} />
          </div>

          {/* Verification Code */}
          {!isTerminal && order.status !== "CANCELLED" && order.verificationCode && (
            <div className="bg-orange-50 rounded-xl p-4 text-center">
              <p className="text-sm text-orange-600 font-medium">ডেলিভারি ভেরিফিকেশন কোড</p>
              <p className="text-3xl font-bold text-orange-500 tracking-widest mt-1">
                {order.verificationCode}
              </p>
              <p className="text-xs text-orange-400 mt-1">ডেলিভারি বয়কে এই কোড দিন</p>
            </div>
          )}
        </div>

        {/* Status Tracker */}
        {!["CANCELLED", "REJECTED"].includes(order.status) && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-4">
            <h2 className="font-bold text-gray-900 mb-4">ট্র্যাক করুন</h2>
            <div className="space-y-3">
              {STATUS_STEPS.map((step, idx) => {
                const isPast = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                return (
                  <div key={step} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isCurrent ? "bg-orange-500" : isPast ? "bg-green-500" : "bg-gray-200"
                    }`}>
                      {isPast && !isCurrent ? (
                        <CheckCircle className="w-4 h-4 text-white" />
                      ) : isCurrent ? (
                        <Clock className="w-4 h-4 text-white animate-pulse" />
                      ) : (
                        <span className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                    <span className={`text-sm ${isPast ? "text-gray-900 font-medium" : "text-gray-400"}`}>
                      {getStatusLabel(step)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Delivery Info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-4">
          <h2 className="font-bold text-gray-900 mb-3">ডেলিভারি তথ্য</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <Phone className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
              <span>{order.customerName} — {order.customerPhone}</span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
              <div>
                <span>{order.deliveryAddress}</span>
                {order.deliveryLandmark && (
                  <span className="text-gray-400"> (কাছে: {order.deliveryLandmark})</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-4">
          <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-orange-400" />
            অর্ডারের আইটেম
          </h2>
          <div className="space-y-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-700">{item.name} × {item.quantity}</span>
                <span className="font-medium text-gray-900">৳{parseFloat(item.subtotal).toFixed(0)}</span>
              </div>
            ))}
          </div>
          <div className="border-t mt-4 pt-3 space-y-1">
            <div className="flex justify-between text-sm text-gray-500">
              <span>খাবারের দাম</span>
              <span>৳{parseFloat(order.subtotal).toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>ডেলিভারি চার্জ</span>
              <span>৳{parseFloat(order.deliveryFee).toFixed(0)}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t">
              <span>মোট</span>
              <span className="text-orange-500">৳{parseFloat(order.total).toFixed(0)}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Link href="/profile" className="flex-1 text-center py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors">
            আমার অর্ডার
          </Link>
          <Link href="/restaurants" className="flex-1 text-center py-3 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors">
            আরও অর্ডার করুন
          </Link>
        </div>
      </div>
    </div>
  );
}
