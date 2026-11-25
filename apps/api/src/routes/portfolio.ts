import { Hono } from "hono";
import type {
    MediaAssetInfo,
    PortfolioContentDTO,
    PortfolioPublicResponse,
} from "@giabao-portfolio/shared";
import type { AppBindings } from "../env.ts";

interface ContentRow {
    locale: "vi" | "en";
    content_json: string;
}

interface MediaAssetRow {
    asset_type: "avatar" | "cv";
    original_name: string;
    mime_type: string;
    size_bytes: number;
    updated_at: string;
}

export const portfolioRoute = new Hono<{ Bindings: AppBindings }>();

portfolioRoute.get("/", async (c) => {
    const [contentResult, mediaResult] = await Promise.all([
        c.env.DB.prepare("SELECT locale, content_json FROM portfolio_contents").all<ContentRow>(),
        c.env.DB.prepare(
            "SELECT asset_type, original_name, mime_type, size_bytes, updated_at FROM media_assets",
        ).all<MediaAssetRow>(),
    ]);

    const contentByLocale: PortfolioPublicResponse["contentByLocale"] = {
        vi: null,
        en: null,
    };

    for (const row of contentResult.results ?? []) {
        try {
            contentByLocale[row.locale] = JSON.parse(row.content_json) as PortfolioContentDTO;
        } catch {
            // Bỏ qua nếu JSON lỗi
        }
    }

    const media: PortfolioPublicResponse["media"] = {
        avatar: null,
        cv: null,
    };

    for (const item of mediaResult.results ?? []) {
        const versionParam = encodeURIComponent(item.updated_at);
        const info: MediaAssetInfo = {
            assetType: item.asset_type,
            url: `/api/media/${item.asset_type}?v=${versionParam}`,
            originalName: item.original_name,
            mimeType: item.mime_type,
            sizeBytes: item.size_bytes,
            updatedAt: item.updated_at,
        };
        media[item.asset_type] = info;
    }

    const payload: PortfolioPublicResponse = {
        ok: true,
        contentByLocale,
        media,
    };

    c.header("Cache-Control", "no-store");
    return c.json(payload, 200);
});