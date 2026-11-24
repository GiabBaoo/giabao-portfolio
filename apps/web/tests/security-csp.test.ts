import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = process.cwd();

describe("CSP & static security headers (_headers)", () => {
  it("matches the exact SHA-256 hash of the inline anti-FOUC script without unsafe-inline in script-src", () => {
    const indexHtml = readFileSync(resolve(webRoot, "index.html"), "utf8");
    const headersFile = readFileSync(resolve(webRoot, "public/_headers"), "utf8");

    const scriptMatch = indexHtml.match(/<script>([\s\S]*?)<\/script>/);
    expect(scriptMatch).not.toBeNull();

    const expectedHash = `sha256-${createHash("sha256").update(scriptMatch![1]!).digest("base64")}`;
    const cspLine = headersFile
      .split(/\r?\n/)
      .find((line) => line.trim().startsWith("Content-Security-Policy:"));

    expect(cspLine).toBeDefined();
    expect(cspLine).toContain(`'${expectedHash}'`);

    const scriptSrcMatch = cspLine!.match(/script-src\s+([^;]+)/);
    expect(scriptSrcMatch).not.toBeNull();
    expect(scriptSrcMatch![1]).not.toContain("unsafe-inline");
    expect(scriptSrcMatch![1]).not.toContain("unsafe-eval");
    expect(scriptSrcMatch![1]).toContain("https://challenges.cloudflare.com");

    expect(cspLine).toContain("frame-src https://challenges.cloudflare.com");
    expect(cspLine).toContain("font-src 'self'");
    expect(cspLine).not.toContain("fonts.gstatic.com");
    expect(cspLine).toContain("style-src 'self'");
    expect(cspLine).not.toContain("fonts.googleapis.com");
    expect(cspLine).toContain("frame-ancestors 'none'");
  });
});
