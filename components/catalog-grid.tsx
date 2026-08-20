"use client";

import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type Item,
  type Os,
} from "@/lib/types";
import { linuxSupported } from "@/lib/generate-linux";
import { ItemCard } from "./item-card";

type Props = {
  items: Item[];
  selectedIds: Set<string>;
  requiredIds: Set<string>;
  os: Os;
  onToggle: (id: string) => void;
};

export function CatalogGrid({
  items,
  selectedIds,
  requiredIds,
  os,
  onToggle,
}: Props) {
  return (
    <div className="flex flex-col gap-10">
      {CATEGORY_ORDER.map((category) => {
        const inCategory = items.filter((item) => item.category === category);
        if (inCategory.length === 0) return null;

        return (
          <section key={category} aria-labelledby={`cat-${category}`}>
            <h2
              id={`cat-${category}`}
              // Not `/40`. A category heading is the label of its `region` landmark and
              // the only thing that says what the cards below are, so it is essential
              // copy: `/40` measures 3.69:1 on the background and fails AA. `/60` is
              // 6.62:1 and still reads as a quiet label.
              className="text-foreground/60 mb-3 font-mono text-xs tracking-widest uppercase"
            >
              {CATEGORY_LABELS[category]}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {inCategory.map((item, index) => (
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
          </section>
        );
      })}
    </div>
  );
}
