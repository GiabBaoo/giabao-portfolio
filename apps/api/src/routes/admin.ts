import { Hono } from "hono";
import { portfolioContentSchema } from "@giabao-portfolio/shared";
import type { AppBindings } from "../env.ts";
import { adminAccessMiddleware } from "../middleware/admin-access.ts";
import { ApiError } from "../middleware/error-handler.ts";

const AVATAR_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_CV_BYTES = 10 * 1024 * 1024; // 10 MB

export const adminRoute = new Hono<{ Bindings: AppBindings }>();

adminRoute.use("*", adminAccessMiddleware);

adminRoute.get("/session", (c) => {
    return c.json({ ok: true }, 200);
});
// Cập nhật toàn bộ nội dung Portfolio theo ngôn ngữ (vi hoặc en)
adminRoute.put("/portfolio/:locale", async (c) => {
    const locale = c.req.param("locale");
    if (locale !== "vi" && locale !== "en") {
        throw new ApiError(400, "VALIDATION_ERROR", "Ngôn ngữ phải là 'vi' hoặc 'en'");
    }

    let body: unknown;
    try {
        body = await c.req.json();
    } catch {
        throw new ApiError(400, "VALIDATION_ERROR", "Dữ liệu JSON không hợp lệ");
    }

    const parsed = portfolioContentSchema.safeParse(body);
    if (!parsed.success) {
        throw new ApiError(400, "VALIDATION_ERROR", "Dữ liệu nội dung không hợp lệ");
    }

    const updatedAt = new Date().toISOString();
    const adminEmail = (c.get("adminEmail" as never) as string | undefined) ?? "admin";

    await c.env.DB.prepare(
        `INSERT INTO portfolio_contents (locale, content_json, updated_at, updated_by)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(locale) DO UPDATE SET
       content_json = excluded.content_json,
       updated_at = excluded.updated_at,
       updated_by = excluded.updated_by`,
    )
        .bind(locale, JSON.stringify(parsed.data), updatedAt, adminEmail)
        .run();

    return c.json({ ok: true, locale, updatedAt }, 200);
});

// Upload ảnh đại diện (avatar) hoặc file CV (cv) lên Cloudflare R2
adminRoute.post("/media", async (c) => {
    if (!c.env.MEDIA_BUCKET) {
        throw new ApiError(503, "SERVICE_UNAVAILABLE", "Chưa cấu hình R2 Storage");
    }

    const formData = await c.req.parseBody();
    const assetType = formData.type;
    const uploadedFile = formData.file;

    if (assetType !== "avatar" && assetType !== "cv") {
        throw new ApiError(400, "VALIDATION_ERROR", "Loại tệp phải là 'avatar' hoặc 'cv'");
    }

    if (!(uploadedFile instanceof File)) {
        throw new ApiError(400, "VALIDATION_ERROR", "Vui lòng chọn tệp tin hợp lệ để tải lên");
    }

    if (assetType === "avatar") {
        if (!AVATAR_MIME_TYPES.has(uploadedFile.type)) {
            throw new ApiError(400, "VALIDATION_ERROR", "Ảnh đại diện chỉ hỗ trợ JPG, PNG hoặc WebP");
        }
        if (uploadedFile.size > MAX_AVATAR_BYTES) {
            throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Ảnh đại diện tối đa 5 MB");
        }
    } else {
        if (uploadedFile.type !== "application/pdf") {
            throw new ApiError(400, "VALIDATION_ERROR", "CV chỉ hỗ trợ định dạng PDF");
        }
        if (uploadedFile.size > MAX_CV_BYTES) {
            throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Tệp CV tối đa 10 MB");
        }
    }

    const existing = await c.env.DB.prepare(
        "SELECT r2_key FROM media_assets WHERE asset_type = ?",
    )
        .bind(assetType)
        .first<{ r2_key: string }>();

    const sanitizedName = uploadedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const newR2Key = `${assetType}/${Date.now()}-${sanitizedName}`;
    const fileBuffer = await uploadedFile.arrayBuffer();

    await c.env.MEDIA_BUCKET.put(newR2Key, fileBuffer, {
        httpMetadata: {
            contentType: uploadedFile.type,
        },
    });

    const updatedAt = new Date().toISOString();

    await c.env.DB.prepare(
        `INSERT INTO media_assets (asset_type, r2_key, original_name, mime_type, size_bytes, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(asset_type) DO UPDATE SET
       r2_key = excluded.r2_key,
       original_name = excluded.original_name,
       mime_type = excluded.mime_type,
       size_bytes = excluded.size_bytes,
       updated_at = excluded.updated_at`,
    )
        .bind(assetType, newR2Key, uploadedFile.name, uploadedFile.type, uploadedFile.size, updatedAt)
        .run();

    if (existing?.r2_key && existing.r2_key !== newR2Key) {
        await c.env.MEDIA_BUCKET.delete(existing.r2_key).catch(() => { });
    }

    return c.json(
        {
            ok: true,
            media: {
                assetType,
                url: `/api/media/${assetType}?v=${encodeURIComponent(updatedAt)}`,
                originalName: uploadedFile.name,
                mimeType: uploadedFile.type,
                sizeBytes: uploadedFile.size,
                updatedAt,
            },
        },
        200,
    );
});

// Xóa ảnh đại diện hoặc CV đã tải lên
adminRoute.delete("/media/:type", async (c) => {
    const assetType = c.req.param("type");
    if (assetType !== "avatar" && assetType !== "cv") {
        throw new ApiError(400, "VALIDATION_ERROR", "Loại tệp không hợp lệ");
    }

    const existing = await c.env.DB.prepare(
        "SELECT r2_key FROM media_assets WHERE asset_type = ?",
    )
        .bind(assetType)
        .first<{ r2_key: string }>();

    if (existing?.r2_key && c.env.MEDIA_BUCKET) {
        await c.env.MEDIA_BUCKET.delete(existing.r2_key).catch(() => { });
    }

    await c.env.DB.prepare("DELETE FROM media_assets WHERE asset_type = ?").bind(assetType).run();

    return c.json({ ok: true }, 200);
});