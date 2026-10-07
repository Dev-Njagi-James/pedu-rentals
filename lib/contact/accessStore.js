"use client";
import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { clearContactCache } from "@/lib/contact/fetchContact";

const INITIAL = {
  loaded: false,
  expiresAt: null,
  offset: 0,
  activating: false,
  version: 0,
};
let state = INITIAL;
let timer = null;
let loading = null;
let epoch = 0;
const listeners = new Set();

function emit(patch) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}
function subscribe(l) {
  listeners.add(l);
  return () => listeners.delete(l);
}
const getSnapshot = () => state;
const getServerSnapshot = () => INITIAL;

export function useContactAccess() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function getRemainingMs(s = state) {
  return s.expiresAt ? s.expiresAt - (Date.now() + s.offset) : 0;
}

function schedule() {
  clearTimeout(timer);
  const ms = getRemainingMs();
  if (ms <= 0) return;
  timer = setTimeout(
    () => {
      if (getRemainingMs() > 0) return schedule();
      clearContactCache();
        emit({ version: state.version + 1 });
        toast.info("Your subscription has ended", {
        action: { label: "Activate", onClick: () => activateWithToast() },
      });
    },
    Math.min(ms + 250, 2 ** 31 - 1),
  );
}

function apply(data) {
  emit({
    expiresAt: data?.expires_at ? Date.parse(data.expires_at) : null,
    offset: data?.server_time ? Date.parse(data.server_time) - Date.now() : 0,
  });
  schedule();
}

export function loadAccess() {
  if (state.loaded || loading) return loading;
  const myEpoch = epoch;
  loading = (async () => {
    try {
      for (let i = 0; i < 3; i++) {
        const res = await fetch("/api/v1/contact-access/me", {
          cache: "no-store",
        });
        if (res.status === 409 && i < 2) {
          await new Promise((r) => setTimeout(r, 1500));
          continue;
        }
        if (res.ok && myEpoch === epoch) apply((await res.json()).data);
        break;
      }
    } catch {
      /* leave expiry empty; button shows Activate */
    } finally {
      if (myEpoch === epoch) {
        loading = null;
        emit({ loaded: true });
      }
    }
  })();
  return loading;
}

export async function activateAccess() {
  if (state.activating) return { ok: false, code: "busy" };
  emit({ activating: true });
  try {
    const res = await fetch("/api/v1/contact-access/grant", { method: "POST" });
    const json = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, code: json?.code ?? "error" };
    apply(json.data);
    clearContactCache();
    emit({ loaded: true, version: state.version + 1 });
    return { ok: true };
  } catch {
    return { ok: false, code: "error" };
  } finally {
    emit({ activating: false });
  }
}

export async function activateWithToast() {
  const r = await activateAccess();
  if (r.ok) toast.success("Subscription activated");
  else if (r.code === "free_grant_disabled")
    toast.error("Activation is not available yet");
  else if (r.code !== "busy") toast.error("Could not activate. Try again.");
  return r;
}

export function resetAccess() {
  epoch++;
  loading = null;
  clearTimeout(timer);
  clearContactCache();
  state = { ...INITIAL, version: state.version + 1 };
  listeners.forEach((l) => l());
}
