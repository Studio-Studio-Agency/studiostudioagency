import { describe, it, expect } from "vitest";
import { buildPhotoMarker, parsePhotoMarker, isValidPhotoPath } from "./photos";

describe("photo marker", () => {
  it("round-trips build → parse", () => {
    const path = "sess-1/1721570000_raum.jpg";
    expect(parsePhotoMarker(buildPhotoMarker(path))).toBe(path);
  });

  it("returns null for ordinary messages", () => {
    expect(parsePhotoMarker("Hallo, ich brauche eine Klimaanlage")).toBeNull();
    expect(parsePhotoMarker("")).toBeNull();
    expect(parsePhotoMarker("[KLIMA_FOTO:]")).toBeNull();
  });

  it("tolerates surrounding whitespace", () => {
    expect(parsePhotoMarker("  [KLIMA_FOTO:s/x.jpg]  ")).toBe("s/x.jpg");
  });
});

describe("isValidPhotoPath", () => {
  const SESSION = "sess-abc";

  it("accepts paths inside the own session folder", () => {
    expect(isValidPhotoPath("sess-abc/1721570000_wohnzimmer.jpg", SESSION)).toBe(true);
  });

  it("rejects foreign sessions and traversal attempts", () => {
    expect(isValidPhotoPath("andere-session/foto.jpg", SESSION)).toBe(false);
    expect(isValidPhotoPath("sess-abc/../andere/foto.jpg", SESSION)).toBe(false);
    expect(isValidPhotoPath("sess-abc//foto.jpg", SESSION)).toBe(false);
  });

  it("rejects strange characters and oversized paths", () => {
    expect(isValidPhotoPath("sess-abc/fo to.jpg", SESSION)).toBe(false);
    expect(isValidPhotoPath(`sess-abc/${"a".repeat(300)}.jpg`, SESSION)).toBe(false);
  });
});
