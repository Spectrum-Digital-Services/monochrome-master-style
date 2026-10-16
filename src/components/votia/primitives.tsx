import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-2xl border border-hairline bg-surface shadow-card", className)}>{children}</div>;
}

export function PanelHeader({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-hairline px-5 py-4">
      <div>
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Pill({ children, solid, className }: { children: ReactNode; solid?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-medium",
        solid ? "bg-primary text-primary-foreground" : "border border-border bg-surface-2 text-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Dot({ live }: { live?: boolean }) {
  return (
    <span className="relative inline-flex h-1.5 w-1.5">
      {live && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />}
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
    </span>
  );
}

export function Bar({ value, marker, thin }: { value: number; marker?: number; thin?: boolean }) {
  return (
    <div className={cn("relative w-full overflow-visible rounded-full bg-muted", thin ? "h-1.5" : "h-2.5")}>
      <div className="h-full rounded-full bg-primary transition-all duration-700 ease-out" style={{ width: `${Math.min(100, value)}%` }} />
      {marker !== undefined && (
        <div className="absolute -top-1 h-[calc(100%+8px)] w-px bg-foreground" style={{ left: `${marker}%` }} />
      )}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  size?: "sm" | "md";
}) {
  return (
    <div className="inline-flex rounded-lg bg-muted p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md font-medium transition-all active:scale-[0.98]",
            size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3.5 py-1.5 text-xs",
            value === o.value ? "bg-surface text-foreground shadow-card" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("font-mono text-[11px] tracking-tight", className)}>{children}</span>;
}

export function Ring({ value, marker, size = 160 }: { value: number; marker?: number; size?: number }) {
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={10} className="stroke-muted" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c - (Math.min(100, value) / 100) * c}
        className="stroke-primary transition-all duration-700"
      />
      {marker !== undefined && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={16}
          strokeDasharray={`2 ${c}`}
          strokeDashoffset={-(marker / 100) * c}
          className="stroke-foreground"
        />
      )}
    </svg>
  );
}

export function QrGlyph({ seed, size = 21 }: { seed: string; size?: number }) {
  const cells: boolean[] = [];
  for (let i = 0; i < size * size; i++) {
    const ch = parseInt(seed[(i * 7) % seed.length], 16);
    cells.push(((ch >> (i % 4)) & 1) === 1);
  }
  const finder = (x: number, y: number) => {
    const inBox = (ox: number, oy: number) => x >= ox && x < ox + 7 && y >= oy && y < oy + 7;
    for (const [ox, oy] of [[0, 0], [size - 7, 0], [0, size - 7]]) {
      if (inBox(ox, oy)) {
        const dx = x - ox, dy = y - oy;
        return dx === 0 || dy === 0 || dx === 6 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4) ? 1 : 0;
      }
    }
    return -1;
  };
  return (
    <div className="grid aspect-square w-full" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
      {cells.map((on, i) => {
        const f = finder(i % size, Math.floor(i / size));
        const filled = f === -1 ? on : f === 1;
        return <div key={i} className={filled ? "bg-foreground" : "bg-transparent"} />;
      })}
    </div>
  );
}
