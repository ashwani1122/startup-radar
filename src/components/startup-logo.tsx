import { cn } from "@/lib/utils";

const accentClasses: Record<string, string> = {
  lime: "bg-lime-300 text-lime-950",
  violet: "bg-violet-300 text-violet-950",
  cyan: "bg-cyan-300 text-cyan-950",
  orange: "bg-orange-300 text-orange-950",
  yellow: "bg-yellow-300 text-yellow-950",
  pink: "bg-pink-300 text-pink-950",
};

export function StartupLogo({ text, accent, className }: { text: string; accent: string; className?: string }) {
  return (
    <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl font-mono text-xs font-bold tracking-[-0.04em] shadow-sm", accentClasses[accent] ?? accentClasses.lime, className)}>
      {text}
    </span>
  );
}
