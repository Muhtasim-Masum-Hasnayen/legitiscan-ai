import { describe, expect, it } from "vitest";
import { DEFAULT_LIMITS, validateFiles } from "./validation";

const f = (name: string, type: string, size = 1000, lastModified = 1) => {
  const file = new File([new Uint8Array(size)], name, { type, lastModified });
  return file;
};

describe("validateFiles", () => {
  it("accepts supported images", () => {
    const r = validateFiles([], [f("a.jpg", "image/jpeg"), f("b.png", "image/png"), f("c.webp", "image/webp")]);
    expect(r.accepted).toHaveLength(3);
    expect(r.errors).toEqual([]);
  });

  it("rejects unsupported types", () => {
    const r = validateFiles([], [f("a.gif", "image/gif"), f("doc.pdf", "application/pdf")]);
    expect(r.accepted).toHaveLength(0);
    expect(r.errors).toHaveLength(2);
  });

  it("falls back to the extension when the browser gives no MIME type", () => {
    expect(validateFiles([], [f("photo.JPG", "")]).accepted).toHaveLength(1);
    expect(validateFiles([], [f("photo.txt", "")]).accepted).toHaveLength(0);
  });

  it("rejects empty and oversized files", () => {
    const r = validateFiles([], [f("e.jpg", "image/jpeg", 0), f("big.jpg", "image/jpeg", DEFAULT_LIMITS.maxBytes + 1)]);
    expect(r.accepted).toHaveLength(0);
    expect(r.errors).toHaveLength(2);
  });

  it("enforces the max file count", () => {
    const existing = [f("1.jpg", "image/jpeg", 10, 1), f("2.jpg", "image/jpeg", 10, 2)];
    const r = validateFiles(existing, [f("3.jpg", "image/jpeg", 10, 3), f("4.jpg", "image/jpeg", 10, 4)]);
    expect(r.accepted).toHaveLength(1);
    expect(r.errors[0]).toMatch(/up to 3/);
  });

  it("skips duplicates", () => {
    const a = f("a.jpg", "image/jpeg");
    const r = validateFiles([a], [f("a.jpg", "image/jpeg")]);
    expect(r.accepted).toHaveLength(0);
    expect(r.errors[0]).toMatch(/already added/);
  });
});
