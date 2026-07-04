'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image'
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { uploadListingMedia } from '@/lib/uploadMedia';
import styles from '../css/Lister/AddListing.module.css';

/* ─── Icon primitive ─── */
const Icon = ({ d, className }) => (
  <svg
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    className={className ?? styles.fieldIcon} aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

const icons = {
  tag: 'M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01',
  map: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  layers: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  clock: 'M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20zm0-14v4l3 3',
  sofa: 'M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3M2 11a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v6H2v-6zM4 17v2M20 17v2',
  phone: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z',
  dollar: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  image: 'M21 15l-5-5L5 21M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 5h6M19 2v6',
  video: 'M23 7l-7 5 7 5V7zM1 5h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H1a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z',
  align: 'M17 10H3M21 6H3M21 14H3M17 18H3',
  back: 'M19 12H5M12 19l-7-7 7-7',
  link: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
};

const DURATIONS = [ 'Short Term', 'Long Term' ];
const FURNITURE = [ 'Furnished', 'Unfurnished' ];
const REQUIRED = [ 'name', 'ward', 'ward_location', 'property_location', 'category', 'type', 'duration', 'furniture', 'phone', 'price', 'description' ];

const EMPTY = {
  name: '',
  ward: '',
  ward_location: '',
  property_location: '',
  category: '',
  type: '',
  duration: '',
  furniture: '',
  phone: '',
  price: '',
  description: '',
  images: [ null, null, null, null ],
  video: null,
};

const FieldInput = ({ icon, label, name, type = 'text', value, onChange, hint, errors, placeholder, disabled }) => (
  <div className={styles.fieldRow}>
    <Icon d={icons[ icon ]} />
    <div className={styles.fieldBody}>
      <label className={styles.fieldLabel} htmlFor={name}>{label}</label>
      <input
        id={name} name={name} type={type} value={value}
        onChange={onChange} placeholder={placeholder ?? ''}
        disabled={disabled}
        className={`${styles.fieldInput} ${errors?.[ name ] ? styles.error : ''}`}
        autoComplete="off"
      />
      {hint && <span className={styles.fieldHint}>{hint}</span>}
      {errors?.[ name ] && <span className={styles.fieldError}>{errors[ name ]}</span>}
    </div>
  </div>
);

const FieldSelect = ({ icon, label, name, options = [], value, onChange, errors, disabled }) => (
  <div className={styles.fieldRow}>
    <Icon d={icons[ icon ]} />
    <div className={styles.fieldBody}>
      <label className={styles.fieldLabel} htmlFor={name}>{label}</label>
      <select
        id={name} name={name} value={value} onChange={onChange} disabled={disabled}
        className={`${styles.fieldSelect} ${errors?.[ name ] ? styles.error : ''}`}
      >
        <option value="">{disabled ? '— select category first —' : 'Select…'}</option>
        {options.map(o =>
          typeof o === 'string'
            ? <option key={o} value={o}>{o}</option>
            : <option key={o.value} value={o.value}>{o.label}</option>
        )}
      </select>
      {errors?.[ name ] && <span className={styles.fieldError}>{errors[ name ]}</span>}
    </div>
  </div>
);

const FieldTextarea = ({ icon, label, name, value, onChange, errors, hint, disabled }) => (
  <div className={styles.fieldRow}>
    <Icon d={icons[ icon ]} />
    <div className={styles.fieldBody}>
      <label className={styles.fieldLabel} htmlFor={name}>{label}</label>
      <textarea
        id={name} name={name} value={value} onChange={onChange}
        disabled={disabled}
        className={`${styles.fieldTextarea} ${errors?.[ name ] ? styles.error : ''}`}
        rows={4}
      />
      {hint && <span className={styles.fieldHint}>{hint}</span>}
      {errors?.[ name ] && <span className={styles.fieldError}>{errors[ name ]}</span>}
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
    <label className={`${styles.uploadSlot} ${disabled ? styles.uploadSlotDisabled : ''}`}>
      {preview
        ? <Image src={preview} width={20} height={30} alt="preview" className={styles.uploadSlotPreview} />
        : <>
          <Icon d={icons.image} className={styles.uploadIcon} />
          <span>{label}</span>
        </>
      }
      <input type="file" accept="image/*" onChange={onChange} disabled={disabled} />
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
        <button className={styles.popupDiscard} onClick={onDiscard}>Discard</button>
        <button className={styles.popupContinue} onClick={onContinue}>Continue editing</button>
      </div>
    </div>
  </div>
);

const extractGoogleMapsUrl = (input) => {
  if (!input) return '';
  const trimmed = input.trim();
  const srcMatch = trimmed.match(/src=["']([^"']+)["']/);
  if (srcMatch) return srcMatch[ 1 ];
  return trimmed.replace(/^["']|["']$/g, '');
};

export default function AddListing({ canAdd = true, prefill = null, onDone = null }) {
  const router = useRouter();
  const isEdit = !!prefill;

  const [ filters, setFilters ] = useState({ wards: [], categories: [] });
  const [ filtersLoading, setFiltersLoading ] = useState(true);
  const [ filtersError, setFiltersError ] = useState(null);

  useEffect(() => {
    fetch('/api/filters')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load filter options.');
        return res.json();
      })
      .then(json => setFilters(json))
      .catch(err => setFiltersError(err.message))
      .finally(() => setFiltersLoading(false));
  }, []);

  const [ form, setForm ] = useState(EMPTY);
  const [ errors, setErrors ] = useState({});
  const [ isDirty, setIsDirty ] = useState(false);
  const [ showPopup, setShowPopup ] = useState(false);
  const [ submitting, setSubmitting ] = useState(false);
  const [ serverError, setServerError ] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);

  useEffect(() => {
    if (!prefill || filtersLoading) return;
    setForm({
      name: prefill.property_name ?? '',
      ward: prefill.ward_name ?? '',
      ward_location: prefill.ward_location ?? '',
      property_location: prefill.property_location ?? '',
      category: prefill.category_id ?? '',
      type: prefill.property_type_id ?? '',
      duration: prefill.rent_duration ?? '',
      furniture: prefill.property_interior ?? '',
      phone: String(prefill.phone_number ?? ''),
      price: prefill.property_price ?? '',
      description: prefill.description ?? '',
      images: [ null, null, null ],
      video: null,
    });
    setIsDirty(false);
  }, [ prefill, filtersLoading ]);

  const wardOptions = filters.wards.map(w => ({ value: w.ward_name, label: w.ward_name }));
  const categoryOptions = filters.categories.map(c => ({ value: c.category_id, label: c.category_name }));
  const selectedCategory = filters.categories.find(c => String(c.category_id) === String(form.category));
  const typeOptions = (selectedCategory?.types ?? []).map(t => ({ value: t.type_id, label: t.type_name }));
    const CIRCUMFERENCE = 2 * Math.PI * 45; // radius 45

  const handleChange = useCallback(e => {
    const { name, value } = e.target;
    const normalized = name === 'property_location' ? extractGoogleMapsUrl(value) : value;
    setForm(prev => ({ ...prev, [ name ]: normalized }));
    setIsDirty(true);
    setErrors(prev => ({ ...prev, [ name ]: undefined }));
  }, []);

  const handleCategoryChange = useCallback(e => {
    const { value } = e.target;
    setForm(prev => ({ ...prev, category: value, type: '' }));
    setIsDirty(true);
    setErrors(prev => ({ ...prev, category: undefined, type: undefined }));
  }, []);

  const handleImage = useCallback((index, e) => {
    const file = e.target.files?.[ 0 ] ?? null;
    setForm(prev => {
      const images = [ ...prev.images ];
      images[ index ] = file;
      return { ...prev, images };
    });
    setIsDirty(true);
    setErrors(prev => ({ ...prev, [ `image_${index}` ]: undefined }));
  }, []);

  const handleVideo = useCallback(e => {
    const file = e.target.files?.[ 0 ] ?? null;
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, video: 'Video exceeds 50 MB' }));
      toast.error('Video exceeds 50 MB. Please upload a smaller file.');
      return;
    }

    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      if (video.duration > 60) {
        setErrors(prev => ({ ...prev, video: 'Video exceeds 60 seconds' }));
        toast.error('Video exceeds 60 seconds. Please trim it before uploading.');
        return;
      }
      setForm(prev => ({ ...prev, video: file }));
      setIsDirty(true);
      setErrors(prev => ({ ...prev, video: undefined }));
      toast.success('Video added successfully.');
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
    toast.success('Data Discarded');
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

  const validate = () => {
    const errs = {};
    const MAX_BYTES = 10 * 1024 * 1024; //10 MB
    const VIDEO_MAX_BYTES = 50 * 1024 * 1024; //50 MB

    REQUIRED.forEach(field => {
      if (!form[ field ] || String(form[ field ]).trim() === '') {
        errs[ field ] = 'Required';
      }
    });

    if (form.phone && !/^\d{6,15}$/.test(form.phone.replace(/\s/g, ''))) {
      errs.phone = 'Enter a valid phone number';
    }

    if (form.price && isNaN(Number(form.price))) {
      errs.price = 'Must be a number';
    }

    if (form.property_location && !form.property_location.includes('google.com/maps')) {
      errs.property_location = 'Must be a Google Maps embed URL';
    }

    form.images.forEach((file, i) => {
      if (isEdit && file === null) return;
      if (!(file instanceof File) || file.size === 0) {
        errs[ `image_${i}` ] = `Image ${i + 1} is required`;
        toast.warning(`Image ${i + 1} is required`);
      } else if (file.size > MAX_BYTES) {
        errs[ `image_${i}` ] = `Image ${i + 1} exceeds 5 MB`;
        toast.error(`Image ${i + 1} exceeds 5 MB`)
      }

    });

    if (form.video instanceof File && form.video.size > VIDEO_MAX_BYTES) {
      errs.video = 'Video exceeds 50 MB';
      toast.error("Video exceeds 50MB")
    }

    return errs;
  };


  const UploadOverlay = ({ stage, percent }) => {
    const offset = CIRCUMFERENCE - (percent / 100) * CIRCUMFERENCE;
    const isDone = percent === 100;

    return (
      <div className={styles.uploadOverlay}>
        <div className={styles.uploadCard}>

          <div className={styles.uploadRingWrap}>
            <svg viewBox="0 0 100 100" className={styles.uploadRingSvg}>
              {/* Track */}
              <circle
                cx="50" cy="50" r="45"
                fill="none"
                stroke="var(--ring-track, #2a2a2a)"
                strokeWidth="6"
              />
              {/* Progress arc */}
              <circle
                cx="50" cy="50" r="45"
                fill="none"
                stroke="var(--ring-fill, #C8A84B)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 0.5s ease', transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
              />
            </svg>

            <div className={styles.uploadRingInner}>
              {isDone
                ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="var(--ring-fill, #C8A84B)"
                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    className={styles.uploadCheckIcon}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )
                : <span className={styles.uploadPercent}>{percent}%</span>
              }
            </div>
          </div>

          <span className={styles.uploadStageLabel}>{stage}</span>

        </div>
      </div>
    );
  };

  const handleSubmit = async () => {
    if (!canAdd && !isEdit) return;

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    setServerError(null);

    try {
      if (isEdit) {
        const fd = new FormData();
        const selectedWard = filters.wards.find(w => w.ward_name === form.ward);

        fd.append('property_name', form.name);
        fd.append('ward_name', form.ward);
        fd.append('ward_id', selectedWard?.ward_id ?? '');
        fd.append('ward_location', form.ward_location);
        fd.append('property_location', form.property_location);
        fd.append('category_id', form.category);
        fd.append('type_id', form.type);
        fd.append('rent_duration', form.duration);
        fd.append('property_interior', form.furniture);
        fd.append('phone_number', form.phone.replace(/\s/g, ''));
        fd.append('property_price', form.price);
        fd.append('description', form.description);

        form.images.forEach((file, i) => {
          if (file) fd.append(`image_${i}`, file);
        });
        if (form.video) fd.append('video', form.video);

        const res = await fetch(`/api/listings/${prefill.listing_id}`, {
          method: 'PATCH',
          body: fd,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? 'Failed to update listing.');

        toast.success('Listing updated!');
        onDone?.();

      } else {
        const selectedWard = filters.wards.find(w => w.ward_name === form.ward);

        // Show overlay
        setUploadProgress({ stage: 'Uploading Images', percent: 0 });

        // Step 1: insert text fields, get listing_id
        const listingRes = await fetch('/api/AddListing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            property_name: form.name,
            ward_name: form.ward,
            ward_id: selectedWard?.ward_id ?? '',
            ward_location: form.ward_location,
            property_location: form.property_location,
            category_id: form.category,
            type_id: form.type,
            rent_duration: form.duration,
            property_interior: form.furniture,
            phone_number: form.phone.replace(/\s/g, ''),
            property_price: form.price,
            description: form.description,
          }),
        });
        const listingJson = await listingRes.json();
        if (!listingRes.ok) throw new Error(listingJson.error ?? 'Failed to create listing.');

        const listingId = listingJson.listing_id;

        // Step 2: upload to Cloudinary — callback drives overlay
        const media = await uploadListingMedia(
          listingId,
          form.images.filter(Boolean),
          form.video ?? null,
          ({ stage, percent }) => setUploadProgress({ stage, percent })
        );

        // Step 3: send URLs to Supabase
        setUploadProgress({ stage: 'Uploading Data', percent: 75 });
        const mediaRes = await fetch('/api/AddListing/media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ listing_id: listingId, media }),
        });
        const mediaJson = await mediaRes.json();
        if (!mediaRes.ok) throw new Error(mediaJson.error ?? 'Failed to save media.');

        // Step 4: Confirming
        setUploadProgress({ stage: 'Confirming', percent: 100 });
        await new Promise(r => setTimeout(r, 1500));

        setUploadProgress(null);
        toast.success('Property posted successfully!');
        setForm(EMPTY);
        setIsDirty(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

    } catch (err) {
      setServerError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.root}>

      <div className={styles.topBar}>
        <h1 className={styles.pageTitle}>{isEdit ? 'Edit Listing' : 'Post a property'}</h1>
        {(isDirty || isEdit) && (
          <div className={styles.topActions}>
            <button className={styles.backBtn} onClick={handleBack}>Back</button>
            {isDirty && <button className={styles.discardBtn} onClick={triggerDiscard}>Discard</button>}
          </div>
        )}
      </div>

      {serverError && <p className={styles.errorBanner}>{serverError}</p>}
      {filtersError && <p className={styles.errorBanner}>Could not load options: {filtersError}</p>}

      {!canAdd && !isEdit && (
        <div className={styles.noSlotsBanner}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          You have no listing slots available. Go to <strong>Listings</strong> to purchase more slots.
        </div>
      )}

      <div className={(!canAdd && !isEdit) ? styles.formDisabled : undefined}>

        <div className={styles.sectionsGrid}>

          <Section title="Details">
            <FieldInput
              icon="tag" label="Property Name" name="name"
              value={form.name} onChange={handleChange} errors={errors}
              placeholder="e.g. Westlands 2BR Apartment"
              disabled={!canAdd && !isEdit}
            />
            <FieldSelect
              icon="map" label="Ward Name" name="ward"
              options={wardOptions} value={form.ward}
              onChange={handleChange} errors={errors}
              disabled={filtersLoading || (!canAdd && !isEdit)}
            />
            <FieldInput
              icon="map" label="Ward Location" name="ward_location"
              value={form.ward_location} onChange={handleChange} errors={errors}
              placeholder="e.g. Opposite Total Petrol Station"
              hint="Specific street or landmark within the ward"
              disabled={!canAdd && !isEdit}
            />
            <FieldInput
              icon="link" label="Google Maps Location(URL)" name="property_location"
              value={form.property_location} onChange={handleChange} errors={errors}
              placeholder="https://www.google.com/maps/embed?pb=..."
              hint="Paste the embed URL from Google Maps → Share → Embed a map"
              disabled={!canAdd && !isEdit}
            />
            <FieldSelect
              icon="grid" label="Property Category" name="category"
              options={categoryOptions} value={form.category}
              onChange={handleCategoryChange} errors={errors}
              disabled={filtersLoading || (!canAdd && !isEdit)}
            />
            <FieldSelect
              icon="layers" label="Property Type" name="type"
              options={typeOptions} value={form.type}
              onChange={handleChange} errors={errors
              }
              disabled={!form.category || filtersLoading || (!canAdd && !isEdit)}
            />
            <FieldSelect
              icon="clock" label="Rent Duration" name="duration"
              options={DURATIONS} value={form.duration}
              onChange={handleChange} errors={errors}
              disabled={!canAdd && !isEdit}
            />
            <FieldSelect
              icon="sofa" label="Property Furnishing" name="furniture"
              options={FURNITURE} value={form.furniture}
              onChange={handleChange} errors={errors}
              disabled={!canAdd && !isEdit}
            />
          </Section>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            <Section title="Contact & pricing">
              <div className={styles.fieldRow}>
                <Icon d={icons.phone} />
                <div className={styles.fieldBody}>
                  <label className={styles.fieldLabel} htmlFor="phone">Phone</label>
                  <div className={styles.phoneGroup}>
                    <input
                      value="+254" readOnly
                      className={`${styles.fieldInput} ${styles.phonePrefix}`}
                      aria-label="Country code"
                      disabled={!canAdd && !isEdit}
                    />
                    <input
                      id="phone" name="phone" type="tel" value={form.phone}
                      onChange={handleChange} placeholder="7XX XXX XXX"
                      disabled={!canAdd && !isEdit}
                      className={`${styles.fieldInput} ${errors.phone ? styles.error : ''}`}
                    />
                  </div>
                  {errors.phone && <span className={styles.fieldError}>{errors.phone}</span>}
                </div>
              </div>
              <FieldInput
                icon="dollar" label="Price (KES)" name="price" type="number"
                value={form.price} onChange={handleChange} errors={errors}
                placeholder="e.g. 45000"
                hint="Monthly rent or sale price"
                disabled={!canAdd && !isEdit}
              />
            </Section>

            <Section title="Media">
              <div className={styles.fieldRow}>
                <Icon d={icons.image} />
                <div className={styles.fieldBody}>
                  <span className={styles.fieldLabel}>
                    {isEdit ? 'Images (upload to replace)' : 'Property Images (3 required)'}
                  </span>
                  <div className={styles.imageGroup}>
                    {form.images.map((file, i) => (
                      <div key={i}>
                        <ImageSlot
                          file={file}
                          label={`Img ${i + 1}`}
                          onChange={e => handleImage(i, e)}
                          disabled={!canAdd && !isEdit}
                        />
                        {errors[ `image_${i}` ] && (
                          <span className={styles.fieldError}>{errors[ `image_${i}` ]}</span>
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
                    <label className={`${styles.uploadSlot} ${(!canAdd && !isEdit) ? styles.uploadSlotDisabled : ''}`}>
                      <Icon d={icons.video} className={styles.uploadIcon} />
                      <span>{form.video ? form.video.name.slice(0, 10) + '…' : 'Upload'}</span>
                      <input type="file" accept="video/*" onChange={handleVideo} disabled={!canAdd && !isEdit} />
                    </label>
                  </div>
                  {errors.video && <span className={styles.fieldError}>{errors.video}</span>}
                </div>
              </div>
            </Section>

          </div>
        </div>

        <Section title="Description">
          <FieldTextarea
            icon="align" label="Property Description" name="description"
            value={form.description} onChange={handleChange} errors={errors}
            hint="Highlight key features, nearby amenities, access etc."
            disabled={!canAdd && !isEdit}
          />
        </Section>

        <div className={styles.section} style={{ marginTop: 8 }}>
          <div className={styles.submitRow}>
            <button
              className={styles.submitBtn}
              onClick={handleSubmit}
              disabled={submitting || (!canAdd && !isEdit)}
            >
              {submitting
                ? (isEdit ? 'Saving…' : 'Posting…')
                : (isEdit ? 'SAVE CHANGES' : 'POST PROPERTY')}
            </button>
          </div>
        </div>

      </div>

      {showPopup && (
        <DiscardPopup
          onContinue={dismissPopup}
          onDiscard={confirmDiscard}
        />
      )}

      {uploadProgress && (
        <UploadOverlay
          stage={uploadProgress.stage}
          percent={uploadProgress.percent}
        />
      )}

    </div>
  );
}