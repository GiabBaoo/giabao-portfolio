import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  CONTACT_FIELD_LIMITS,
  apiErrorResponseSchema,
  contactSubmissionSchema,
  contactSuccessResponseSchema,
  healthResponseSchema,
} from "./index";

describe("Zod CSP-safe configuration", () => {
  it("bật chế độ jitless toàn cục để không gọi new Function / eval dưới CSP nghiêm ngặt", () => {
    expect(z.config().jitless).toBe(true);
  });
});

describe("healthResponseSchema", () => {
  it("chấp nhận payload health hợp lệ theo response envelope thống nhất", () => {
    const payload = {
      ok: true as const,
      data: {
        status: "healthy" as const,
        database: "connected" as const,
      },
    };

    const result = healthResponseSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(payload);
    }
  });

  it("từ chối payload health sai cấu trúc hoặc sai trạng thái", () => {
    const invalidPayload = {
      ok: false,
      data: {
        status: "unknown",
        database: "offline",
      },
    };

    const result = healthResponseSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });
});

describe("apiErrorResponseSchema & contactSuccessResponseSchema", () => {
  it("chấp nhận phản hồi thành công và lỗi đúng contract", () => {
    expect(contactSuccessResponseSchema.safeParse({ ok: true }).success).toBe(true);

    const err = apiErrorResponseSchema.safeParse({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Dữ liệu không hợp lệ",
        fields: { email: "Địa chỉ email không đúng định dạng" },
      },
    });
    expect(err.success).toBe(true);
  });
});

describe("contactSubmissionSchema", () => {
  const validPayload = {
    name: "  Nguyễn Gia Bảo  ",
    email: "  recruiter@example.com  ",
    subject: "  Backend Developer Role  ",
    message: "  Xin chào, tôi muốn trao đổi về vị trí Backend Developer.  ",
    locale: "vi" as const,
    turnstileToken: "  test-turnstile-token-123  ",
  };

  it("chấp nhận và trim dữ liệu hợp lệ", () => {
    const result = contactSubmissionSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        name: "Nguyễn Gia Bảo",
        email: "recruiter@example.com",
        subject: "Backend Developer Role",
        message: "Xin chào, tôi muốn trao đổi về vị trí Backend Developer.",
        locale: "vi",
        turnstileToken: "test-turnstile-token-123",
      });
    }
  });

  it("cho phép bỏ qua subject và chuẩn hóa subject chỉ gồm khoảng trắng thành undefined", () => {
    const withoutSubject = contactSubmissionSchema.safeParse({
      name: "Jane Doe",
      email: "jane@example.com",
      message: "Hello, this is a valid contact message.",
      locale: "en",
      turnstileToken: "valid-token",
    });
    expect(withoutSubject.success).toBe(true);
    if (withoutSubject.success) {
      expect(withoutSubject.data.subject).toBeUndefined();
    }

    const blankSubject = contactSubmissionSchema.safeParse({
      ...validPayload,
      subject: "     ",
    });
    expect(blankSubject.success).toBe(true);
    if (blankSubject.success) {
      expect(blankSubject.data.subject).toBeUndefined();
    }
  });

  it("giữ nguyên trường honeypot website (không strip và không báo lỗi khi có nội dung)", () => {
    const withEmptyWebsite = contactSubmissionSchema.safeParse({
      ...validPayload,
      website: "",
    });
    expect(withEmptyWebsite.success).toBe(true);
    if (withEmptyWebsite.success) {
      expect(withEmptyWebsite.data.website).toBe("");
    }

    const withBotWebsite = contactSubmissionSchema.safeParse({
      ...validPayload,
      website: "https://spam-bot.example.com/" + "a".repeat(300),
    });
    expect(withBotWebsite.success).toBe(true);
    if (withBotWebsite.success) {
      expect(withBotWebsite.data.website).toBe("https://spam-bot.example.com/" + "a".repeat(300));
    }
  });

  it("từ chối khi thiếu turnstileToken, toàn khoảng trắng hoặc vượt quá 2048 ký tự", () => {
    expect(
      contactSubmissionSchema.safeParse({
        name: "Jane Doe",
        email: "jane@example.com",
        message: "Hello, this is a valid contact message.",
        locale: "en",
      }).success,
    ).toBe(false);
    expect(
      contactSubmissionSchema.safeParse({ ...validPayload, turnstileToken: "   " }).success,
    ).toBe(false);
    expect(
      contactSubmissionSchema.safeParse({
        ...validPayload,
        turnstileToken: "t".repeat(CONTACT_FIELD_LIMITS.turnstileTokenMax + 1),
      }).success,
    ).toBe(false);
  });

  it("loại bỏ các trường lạ không nằm trong schema", () => {
    const result = contactSubmissionSchema.safeParse({
      ...validPayload,
      role: "admin",
      status: "read",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect("role" in result.data).toBe(false);
      expect("status" in result.data).toBe(false);
    }
  });

  it("từ chối name rỗng, toàn khoảng trắng hoặc vượt quá 100 ký tự", () => {
    expect(contactSubmissionSchema.safeParse({ ...validPayload, name: "" }).success).toBe(false);
    expect(contactSubmissionSchema.safeParse({ ...validPayload, name: "   " }).success).toBe(false);
    expect(
      contactSubmissionSchema.safeParse({
        ...validPayload,
        name: "a".repeat(CONTACT_FIELD_LIMITS.nameMax + 1),
      }).success,
    ).toBe(false);
  });

  it("từ chối email sai định dạng hoặc vượt quá 254 ký tự", () => {
    expect(
      contactSubmissionSchema.safeParse({ ...validPayload, email: "invalid-email" }).success,
    ).toBe(false);
    expect(contactSubmissionSchema.safeParse({ ...validPayload, email: "   " }).success).toBe(
      false,
    );
    const longEmail = `${"a".repeat(245)}@example.com`;
    expect(longEmail.length).toBeGreaterThan(CONTACT_FIELD_LIMITS.emailMax);
    expect(contactSubmissionSchema.safeParse({ ...validPayload, email: longEmail }).success).toBe(
      false,
    );
  });

  it("từ chối subject vượt quá 150 ký tự", () => {
    expect(
      contactSubmissionSchema.safeParse({
        ...validPayload,
        subject: "s".repeat(CONTACT_FIELD_LIMITS.subjectMax + 1),
      }).success,
    ).toBe(false);
  });

  it("từ chối message quá ngắn (<10) hoặc quá dài (>5000)", () => {
    expect(
      contactSubmissionSchema.safeParse({ ...validPayload, message: "Ngắn quá" }).success,
    ).toBe(false);
    expect(
      contactSubmissionSchema.safeParse({ ...validPayload, message: "         " }).success,
    ).toBe(false);
    expect(
      contactSubmissionSchema.safeParse({
        ...validPayload,
        message: "m".repeat(CONTACT_FIELD_LIMITS.messageMax + 1),
      }).success,
    ).toBe(false);
  });

  it("từ chối locale ngoài 'en' | 'vi' và dữ liệu sai kiểu", () => {
    expect(contactSubmissionSchema.safeParse({ ...validPayload, locale: "fr" }).success).toBe(
      false,
    );
    expect(
      contactSubmissionSchema.safeParse({
        name: 123,
        email: true,
        subject: ["array"],
        message: null,
        locale: 1,
      }).success,
    ).toBe(false);
  });
});
