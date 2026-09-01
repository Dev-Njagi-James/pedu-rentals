'use client';

import styles from '../css/UploadOverlay.module.css';

// Guarded default mirroring AddListing's uploadStats shape.
const ZERO_STATS = {
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

// Human-readable byte rate, e.g. 2400000 -> "2.4 MB/s", 480000 -> "480 KB/s".
function formatSpeed(bytesPerSec) {
  if (!bytesPerSec || bytesPerSec <= 0) return '—';
  if (bytesPerSec >= 1e6) return `${(bytesPerSec / 1e6).toFixed(1)} MB/s`;
  return `${Math.round(bytesPerSec / 1e3)} KB/s`;
}

const STEPS = [
  {
    key: 'images',
    shortTitle: 'Images',
    title: 'Uploading Images',
    desc: 'Sending your images to the cloud',
    icon: 'hgi-camera-01',
  },
  {
    key: 'video',
    shortTitle: 'Video',
    title: 'Uploading Video',
    desc: 'Uploading your video file',
    icon: 'hgi-video-02',
  },
  {
    key: 'details',
    shortTitle: 'Details',
    title: 'Saving Listing Details',
    desc: 'Saving your property information',
    icon: 'hgi-file-01',
  },
  {
    key: 'confirm',
    shortTitle: 'Confirm',
    title: 'Confirming Details',
    desc: 'Verifying all information provided',
    icon: 'hgi-security-check',
  },
  {
    key: 'complete',
    shortTitle: 'Complete',
    title: 'Completing Upload',
    desc: 'Finalizing and preparing your listing',
    icon: 'hgi-cloud-upload',
  },
  {
    key: 'done',
    shortTitle: 'Done',
    title: 'Done',
    desc: 'Your property is live!',
    icon: 'hgi-tick-double-01',
  },
];

export default function UploadOverlay({ onCancel, uploadProgress, fileProgress = {}, uploadStats = null }) {
  const stats = uploadStats ?? ZERO_STATS;
  const stage = uploadProgress?.stage ?? '';

  // Derive the active step from the real stage, not a timer.
  let activeIndex = 0;
  if (stage === 'Uploading') {
    const images = stats.imagesTotalCount > 0;
    const haveVideo = stats.videoTotalCount > 0;
    const imagesDone = images && stats.imagesDoneCount >= stats.imagesTotalCount;
    const videoNotDone = haveVideo && stats.videoDoneCount < stats.videoTotalCount;
    activeIndex = images ? (imagesDone && videoNotDone ? 1 : 0) : videoNotDone ? 1 : 0;
  } else if (stage === 'Saving') {
    activeIndex = 2;
  } else if (stage === 'Confirming') {
    activeIndex = 3;
  } else if (stage === 'Completing') {
    activeIndex = 4;
  } else if (stage === 'Done') {
    activeIndex = 5;
  }
  // 'Preparing upload' (and any unknown/absent stage) falls through to 0.

  const activeStep = STEPS[activeIndex];
  const isByteStep = activeStep.key === 'images' || activeStep.key === 'video';

  // Real byte-derived percents (divide-by-zero guarded). Only meaningful for the
  // images/video steps; every other step has no byte data so activePercent is null.
  const imagesPercent =
    stats.imagesTotal > 0
      ? Math.min(100, Math.round((stats.imagesLoaded / stats.imagesTotal) * 100))
      : 0;
  const videoPercent =
    stats.videoTotal > 0
      ? Math.min(100, Math.round((stats.videoLoaded / stats.videoTotal) * 100))
      : 0;

  const activePercent = isByteStep
    ? (activeStep.key === 'images' ? imagesPercent : videoPercent)
    : null;

  const activeSpeed = isByteStep
    ? (activeStep.key === 'images' ? stats.imagesSpeed : stats.videoSpeed)
    : 0;

  const isUploadingImages = isByteStep && activeStep.key === 'images';
  const isUploadingVideo = isByteStep && activeStep.key === 'video';

  // Steps 3–5 (details/confirm/complete) have no byte data: treat each completed
  // step as 100%, the active non-byte step as 0% — the bar jumps in big steps
  // for those phases, which is expected. Images/video interpolate on real bytes.
  const overallPercent = Math.round(
    (STEPS.reduce((sum, step, i) => {
      if (i < activeIndex) return sum + 1;
      if (i > activeIndex) return sum;
      if (step.key === 'images') return sum + imagesPercent / 100;
      if (step.key === 'video') return sum + videoPercent / 100;
      if (step.key === 'done') return sum + 1; // treat 'done' as complete, not in-progress
      return sum; // active non-byte step contributes 0 until done
    }, 0) /
      STEPS.length) *
      100
  );

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.brandName}>OWL NEST</span>

        <button className={styles.cancelBtn} onClick={onCancel} disabled>
          Cancel Upload
        </button>
      </div>

      <div className={styles.body}>
        <div className={styles.headingRow}>
          <div>
            <h2 className={styles.title}>Uploading Your Property</h2>
            <p className={styles.subtitle}>
              Hang on there as we put your listing to the list of winning listers.
            </p>
          </div>

          <div className={styles.overallTop}>
            <span>Overall Progress</span>
            <strong>{overallPercent}%</strong>
          </div>
        </div>

        <div className={styles.progressSteps} aria-label="Upload progress">
          {STEPS.map((step, index) => {
            const isDone = index < activeIndex;
            const isActive = index === activeIndex;

            return (
              <div
                key={step.key}
                className={styles.progressStep}
                data-status={isDone ? 'done' : isActive ? 'active' : 'pending'}
              >
                <div className={styles.progressNodeRow}>
                  <span className={styles.progressNode}>
                    {isDone ? (
                      <i className="hgi hgi-stroke hgi-rounded hgi-tick-double-01" />
                    ) : (
                      index + 1
                    )}
                  </span>

                  {index < STEPS.length - 1 && (
                    <span className={styles.progressLine} />
                  )}
                </div>

                <span className={styles.progressLabel}>{step.shortTitle}</span>
              </div>
            );
          })}
        </div>

        <section
          key={activeStep.key}
          className={styles.activeCard}
          aria-live="polite"
        >
          <div className={styles.activeIconBox}>
            <i className={`hgi hgi-stroke hgi-rounded ${activeStep.icon}`} />
          </div>

          <div className={styles.activeContent}>
            <span className={styles.activeStepLabel}>
              STEP {activeIndex + 1} OF {STEPS.length}
            </span>

            <div className={styles.activeTitleRow}>
              <div>
                <h3 className={styles.activeTitle}>{activeStep.title}</h3>
                <p className={styles.activeDesc}>{activeStep.desc}</p>
              </div>

              <strong className={styles.activePercent}>
                {activePercent === null ? '…' : `${activePercent}%`}
              </strong>
            </div>

            <div className={styles.progressMeta}>
              <span>
                {isByteStep
                  ? (activeStep.key === 'images' ? 'Uploading images' : 'Uploading video')
                  : 'Processing'}
              </span>
              <strong>{isByteStep ? formatSpeed(activeSpeed) : '…'}</strong>
            </div>

            <div className={styles.track}>
              <div
                className={`${styles.fill} ${activePercent === null ? styles.fillIndeterminate : ''}`}
                style={activePercent === null ? undefined : { width: `${activePercent}%` }}
              />
            </div>
          </div>
        </section>

        <div className={styles.footerRow}>
          <div className={styles.currentStatusGroup}>
            <span>
              <strong>Current step</strong>
              {activeIndex + 1} of {STEPS.length}
            </span>

            {isUploadingImages && (
              <span className={`${styles.imageCountInline} ${styles.imageUploadPulsing}`}>
                <strong>Images uploaded</strong>
                {stats.imagesDoneCount} / {stats.imagesTotalCount}
              </span>
            )}
            {isUploadingVideo && (
              <span className={styles.imageCountInline}>
                <strong>Video uploaded</strong>
                {stats.videoDoneCount} / {stats.videoTotalCount}
              </span>
            )}
          </div>

          <span>
            <strong>Overall progress</strong>
            {overallPercent}% complete
          </span>

          <span className={styles.badge}>
            {activeIndex + 1} / {STEPS.length}
          </span>
        </div>

        <div className={styles.typewriterWrap}>
          <div className={styles.typewriterAlt} aria-hidden="true">
            <div className={styles.slide}>
              <i />
            </div>
            <div className={styles.paper} />
            <div className={styles.keyboard} />
          </div>

          <p className={styles.typewriterCaption}>
            Putting your property out there
            <span className={styles.cursor}>...</span>
          </p>
        </div>
      </div>
    </div>
  );
}