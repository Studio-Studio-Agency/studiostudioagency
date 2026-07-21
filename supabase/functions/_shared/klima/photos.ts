/**
 * Raum-Foto-Uploads: Marker-Format zwischen Chat-UI und Edge-Function.
 *
 * Der Client lädt das Bild direkt in den privaten Storage-Bucket
 * `klima-photos` (Pfad: `<sessionId>/<datei>`) und sendet danach eine
 * Chat-Nachricht mit diesem Marker. Die Edge-Function erkennt den Marker
 * deterministisch (kein LLM nötig), hängt den Pfad an `qualification.photos`
 * an und ersetzt den Nachrichtentext für Modell und Transkript.
 *
 * ⚠️  Diese Datei ist 1:1 gespiegelt unter
 *     supabase/functions/_shared/klima/photos.ts — beide synchron halten.
 */

const MARKER_PREFIX = "[KLIMA_FOTO:";
const MARKER_SUFFIX = "]";

export const PHOTO_BUCKET = "klima-photos";
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // muss zum Bucket-Limit passen
export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export function buildPhotoMarker(path: string): string {
  return `${MARKER_PREFIX}${path}${MARKER_SUFFIX}`;
}

/** Extrahiert den Storage-Pfad aus einer Marker-Nachricht, sonst null. */
export function parsePhotoMarker(message: string): string | null {
  const trimmed = message.trim();
  if (!trimmed.startsWith(MARKER_PREFIX) || !trimmed.endsWith(MARKER_SUFFIX)) return null;
  const path = trimmed.slice(MARKER_PREFIX.length, -MARKER_SUFFIX.length).trim();
  return path.length > 0 ? path : null;
}

/**
 * Ein Pfad ist nur gültig, wenn er zur eigenen Session gehört (verhindert,
 * dass fremde Uploads einem Lead zugeordnet werden) und harmlos aufgebaut ist.
 */
export function isValidPhotoPath(path: string, sessionId: string): boolean {
  if (!path.startsWith(`${sessionId}/`)) return false;
  if (path.includes("..") || path.includes("//") || path.length > 300) return false;
  return /^[A-Za-z0-9_\-./]+$/.test(path);
}
