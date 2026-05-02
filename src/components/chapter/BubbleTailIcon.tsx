import { cn } from "@/lib/utils";

/** Glyphe « queue de bulle » BD (corps + pointe), lisible en 16–20px. */
export function BubbleTailIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("shrink-0", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M7.5 4.5h7.8a2.7 2.7 0 0 1 2.7 2.7v6.1a2.7 2.7 0 0 1-2.7 2.7h-4.1l-2.9 5.5-.8-5.5H7.5a2.7 2.7 0 0 1-2.7-2.7V7.2a2.7 2.7 0 0 1 2.7-2.7z" />
    </svg>
  );
}
