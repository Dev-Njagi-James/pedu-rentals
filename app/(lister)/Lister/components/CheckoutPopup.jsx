"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import styles from "../css/CheckoutPopup.module.css";

// REMOVABLE: temporary free pass. Delete with the server block in initiate.
const hasFreePass = (category, plan) =>
  category === "Rentals" && plan === "Regular";

export default function CheckoutPopup({
  listingId,
  categoryName,
  propertyLabel,
  onClose,
  onPaid,
}) {
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const [step, setStep] = useState("select"); // select | processing | success | error
  const [errorMsg, setErrorMsg] = useState("");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [iframeUrl, setIframeUrl] = useState(null);
  const pollRef = useRef({ cancelled: false });

  useEffect(() => {
    if (!categoryName) {
      setPlansError("No category found for this listing.");
      setPlansLoading(false);
      return;
    }
    fetch(`/api/v1/plans?category_name=${encodeURIComponent(categoryName)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load plans.");
        return r.json();
      })
      .then((json) => {
        setPlans(json.plans ?? []);
        // Default to the first (highest-priority) plan, matching Figma default.
        if (json.plans?.length) setSelectedPlan(json.plans[0].plan_name);
      })
      .catch((err) => setPlansError(err.message))
      .finally(() => setPlansLoading(false));
  }, [categoryName]);

  const freePass = hasFreePass(categoryName, selectedPlan);
  const total = freePass
    ? 0
    : (plans.find((p) => p.plan_name === selectedPlan)?.price_kes ?? 0);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape" || step === "processing" || step === "success")
        return;
      setShowCancelConfirm((open) => !open);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  const requestCancel = () => {
    if (step === "processing" || step === "success") return;
    setShowCancelConfirm(true);
  };

  const handleDelist = () => {
    setShowCancelConfirm(false);
    toast.info("Saved as pending. Choose a package to publish.");
    onClose?.();
  };

  // Messages from /payment/return and /payment/cancelled loaded inside the iframe.
  useEffect(() => {
    const onMsg = (e) => {
      if (
        e.origin !== window.location.origin ||
        e.data?.source !== "pedu-payment"
      )
        return;
      if (e.data.type === "cancelled") {
        pollRef.current.cancelled = true;
        setIframeUrl(null);
        setErrorMsg("Payment cancelled.");
        setStep("error");
      } else if (e.data.type === "returned") {
        setIframeUrl(null); // polling continues; UI shows "Confirming payment…"
      }
    };
    window.addEventListener("message", onMsg);
    return () => {
      window.removeEventListener("message", onMsg);
      pollRef.current.cancelled = true;
    };
  }, []);

  const closePaymentFrame = () => {
    pollRef.current.cancelled = true;
    setIframeUrl(null);
    setErrorMsg(
      "Payment window closed. If you already paid, the listing publishes automatically.",
    );
    setStep("error");
  };

  const pollForCompletion = async (providerRef, token) => {
    const deadline = Date.now() + 15 * 60_000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 3000));
      if (token.cancelled) return "aborted";
      const res = await fetch(`/api/v1/payments/status/${providerRef}`, {
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (token.cancelled) return "aborted";
      if (json.status === "completed") return "completed";
      if (json.status === "failed" || json.status === "reversed")
        throw new Error("Payment was not completed. Try again.");
      if (json.status === "expired")
        throw new Error("Payment session expired. Start again.");
      if (json.status === "needs_review")
        throw new Error(
          "Payment received but confirmation failed. Contact support.",
        );
    }
    throw new Error(
      "Payment timed out. If you paid, the listing publishes automatically.",
    );
  };

  const token = { cancelled: false };
  pollRef.current = token;
  const handleCheckout = async () => {
    if (!selectedPlan) {
      setErrorMsg("Select a package.");
      return;
    }

    setErrorMsg("");
    setStep("processing");

    try {
      const res = await fetch("/api/v1/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          listing_id: listingId,
          plan_name: selectedPlan,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.error ?? "Payment initiation failed.");

      if (json.free_pass) {
        setStep("success");
        toast.success("Listing published.");
        onPaid?.();
        return;
      }

      setIframeUrl(json.redirect_url);
      const outcome = await pollForCompletion(json.provider_ref, token);
      if (outcome === "aborted") return;

      setIframeUrl(null);
      setStep("success");
      toast.success("Payment confirmed — your listing is live.");
      onPaid?.();
    } catch (err) {
      if (token.cancelled) return;
      setErrorMsg(err.message ?? "Payment failed. Try again.");
      setIframeUrl(null);
      setStep("error");
    }
  };

  return (
    <div
      className={styles.checkoutPanel}
      onClick={(e) => {
        if (e.target === e.currentTarget) requestCancel();
      }}>
      <div className={styles.popup}>
        <div className={styles.header}>
          <div className={styles.brand}>
            <span className={styles.brandName}>Pedu Rentals</span>
          </div>
          <button
            className={styles.cancelBtn}
            onClick={iframeUrl ? closePaymentFrame : requestCancel}
            disabled={step === "processing" && !iframeUrl}>
            Cancel
          </button>
        </div>

        {iframeUrl && (
          <iframe
            src={iframeUrl}
            className={styles.payFrame}
            title="Secure payment"
          />
        )}
        <div
          className={styles.body}
          style={iframeUrl ? { display: "none" } : undefined}>
          <div className={styles.message}>
            <h2 className={styles.title}>Give Your Listing More Visibility</h2>
            <p className={styles.subtitle}>
              Choose a listing package that suits your needs. Higher-tier
              packages give your property greater visibility and help it stand
              out to potential tenants and customers.
            </p>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Property</label>
            <div className={styles.readonlyInput}>
              {propertyLabel ?? categoryName}
            </div>
          </div>

          <div className={styles.packages}>
            <h3 className={styles.sectionTitle}>Choose Package</h3>

            {plansLoading && <p className={styles.hint}>Loading packages…</p>}
            {plansError && <p className={styles.errorBanner}>{plansError}</p>}

            {!plansLoading &&
              !plansError &&
              plans.map((plan) => {
                const isSelected = selectedPlan === plan.plan_name;
                const cardFree = hasFreePass(categoryName, plan.plan_name);
                return (
                  <button
                    key={plan.plan_name}
                    type="button"
                    className={`${styles.packageCard} ${isSelected ? styles.packageCardSelected : ""} ${styles[`accent_${plan.plan_name}`] ?? ""}`}
                    onClick={() => setSelectedPlan(plan.plan_name)}
                    disabled={step === "processing"}>
                    <div className={styles.packageTop}>
                      <span className={styles.packageName}>
                        {plan.plan_name}
                      </span>
                      <span
                        className={`${styles.radio} ${isSelected ? styles.radioSelected : ""}`}
                        aria-hidden
                      />
                    </div>
                    <div className={styles.packageRow}>
                      <span>{plan.visibility_label}</span>
                      {cardFree ? (
                        <span className={styles.freePriceGroup}>
                          <s className={styles.priceStruck}>
                            KSH {plan.price_kes.toLocaleString()}
                          </s>
                          <span className={styles.freeBadge}>Free pass</span>
                        </span>
                      ) : (
                        <strong>KSH {plan.price_kes.toLocaleString()}</strong>
                      )}
                    </div>
                  </button>
                );
              })}
          </div>
        </div>

        <div className={styles.totalSection}>
          <h3 className={styles.checkoutDetailsTitle}>Checkout Details</h3>
          <div className={styles.totalRow}>
            <span>Total</span>
            <strong>
              {freePass ? "Free pass" : `KSH ${total.toLocaleString()}`}
            </strong>
          </div>

          {errorMsg && <p className={styles.errorBanner}>{errorMsg}</p>}
        </div>

        <div className={styles.payBar}>
          {step === "select" || step === "error" ? (
            <button
              className={styles.checkoutBtn}
              onClick={handleCheckout}
              disabled={plansLoading}>
              {freePass ? "Publish" : "Checkout"}
            </button>
          ) : step === "processing" ? (
            <div className={styles.processingRow}>
              <span className={styles.spinner} aria-label="Processing" />
              <span>
                {freePass
                  ? "Publishing…"
                  : iframeUrl
                    ? "Complete payment above"
                    : "Confirming payment…"}
              </span>
            </div>
          ) : (
            <div className={styles.successRow}>
              <span>
                {freePass ? "Listing published." : "Payment confirmed."}
              </span>
              <button className={styles.checkoutBtn} onClick={onClose}>
                Done
              </button>
            </div>
          )}
        </div>
      </div>

      {showCancelConfirm && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmPopup}>
            <p className={styles.confirmTitle}>Delist this property?</p>
            <p className={styles.confirmBody}>
              {freePass
                ? "Regular listings on Rentals currently have a free pass. If you leave now, the property will be delisted."
                : "Without a package, the property will be delisted. Choose a package to publish it."}
            </p>
            <div className={styles.confirmActions}>
              <button className={styles.confirmDelist} onClick={handleDelist}>
                Delist property
              </button>
              <button
                className={styles.confirmContinue}
                onClick={() => setShowCancelConfirm(false)}>
                Choose package
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
