import { describe, it, expect } from "vitest";
import { parseGeocodeResponse } from "./geocode";

const BASEL_RESULT = {
  status: "OK",
  results: [
    {
      formatted_address: "Musterstrasse 1, 4051 Basel, Schweiz",
      geometry: { location_type: "ROOFTOP" },
      address_components: [
        { long_name: "1", types: ["street_number"] },
        { long_name: "Musterstrasse", types: ["route"] },
        { long_name: "Basel", types: ["locality", "political"] },
        { long_name: "Basel-Stadt", types: ["administrative_area_level_1", "political"] },
        { long_name: "4051", types: ["postal_code"] },
      ],
    },
  ],
};

describe("parseGeocodeResponse", () => {
  it("extracts address, canton, postal code and locality", () => {
    const g = parseGeocodeResponse(BASEL_RESULT);
    expect(g).not.toBeNull();
    expect(g!.formattedAddress).toBe("Musterstrasse 1, 4051 Basel, Schweiz");
    expect(g!.canton).toBe("Basel-Stadt");
    expect(g!.postalCode).toBe("4051");
    expect(g!.locality).toBe("Basel");
    expect(g!.precise).toBe(true);
  });

  it("marks approximate hits as not precise", () => {
    const g = parseGeocodeResponse({
      status: "OK",
      results: [
        {
          formatted_address: "Basel, Schweiz",
          geometry: { location_type: "APPROXIMATE" },
          address_components: [
            { long_name: "Basel-Stadt", types: ["administrative_area_level_1"] },
          ],
        },
      ],
    });
    expect(g!.precise).toBe(false);
    expect(g!.canton).toBe("Basel-Stadt");
  });

  it("returns null for ZERO_RESULTS or malformed bodies", () => {
    expect(parseGeocodeResponse({ status: "ZERO_RESULTS", results: [] })).toBeNull();
    expect(parseGeocodeResponse({})).toBeNull();
    expect(parseGeocodeResponse({ status: "OK", results: [{}] })).toBeNull();
  });

  it("treats partial matches as not precise", () => {
    const g = parseGeocodeResponse({
      status: "OK",
      results: [
        {
          formatted_address: "Irgendwo 1, Schweiz",
          partial_match: true,
          geometry: { location_type: "ROOFTOP" },
          address_components: [],
        },
      ],
    });
    expect(g!.precise).toBe(false);
    expect(g!.canton).toBeNull();
  });
});
