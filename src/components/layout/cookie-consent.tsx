"use client";

import { useEffect, useState } from "react";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "clinicore_cookie_notice_ack";

/**
 * A plain notice, not a consent-gathering banner — Clinicore only ever sets
 * the cookies the app needs to function (signing you in, remembering your
 * theme and sidebar state). There's nothing optional to opt into or out of,
 * so this doesn't block the page or offer a "reject" choice; it just tells
 * people what's happening and gets out of the way once acknowledged.
 *
 * The acknowledgement itself lives in localStorage, not a cookie — setting a
 * cookie to remember that someone was told about cookies, before they've
 * been told, is the wrong order of operations.
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  function acknowledge() {
    window.localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-3 border-t bg-card/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:flex-row sm:justify-between"
    >
      <p className="flex items-start gap-2 text-sm text-muted-foreground sm:items-center">
        <Cookie className="mt-0.5 size-4 shrink-0 text-muted-foreground sm:mt-0" />
        <span>
          We use essential cookies to keep you securely signed in and remember your preferences.
          We don&apos;t use tracking or advertising cookies.
        </span>
      </p>
      <Button size="sm" onClick={acknowledge} className="shrink-0">
        Got it
      </Button>
    </div>
  );
}
