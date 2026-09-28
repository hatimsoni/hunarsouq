"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Scissors,
  CookingPot,
  Ruler,
  Scale,
  CodeXml,
  Cog,
  BookOpen,
  Store,
  HeartPulse,
  Calculator,
  Megaphone,
  House,
  Wrench,
  Plane,
  Palette,
  Camera,
  Gem,
  ArrowUpRight,
  Search,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "@/lib/supabase/database.types";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
const icons: Record<string, LucideIcon> = {
  Scissors,
  CookingPot,
  Ruler,
  Scale,
  CodeXml,
  Cog,
  BookOpen,
  Store,
  HeartPulse,
  Calculator,
  Megaphone,
  House,
  Wrench,
  Plane,
  Palette,
  Camera,
  Gem,
};
export function CategoryBrowser({ categories }: { categories: Category[] }) {
  const [search, setSearch] = useState("");
  const [all, setAll] = useState(false);
  const filtered = categories.filter((c) =>
    `${c.name} ${c.description}`.toLowerCase().includes(search.toLowerCase()),
  );
  const shown = search || all ? filtered : filtered.slice(0, 8);
  return (
    <>
      <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow mb-3">So many skills. One community.</p>
          <h2 className="section-title">Find the right hands.</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            From everyday essentials to something extraordinary.
          </p>
        </div>
        <label className="flex h-11 items-center gap-2 rounded-lg border bg-white px-3 text-muted-foreground">
          <Search size={17} />
          <span className="sr-only">Search skills</span>
          <input
            className="w-full bg-transparent text-sm outline-none sm:w-40"
            placeholder="Search a skill…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      <div
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        aria-live="polite"
      >
        {shown.map((category, i) => {
          const Icon = icons[category.icon] || Palette;
          return (
            <Link
              key={category.slug}
              href={`/hunar?skill=${category.slug}`}
              className="group rounded-xl"
            >
              <Card className="relative h-full gap-0 rounded-xl border-border/90 p-5 shadow-none transition-all group-hover:-translate-y-1 group-hover:border-primary/40 group-hover:shadow-md">
                <span
                  className={`mb-5 flex size-11 items-center justify-center rounded-xl ${i % 3 === 0 ? "bg-[#f6ecd6] text-[#987231]" : i % 3 === 1 ? "bg-[#e9efdf] text-[#587541]" : "bg-[#edece8] text-[#677569]"}`}
                >
                  <Icon size={23} strokeWidth={1.5} />
                </span>
                <ArrowUpRight className="absolute right-5 top-6 size-4 text-muted-foreground/50 transition-colors group-hover:text-primary" />
                <h3 className="font-sans text-sm font-semibold">
                  {category.name}
                </h3>
                <p className="mt-2 min-h-10 text-xs leading-5 text-muted-foreground">
                  {category.description}
                </p>
                <p className="mt-4 border-t pt-3 text-[11px] text-muted-foreground">
                  0 members · Be the first
                </p>
              </Card>
            </Link>
          );
        })}
      </div>
      {shown.length === 0 && (
        <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          No skills found. Try “cooking”, “artist”, or “software”.
        </p>
      )}
      {!search && (
        <div className="mt-8 text-center">
          <Button
            variant="outline"
            className="h-11 bg-transparent px-6"
            onClick={() => setAll(!all)}
            aria-expanded={all}
          >
            {all
              ? "Show fewer categories"
              : `Explore all ${categories.length} categories`}
            <ArrowRight />
          </Button>
        </div>
      )}
    </>
  );
}
