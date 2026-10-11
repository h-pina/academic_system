import { cn } from "@/lib/cn";
import { avatarToneFor, initialsOf, type AvatarTone } from "@/lib/initials";

const TONES: Record<AvatarTone, string> = {
  blue: "bg-tile-blue text-slate-900",
  coral: "bg-tile-coral text-slate-900",
  sun: "bg-tile-sun text-slate-900",
  mint: "bg-tile-mint text-slate-900",
};

const SIZES = { sm: "h-7 w-7 text-xs", md: "h-9 w-9 text-sm", lg: "h-12 w-12 text-base" };

interface AvatarProps {
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}

/** Initials on a stable colour; the name is the accessible label. */
export function Avatar({ name, size = "md", className }: AvatarProps) {
  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        "inline-flex flex-none items-center justify-center rounded-full font-semibold",
        TONES[avatarToneFor(name)],
        SIZES[size],
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
