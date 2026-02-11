/**
 * Camera Service
 * Wraps @capacitor/camera for native photo capture and gallery picking.
 * No-ops on web.
 */

import { isNative } from '../utils/platform';

let Camera = null;
let CameraResultType = null;
let CameraSource = null;

async function getCamera() {
  if (!Camera) {
    const mod = await import('@capacitor/camera');
    Camera = mod.Camera;
    CameraResultType = mod.CameraResultType;
    CameraSource = mod.CameraSource;
  }
  return { Camera, CameraResultType, CameraSource };
}

/**
 * Convert a data URL to a File object
 */
function dataUrlToFile(dataUrl, fileName) {
  const [header, data] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)[1];
  const binary = atob(data);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new File([array], fileName, { type: mime });
}

/**
 * Take a photo with the native camera
 * @returns {Promise<{ dataUrl: string, blob: Blob, file: File } | null>}
 */
export async function takePhoto() {
  if (!isNative) return null;
  try {
    const { Camera, CameraResultType, CameraSource } = await getCamera();
    const image = await Camera.getPhoto({
      quality: 80,
      width: 1920,
      allowEditing: true,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
    });

    const dataUrl = image.dataUrl;
    const file = dataUrlToFile(dataUrl, `photo_${Date.now()}.${image.format || 'jpeg'}`);
    const blob = file.slice(0, file.size, file.type);

    return { dataUrl, blob, file };
  } catch (err) {
    // User cancelled or permission denied
    if (err?.message?.includes('cancelled') || err?.message?.includes('User cancelled')) {
      return null;
    }
    console.error('Camera takePhoto error:', err);
    return null;
  }
}

/**
 * Pick a photo from the device gallery
 * @returns {Promise<{ dataUrl: string, blob: Blob, file: File } | null>}
 */
export async function pickFromGallery() {
  if (!isNative) return null;
  try {
    const { Camera, CameraResultType, CameraSource } = await getCamera();
    const image = await Camera.getPhoto({
      quality: 80,
      width: 1920,
      allowEditing: true,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos,
    });

    const dataUrl = image.dataUrl;
    const file = dataUrlToFile(dataUrl, `gallery_${Date.now()}.${image.format || 'jpeg'}`);
    const blob = file.slice(0, file.size, file.type);

    return { dataUrl, blob, file };
  } catch (err) {
    if (err?.message?.includes('cancelled') || err?.message?.includes('User cancelled')) {
      return null;
    }
    console.error('Camera pickFromGallery error:', err);
    return null;
  }
}
