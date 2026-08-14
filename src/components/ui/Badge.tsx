import { cn, getStatusColor, getStatusLabel } from "@/lib/utils";

interface BadgeProps {
  status: string;
  className?: string;
  showLabel?: boolean;
  customLabel?: string;
}

export default function Badge({ status, className, showLabel = true, customLabel }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        getStatusColor(status),
        className
      )}
    >
      {customLabel ?? (showLabel ? getStatusLabel(status) : status)}
    </span>
  );
}
