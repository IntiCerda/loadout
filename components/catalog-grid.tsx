"use client";

import type { Item, Os } from "@/lib/types";
import { linuxSupported } from "@/lib/generate-linux";
import { ItemCard } from "./item-card";

type Props = {
  /** Already filtered by the rail and the provider chips. */
  items: Item[];
  selectedIds: Set<string>;
  requiredIds: Set<string>;
  os: Os;
  onToggle: (id: string) => void;
};

/**
 * One flat grid. Categories are the rail now, so a heading per section would
 * repeat the filter the user just used and put the scroll back.
 */
export function CatalogGrid({
  items,
  selectedIds,
  requiredIds,
  os,
  onToggle,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item, index) => (
        <ItemCard
          key={item.id}
          item={item}
          checked={selectedIds.has(item.id)}
          required={requiredIds.has(item.id)}
          unavailable={os === "linux" && !linuxSupported(item)}
          index={index}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}
