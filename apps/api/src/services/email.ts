export interface ContactEmailPayload {
    name: string;
    email: string;
    subject?: string;
    message: string;
    locale?: string;
}

const OWNER_EMAIL = "truyennguyen744@gmail.com";

export async function sendContactNotificationEmail(
    apiKey: string | undefined,
    data: ContactEmailPayload,
): Promise<void> {
    // Bỏ qua khi chạy test/local nếu chưa cấu hình RESEND_API_KEY
    if (!apiKey || apiKey.trim().length === 0) {
        return;
    }

    const cleanSubject = data.subject?.trim()
        ? `[Portfolio] ${data.subject.trim()}`
        : `[Portfolio] Tin nhắn mới từ ${data.name}`;

    const textBody = [
        "Bạn vừa nhận được tin nhắn mới từ trang Portfolio:",
        "",
        `• Họ và tên: ${data.name}`,
        `• Email: ${data.email}`,
        `• Tiêu đề: ${data.subject?.trim() || "(Không có tiêu đề)"}`,
        `• Ngôn ngữ trang: ${data.locale ?? "vi"}`,
        "",
        "--- Nội dung tin nhắn ---",
        data.message,
    ].join("\n");

    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from: "Portfolio Contact <onboarding@resend.dev>",
            to: [OWNER_EMAIL],
            reply_to: data.email,
            subject: cleanSubject,
            text: textBody,
        }),
    });

    if (!response.ok) {
        const errorDetail = await response.text().catch(() => "");
        console.error(`[api] contact_email_failed status=${response.status} ${errorDetail}`);
    }
}