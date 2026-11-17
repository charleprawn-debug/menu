import { cn } from "@/lib/utils";

export function LogoMark({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <rect width="48" height="48" rx="14" fill="url(#df-grad)" />
      <path
        d="M14 17.5C14 16.6716 14.6716 16 15.5 16H27C32.5228 16 37 20.4772 37 26C37 31.5228 32.5228 36 27 36H15.5C14.6716 36 14 35.3284 14 34.5V17.5Z"
        fill="white"
        fillOpacity="0.16"
      />
      <path
        d="M20 22H28.5M20 27H26"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="31.5" cy="32" r="3.5" fill="#FBBF24" />
      <defs>
        <linearGradient id="df-grad" x1="4" y1="2" x2="44" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10B981" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Logo({
  className,
  showText = true,
  subtitle,
  textClassName,
}: {
  className?: string;
  showText?: boolean;
  subtitle?: string;
  textClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {showText ? (
        <span className="flex flex-col leading-none">
          <span className={cn("text-lg font-extrabold tracking-tight", textClassName)}>DineFlow</span>
          {subtitle ? <span className="mt-1 text-[10px] font-medium text-muted-foreground">{subtitle}</span> : null}
        </span>
      ) : null}
    </span>
  );
}
