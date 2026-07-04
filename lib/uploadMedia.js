async function getSignature(folder) {
  console.log('[sign] requesting signature for folder:', folder);
  const res = await fetch('/api/cloudinary-sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder }),
  });
  console.log('[sign] response status:', res.status);
  if (!res.ok) throw new Error('Failed to get upload signature');
  const data = await res.json();
  console.log('[sign] signature received:', data);
  return data;
}

async function uploadFile(file, resourceType, folder) {
  console.log('[upload] starting upload:', file.name, resourceType, folder);
  const sign = await getSignature(folder);

  const fd = new FormData();
  fd.append('file', file);
  fd.append('api_key', sign.api_key);
  fd.append('timestamp', sign.timestamp);
  fd.append('signature', sign.signature);
  fd.append('folder', folder);

  console.log('[upload] hitting cloudinary...');
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${sign.cloud_name}/${resourceType}/upload`,
    { method: 'POST', body: fd }
  );
  console.log('[upload] cloudinary response status:', res.status);
  if (!res.ok) throw new Error(`Cloudinary upload failed for ${file.name}`);
  const data = await res.json();
  console.log('[upload] done:', data.public_id);
  return {
    cloudinary_url:       data.secure_url,
    cloudinary_public_id: data.public_id,
    resource_type:        resourceType,
  };
}

function simulateProgress(fromPercent, toPercent, stage, onProgress, intervalMs = 120) {
  console.log('[progress] simulating:', stage, fromPercent, '→', toPercent);
  let current = fromPercent;
  const ceiling = toPercent - 2;
  const id = setInterval(() => {
    if (current >= ceiling) { clearInterval(id); return; }
    current = Math.min(current + 1, ceiling);
    onProgress({ stage, percent: current });
  }, intervalMs);
  return () => {
    console.log('[progress] stopped simulation at:', current, 'for stage:', stage);
    clearInterval(id);
  };
}

export async function uploadListingMedia(listingId, images, video, onProgress) {
  console.log('[media] uploadListingMedia called, listingId:', listingId, 'images:', images.length, 'hasVideo:', !!video);
  const folder = `pedu-rentals/listings/${listingId}`;
  const media = [];
  const hasVideo = !!video;

  const imgEnd = hasVideo ? 40 : 60;
  const vidEnd = 60;
  const refEnd = 75;

  // ── Images ──
  console.log('[media] starting image uploads, imgEnd:', imgEnd);
  onProgress?.({ stage: 'Uploading Images', percent: 0 });

  const perImage = imgEnd / images.length;

  for (let i = 0; i < images.length; i++) {
    const fromPercent = Math.round(i * perImage);
    const toPercent   = Math.round((i + 1) * perImage);
    console.log(`[media] image ${i + 1}/${images.length}, percent range: ${fromPercent} → ${toPercent}`);

    const stop = simulateProgress(fromPercent, toPercent, 'Uploading Images', onProgress);
    const result = await uploadFile(images[i], 'image', `${folder}/images`);
    stop();

    onProgress?.({ stage: 'Uploading Images', percent: toPercent });
    console.log(`[media] image ${i + 1} complete, snapped to ${toPercent}%`);
    media.push({ ...result, position: i + 1 });
  }

  // ── Video ──
  if (hasVideo) {
    console.log('[media] starting video upload, percent range:', imgEnd, '→', vidEnd);
    onProgress?.({ stage: 'Uploading Video', percent: imgEnd });
    const stop = simulateProgress(imgEnd, vidEnd, 'Uploading Video', onProgress);
    const result = await uploadFile(video, 'video', `${folder}/videos`);
    stop();
    onProgress?.({ stage: 'Uploading Video', percent: vidEnd });
    console.log('[media] video upload complete, snapped to', vidEnd + '%');
    media.push({ ...result, position: 0 });
  }

  // ── Generating Reference ──
  const refStart = hasVideo ? vidEnd : imgEnd;
  console.log('[media] generating reference, percent range:', refStart, '→', refEnd);
  onProgress?.({ stage: 'Generating Reference', percent: refStart });
  await new Promise(r => setTimeout(r, 600));
  onProgress?.({ stage: 'Generating Reference', percent: refEnd });
  console.log('[media] reference complete, at', refEnd + '%');

  // ── Signal Uploading Data entry ──
  console.log('[media] signalling Uploading Data entry at', refEnd + '%');
  onProgress?.({ stage: 'Uploading Data', percent: refEnd });

  console.log('[media] returning media array, length:', media.length);
  return media;
}