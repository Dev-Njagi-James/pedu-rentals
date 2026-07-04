// lib/cloudinary.js
// Cloudinary upload utility — used by API routes only (server-side)
// Never import this in client components

import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name:  process.env.CLOUDINARY_CLOUD_NAME,
  api_key:     process.env.CLOUDINARY_API_KEY,
  api_secret:  process.env.CLOUDINARY_API_SECRET,
  secure:      true,
});

/**
 * Upload a File/Blob to Cloudinary and return its public_id and secure_url.
 * @param {File}   file
 * @param {'image'|'video'} resourceType
 * @param {string} folder  - e.g. 'pedu-rentals/listings/123/images'
 * @returns {{ public_id: string, secure_url: string }}
 */
export async function uploadToCloudinary(file, resourceType, folder) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,   // 'image' or 'video'
        folder,
        upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
        // No transformations — serve as-is to save credits on free tier
      },
      (error, result) => {
        if (error) return reject(new Error(`Cloudinary upload failed: ${error.message}`));
        resolve({ public_id: result.public_id, secure_url: result.secure_url });
      }
    );
    uploadStream.end(buffer);
  });
}

/**
 * Delete a file from Cloudinary by public_id.
 * Used for rollback on listing insert failure.
 * @param {string} publicId
 * @param {'image'|'video'} resourceType
 */
export async function deleteFromCloudinary(publicId, resourceType) {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch {
    // Non-fatal — log and continue
    console.error(`Failed to delete Cloudinary asset: ${publicId}`);
  }
}