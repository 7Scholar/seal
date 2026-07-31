import { describe, expect, it } from "vitest";
import { explain } from "./errors";

describe("explain", () => {
  it("names the action, the file, and a plain-language cause", () => {
    const message = explain("open .env.production", {
      kind: "absent",
      path: "/repo/config/.env.production",
    });
    expect(message).toContain("Could not open .env.production");
    expect(message).toContain(".env.production");
    expect(message).toContain("moved or deleted");
  });

  it("says nothing was changed on a wrong password", () => {
    const message = explain("seal the file", { kind: "wrongPassphrase", path: null });
    expect(message).toMatch(/Nothing was changed/);
  });

  it("explains a refused unknown key as protection, not as a fault", () => {
    const message = explain("save the changes", { kind: "unknownKey", path: null });
    expect(message).toMatch(/refused rather than silently adding/);
  });

  it("covers every error kind the boundary can produce", () => {
    const kinds = [
      "locked",
      "wrongPassphrase",
      "notOpen",
      "notManaged",
      "alreadySealed",
      "notSealed",
      "absent",
      "busy",
      "damaged",
      "symlinkTarget",
      "unknownKey",
      "notAnEnvFile",
      "notAcknowledged",
      "notEstablished",
      "alreadyEstablished",
      "rekeyInFlight",
      "noRekey",
      "io",
      "registry",
    ];
    for (const kind of kinds) {
      const message = explain("do the thing", { kind, path: null });
      expect(message).not.toMatch(/unexpected/i);
    }
  });

  it("falls back to a safe generic message for anything unrecognised", () => {
    const message = explain("do the thing", new Error("ENOENT: no such file"));
    expect(message).toContain("Could not do the thing");
    expect(message).not.toContain("ENOENT");
  });
});
