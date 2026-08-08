"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Search } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Lazy-loaded search palette. `cmdk` + the query/results UI (`GlobalSearch`)
 * only downloads once the dialog actually opens, instead of riding along in
 * the app shell's shared bundle on every one of the ~50 authenticated routes.
 */
const GlobalSearchDialog = dynamic(
  () => import("./global-search-dialog").then((m) => m.GlobalSearchDialog),
  { ssr: false },
);

export function SearchTrigger() {
  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setEverOpened(true);
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function openSearch() {
    setEverOpened(true);
    setOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={openSearch}
        className="hidden h-9 w-full items-center gap-2 rounded-lg border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted md:flex"
      >
        <Search className="size-4" />
        <span>Search patients, appointments, invoices…</span>
        <kbd className="ml-auto hidden rounded border bg-background px-1.5 text-[10px] sm:inline">
          ⌘K
        </kbd>
      </button>
      <button
        type="button"
        aria-label="Search"
        onClick={openSearch}
        className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "md:hidden")}
      >
        <Search className="size-4.5" />
      </button>

      {/* Keep mounted once opened so re-opening doesn't re-fetch the chunk. */}
      {everOpened && <GlobalSearchDialog open={open} onOpenChange={setOpen} />}
    </>
  );
}
