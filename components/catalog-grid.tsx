"use client";

import { CATEGORY_LABELS, CATEGORY_ORDER, type Item } from "@/lib/types";
import { ItemCard } from "./item-card";

type Props = {
  items: Item[];
  selectedIds: Set<string>;
  requiredIds: Set<string>;
  onToggle: (id: string) => void;
};

export function CatalogGrid({
  items,
  selectedIds,
  requiredIds,
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
              className="text-foreground/40 mb-3 font-mono text-xs tracking-widest uppercase"
            >
              {CATEGORY_LABELS[category]}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {inCategory.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  checked={selectedIds.has(item.id)}
                  required={requiredIds.has(item.id)}
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
