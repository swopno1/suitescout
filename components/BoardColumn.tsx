// Board column — collapsible on mobile, always open on desktop.
// Mobile shows the header (name + count) only; tapping expands the
// cards to a capped scroll area. Desktop keeps the fixed-height rail.
"use client";

import { useState } from "react";

export default function BoardColumn({
  label,
  dotClass,
  count,
  listId,
  children,
}: {
  label: string;
  dotClass: string;
  count: number;
  listId: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section
      aria-label={`${label} prospects`}
      className="flex flex-col rounded-xl bg-stone-800/[0.05] p-2 md:h-[62vh] md:min-h-80"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={listId}
        className="flex w-full shrink-0 items-center justify-between px-1.5 py-1 text-left text-[13px] font-bold md:mb-2 md:cursor-default md:pt-1"
      >
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${dotClass}`}
          />
          {label}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="badge bg-white tabular-nums text-stone-600 shadow-sm">
            {count}
          </span>
          <span
            aria-hidden="true"
            className={`text-stone-400 transition-transform md:hidden ${open ? "rotate-180" : ""}`}
          >
            ▾
          </span>
        </span>
      </button>
      <div
        id={listId}
        className={`min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5 ${
          open ? "mt-1 max-h-[50vh] pt-1" : "hidden"
        } md:mt-0 md:block md:max-h-none md:pt-0`}
      >
        {children}
      </div>
    </section>
  );
}
