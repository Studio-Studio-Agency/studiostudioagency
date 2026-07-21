/**
 * Adressvalidierung via Google Geocoding API — reiner, testbarer Teil.
 *
 * Der eigentliche API-Aufruf lebt in der klima-chat Edge-Function (nur dort
 * gibt es den Key); hier stehen Typen und das Parsen der Antwort, damit die
 * Logik unter Vitest testbar ist.
 *
 * ⚠️  Diese Datei ist 1:1 gespiegelt unter
 *     supabase/functions/_shared/klima/geocode.ts — beide synchron halten.
 */

export interface GeocodeAddress {
  /** Normalisierte, vollständige Adresse (z. B. "Musterstrasse 1, 4051 Basel, Schweiz") */
  formattedAddress: string;
  /** Kanton (administrative_area_level_1), z. B. "Basel-Stadt" */
  canton: string | null;
  postalCode: string | null;
  locality: string | null;
  /** true nur bei präzisem Treffer (Hausnummer/Adresse, nicht bloss Ortsmitte) */
  precise: boolean;
}

interface AddressComponent {
  long_name?: string;
  types?: string[];
}

interface GeocodeResult {
  formatted_address?: string;
  address_components?: AddressComponent[];
  geometry?: { location_type?: string };
  partial_match?: boolean;
}

function component(result: GeocodeResult, type: string): string | null {
  const c = (result.address_components ?? []).find((x) => (x.types ?? []).includes(type));
  return c?.long_name?.trim() || null;
}

/**
 * Extrahiert die relevanten Felder aus einer Geocoding-API-Antwort.
 * Gibt null zurück, wenn kein brauchbares Resultat vorliegt.
 */
export function parseGeocodeResponse(body: {
  status?: string;
  results?: GeocodeResult[];
}): GeocodeAddress | null {
  if (body.status !== "OK") return null;
  const result = body.results?.[0];
  if (!result?.formatted_address) return null;

  const locationType = result.geometry?.location_type ?? "";
  return {
    formattedAddress: result.formatted_address,
    canton: component(result, "administrative_area_level_1"),
    postalCode: component(result, "postal_code"),
    locality: component(result, "locality"),
    precise:
      !result.partial_match &&
      (locationType === "ROOFTOP" || locationType === "RANGE_INTERPOLATED"),
  };
}
