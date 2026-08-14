import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `৳${num.toFixed(0)}`;
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("bn-BD", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PLACED: "অর্ডার হয়েছে",
    ACCEPTED: "গ্রহণ করা হয়েছে",
    PREPARING: "তৈরি হচ্ছে",
    READY_FOR_PICKUP: "পিকআপের জন্য প্রস্তুত",
    PICKED_UP: "পিকআপ হয়েছে",
    ON_THE_WAY: "পথে আছে",
    DELIVERED: "ডেলিভারি সম্পন্ন",
    CANCELLED: "বাতিল",
    REJECTED: "প্রত্যাখ্যাত",
    PENDING: "অপেক্ষারত",
    APPROVED: "অনুমোদিত",
    SUSPENDED: "স্থগিত",
    REJECTED_RESTAURANT: "প্রত্যাখ্যাত",
  };
  return labels[status] ?? status;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PLACED: "bg-blue-100 text-blue-800",
    ACCEPTED: "bg-indigo-100 text-indigo-800",
    PREPARING: "bg-yellow-100 text-yellow-800",
    READY_FOR_PICKUP: "bg-purple-100 text-purple-800",
    PICKED_UP: "bg-orange-100 text-orange-800",
    ON_THE_WAY: "bg-cyan-100 text-cyan-800",
    DELIVERED: "bg-green-100 text-green-800",
    CANCELLED: "bg-gray-100 text-gray-800",
    REJECTED: "bg-red-100 text-red-800",
    PENDING: "bg-yellow-100 text-yellow-800",
    APPROVED: "bg-green-100 text-green-800",
    SUSPENDED: "bg-red-100 text-red-800",
  };
  return colors[status] ?? "bg-gray-100 text-gray-800";
}

export function apiResponse<T>(
  data: T,
  message = "Success",
  status = 200
) {
  return Response.json({ success: true, message, data }, { status });
}

export function apiError(message: string, status = 400, details?: unknown) {
  return Response.json(
    { success: false, message, ...(details ? { details } : {}) },
    { status }
  );
}
