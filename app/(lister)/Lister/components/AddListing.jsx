// app/(lister)/Lister/components/AddListing.jsx
"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { uploadListingMedia } from "@/lib/uploadMedia";
import CheckoutPopup from "./CheckoutPopup";
import UploadOverlay from "./UploadOverlay";
import RichTextEditor from "./RichTextEditor";
import styles from "../css/AddListing.module.css";

/* ─── Icon primitive ─── */
const Icon = ({ d, className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className ?? styles.fieldIcon}
    aria-hidden="true">
    <path d={d} />
  </svg>
);

const icons = {
  tag: "M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01",
  map: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  layers: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  clock: "M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20zm0-14v4l3 3",
  sofa: "M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3M2 11a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v6H2v-6zM4 17v2M20 17v2",
  phone:
    "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z",
  dollar: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  image:
    "M21 15l-5-5L5 21M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 5h6M19 2v6",
  video:
    "M23 7l-7 5 7 5V7zM1 5h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H1a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z",
  align: "M17 10H3M21 6H3M21 14H3M17 18H3",
  back: "M19 12H5M12 19l-7-7 7-7",
  link: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
};

const DURATIONS = ["Short Term", "Long Term"];
const FURNITURE = ["Furnished", "Unfurnished"];
const REQUIRED = [
  "name",
  "ward",
  "ward_location",
  "property_location",
  "category",
  "type",
  "duration",
  "furniture",
  "phone",
  "price",
];

const EMPTY_DESCRIPTION = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

const normalizeDescription = (value) => {
  if (value && typeof value === "object" && value.type === "doc") {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    return {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: value }],
        },
      ],
    };
  }

  return EMPTY_DESCRIPTION;
};

const EMPTY = {
  name: "",
  ward: "",
  ward_location: "",
  property_location: "",
  category: "",
  type: "",
  duration: "",
  furniture: "",
  phone: "",
  price: "",
  description: EMPTY_DESCRIPTION,
  images: [null, null, null, null],
  video: null,
};

const FieldInput = ({
  icon,
  label,
  name,
  type = "text",
  value,
  onChange,
  hint,
  errors,
  placeholder,
  disabled,
}) => (
  <div className={styles.fieldRow}>
    <Icon d={icons[icon]} />
    <div className={styles.fieldBody}>
      <label className={styles.fieldLabel} htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder ?? ""}
        disabled={disabled}
        className={`${styles.fieldInput} ${errors?.[name] ? styles.error : ""}`}
        autoComplete="off"
      />
      {hint && <span className={styles.fieldHint}>{hint}</span>}
      {errors?.[name] && (
        <span className={styles.fieldError}>{errors[name]}</span>
      )}
    </div>
  </div>
);

const FieldSelect = ({
  icon,
  label,
  name,
  options = [],
  value,
  onChange,
  errors,
  disabled,
}) => (
  <div className={styles.fieldRow}>
    <Icon d={icons[icon]} />
    <div className={styles.fieldBody}>
      <label className={styles.fieldLabel} htmlFor={name}>
        {label}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`${styles.fieldSelect} ${errors?.[name] ? styles.error : ""}`}>
        <option value="">
          {disabled ? "— select category first —" : "Select…"}
        </option>
        {options.map((o) =>
          typeof o === "string" ? (
            <option key={o} value={o}>
              {o}
            </option>
          ) : (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ),
        )}
      </select>
      {errors?.[name] && (
        <span className={styles.fieldError}>{errors[name]}</span>
      )}
    </div>
  </div>
);

const FieldTextarea = ({
  icon,
  label,
  name,
  value,
  onChange,
  errors,
  hint,
  disabled,
}) => (
  <div className={styles.fieldRow}>
    <Icon d={icons[icon]} />
    <div className={styles.fieldBody}>
      <label className={styles.fieldLabel} htmlFor={name}>
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`${styles.fieldTextarea} ${errors?.[name] ? styles.error : ""}`}
        rows={4}
      />
      {hint && <span className={styles.fieldHint}>{hint}</span>}
      {errors?.[name] && (
        <span className={styles.fieldError}>{errors[name]}</span>
      )}
    </div>
  </div>
);

const Section = ({ title, children }) => (
  <div className={styles.section}>
    <div className={styles.sectionHeader}>
      <span className={styles.sectionTitle}>{title}</span>
    </div>
    <div className={styles.sectionBody}>{children}</div>
  </div>
);

const ImageSlot = ({ file, onChange, label, disabled }) => {
  const preview = file ? URL.createObjectURL(file) : null;
  return (
    <label
      className={`${styles.uploadSlot} ${disabled ? styles.uploadSlotDisabled : ""}`}>
      {preview ? (
        <Image
          src={preview}
          width={20}
          height={30}
          alt="preview"
          className={styles.uploadSlotPreview}
        />
      ) : (
        <>
          <Icon d={icons.image} className={styles.uploadIcon} />
          <span>{label}</span>
        </>
      )}
      <input
        type="file"
        accept="image/*"
        onChange={onChange}
        disabled={disabled}
      />
    </label>
  );
};

const DiscardPopup = ({ onContinue, onDiscard }) => (
  <div className={styles.overlay}>
    <div className={styles.popup}>
      <p className={styles.popupTitle}>Discard changes?</p>
      <p className={styles.popupBody}>
        All entered listing data will be cleared. This cannot be undone.
      </p>
      <div className={styles.popupActions}>
        <button className={styles.popupDiscard} onClick={onDiscard}>
          Discard
        </button>
        <button className={styles.popupContinue} onClick={onContinue}>
          Continue editing
        </button>
      </div>
    </div>
  </div>
);

const extractGoogleMapsUrl = (input) => {
  if (!input) return "";
  const trimmed = input.trim();
  const srcMatch = trimmed.match(/src=["']([^"']+)["']/);
  if (srcMatch) return srcMatch[1];
  return trimmed.replace(/^["']|["']$/g, "");
};

export default function AddListing({
  prefill = null,
  onDone = null,
  onUploadStateChange = null,
  onFileProgress = null,
}) {
  const router = useRouter();
  const isEdit = !!prefill;

  const [filters, setFilters] = useState({ wards: [], categories: [] });
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [filtersError, setFiltersError] = useState(null);

  useEffect(() => {
    fetch("/api/v1/listings/filters")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load filter options.");
        return res.json();
      })
      .then((json) => setFilters(json))
      .catch((err) => setFiltersError(err.message))
      .finally(() => setFiltersLoading(false));
  }, []);

  // Cleanup for the fake-progress interval timers (see startFakeProgress
  // below). Separate from the fetch effect above — do not merge.
  useEffect(() => {
    return () => {
      fakeProgressTimersRef.current.forEach(clearInterval);
      fakeProgressTimersRef.current.clear();
      stopPrepProgress();
    };
  }, []);

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [checkoutData, setCheckoutData] = useState(null);
  const [fileProgress, setFileProgress] = useState({});
  const [uploadTotals, setUploadTotals] = useState({
    imagesTotalCount: 0,
    videoTotalCount: 0,
  });

  // Last progress-event timestamp per fileId — kept in a ref (not state) so
  // the high-frequency onprogress stream never triggers extra renders itself.
  const lastProgressAtRef = useRef(new Map());
  const fakeProgressTimersRef = useRef(new Map());
  const prepProgressTimerRef = useRef(null);

  useEffect(() => {
    if (!prefill || filtersLoading) return;
    setForm({
      name: prefill.property_name ?? "",
      ward: prefill.ward_name ?? "",
      ward_location: prefill.ward_location ?? "",
      property_location: prefill.property_location ?? "",
      category: prefill.category_id ?? "",
      type: prefill.property_type_id ?? "",
      duration: prefill.rent_duration ?? "",
      furniture: prefill.property_interior ?? "",
      phone: String(prefill.phone_number ?? ""),
      price: prefill.property_price ?? "",
      description: normalizeDescription(prefill.description),
      images: [null, null, null, null],
      video: null,
    });
    setIsDirty(false);
  }, [prefill, filtersLoading]);

  const wardOptions = filters.wards.map((w) => ({
    value: w.ward_name,
    label: w.ward_name,
  }));
  const categoryOptions = filters.categories.map((c) => ({
    value: c.category_name,
    label: c.category_name,
  }));
  const selectedCategory = filters.categories.find(
    (c) => c.category_name === form.category,
  );
  const typeOptions = (selectedCategory?.types ?? []).map((t) => ({
    value: t.category_type_name,
    label: t.category_type_name,
  }));
  const CIRCUMFERENCE = 2 * Math.PI * 45; // radius 45

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    const normalized =
      name === "property_location" ? extractGoogleMapsUrl(value) : value;
    setForm((prev) => ({ ...prev, [name]: normalized }));
    setIsDirty(true);
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }, []);

  const handleCategoryChange = useCallback((e) => {
    const { value } = e.target;
    setForm((prev) => ({ ...prev, category: value, type: "" }));
    setIsDirty(true);
    setErrors((prev) => ({ ...prev, category: undefined, type: undefined }));
  }, []);

  const handleImage = useCallback((index, e) => {
    const file = e.target.files?.[0] ?? null;
    setForm((prev) => {
      const images = [...prev.images];
      images[index] = file;
      return { ...prev, images };
    });
    setIsDirty(true);
    setErrors((prev) => ({ ...prev, [`image_${index}`]: undefined }));
  }, []);

  const handleVideo = useCallback((e) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;

    if (file.size > 80 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, video: "Video exceeds 80 MB" }));
      toast.error("Video exceeds 80 MB. Please upload a smaller file.");
      return;
    }

    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      if (video.duration > 90) {
        setErrors((prev) => ({
          ...prev,
          video: "Video exceeds 1 min and 20 seconds",
        }));
        toast.error(
          "Video exceeds 1 min and 20. Please trim it before uploading.",
        );
        return;
      }
      setForm((prev) => ({ ...prev, video: file }));
      setIsDirty(true);
      setErrors((prev) => ({ ...prev, video: undefined }));
      toast.success("Video added successfully.");
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      setErrors((prev) => ({
        ...prev,
        video:
          "Could not read this video file (unsupported format or corrupt file)",
      }));
      toast.error(
        "Could not read this video file. Try a different format (MP4/H.264 recommended).",
      );
    };

    video.src = url;
  }, []);

  const triggerDiscard = () => setShowPopup(true);

  const confirmDiscard = () => {
    setForm(EMPTY);
    setErrors({});
    setIsDirty(false);
    setShowPopup(false);
    setServerError(null);
    toast.success("Data Discarded");
    if (isEdit && onDone) onDone();
  };

  const dismissPopup = () => setShowPopup(false);

  const handleBack = () => {
    if (isDirty) {
      setShowPopup(true);
    } else if (isEdit && onDone) {
      onDone();
    } else {
      router.back();
    }
  };

  // Fake progress ceiling/timing — tuned so the fake curve visibly moves before
  // real bytes report anything. Never overtakes real progress: display always
  // takes Math.max(real, fake), so real data wins the instant it exists.
  const FAKE_CEILING_FRACTION = 0.9;
  const FAKE_TAU_MS = 1500;

  // Prep-stage fake progress — covers the 'Preparing upload' wait (listing
  // insert + SCALE create() calls), which has no byte total to derive real
  // progress from. Slower tau than the byte-upload curve above: this wait
  // has been observed at 8-40s depending on SCALE backend latency, so the
  // curve needs to keep crawling rather than hit its ceiling in ~1.5s.
  const PREP_CEILING_FRACTION = 0.85;
  const PREP_TAU_MS = 8000;

  const startPrepProgress = () => {
    const startedAt = Date.now();
    prepProgressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const percent = Math.round(
        PREP_CEILING_FRACTION * 100 * (1 - Math.exp(-elapsed / PREP_TAU_MS)),
      );
      setUploadProgress((prev) => {
        if (!prev || prev.stage !== "Preparing upload") return prev;
        return { ...prev, percent };
      });
    }, 150);
  };

  const stopPrepProgress = () => {
    if (prepProgressTimerRef.current) {
      clearInterval(prepProgressTimerRef.current);
      prepProgressTimerRef.current = null;
    }
  };

  const startFakeProgress = (fileId, total) => {
    const startedAt = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startedAt;
      const ceiling = total * FAKE_CEILING_FRACTION;
      const fakeLoaded = ceiling * (1 - Math.exp(-elapsed / FAKE_TAU_MS));

      setFileProgress((prev) => {
        const entry = prev[fileId];
        if (!entry || entry.status !== "uploading") return prev;
        return { ...prev, [fileId]: { ...entry, fakeLoaded } };
      });
    };

    fakeProgressTimersRef.current.set(fileId, setInterval(tick, 150));
  };

  const stopFakeProgress = (fileId) => {
    const timer = fakeProgressTimersRef.current.get(fileId);
    if (timer) {
      clearInterval(timer);
      fakeProgressTimersRef.current.delete(fileId);
    }
  };

  // Per-file byte-progress bookkeeping for the SCALE PUT loop. Instantaneous
  // speed comes from the loaded-delta between consecutive events divided by
  // elapsed seconds; smoothed as an EMA (0.7 previous / 0.3 instant).
  const handleFileProgress = (event) => {
    const prevEntry = fileProgress[event.fileId];
    const now = Date.now();
    const lastAt = lastProgressAtRef.current.get(event.fileId);
    const deltaSeconds = lastAt === undefined ? 0 : (now - lastAt) / 1000;
    lastProgressAtRef.current.set(event.fileId, now);

    const instantSpeed =
      prevEntry && deltaSeconds > 0
        ? Math.max(0, event.loaded - prevEntry.realLoaded) / deltaSeconds
        : 0;
    const speed = (prevEntry?.speed ?? 0) * 0.7 + instantSpeed * 0.3;

    setFileProgress((prev) => ({
      ...prev,
      [event.fileId]: {
        ...prev[event.fileId],
        type: event.type,
        realLoaded: event.loaded,
        total: event.total,
        status: "uploading",
        speed,
      },
    }));
  };

  // Aggregated per-type upload stats, derived from fileProgress on every
  // render. All zeros until progress events arrive — no guards needed to
  // avoid throwing, the loop simply runs zero times over an empty map.
  const uploadStats = useMemo(() => {
    const stats = {
      imagesLoaded: 0,
      imagesTotal: 0,
      imagesSpeed: 0,
      imagesDoneCount: 0,
      imagesTotalCount: 0,
      videoLoaded: 0,
      videoTotal: 0,
      videoSpeed: 0,
      videoDoneCount: 0,
      videoTotalCount: 0,
    };

    for (const entry of Object.values(fileProgress)) {
      const prefix = entry.type === "video" ? "video" : "images";
      const displayedLoaded = Math.max(
        entry.realLoaded ?? 0,
        entry.fakeLoaded ?? 0,
      );
      stats[`${prefix}Loaded`] += displayedLoaded;
      stats[`${prefix}Total`] += entry.total ?? 0;
      if (entry.status === "uploading")
        stats[`${prefix}Speed`] += entry.speed ?? 0;
      if (entry.status === "done") stats[`${prefix}DoneCount`] += 1;
    }

    return {
      ...stats,
      imagesTotalCount: uploadTotals.imagesTotalCount,
      videoTotalCount: uploadTotals.videoTotalCount,
    };
  }, [fileProgress, uploadTotals]);

  const hasSelectedImages = form.images.some(
    (file) => file instanceof File && file.size > 0,
  );

  const hasDescriptionContent = (document) => {
    const getText = (node) => {
      if (!node) return "";
      if (node.type === "text") return node.text ?? "";
      return (node.content ?? []).map(getText).join(" ");
    };

    return Boolean(
      document?.type === "doc" && getText(document).trim().length > 0,
    );
  };

  const validate = () => {
    const errs = {};
    const MAX_BYTES = 10 * 1024 * 1024; //10 MB
    const VIDEO_MAX_BYTES = 50 * 1024 * 1024; //50 MB

    REQUIRED.forEach((field) => {
      if (!form[field] || String(form[field]).trim() === "") {
        errs[field] = "Required";
      }
    });

    if (!hasDescriptionContent(form.description)) {
      errs.description = "Required";
    }

    if (form.phone && !/^\d{6,15}$/.test(form.phone.replace(/\s/g, ""))) {
      errs.phone = "Enter a valid phone number";
    }

    if (form.price && isNaN(Number(form.price))) {
      errs.price = "Must be a number";
    }

    if (
      form.property_location &&
      !form.property_location.includes("google.com/maps")
    ) {
      errs.property_location = "Must be a Google Maps embed URL";
    }

    form.images.forEach((file, i) => {
      if (isEdit && file === null) return;
      if (!(file instanceof File) || file.size === 0) {
        errs[`image_${i}`] = `Image ${i + 1} is required`;
        toast.warning(`Image ${i + 1} is required`);
      } else if (file.size > MAX_BYTES) {
        errs[`image_${i}`] = `Image ${i + 1} exceeds 5 MB`;
        toast.error(`Image ${i + 1} exceeds 5 MB`);
      }
    });

    if (form.video instanceof File && form.video.size > VIDEO_MAX_BYTES) {
      errs.video = "Video exceeds 50 MB";
      toast.error("Video exceeds 50MB");
    }

    return errs;
  };

  const handleSubmit = async () => {
    const validationErrors = validate();

    // Validation is the single gate before any listing or upload request.
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSubmitting(true);
    setServerError(null);

    try {
      if (isEdit) {
        const fd = new FormData();
        const selectedWard = filters.wards.find(
          (w) => w.ward_name === form.ward,
        );

        fd.append("property_name", form.name);
        fd.append("ward_name", form.ward);
        fd.append("ward_id", selectedWard?.ward_id ?? "");
        fd.append("ward_location", form.ward_location);
        fd.append("property_location", form.property_location);
        fd.append("category_id", form.category);
        fd.append("type_id", form.type);
        fd.append("rent_duration", form.duration);
        fd.append("property_interior", form.furniture);
        fd.append("phone_number", form.phone.replace(/\s/g, ""));
        fd.append("property_price", form.price);
        fd.append("description", form.description);

        form.images.forEach((file, i) => {
          if (file) fd.append(`image_${i}`, file);
        });
        if (form.video) fd.append("video", form.video);

        const res = await fetch(`/api/listings/${prefill.listing_id}`, {
          method: "PATCH",
          body: fd,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to update listing.");

        toast.success("Listing updated!");
        onDone?.();
      } else {
        const selectedWard = filters.wards.find(
          (w) => w.ward_name === form.ward,
        );

        // Build files metadata array (non-null images + optional video), in the
        // same order as the actual File objects we'll PUT directly to R2 later.
        // Each entry is tagged by type so finalize can split images vs video.
        const fileObjects = form.images
          .filter(Boolean)
          .map((f) => ({ file: f, type: "image" }));
        if (form.video) fileObjects.push({ file: form.video, type: "video" });
        const files = fileObjects.map(({ file, type }) => ({
          filename: file.name,
          contentType: file.type,
          fileSize: file.size,
          type,
        }));

        // Show overlay
        setUploadProgress({ stage: "Preparing upload", percent: 0 });
        onUploadStateChange?.(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
        startPrepProgress();

        // Step 1: POST JSON to /api/v1/listings — listing fields + files metadata.
        console.log("[AddListing] create request body:", {
          property_name: form.name,
          ward_id: selectedWard?.ward_id ?? "",
          ward_name: form.ward,
          category_id: form.category,
          property_type_id: form.type,
          property_price: form.price,
          phone_number: form.phone.replace(/\s/g, ""),
          files: fileObjects.length,
        });
        const listingRes = await fetch("/api/v1/listings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            property_name: form.name,
            ward_name: form.ward,
            ward_id: selectedWard?.ward_id ?? "",
            ward_location: form.ward_location,
            property_location: form.property_location,
            category_name: form.category,
            category_type_name: form.type,
            rent_duration: form.duration,
            property_interior: form.furniture,
            phone_number: form.phone.replace(/\s/g, ""),
            property_price: form.price,
            description: form.description,
            files,
          }),
        });
        const listingJson = await listingRes.json();
        stopPrepProgress();
        if (!listingRes.ok)
          throw new Error(listingJson.error ?? "Failed to create listing.");

        const listingId = listingJson.listing_id;
        const uploadTargets = listingJson.uploadTargets;

        // Pre-flight totals from Step 1's response — known before any XHR
        // fires, so "x of N" readouts are correct before the first byte moves.
        setUploadTotals({
          imagesTotalCount: uploadTargets.filter((t) => t.type === "image")
            .length,
          videoTotalCount: uploadTargets.filter((t) => t.type === "video")
            .length,
        });

        // Step 2: browser PUTs each file directly to its uploadUrl, in parallel.
        // One PUT attempt per file, no retries. Vercel never touches file bytes.
        setUploadProgress({ stage: "Uploading", percent: 0 });

        const putFile = (target, index) =>
          new Promise((resolve, reject) => {
            const file = fileObjects[target.position].file;

            const start = () => {
              const xhr = new XMLHttpRequest();
              xhr.open("PUT", target.uploadUrl, true);
              xhr.setRequestHeader("Content-Type", file.type);
              xhr.setRequestHeader(
                "Cache-Control",
                "public, max-age=31536000, immutable",
              );

              setFileProgress((prev) => ({
                ...prev,
                [target.key]: {
                  type: target.type,
                  realLoaded: 0,
                  fakeLoaded: 0,
                  total: file.size,
                  status: "uploading",
                  speed: 0,
                },
              }));
              startFakeProgress(target.key, file.size);

              xhr.upload.onprogress = (event) => {
                handleFileProgress({
                  fileId: target.key,
                  type: target.type,
                  loaded: event.loaded,
                  total: event.total,
                });
                onFileProgress?.({
                  fileId: target.key,
                  type: target.type,
                  loaded: event.loaded,
                  total: event.total,
                });
              };

              xhr.onload = () => {
                stopFakeProgress(target.key);
                if (xhr.status >= 200 && xhr.status <= 299) {
                  setFileProgress((prev) => ({
                    ...prev,
                    [target.key]: {
                      ...prev[target.key],
                      status: "done",
                      realLoaded: prev[target.key]?.total,
                    },
                  }));
                  resolve();
                } else {
                  setFileProgress((prev) => ({
                    ...prev,
                    [target.key]: {
                      ...prev[target.key],
                      status: "failed",
                    },
                  }));
                  reject(
                    new Error(
                      `Upload failed for ${file.name} (status ${xhr.status})`,
                    ),
                  );
                }
              };

              xhr.onerror = () => {
                stopFakeProgress(target.key);
                setFileProgress((prev) => ({
                  ...prev,
                  [target.key]: {
                    ...prev[target.key],
                    status: "failed",
                  },
                }));
                reject(new Error(`Network error while uploading ${file.name}`));
              };

              xhr.send(file);
            };

            if (index === 0) {
              start();
            } else {
              setTimeout(start, index * 120);
            }
          });

        try {
          await Promise.all(
            uploadTargets.map((target, index) => putFile(target, index)),
          );
        } catch (uploadErr) {
          // At least one file failed — the listing row exists with no media.
          // Clean it up via the guarded cancel route so it doesn't sit orphaned.
          try {
            await fetch(`/api/v1/listings/${listingId}/cancel`, {
              method: "POST",
              credentials: "include",
            });
          } catch (cancelErr) {
            console.error(
              "[AddListing] cleanup after failed upload also failed:",
              cancelErr,
            );
          }
          throw uploadErr;
        }

        // Step 3: POST JSON to /api/v1/listings/finalize with the uploads taken
        // directly from step 1's response — do not reconstruct or guess values.
        setUploadProgress({ stage: "Saving", percent: 100 }); // was 'Confirming'
        const finalizeRes = await fetch("/api/v1/listings/finalize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            listing_id: listingId,
            uploads: uploadTargets.map((t) => ({
              key: t.key,
              publicUrl: t.publicUrl,
              position: t.position,
              type: t.type,
            })),
          }),
        });
        const finalizeJson = await finalizeRes.json();
        if (!finalizeRes.ok)
          throw new Error(finalizeJson.error ?? "Failed to finalize listing.");

        setUploadProgress({ stage: "Confirming", percent: 100 });
        await new Promise((r) => setTimeout(r, 400));

        setUploadProgress({ stage: "Completing", percent: 100 });
        await new Promise((r) => setTimeout(r, 400));

        setUploadProgress({ stage: "Done", percent: 100 });
        await new Promise((r) => setTimeout(r, 400));

        setUploadProgress(null);
        onUploadStateChange?.(false);
        setCheckoutData({
          listingId: listingId,
          categoryName: listingJson.listing_category,
          propertyLabel: listingJson.listing_category,
        });
        onUploadStateChange?.(true);
      }
    } catch (err) {
      stopPrepProgress();
      setServerError(err.message);
      setUploadProgress(null);
      onUploadStateChange?.(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckoutClose = () => {
    setCheckoutData(null);
    onUploadStateChange?.(false);
    setForm(EMPTY);
    setIsDirty(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCheckoutPaid = () => {
    toast.success("Property posted successfully!");
    handleCheckoutClose();
  };

  return (
    <div className={styles.root}>
      <div className={styles.topBar}>
        <h1 className={styles.pageTitle}>
          {isEdit ? "Edit Listing" : "Post a property"}
        </h1>
        {(isDirty || isEdit) && (
          <div className={styles.topActions}>
            <button className={styles.backBtn} onClick={handleBack}>
              Back
            </button>
            {isDirty && (
              <button className={styles.discardBtn} onClick={triggerDiscard}>
                Discard
              </button>
            )}
          </div>
        )}
      </div>

      {serverError && <p className={styles.errorBanner}>{serverError}</p>}
      {filtersError && (
        <p className={styles.errorBanner}>
          Could not load options: {filtersError}
        </p>
      )}

      <div>
        {uploadProgress && hasSelectedImages ? (
          <UploadOverlay
            onCancel={() => {}}
            uploadProgress={uploadProgress}
            fileProgress={fileProgress}
            uploadStats={uploadStats}
          />
        ) : checkoutData ? (
          <CheckoutPopup
            listingId={checkoutData.listingId}
            categoryName={checkoutData.categoryName}
            propertyLabel={checkoutData.propertyLabel}
            onClose={handleCheckoutClose}
            onPaid={handleCheckoutPaid}
          />
        ) : (
          <>
            <div className={styles.sectionsGrid}>
              <Section title="Details">
                <FieldInput
                  icon="tag"
                  label="Property Name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  errors={errors}
                  placeholder="e.g. Westlands 2BR Apartment"
                />
                <FieldSelect
                  icon="map"
                  label="Ward Name"
                  name="ward"
                  options={wardOptions}
                  value={form.ward}
                  onChange={handleChange}
                  errors={errors}
                  disabled={filtersLoading}
                />
                <FieldInput
                  icon="map"
                  label="Ward Location"
                  name="ward_location"
                  value={form.ward_location}
                  onChange={handleChange}
                  errors={errors}
                  placeholder="e.g. Opposite Total Petrol Station"
                  hint="Specific street or landmark within the ward"
                />
                <FieldInput
                  icon="link"
                  label="Google Maps Location(URL)"
                  name="property_location"
                  value={form.property_location}
                  onChange={handleChange}
                  errors={errors}
                  placeholder="https://www.google.com/maps/embed?pb=..."
                  hint="Paste the embed URL from Google Maps → Share → Embed a map"
                />
                <FieldSelect
                  icon="grid"
                  label="Property Category"
                  name="category"
                  options={categoryOptions}
                  value={form.category}
                  onChange={handleCategoryChange}
                  errors={errors}
                  disabled={filtersLoading}
                />
                <FieldSelect
                  icon="layers"
                  label="Property Type"
                  name="type"
                  options={typeOptions}
                  value={form.type}
                  onChange={handleChange}
                  errors={errors}
                  disabled={!form.category || filtersLoading}
                />
                <FieldSelect
                  icon="clock"
                  label="Rent Duration"
                  name="duration"
                  options={DURATIONS}
                  value={form.duration}
                  onChange={handleChange}
                  errors={errors}
                />
                <FieldSelect
                  icon="sofa"
                  label="Property Furnishing"
                  name="furniture"
                  options={FURNITURE}
                  value={form.furniture}
                  onChange={handleChange}
                  errors={errors}
                />
              </Section>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}>
                <Section title="Contact & pricing">
                  <div className={styles.fieldRow}>
                    <Icon d={icons.phone} />
                    <div className={styles.fieldBody}>
                      <label className={styles.fieldLabel} htmlFor="phone">
                        Phone
                      </label>
                      <div className={styles.phoneGroup}>
                        <input
                          value="+254"
                          readOnly
                          className={`${styles.fieldInput} ${styles.phonePrefix}`}
                          aria-label="Country code"
                        />
                        <input
                          id="phone"
                          name="phone"
                          type="tel"
                          value={form.phone}
                          onChange={handleChange}
                          placeholder="7XX XXX XXX"
                          className={`${styles.fieldInput} ${errors.phone ? styles.error : ""}`}
                        />
                      </div>
                      {errors.phone && (
                        <span className={styles.fieldError}>
                          {errors.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <FieldInput
                    icon="dollar"
                    label="Price (KES)"
                    name="price"
                    type="number"
                    value={form.price}
                    onChange={handleChange}
                    errors={errors}
                    placeholder="e.g. 45000"
                    hint="Monthly rent or sale price"
                  />
                </Section>

                <Section title="Media">
                  <div className={styles.fieldRow}>
                    <Icon d={icons.image} />
                    <div className={styles.fieldBody}>
                      <span className={styles.fieldLabel}>
                        {isEdit
                          ? "Images (upload to replace)"
                          : "Property Images (3 required)"}
                      </span>
                      <div className={styles.imageGroup}>
                        {form.images.map((file, i) => (
                          <div key={i}>
                            <ImageSlot
                              file={file}
                              label={`Img ${i + 1}`}
                              onChange={(e) => handleImage(i, e)}
                            />
                            {errors[`image_${i}`] && (
                              <span className={styles.fieldError}>
                                {errors[`image_${i}`]}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className={styles.fieldRow}>
                    <Icon d={icons.video} />
                    <div className={styles.fieldBody}>
                      <span className={styles.fieldLabel}>Property Video</span>
                      <div className={styles.imageGroup}>
                        <label className={styles.uploadSlot}>
                          <Icon d={icons.video} className={styles.uploadIcon} />
                          <span>
                            {form.video
                              ? form.video.name.slice(0, 10) + "…"
                              : "Upload"}
                          </span>
                          <input
                            type="file"
                            accept="video/*"
                            onChange={handleVideo}
                          />
                        </label>
                      </div>
                      {errors.video && (
                        <span className={styles.fieldError}>
                          {errors.video}
                        </span>
                      )}
                    </div>
                  </div>
                </Section>
              </div>
            </div>

            <Section title="Description">
              <div className={styles.fieldRow}>
                <Icon d={icons.align} />
                <div className={styles.fieldBody}>
                  <label
                    className={styles.fieldLabel}
                    htmlFor="description-editor">
                    Property Description
                  </label>

                  <RichTextEditor
                    value={form.description}
                    disabled={submitting}
                    onChange={(description) => {
                      setForm((previous) => ({ ...previous, description }));
                      setIsDirty(true);
                      setErrors((previous) => ({
                        ...previous,
                        description: undefined,
                      }));
                    }}
                  />

                  <span className={styles.fieldHint}>
                    Highlight key features, nearby amenities, access, and other
                    details.
                  </span>

                  {errors.description && (
                    <span className={styles.fieldError}>
                      {errors.description}
                    </span>
                  )}
                </div>
              </div>
            </Section>

            <div className={styles.section} style={{ marginTop: 8 }}>
              <div className={styles.submitRow}>
                <button
                  className={styles.submitBtn}
                  onClick={handleSubmit}
                  disabled={submitting}>
                  {submitting
                    ? isEdit
                      ? "Saving…"
                      : "Posting…"
                    : isEdit
                      ? "SAVE CHANGES"
                      : "POST PROPERTY"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {showPopup && (
        <DiscardPopup onContinue={dismissPopup} onDiscard={confirmDiscard} />
      )}
    </div>
  );
}
