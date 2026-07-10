import { describe, it, expect } from "vitest";
import { getAuthUrl } from "./auth-url";

describe("getAuthUrl", () => {
  it("arma la URL de consentimiento con los scopes y flags de refresh token", () => {
    const url = getAuthUrl({
      clientId: "abc123.apps.googleusercontent.com",
      redirectUri: "http://localhost:3000/api/auth/google/callback",
    });
    expect(url).toContain("https://accounts.google.com/o/oauth2/v2/auth?");
    expect(url).toContain("client_id=abc123.apps.googleusercontent.com");
    expect(url).toContain(
      "redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fauth%2Fgoogle%2Fcallback",
    );
    expect(url).toContain("response_type=code");
    expect(url).toContain("access_type=offline");
    expect(url).toContain("prompt=consent");
    expect(url).toContain("scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.events");
  });
});
