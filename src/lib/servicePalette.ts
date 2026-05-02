/**
 * Curated palette of service colors. The `className` field is the exact string
 * applied to BookingBlock, so each variant must appear literally in source for
 * Tailwind to generate it. The `swatch` hex powers picker UI previews only.
 */
export interface ServiceColor {
  id: string;
  label: string;
  swatch: string;
  className: string;
}

export const SERVICE_COLORS: ServiceColor[] = [
  {
    id: "rose",
    label: "Rose",
    swatch: "#fb7185",
    className: "bg-rose-500/90 hover:bg-rose-500 text-white",
  },
  {
    id: "pink",
    label: "Pink",
    swatch: "#ec4899",
    className: "bg-pink-500/90 hover:bg-pink-500 text-white",
  },
  {
    id: "fuchsia",
    label: "Fuchsia",
    swatch: "#d946ef",
    className: "bg-fuchsia-500/90 hover:bg-fuchsia-500 text-white",
  },
  {
    id: "violet",
    label: "Violet",
    swatch: "#8b5cf6",
    className: "bg-violet-500/90 hover:bg-violet-500 text-white",
  },
  {
    id: "indigo",
    label: "Indigo",
    swatch: "#6366f1",
    className: "bg-indigo-500/90 hover:bg-indigo-500 text-white",
  },
  {
    id: "blue",
    label: "Blue",
    swatch: "#3b82f6",
    className: "bg-blue-500/90 hover:bg-blue-500 text-white",
  },
  {
    id: "sky",
    label: "Sky",
    swatch: "#0ea5e9",
    className: "bg-sky-500/90 hover:bg-sky-500 text-white",
  },
  {
    id: "cyan",
    label: "Cyan",
    swatch: "#06b6d4",
    className: "bg-cyan-500/90 hover:bg-cyan-500 text-white",
  },
  {
    id: "teal",
    label: "Teal",
    swatch: "#14b8a6",
    className: "bg-teal-500/90 hover:bg-teal-500 text-white",
  },
  {
    id: "emerald",
    label: "Emerald",
    swatch: "#10b981",
    className: "bg-emerald-500/90 hover:bg-emerald-500 text-white",
  },
  {
    id: "green",
    label: "Green",
    swatch: "#22c55e",
    className: "bg-green-500/90 hover:bg-green-500 text-white",
  },
  {
    id: "lime",
    label: "Lime",
    swatch: "#84cc16",
    className: "bg-lime-500/90 hover:bg-lime-500 text-zinc-900",
  },
  {
    id: "amber",
    label: "Amber",
    swatch: "#f59e0b",
    className: "bg-amber-500/90 hover:bg-amber-500 text-white",
  },
  {
    id: "orange",
    label: "Orange",
    swatch: "#f97316",
    className: "bg-orange-500/90 hover:bg-orange-500 text-white",
  },
  {
    id: "red",
    label: "Red",
    swatch: "#ef4444",
    className: "bg-red-500/90 hover:bg-red-500 text-white",
  },
  {
    id: "slate",
    label: "Slate",
    swatch: "#64748b",
    className: "bg-slate-500/90 hover:bg-slate-500 text-white",
  },
];

export const DEFAULT_SERVICE_COLOR: ServiceColor = SERVICE_COLORS[0];

export function findServiceColor(className: string): ServiceColor {
  return (
    SERVICE_COLORS.find((c) => c.className === className) ??
    DEFAULT_SERVICE_COLOR
  );
}
