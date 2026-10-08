"use client";
import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { clearContactCache } from "@/lib/contact/fetchContact";

const POLL_MS = 3000;
const POLL_TIMEOUT_MS = 15 * 60_000;
const FAILED = ["failed", "reversed", "expired", "needs_review"];

const INITIAL = {
  loaded: false,
  expiresAt: null,
  offset: 0,
  activating: false,
  version: 0,
  paymentRequired: false,
  plan: null,
  checkout: null, // { url, providerRef, phase: "paying" | "verifying" }
};
let state = INITIAL;
let timer = null;
let loading = null;
let epoch = 0;
let pollId = 0;
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
    ...(data?.payment_required !== undefined && {
      paymentRequired: Boolean(data.payment_required),
    }),
    ...(data?.plan !== undefined && { plan: data.plan }),
  });
  schedule();
}

async function refreshAccess() {
  try {
    const res = await fetch("/api/v1/contact-access/me", { cache: "no-store" });
    if (res.ok) apply((await res.json()).data);
  } catch {
    /* keep current state */
  }
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
          await sleep(1500);
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

// ---------- free activation (flag off) ----------

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

// ---------- paid activation (flag on) ----------

async function fetchPaymentStatus(providerRef) {
  try {
    const res = await fetch(
      `/api/v1/contact-access/pay/status/${encodeURIComponent(providerRef)}`,
      { cache: "no-store" },
    );
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

async function onPaid(j) {
  pollId++;
  if (j?.expires_at) apply(j);
  else await refreshAccess();
  clearContactCache();
  emit({ checkout: null, loaded: true, version: state.version + 1 });
  toast.success("Subscription activated");
}

async function pollPayment(providerRef) {
  const myPoll = ++pollId;
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (myPoll === pollId && Date.now() < deadline) {
    await sleep(POLL_MS);
    if (myPoll !== pollId) return;
    const j = await fetchPaymentStatus(providerRef);
    if (myPoll !== pollId) return;
    if (j?.status === "completed") return onPaid(j);
    if (j && FAILED.includes(j.status)) {
      pollId++;
      emit({ checkout: null });
      toast.error(
        j.status === "needs_review"
          ? "Payment needs review. Contact support."
          : j.status === "failed"
            ? "Payment failed. Try again."
            : "Payment was not completed.",
      );
      return;
    }
  }
  if (myPoll === pollId) {
    emit({ checkout: null });
    toast.error(
      "Payment timed out. If you paid, access activates automatically.",
    );
  }
}

export async function startCheckout() {
  if (state.checkout || state.activating) return { ok: false, code: "busy" };
  emit({ activating: true });
  try {
    const res = await fetch("/api/v1/contact-access/pay/initiate", {
      method: "POST",
    });
    const json = await res.json().catch(() => null);

    if (!res.ok) {
      if (json?.code === "already_active") {
        await refreshAccess();
        return { ok: true };
      }
      if (json?.code === "payments_disabled") {
        emit({ paymentRequired: false });
        toast.error("Please try again.");
      } else if (res.status === 429) {
        toast.error(json?.error ?? "Too many attempts. Wait a few minutes.");
      } else if (res.status === 503) {
        toast.error("Payments are not available right now.");
      } else {
        toast.error(json?.error ?? "Could not start payment. Try again.");
      }
      return { ok: false, code: json?.code ?? "error" };
    }

    emit({
      checkout: {
        url: json.redirect_url,
        providerRef: json.provider_ref,
        phase: "paying",
      },
    });
    pollPayment(json.provider_ref);
    return { ok: true };
  } catch {
    toast.error("Could not start payment. Try again.");
    return { ok: false, code: "error" };
  } finally {
    emit({ activating: false });
  }
}

// Pesapal redirected the iframe to /payment/return: stop showing the
// checkout page, keep polling until the server confirms.
export function checkoutReturned() {
  if (state.checkout) {
    emit({ checkout: { ...state.checkout, phase: "verifying" } });
  }
}

export async function closeCheckout({ cancelled = false } = {}) {
  const c = state.checkout;
  if (!c) return;
  pollId++; // stop background polling
  emit({ checkout: null });
  if (cancelled) return;
  const j = await fetchPaymentStatus(c.providerRef); // one last check
  if (j?.status === "completed") return onPaid(j);
  if (j?.status === "pending") {
    toast.info("If you completed payment, your access will activate shortly.");
  }
}

// ---------- entry point used by the buttons ----------

export async function activateWithToast() {
  if (state.paymentRequired) return startCheckout();

  const r = await activateAccess();
  if (r.ok) toast.success("Subscription activated");
  else if (r.code === "payment_required") {
    emit({ paymentRequired: true });
    return startCheckout();
  } else if (r.code === "free_grant_disabled")
    toast.error("Activation is not available yet");
  else if (r.code !== "busy") toast.error("Could not activate. Try again.");
  return r;
}

export function resetAccess() {
  epoch++;
  pollId++;
  loading = null;
  clearTimeout(timer);
  clearContactCache();
  state = { ...INITIAL, version: state.version + 1 };
  listeners.forEach((l) => l());
}
