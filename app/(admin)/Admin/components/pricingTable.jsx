"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import base from "../css/transaction.module.css";
import styles from "../css/pricing.module.css";

const PLAN_ORDER = ["Regular", "Premium", "Enterprise"];

// REMOVABLE: free-pass cosmetic. Delete with .freePass in pricing.module.css
// and the freePass className condition below.
const isFreePass = (category, plan) =>
  category === "Rentals" && plan === "Regular";

const formatKES = (v) => `KES ${Number(v ?? 0).toLocaleString("en-KE")}`;

export default function AdminPricingTable() {
  const [pricing, setPricing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/admin/pricing", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load pricing.");
      const json = await res.json();
      setPricing(json.pricing ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const keyOf = (c, p) => `${p}::${c}`;

  const priceMap = useMemo(() => {
    const m = new Map();
    pricing.forEach((r) =>
      m.set(keyOf(r.category_name, r.plan_name), r.price_kes),
    );
    return m;
  }, [pricing]);

  const categories = useMemo(
    () => [...new Set(pricing.map((r) => r.category_name))].sort(),
    [pricing],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return categories.filter(
      (c) =>
        (category === "all" || c === category) && c.toLowerCase().includes(q),
    );
  }, [categories, category, search]);

  const changes = useMemo(() => {
    const out = [];
    for (const [key, raw] of Object.entries(draft)) {
      const oldP = priceMap.get(key);
      if (oldP === undefined || raw === "" || raw === undefined) continue;
      const newP = Number(raw);
      if (!Number.isInteger(newP) || newP === oldP) continue;
      const [plan_name, category_name] = key.split("::");
      out.push({
        plan_name,
        category_name,
        old_price_kes: oldP,
        new_price_kes: newP,
      });
    }
    return out;
  }, [draft, priceMap]);

  const invalidKeys = useMemo(() => {
    const bad = new Set();
    for (const [key, raw] of Object.entries(draft)) {
      if (raw === "" || raw === undefined) continue;
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 1 || n > 1_000_000) bad.add(key);
    }
    return bad;
  }, [draft]);

  const startEdit = () => {
    setDraft({});
    setSaveError("");
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setConfirming(false);
    setDraft({});
    setSaveError("");
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/v1/admin/pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changes }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409) await load();
        throw new Error(json.error ?? "Failed to save pricing.");
      }
      setEditing(false);
      setConfirming(false);
      setDraft({});
      await load();
    } catch (e) {
      setConfirming(false);
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const renderCell = (cat, plan) => {
    const key = keyOf(cat, plan);
    const current = priceMap.get(key);
    const free = isFreePass(cat, plan);

    if (current === undefined) {
      return (
        <td key={plan} className={base.td}>
          <span className={base.mono}>—</span>
        </td>
      );
    }

    if (!editing) {
      return (
        <td key={plan} className={base.td}>
          <span className={`${base.mono} ${free ? styles.freePass : ""}`}>
            {formatKES(current)}
          </span>
          {free && <span className={styles.freeTag}>Free pass</span>}
        </td>
      );
    }

    const value = draft[key] ?? String(current);
    const changed = changes.some(
      (c) => c.plan_name === plan && c.category_name === cat,
    );
    return (
      <td key={plan} className={base.td}>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={1000000}
          step={1}
          value={value}
          onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
          className={`${styles.priceInput} ${changed ? styles.priceChanged : ""} ${invalidKeys.has(key) ? styles.priceInvalid : ""}`}
          aria-label={`${plan} price for ${cat}`}
        />
      </td>
    );
  };

  const canSave = changes.length > 0 && invalidKeys.size === 0 && !saving;

  return (
    <div className={base.container}>
      <div className={base.headerFlex}>
        <div>
          <h1 className={base.title}>Pricing</h1>
          <p className={base.subtitle}>
            Listing package prices per category. Changes apply to new payments
            immediately.
          </p>
        </div>
        <div className={styles.headerActions}>
          {editing ? (
            <>
              <button
                className={styles.secondaryBtn}
                onClick={cancelEdit}
                disabled={saving}>
                Cancel
              </button>
              <button
                className={base.exportBtn}
                onClick={() => setConfirming(true)}
                disabled={!canSave}>
                Save{changes.length ? ` (${changes.length})` : ""}
              </button>
            </>
          ) : (
            <button
              className={base.exportBtn}
              onClick={startEdit}
              disabled={loading || !!error}>
              Edit prices
            </button>
          )}
        </div>
      </div>

      {saveError && <p className={styles.errorBanner}>{saveError}</p>}

      <div className={base.tableContainer}>
        <div className={base.toolbar}>
          <div className={base.searchBox}>
            <svg
              className={base.searchIcon}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={base.searchInput}
            />
          </div>
          <div className={base.filterGroup}>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={base.selectInput}>
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={base.tableWrapper}>
          <table className={base.table}>
            <thead className={base.thead}>
              <tr>
                <th className={base.th}>Category</th>
                {PLAN_ORDER.map((p) => (
                  <th key={p} className={base.th}>
                    {p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className={styles.stateCell}>
                    Loading pricing...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={4} className={styles.stateCell}>
                    {error}
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={4} className={styles.stateCell}>
                    No categories match your search.
                  </td>
                </tr>
              ) : (
                visible.map((cat) => (
                  <tr key={cat} className={base.tr}>
                    <td
                      className={base.td}
                      style={{ fontWeight: 600, color: "#0f172a" }}>
                      {cat}
                    </td>
                    {PLAN_ORDER.map((plan) => renderCell(cat, plan))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {confirming && (
        <div className={styles.overlay}>
          <div className={styles.modal} role="dialog" aria-modal="true">
            <p className={styles.modalTitle}>
              Confirm {changes.length} price change
              {changes.length !== 1 ? "s" : ""}
            </p>
            <ul className={styles.changeList}>
              {changes.map((c) => (
                <li key={`${c.plan_name}::${c.category_name}`}>
                  <span>
                    {c.category_name} · {c.plan_name}
                  </span>
                  <span className={base.mono}>
                    {formatKES(c.old_price_kes)} → {formatKES(c.new_price_kes)}
                  </span>
                </li>
              ))}
            </ul>
            <div className={styles.modalActions}>
              <button
                className={styles.secondaryBtn}
                onClick={() => setConfirming(false)}
                disabled={saving}>
                Back
              </button>
              <button
                className={base.exportBtn}
                onClick={handleSave}
                disabled={saving}>
                {saving ? "Saving..." : "Confirm and save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
