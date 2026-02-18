import {} from "lucide-react";

interface CarboySlot {
  AreaNumber: number;
  SlotNumber: number;
  MaterialID: number | null;
  Material?: {
    MaterialID: number;
    MaterialName: string;
    Color?: string;
    CurrentQuantityGrams?: number;
    InitialQuantityGrams?: number;
    ExpirationDate?: string;
  } | null;
}

interface Material {
  MaterialID: number;
  MaterialName: string;
  Color?: string;
}

interface PrinterCarboyGridProps {
  carboys: CarboySlot[];
  materials: Material[];
  onCarboyChange?: (
    areaNumber: number,
    slotNumber: number,
    materialId: number | null,
  ) => void;
  // Map of MaterialID -> Usage in Grams
  projectedUsage?: Record<number, number>;
}

// Helper to map slot number to label based on the image (M1-L, M1-R etc)
const getSlotLabel = (area: number, slot: number) => {
  const side = slot === 1 ? "L" : "R";
  return `M${area}-${side}`;
};

export default function PrinterCarboyGrid({
  carboys,
  materials,
  onCarboyChange,
  projectedUsage = {},
}: PrinterCarboyGridProps) {
  // Group by Area
  const areas: { [key: number]: CarboySlot[] } = {};
  carboys.forEach((c) => {
    if (!areas[c.AreaNumber]) areas[c.AreaNumber] = [];
    areas[c.AreaNumber].push(c);
  });

  const areaKeys = Object.keys(areas)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700/50">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
        {areaKeys.map((areaNum) => {
          const slots = areas[areaNum];
          const leftSlot = slots.find((s) => s.SlotNumber === 1);
          const rightSlot = slots.find((s) => s.SlotNumber === 2);

          return (
            <div
              key={areaNum}
              className="bg-slate-800/50 rounded-lg p-3 border border-slate-600/50 flex gap-4"
            >
              {[leftSlot, rightSlot].map((slot, idx) => {
                if (!slot) return <div key={idx} className="flex-1" />;
                const label = getSlotLabel(areaNum, slot.SlotNumber);
                const current = Number(
                  slot.Material?.CurrentQuantityGrams || 0,
                );
                const total = Number(
                  slot.Material?.InitialQuantityGrams || 3600,
                ); // Default max

                const matID = slot.MaterialID || 0;
                const usage = projectedUsage[matID] || 0;

                // If usage > 0, we visualize it effectively reducing the current level
                // Current level = (current / total) * 100
                // Usage level = (usage / total) * 100
                // We want to show the 'current' bar, but split into 'remaining' and 'used'

                const currentPercent = Math.min(
                  100,
                  Math.max(0, (current / total) * 100),
                );
                const usagePercent = Math.min(
                  currentPercent, // Usage can't exceed what we have for visualization
                  Math.max(0, (usage / total) * 100),
                );
                const remainingPercent = currentPercent - usagePercent;

                const matName = slot.Material?.MaterialName || "Empty";
                const isEmpty = !slot.MaterialID;

                return (
                  <div
                    key={slot.SlotNumber}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    {/* Material Name */}
                    <div className="text-[9px] text-slate-400 font-medium truncate w-full text-center h-3.5 tracking-tight">
                      {matName}
                    </div>

                    {/* Tank Visualization */}
                    <div className="relative w-full h-20 bg-slate-900 rounded-sm border border-slate-700/50 overflow-hidden shadow-inner group">
                      {/* Interaction Overlay (Dropdown trigger) - Only if handler provided */}
                      {onCarboyChange && (
                        <select
                          className="absolute inset-0 opacity-0 z-20 cursor-pointer"
                          value={slot.MaterialID || ""}
                          onChange={(e) =>
                            onCarboyChange(
                              areaNum,
                              slot.SlotNumber,
                              e.target.value ? Number(e.target.value) : null,
                            )
                          }
                          title={`Change material for ${label}`}
                        >
                          <option value="">Empty</option>
                          {materials.map((m) => (
                            <option key={m.MaterialID} value={m.MaterialID}>
                              {m.MaterialName}
                            </option>
                          ))}
                        </select>
                      )}

                      {/* Label Overlay - Moved to corner and smaller */}
                      <div className="absolute top-0.5 right-1 pointer-events-none z-10">
                        <span className="text-white/40 font-mono text-[9px]">
                          {label}
                        </span>
                      </div>

                      {/* Fluid Fill */}
                      {!isEmpty && (
                        <div className="absolute bottom-0 w-full h-full pointer-events-none">
                          {/* Remaining Fluid */}
                          <div
                            className="absolute bottom-0 w-full transition-all duration-500 ease-out"
                            style={{
                              height: `${remainingPercent}%`,
                              background:
                                remainingPercent > 70
                                  ? `linear-gradient(to top, #22c55e 0%, #4ade80 100%)`
                                  : remainingPercent > 20
                                    ? `linear-gradient(to top, #eab308 0%, #facc15 100%)`
                                    : `linear-gradient(to top, #ef4444 0%, #f87171 100%)`,
                              opacity: 0.8,
                            }}
                          />
                          {/* Usage Fluid (stacked on top) */}
                          {usage > 0 && (
                            <div
                              className="absolute w-full transition-all duration-500 ease-out"
                              style={{
                                bottom: `${remainingPercent}%`,
                                height: `${usagePercent}%`,
                                background: `repeating-linear-gradient(
                                          45deg,
                                          rgba(255, 255, 255, 0.2),
                                          rgba(255, 255, 255, 0.2) 3px,
                                          rgba(255, 0, 0, 0.4) 3px,
                                          rgba(255, 0, 0, 0.4) 6px
                                        )`,
                                zIndex: 5,
                              }}
                            />
                          )}

                          {/* Shine/Reflection */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent z-10" />

                          {/* Inner Shadow for depth */}
                          <div className="absolute inset-0 shadow-[inset_0_0_8px_rgba(0,0,0,0.5)] z-0" />
                        </div>
                      )}
                    </div>

                    {/* Grams Display */}
                    <div className="flex gap-1 items-center justify-center">
                      <span
                        className={`text-[10px] font-mono font-medium ${isEmpty ? "text-slate-600" : "text-slate-300"}`}
                      >
                        {isEmpty ? "Empty" : `${current.toFixed(0)}g`}
                      </span>
                      {usage > 0 && (
                        <span className="text-[9px] text-red-400 font-mono">
                          -{usage.toFixed(0)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
