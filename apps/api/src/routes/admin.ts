import { Hono } from "hono";
import { portfolioContentSchema, type PortfolioContentDTO } from "@giabao-portfolio/shared";
import type { AppBindings } from "../env.ts";
import { adminAccessMiddleware } from "../middleware/admin-access.ts";
import { ApiError } from "../middleware/error-handler.ts";

interface GitHubRepoItem {
    id: number;
    name: string;
    full_name: string;
    description: string | null;
    html_url: string;
    homepage: string | null;
    fork: boolean;
    language: string | null;
    topics?: string[];
}

type AdminProjectDTO = PortfolioContentDTO["projects"][number];

const AVATAR_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_CV_BYTES = 10 * 1024 * 1024; // 10 MB

const FEATURE_HEADING_REGEX =
    /(?:^|[^\p{L}\p{N}])(tính\s*năng|chức\s*năng|features?)(?:$|[^\p{L}\p{N}])/iu;

const VIETNAMESE_DIACRITIC_REGEX =
    /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

/** Translates Vietnamese text to English while leaving ASCII/non-Vietnamese text intact. */
export async function translateViToEn(text: string): Promise<string> {
    if (!text.trim() || !VIETNAMESE_DIACRITIC_REGEX.test(text)) {
        return text;
    }

    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=vi&tl=en&dt=t&q=${encodeURIComponent(text)}`;
        const response = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0" },
        });
        if (!response.ok) {
            return text;
        }

        const data = (await response.json()) as unknown;
        if (Array.isArray(data) && Array.isArray(data[0])) {
            const segments: string[] = [];
            for (const seg of data[0] as unknown[]) {
                if (Array.isArray(seg) && typeof seg[0] === "string") {
                    segments.push(seg[0]);
                }
            }
            const translated = segments.join("").trim();
            return translated || text;
        }

        return text;
    } catch {
        return text;
    }
}

async function translateProjectToEnglish(project: AdminProjectDTO): Promise<AdminProjectDTO> {
    const [translatedName, translatedDescription, translatedRole, translatedFeatures] =
        await Promise.all([
            translateViToEn(project.name),
            translateViToEn(project.description),
            project.role && project.role.trim().length > 0
                ? translateViToEn(project.role)
                : Promise.resolve(project.role),
            Promise.all(project.features.map((feature) => translateViToEn(feature))),
        ]);

    return {
        ...project,
        name: translatedName.slice(0, 200),
        description: translatedDescription.slice(0, 3000),
        role: translatedRole !== null ? translatedRole.slice(0, 200) : null,
        features: translatedFeatures.map((feature) => feature.slice(0, 1000)),
    };
}

async function upsertPortfolioContent(
    db: D1Database,
    locale: "vi" | "en",
    content: PortfolioContentDTO,
    updatedAt: string,
    adminEmail: string,
): Promise<void> {
    await db
        .prepare(
            `INSERT INTO portfolio_contents (locale, content_json, updated_at, updated_by)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(locale) DO UPDATE SET
       content_json = excluded.content_json,
       updated_at = excluded.updated_at,
       updated_by = excluded.updated_by`,
        )
        .bind(locale, JSON.stringify(content), updatedAt, adminEmail)
        .run();
}

function cleanInlineMarkdown(text: string): string {
    return text
        .replace(/\[\s*!\[[^\]]*\]\([^)]*\)\s*\]\([^)]*\)/g, " ")
        .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
        .replace(/!\[[^\]]*\]\[[^\]]*\]/g, " ")
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
        .replace(/\[([^\]]+)\]\[[^\]]*\]/g, "$1")
        .replace(/<[^>]+>/g, " ")
        .replace(/[*`]+/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function truncateAtWordBoundary(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
        return text;
    }
    const slice = text.slice(0, maxLength - 3);
    const lastSpace = slice.lastIndexOf(" ");
    const base = lastSpace >= Math.floor(maxLength * 0.6) ? slice.slice(0, lastSpace) : slice;
    return `${base.trimEnd()}...`;
}

function extractProseParagraphs(markdownSection: string): string[] {
    const cleanedSection = markdownSection
        .replace(/\[\s*!\[[^\]]*\]\([^)]*\)\s*\]\([^)]*\)/g, " ")
        .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
        .replace(/!\[[^\]]*\]\[[^\]]*\]/g, " ")
        .replace(/^\s*\[[^\]]+\]:\s*\S+.*$/gm, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/^\s*(?:---+|\*\*\*+|___+)\s*$/gm, "");

    const blocks = cleanedSection.split(/\n\s*\n+/);
    const paragraphs: string[] = [];

    for (const block of blocks) {
        const lines = block
            .split("\n")
            .map((line) => line.replace(/^>\s?/, "").trim())
            .filter(
                (line) =>
                    line.length > 0 &&
                    !/^#{1,6}\s+/.test(line) &&
                    !/^(?:---+|\*\*\*+|___+)$/.test(line) &&
                    !/^\|/.test(line) &&
                    !/^(?:[-*+]|\d+\.)\s+/.test(line),
            );

        if (lines.length === 0) continue;

        const cleaned = cleanInlineMarkdown(lines.join(" "));
        if (cleaned) {
            paragraphs.push(cleaned);
        }
    }

    return paragraphs;
}

export function parseReadmeMetadata(
    markdown: string,
    fallbackName: string,
    fallbackDescription: string,
): { name: string; description: string; features: string[] } {
    const normalized = markdown
        .replace(/\r\n?/g, "\n")
        .replace(/```[\s\S]*?```/g, "\n")
        .replace(/~~~[\s\S]*?~~~/g, "\n")
        .replace(/<!--[\s\S]*?-->/g, " ");

    const h1Match = normalized.match(/^#\s+(.+?)\s*#*$/m);
    const cleanedH1 = h1Match?.[1] ? cleanInlineMarkdown(h1Match[1]) : "";
    const name = (cleanedH1 || fallbackName.trim() || "Untitled Project").slice(0, 200);

    const features: string[] = [];
    let inFeatureSection = false;
    for (const line of normalized.split("\n")) {
        const headingMatch = line.match(/^#{1,6}\s+(.+?)\s*#*$/);
        if (headingMatch) {
            const headingText = cleanInlineMarkdown(headingMatch[1] ?? "");
            if (FEATURE_HEADING_REGEX.test(headingText)) {
                inFeatureSection = true;
            } else if (inFeatureSection) {
                break;
            }
            continue;
        }

        if (!inFeatureSection) continue;

        const bulletMatch = line.match(/^\s*[-*]\s+(.+)$/);
        if (!bulletMatch?.[1]) continue;

        const rawItem = bulletMatch[1].replace(/^\[[ xX]\]\s+/, "");
        const cleanedItem = cleanInlineMarkdown(rawItem).replace(/^[:;,\-–—.\s]+|[\s]+$/g, "");
        if (!cleanedItem) continue;

        const boundedItem =
            cleanedItem.length >= 140 ? truncateAtWordBoundary(cleanedItem, 139) : cleanedItem;
        features.push(boundedItem);
        if (features.length >= 5) break;
    }

    const firstSubheadingIndex = normalized.search(/^#{2,6}\s+/m);
    const introSection =
        firstSubheadingIndex >= 0 ? normalized.slice(0, firstSubheadingIndex) : normalized;

    let proseParagraphs = extractProseParagraphs(introSection);
    if (proseParagraphs.length === 0 && firstSubheadingIndex >= 0) {
        proseParagraphs = extractProseParagraphs(normalized);
    }

    const joinedDescription = proseParagraphs.slice(0, 2).join(" ").replace(/\s+/g, " ").trim();
    const rawFallbackDescription =
        fallbackDescription.trim() || "Dự án mã nguồn mở trên GitHub";
    const description = truncateAtWordBoundary(
        joinedDescription || rawFallbackDescription,
        420,
    );

    return {
        name,
        description,
        features,
    };
}

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

    await upsertPortfolioContent(c.env.DB, locale, parsed.data, updatedAt, adminEmail);

    if (locale === "vi") {
        const translatedProjects = await Promise.all(
            parsed.data.projects.map(translateProjectToEnglish),
        );

        return c.json(
            {
                ok: true,
                locale,
                updatedAt,
                content: parsed.data,
                translatedProjects,
            },
            200,
        );
    }

    return c.json({ ok: true, locale, updatedAt, content: parsed.data }, 200);
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

// Đồng bộ danh sách repository công khai từ GitHub sang định dạng Project của Portfolio
adminRoute.post("/sync/github", async (c) => {
    let username = "GiabBaoo";
    let includeForks = false;

    const rawBody = await c.req.text();
    if (rawBody.trim().length > 0) {
        let parsedBody: unknown;
        try {
            parsedBody = JSON.parse(rawBody);
        } catch {
            throw new ApiError(400, "VALIDATION_ERROR", "Dữ liệu JSON không hợp lệ");
        }

        if (parsedBody && typeof parsedBody === "object") {
            const payload = parsedBody as { username?: unknown; includeForks?: unknown };
            if (typeof payload.username === "string" && payload.username.trim().length > 0) {
                username = payload.username.trim();
            }
            if (typeof payload.includeForks === "boolean") {
                includeForks = payload.includeForks;
            }
        }
    }

    const headers: Record<string, string> = {
        "User-Agent": "giabao-portfolio-cms",
        Accept: "application/vnd.github+json",
    };
    const githubToken = c.env.GITHUB_TOKEN?.trim();
    if (githubToken) {
        headers.Authorization = `Bearer ${githubToken}`;
    }

    const apiUrl = githubToken
        ? "https://api.github.com/user/repos?affiliation=owner,collaborator,organization_member&visibility=public&per_page=100&sort=updated"
        : `https://api.github.com/users/${encodeURIComponent(username)}/repos?type=all&per_page=100&sort=updated`;
    let response: Response;
    try {
        response = await fetch(apiUrl, { headers });
    } catch {
        throw new ApiError(502, "SERVICE_UNAVAILABLE", "Không thể kết nối tới GitHub API.");
    }

    if (!response.ok) {
        if (response.status === 404) {
            throw new ApiError(404, "NOT_FOUND", `Không tìm thấy tài khoản GitHub "${username}".`);
        }
        if (response.status === 401) {
            throw new ApiError(401, "UNAUTHORIZED", "GITHUB_TOKEN không hợp lệ hoặc đã hết hạn.");
        }
        if (response.status === 403 || response.status === 429) {
            throw new ApiError(
                502,
                "GITHUB_RATE_LIMIT",
                "GitHub API đang giới hạn IP của Cloudflare. Hãy kiểm tra biến secret GITHUB_TOKEN.",
            );
        }
        throw new ApiError(502, "SERVICE_UNAVAILABLE", `GitHub API trả về lỗi (HTTP ${response.status}).`);
    }

    let repos: GitHubRepoItem[];
    try {
        const json = (await response.json()) as unknown;
        if (!Array.isArray(json)) {
            throw new Error("Invalid GitHub payload");
        }
        repos = json as GitHubRepoItem[];
    } catch {
        throw new ApiError(502, "SERVICE_UNAVAILABLE", "Dữ liệu trả về từ GitHub API không hợp lệ.");
    }

    const normalizedUsername = username.toLowerCase();
    const filteredRepos = repos.filter((repo) => {
        if (!includeForks && repo.fork === true) return false;
        if (repo.name.toLowerCase() === normalizedUsername) return false;
        return true;
    });

    const readmeHeaders: Record<string, string> = {
        Accept: "application/vnd.github.raw+json",
        "User-Agent": "giabao-portfolio-cms",
    };
    if (githubToken) {
        readmeHeaders.Authorization = `Bearer ${githubToken}`;
    }

    const readmeResults = await Promise.allSettled(
        filteredRepos.map(async (repo) => {
            const repoFullName = repo.full_name?.trim()
                ? repo.full_name.trim()
                : `${encodeURIComponent(username)}/${encodeURIComponent(repo.name)}`;
            const readmeUrl = `https://api.github.com/repos/${repoFullName}/readme`;
            const readmeRes = await fetch(readmeUrl, { headers: readmeHeaders });
            if (!readmeRes.ok) {
                return "";
            }
            return readmeRes.text();
        }),
    );

    const projects: AdminProjectDTO[] = filteredRepos.map((repo, index) => {
        const techSet = new Set<string>();
        const seenLower = new Set<string>();
        const candidates = [
            ...(Array.isArray(repo.topics) ? repo.topics : []),
            ...(repo.language ? [repo.language] : []),
        ];
        for (const item of candidates) {
            const trimmed = item.trim().slice(0, 80);
            if (!trimmed) continue;
            const lower = trimmed.toLowerCase();
            if (seenLower.has(lower)) continue;
            seenLower.add(lower);
            techSet.add(trimmed);
            if (techSet.size >= 30) break;
        }

        const normalizedSlug = repo.name
            .toLowerCase()
            .replace(/[^a-z0-9-]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 120);

        const readmeResult = readmeResults[index];
        const rawReadme = readmeResult?.status === "fulfilled" ? readmeResult.value : "";
        const fallbackName = repo.name.slice(0, 200);
        const fallbackDescription =
            repo.description?.trim() || "Dự án mã nguồn mở trên GitHub";
        const metadata = parseReadmeMetadata(rawReadme, fallbackName, fallbackDescription);

        return {
            id: `gh-${repo.id}`,
            slug: normalizedSlug || `gh-${repo.id}`,
            name: metadata.name.slice(0, 200),
            description: metadata.description.slice(0, 3000),
            technologies: Array.from(techSet),
            features: metadata.features,
            role: "Developer",
            imageUrl: null,
            repositoryUrl: repo.html_url,
            demoUrl: repo.homepage?.trim() ? repo.homepage.trim().slice(0, 500) : null,
            projectType: "personal",
        };
    });

    return c.json({ ok: true, projects }, 200);
});