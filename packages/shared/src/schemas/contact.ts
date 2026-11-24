import "../zod-config";
import { z } from "zod";
import { apiSuccessResponseSchema } from "./api";

export const SUPPORTED_LOCALES = ["en", "vi"] as const;

export const CONTACT_FIELD_LIMITS = {
  nameMin: 1,
  nameMax: 100,
  emailMax: 254,
  subjectMax: 150,
  messageMin: 10,
  messageMax: 5000,
  turnstileTokenMax: 2048,
  userAgentMax: 512,
} as const;

export const CONTACT_BODY_LIMIT_BYTES = 10 * 1024;

export const localeSchema = z.enum(SUPPORTED_LOCALES, {
  error: "Ngôn ngữ chỉ chấp nhận 'en' hoặc 'vi'",
});

export const contactSubmissionSchema = z.object({
  name: z
    .string({ error: "Họ tên phải là chuỗi ký tự" })
    .trim()
    .min(CONTACT_FIELD_LIMITS.nameMin, { error: "Vui lòng nhập họ tên" })
    .max(CONTACT_FIELD_LIMITS.nameMax, {
      error: `Họ tên không được vượt quá ${CONTACT_FIELD_LIMITS.nameMax} ký tự`,
    }),
  email: z
    .string({ error: "Email phải là chuỗi ký tự" })
    .trim()
    .min(1, { error: "Vui lòng nhập địa chỉ email" })
    .max(CONTACT_FIELD_LIMITS.emailMax, {
      error: `Email không được vượt quá ${CONTACT_FIELD_LIMITS.emailMax} ký tự`,
    })
    .pipe(z.email({ error: "Địa chỉ email không đúng định dạng" })),
  subject: z
    .string({ error: "Tiêu đề phải là chuỗi ký tự" })
    .trim()
    .max(CONTACT_FIELD_LIMITS.subjectMax, {
      error: `Tiêu đề không được vượt quá ${CONTACT_FIELD_LIMITS.subjectMax} ký tự`,
    })
    .transform((value) => (value.length === 0 ? undefined : value))
    .optional(),
  message: z
    .string({ error: "Nội dung tin nhắn phải là chuỗi ký tự" })
    .trim()
    .min(CONTACT_FIELD_LIMITS.messageMin, {
      error: `Nội dung tin nhắn phải có ít nhất ${CONTACT_FIELD_LIMITS.messageMin} ký tự`,
    })
    .max(CONTACT_FIELD_LIMITS.messageMax, {
      error: `Nội dung tin nhắn không được vượt quá ${CONTACT_FIELD_LIMITS.messageMax} ký tự`,
    }),
  locale: localeSchema,
  turnstileToken: z
    .string({ error: "Mã xác thực chống bot phải là chuỗi ký tự" })
    .trim()
    .min(1, { error: "Vui lòng hoàn tất xác thực chống bot" })
    .max(CONTACT_FIELD_LIMITS.turnstileTokenMax, {
      error: "Mã xác thực chống bot không hợp lệ",
    }),
  // Trường honeypot chống bot: không đặt giới hạn độ dài để không trả lỗi validation cho bot
  website: z.string({ error: "Trường không hợp lệ" }).optional(),
});

export const contactSuccessResponseSchema = apiSuccessResponseSchema;

export type SupportedLocale = z.infer<typeof localeSchema>;
export type ContactSubmissionInput = z.input<typeof contactSubmissionSchema>;
export type ContactSubmission = z.output<typeof contactSubmissionSchema>;
export type ContactSuccessResponse = z.infer<typeof contactSuccessResponseSchema>;
