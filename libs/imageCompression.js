import imageCompression from 'browser-image-compression';

/**
 * Compress an image file before upload
 * @param {File} file - The image file to compress
 * @param {Object} options - Override default compression options
 * @returns {Promise<File>} - Compressed image file
 */
export async function compressImage(file, options = {}) {
  const defaultOptions = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  };

  try {
    const compressedFile = await imageCompression(file, { ...defaultOptions, ...options });
    return compressedFile;
  } catch (error) {
    console.error('Image compression failed:', error);
    return file; // Return original if compression fails
  }
}

/**
 * Compress multiple image files
 * @param {File[]} files - Array of image files to compress
 * @param {Object} options - Override default compression options
 * @returns {Promise<File[]>} - Array of compressed image files
 */
export async function compressImages(files, options = {}) {
  return Promise.all(files.map(file => compressImage(file, options)));
}
