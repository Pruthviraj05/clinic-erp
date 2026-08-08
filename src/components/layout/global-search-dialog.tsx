"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  CalendarDays,
  FileText,
  Receipt,
  Stethoscope,
  Pill,
  FileSignature,
  Loader2,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { globalSearchAction, type SearchHit, type SearchResults } from "@/server/actions/search.actions";

const EMPTY_RESULTS: SearchResults = {
  patients: [],
  appointments: [],
  prescriptions: [],
  invoices: [],
  doctors: [],
  medicines: [],
  consent: [],
};

const SECTIONS: { key: keyof SearchResults; label: string; icon: typeof Users }[] = [
  { key: "patients", label: "Patients", icon: Users },
  { key: "appointments", label: "Appointments", icon: CalendarDays },
  { key: "prescriptions", label: "Prescriptions", icon: FileText },
  { key: "invoices", label: "Invoices", icon: Receipt },
  { key: "doctors", label: "Doctors", icon: Stethoscope },
  { key: "medicines", label: "Medicines", icon: Pill },
  { key: "consent", label: "Consent forms", icon: FileSignature },
];

/**
 * The actual search UI (cmdk + fetch logic). Code-split out of the app shell
 * by `SearchTrigger` — this chunk only downloads once the palette opens.
 * Debounces the query into `globalSearchAction`, which fans out across every
 * module the signed-in role may view (same scoping the list pages use), and
 * deep-links each hit into its role-prefixed route.
 */
export function GlobalSearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const requestId = useRef(0);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults(EMPTY_RESULTS);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = ++requestId.current;
    const timer = setTimeout(() => {
      globalSearchAction(trimmed).then((res) => {
        if (requestId.current === id) {
          setResults(res);
          setLoading(false);
        }
      });
    }, 180);
    return () => clearTimeout(timer);
  }, [query, open]);

  const closeAndReset = useCallback(() => {
    onOpenChange(false);
    setQuery("");
    setResults(EMPTY_RESULTS);
  }, [onOpenChange]);

  const select = useCallback(
    (hit: SearchHit) => {
      router.push(hit.href);
      closeAndReset();
    },
    [router, closeAndReset],
  );

  const totalHits = SECTIONS.reduce((sum, s) => sum + results[s.key].length, 0);
  const trimmed = query.trim();

  return (
    <CommandDialog
      open={open}
      onOpenChange={(o) => (o ? onOpenChange(true) : closeAndReset())}
      title="Search"
      description="Search patients, appointments, prescriptions, invoices and more"
    >
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Search patients, appointments, invoices…"
      />
      <CommandList>
        {trimmed.length < 2 ? (
          <CommandEmpty>Type at least 2 characters to search.</CommandEmpty>
        ) : loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Searching…
          </div>
        ) : totalHits === 0 ? (
          <CommandEmpty>No results for “{trimmed}”.</CommandEmpty>
        ) : (
          SECTIONS.filter((s) => results[s.key].length > 0).map((section) => (
            <CommandGroup key={section.key} heading={section.label}>
              {results[section.key].map((hit) => (
                <CommandItem key={`${section.key}-${hit.id}`} value={`${section.key}-${hit.id}-${hit.title}`} onSelect={() => select(hit)}>
                  <section.icon className="size-4 text-muted-foreground" />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate">{hit.title}</span>
                    {hit.subtitle && (
                      <span className="truncate text-xs text-muted-foreground">{hit.subtitle}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ))
        )}
      </CommandList>
    </CommandDialog>
  );
}
