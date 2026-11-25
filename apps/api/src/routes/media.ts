import { Hono } from "hono";
import type { AppBindings } from "../env.ts";
import { ApiError } from "../middleware/error-handler.ts";

interface MediaRow {
    r2_key: string;
    original_name: string;
    mime_type: string;
}

export const mediaRoute = new Hono<{ Bindings: AppBindings }>();

mediaRoute.get("/:type", async (c) => {
    const assetType = c.req.param("type");
    if (assetType !== "avatar" && assetType !== "cv") {
        throw new ApiError(404, "NOT_FOUND", "Tài nguyên không tồn tại");
    }

    if (!c.env.MEDIA_BUCKET) {
        throw new ApiError(503, "SERVICE_UNAVAILABLE", "Chưa cấu hình R2 Storage");
    }

    const row = await c.env.DB.prepare(
        "SELECT r2_key, original_name, mime_type FROM media_assets WHERE asset_type = ?",
    )
        .bind(assetType)
        .first<MediaRow>();

    if (!row) {
        throw new ApiError(404, "NOT_FOUND", "Chưa có tệp tin được tải lên");
    }

    const object = await c.env.MEDIA_BUCKET.get(row.r2_key);
    if (!object) {
        throw new ApiError(404, "NOT_FOUND", "Không tìm thấy tệp tin trên R2");
    }

    const headers = new Headers();
    headers.set("Content-Type", row.mime_type);
    headers.set("Cache-Control", "public, max-age=3600");

    const isDownload = c.req.query("download") === "1";
    const safeFilename = encodeURIComponent(row.original_name);
    const disposition = isDownload ? "attachment" : "inline";
    headers.set("Content-Disposition", `${disposition}; filename*=UTF-8''${safeFilename}`);

    return new Response(object.body, {
        status: 200,
        headers,
    });
});
