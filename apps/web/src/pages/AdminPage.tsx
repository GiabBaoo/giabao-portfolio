import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { Link } from "react-router";
import type { MediaAssetInfo, PortfolioPublicResponse } from "@giabao-portfolio/shared";
import {
    getPortfolioContent,
    type Experience,
    type PortfolioContent,
    type Project,
    type Skill,
    type SkillCategory,
} from "../content/index.ts";
import { invalidatePortfolioCache } from "../content/usePortfolioData.ts";
import type { Locale } from "../i18n/index.ts";

type AdminTab = "media" | "profile" | "items" | "json";

function cloneDefaultContent(locale: Locale): PortfolioContent {
    return JSON.parse(JSON.stringify(getPortfolioContent(locale))) as PortfolioContent;
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function AdminPage() {
    const [activeTab, setActiveTab] = useState<AdminTab>("media");
    const [locale, setLocale] = useState<Locale>("vi");
    const [drafts, setDrafts] = useState<Record<Locale, PortfolioContent>>(() => ({
        vi: cloneDefaultContent("vi"),
        en: cloneDefaultContent("en"),
    }));
    const [jsonBuffer, setJsonBuffer] = useState<string>(() =>
        JSON.stringify(cloneDefaultContent("vi"), null, 2),
    );
    const [media, setMedia] = useState<{
        avatar: MediaAssetInfo | null;
        cv: MediaAssetInfo | null;
    }>({ avatar: null, cv: null });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingType, setUploadingType] = useState<"avatar" | "cv" | null>(null);
    const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

    const currentContent = drafts[locale];

    const loadInitialData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/portfolio", { headers: { Accept: "application/json" } });
            if (res.ok) {
                const data = (await res.json()) as PortfolioPublicResponse;
                const nextVi = data.contentByLocale.vi ?? cloneDefaultContent("vi");
                const nextEn = data.contentByLocale.en ?? cloneDefaultContent("en");
                setDrafts({ vi: nextVi, en: nextEn });
                setJsonBuffer(JSON.stringify(locale === "vi" ? nextVi : nextEn, null, 2));
                setMedia(data.media);
            }
        } catch {
            setNotice({ kind: "error", text: "Không thể tải dữ liệu từ máy chủ, đang dùng dữ liệu mặc định." });
        } finally {
            setLoading(false);
        }
    }, [locale]);

    useEffect(() => {
        void loadInitialData();
    }, [loadInitialData]);

    const switchLocale = (nextLocale: Locale) => {
        setLocale(nextLocale);
        setJsonBuffer(JSON.stringify(drafts[nextLocale], null, 2));
        setNotice(null);
    };

    const updateCurrentDraft = (updater: (prev: PortfolioContent) => PortfolioContent) => {
        setDrafts((prev) => {
            const updated = updater(prev[locale]);
            setJsonBuffer(JSON.stringify(updated, null, 2));
            return { ...prev, [locale]: updated };
        });
    };

    const handleUploadMedia = async (type: "avatar" | "cv", event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;

        setUploadingType(type);
        setNotice(null);
        try {
            const formData = new FormData();
            formData.append("type", type);
            formData.append("file", file);

            const res = await fetch("/api/admin/media", {
                method: "POST",
                body: formData,
            });

            const body = (await res.json()) as {
                ok?: boolean;
                media?: MediaAssetInfo;
                error?: { message?: string };
            };

            if (!res.ok || !body.ok || !body.media) {
                throw new Error(body.error?.message || "Tải tệp lên thất bại");
            }

            setMedia((prev) => ({ ...prev, [type]: body.media! }));
            invalidatePortfolioCache();
            setNotice({
                kind: "success",
                text: type === "avatar" ? "Đã cập nhật ảnh đại diện thành công!" : "Đã tải lên CV PDF thành công!",
            });
        } catch (err) {
            setNotice({
                kind: "error",
                text: err instanceof Error ? err.message : "Có lỗi xảy ra khi tải tệp lên",
            });
        } finally {
            setUploadingType(null);
        }
    };

    const handleDeleteMedia = async (type: "avatar" | "cv") => {
        setUploadingType(type);
        setNotice(null);
        try {
            const res = await fetch(`/api/admin/media/${type}`, { method: "DELETE" });
            if (!res.ok) {
                throw new Error("Không thể xóa tệp tin");
            }
            setMedia((prev) => ({ ...prev, [type]: null }));
            invalidatePortfolioCache();
            setNotice({
                kind: "success",
                text: type === "avatar" ? "Đã gỡ ảnh đại diện (quay về khung SQL mặc định)." : "Đã gỡ tệp CV.",
            });
        } catch (err) {
            setNotice({
                kind: "error",
                text: err instanceof Error ? err.message : "Lỗi khi xóa tệp tin",
            });
        } finally {
            setUploadingType(null);
        }
    };

    const handleSaveContent = async () => {
        setSaving(true);
        setNotice(null);
        try {
            let payloadToSave: PortfolioContent = currentContent;

            if (activeTab === "json") {
                payloadToSave = JSON.parse(jsonBuffer) as PortfolioContent;
                setDrafts((prev) => ({ ...prev, [locale]: payloadToSave }));
            }

            // Chuẩn hóa trường proficiency để khớp schema Zod
            const normalizedPayload: PortfolioContent = {
                ...payloadToSave,
                skills: payloadToSave.skills.map((s) => ({
                    ...s,
                    proficiency: s.proficiency ?? null,
                })),
            };

            const res = await fetch(`/api/admin/portfolio/${locale}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(normalizedPayload),
            });

            const body = (await res.json()) as { ok?: boolean; error?: { message?: string } };
            if (!res.ok || !body.ok) {
                throw new Error(body.error?.message || "Lưu nội dung thất bại");
            }

            invalidatePortfolioCache();
            setNotice({
                kind: "success",
                text: `Đã lưu nội dung bản ${locale === "vi" ? "Tiếng Việt (VI)" : "Tiếng Anh (EN)"} lên D1!`,
            });
        } catch (err) {
            setNotice({
                kind: "error",
                text: err instanceof Error ? err.message : "Dữ liệu không hợp lệ hoặc lỗi máy chủ",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleResetDefault = () => {
        const fresh = cloneDefaultContent(locale);
        setDrafts((prev) => ({ ...prev, [locale]: fresh }));
        setJsonBuffer(JSON.stringify(fresh, null, 2));
        setNotice({
            kind: "success",
            text: "Đã nạp lại dữ liệu gốc vào trình soạn thảo. Bấm 'Lưu thay đổi' để áp dụng lên web.",
        });
    };

    return (
        <div className="bg-bg-primary text-text-primary min-h-screen pb-16">
            {/* Top Bar */}
            <header className="border-border-subtle bg-surface-primary/90 sticky top-0 z-20 border-b backdrop-blur">
                <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
                    <div>
                        <h1 className="text-lg font-semibold">Portfolio CMS — Quản trị nội dung</h1>
                        <p className="text-text-muted text-xs">
                            Dữ liệu lưu trên Cloudflare D1 & Media lưu trên Cloudflare R2
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <Link
                            to="/vi"
                            target="_blank"
                            className="border-border-strong hover:bg-surface-muted rounded-md border px-3 py-1.5 text-sm font-medium"
                        >
                            Xem trang VI ↗
                        </Link>
                        <Link
                            to="/en"
                            target="_blank"
                            className="border-border-strong hover:bg-surface-muted rounded-md border px-3 py-1.5 text-sm font-medium"
                        >
                            Xem trang EN ↗
                        </Link>
                        {activeTab !== "media" && (
                            <button
                                type="button"
                                disabled={saving}
                                onClick={() => void handleSaveContent()}
                                className="bg-accent-primary text-accent-contrast hover:bg-accent-hover rounded-md px-4 py-1.5 text-sm font-medium shadow-sm disabled:opacity-50"
                            >
                                {saving ? "Đang lưu..." : `Lưu bản ${locale.toUpperCase()}`}
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-6xl space-y-6 px-4 pt-6 sm:px-6">
                {notice && (
                    <div
                        className={`rounded-lg border px-4 py-3 text-sm ${notice.kind === "success"
                                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                : "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300"
                            }`}
                    >
                        {notice.text}
                    </div>
                )}

                {/* Navigation Tabs */}
                <div className="border-border-subtle flex flex-wrap items-center justify-between gap-4 border-b pb-3">
                    <div className="flex flex-wrap gap-2">
                        {(
                            [
                                ["media", "1. Ảnh đại diện & CV (R2)"],
                                ["profile", "2. Hồ sơ & Học vấn"],
                                ["items", "3. Kinh nghiệm, Dự án & Kỹ năng"],
                                ["json", "4. Chỉnh sửa JSON nâng cao"],
                            ] as const
                        ).map(([tabKey, label]) => (
                            <button
                                key={tabKey}
                                type="button"
                                onClick={() => setActiveTab(tabKey)}
                                className={`rounded-md px-3.5 py-2 text-sm font-medium transition-colors ${activeTab === tabKey
                                        ? "bg-accent-primary text-accent-contrast"
                                        : "bg-surface-primary text-text-secondary hover:text-text-primary border-border-subtle border"
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {activeTab !== "media" && (
                        <div className="flex items-center gap-2">
                            <span className="text-text-muted text-xs">Ngôn ngữ đang sửa:</span>
                            <div className="border-border-subtle bg-surface-primary inline-flex rounded-md border p-0.5">
                                {(["vi", "en"] as const).map((lang) => (
                                    <button
                                        key={lang}
                                        type="button"
                                        onClick={() => switchLocale(lang)}
                                        className={`rounded px-3 py-1 text-xs font-semibold uppercase ${locale === lang
                                                ? "bg-accent-primary text-accent-contrast"
                                                : "text-text-secondary hover:text-text-primary"
                                            }`}
                                    >
                                        {lang}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="text-text-muted py-12 text-center text-sm">Đang tải dữ liệu...</div>
                ) : (
                    <>
                        {/* TAB 1: MEDIA UPLOAD (AVATAR & CV) */}
                        {activeTab === "media" && (
                            <div className="grid gap-6 md:grid-cols-2">
                                {/* Avatar Card */}
                                <section className="border-border-subtle bg-surface-primary space-y-4 rounded-xl border p-6">
                                    <div>
                                        <h2 className="text-base font-semibold">Ảnh đại diện cá nhân</h2>
                                        <p className="text-text-muted text-xs">
                                            Hỗ trợ JPG, PNG, WebP (tối đa 5 MB). Hiển thị thay cho khung SQL ở đầu trang.
                                        </p>
                                    </div>

                                    <div className="border-border-subtle bg-bg-secondary flex aspect-square max-h-64 w-full items-center justify-center overflow-hidden rounded-lg border">
                                        {media.avatar ? (
                                            <img
                                                src={media.avatar.url}
                                                alt="Avatar hiện tại"
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-text-muted px-4 text-center text-xs">
                                                Chưa tải ảnh lên (đang hiển thị khung SQL mặc định)
                                            </span>
                                        )}
                                    </div>

                                    {media.avatar && (
                                        <div className="text-text-secondary space-y-1 text-xs">
                                            <p>
                                                <strong>Tệp hiện tại:</strong> {media.avatar.originalName} (
                                                {formatFileSize(media.avatar.sizeBytes)})
                                            </p>
                                        </div>
                                    )}

                                    <div className="flex flex-wrap items-center gap-3">
                                        <label className="bg-accent-primary text-accent-contrast hover:bg-accent-hover cursor-pointer rounded-md px-4 py-2 text-sm font-medium">
                                            {uploadingType === "avatar" ? "Đang tải lên..." : "Chọn ảnh mới"}
                                            <input
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                className="hidden"
                                                disabled={uploadingType !== null}
                                                onChange={(e) => void handleUploadMedia("avatar", e)}
                                            />
                                        </label>

                                        {media.avatar && (
                                            <button
                                                type="button"
                                                disabled={uploadingType !== null}
                                                onClick={() => void handleDeleteMedia("avatar")}
                                                className="rounded-md border border-red-500/40 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400"
                                            >
                                                Gỡ ảnh
                                            </button>
                                        )}
                                    </div>
                                </section>

                                {/* CV PDF Card */}
                                <section className="border-border-subtle bg-surface-primary space-y-4 rounded-xl border p-6">
                                    <div>
                                        <h2 className="text-base font-semibold">Tệp CV cá nhân (PDF)</h2>
                                        <p className="text-text-muted text-xs">
                                            Hỗ trợ định dạng PDF (tối đa 10 MB). Tự động gắn vào nút “Tải CV” ở đầu trang.
                                        </p>
                                    </div>

                                    <div className="border-border-subtle bg-bg-secondary flex min-h-40 flex-col justify-center rounded-lg border p-4">
                                        {media.cv ? (
                                            <div className="space-y-2 text-sm">
                                                <p className="font-medium">{media.cv.originalName}</p>
                                                <p className="text-text-muted text-xs">
                                                    Dung lượng: {formatFileSize(media.cv.sizeBytes)} • Cập nhật:{" "}
                                                    {new Date(media.cv.updatedAt).toLocaleString("vi-VN")}
                                                </p>
                                                <div className="pt-2">
                                                    <a
                                                        href={media.cv.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-accent-primary text-xs font-medium underline"
                                                    >
                                                        Mở xem trước file CV PDF ↗
                                                    </a>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-text-muted text-center text-xs">
                                                Chưa có tệp CV nào được tải lên R2
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3">
                                        <label className="bg-accent-primary text-accent-contrast hover:bg-accent-hover cursor-pointer rounded-md px-4 py-2 text-sm font-medium">
                                            {uploadingType === "cv" ? "Đang tải lên..." : "Tải lên CV (PDF)"}
                                            <input
                                                type="file"
                                                accept="application/pdf"
                                                className="hidden"
                                                disabled={uploadingType !== null}
                                                onChange={(e) => void handleUploadMedia("cv", e)}
                                            />
                                        </label>

                                        {media.cv && (
                                            <button
                                                type="button"
                                                disabled={uploadingType !== null}
                                                onClick={() => void handleDeleteMedia("cv")}
                                                className="rounded-md border border-red-500/40 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400"
                                            >
                                                Gỡ CV
                                            </button>
                                        )}
                                    </div>
                                </section>
                            </div>
                        )}

                        {/* TAB 2: PROFILE & EDUCATION */}
                        {activeTab === "profile" && (
                            <div className="space-y-6">
                                <section className="border-border-subtle bg-surface-primary space-y-4 rounded-xl border p-6">
                                    <h2 className="text-base font-semibold">
                                        Thông tin cá nhân ({locale.toUpperCase()})
                                    </h2>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <label className="space-y-1 text-sm">
                                            <span className="font-medium">Họ và tên</span>
                                            <input
                                                type="text"
                                                value={currentContent.profile.name}
                                                onChange={(e) =>
                                                    updateCurrentDraft((c) => ({
                                                        ...c,
                                                        profile: { ...c.profile, name: e.target.value },
                                                    }))
                                                }
                                                className="border-border-strong bg-bg-primary w-full rounded-md border px-3 py-2"
                                            />
                                        </label>

                                        <label className="space-y-1 text-sm">
                                            <span className="font-medium">Chức danh / Vị trí mục tiêu</span>
                                            <input
                                                type="text"
                                                value={currentContent.profile.title}
                                                onChange={(e) =>
                                                    updateCurrentDraft((c) => ({
                                                        ...c,
                                                        profile: { ...c.profile, title: e.target.value },
                                                    }))
                                                }
                                                className="border-border-strong bg-bg-primary w-full rounded-md border px-3 py-2"
                                            />
                                        </label>

                                        <label className="space-y-1 text-sm">
                                            <span className="font-medium">Địa điểm</span>
                                            <input
                                                type="text"
                                                value={currentContent.profile.location}
                                                onChange={(e) =>
                                                    updateCurrentDraft((c) => ({
                                                        ...c,
                                                        profile: { ...c.profile, location: e.target.value },
                                                    }))
                                                }
                                                className="border-border-strong bg-bg-primary w-full rounded-md border px-3 py-2"
                                            />
                                        </label>

                                        <label className="space-y-1 text-sm">
                                            <span className="font-medium">Email liên hệ</span>
                                            <input
                                                type="email"
                                                value={currentContent.profile.email}
                                                onChange={(e) =>
                                                    updateCurrentDraft((c) => ({
                                                        ...c,
                                                        profile: { ...c.profile, email: e.target.value },
                                                    }))
                                                }
                                                className="border-border-strong bg-bg-primary w-full rounded-md border px-3 py-2"
                                            />
                                        </label>
                                    </div>

                                    <label className="block space-y-1 text-sm">
                                        <span className="font-medium">Mô tả ngắn ở Hero (Summary)</span>
                                        <textarea
                                            rows={3}
                                            value={currentContent.profile.summary}
                                            onChange={(e) =>
                                                updateCurrentDraft((c) => ({
                                                    ...c,
                                                    profile: { ...c.profile, summary: e.target.value },
                                                }))
                                            }
                                            className="border-border-strong bg-bg-primary w-full rounded-md border px-3 py-2"
                                        />
                                    </label>

                                    <label className="block space-y-1 text-sm">
                                        <span className="font-medium">
                                            Các từ khóa nổi bật ở Hero (mỗi dòng 1 thẻ badge)
                                        </span>
                                        <textarea
                                            rows={4}
                                            value={currentContent.profile.heroHighlights.join("\n")}
                                            onChange={(e) =>
                                                updateCurrentDraft((c) => ({
                                                    ...c,
                                                    profile: {
                                                        ...c.profile,
                                                        heroHighlights: e.target.value
                                                            .split("\n")
                                                            .map((line) => line.trim())
                                                            .filter(Boolean),
                                                    },
                                                }))
                                            }
                                            className="border-border-strong bg-bg-primary w-full rounded-md border px-3 py-2 font-mono text-xs"
                                        />
                                    </label>

                                    <label className="block space-y-1 text-sm">
                                        <span className="font-medium">
                                            Các đoạn văn phần Giới thiệu (ngăn cách mỗi đoạn bằng 1 dòng trống)
                                        </span>
                                        <textarea
                                            rows={6}
                                            value={currentContent.profile.aboutParagraphs.join("\n\n")}
                                            onChange={(e) =>
                                                updateCurrentDraft((c) => ({
                                                    ...c,
                                                    profile: {
                                                        ...c.profile,
                                                        aboutParagraphs: e.target.value
                                                            .split(/\n\s*\n/)
                                                            .map((p) => p.trim())
                                                            .filter(Boolean),
                                                    },
                                                }))
                                            }
                                            className="border-border-strong bg-bg-primary w-full rounded-md border px-3 py-2"
                                        />
                                    </label>
                                </section>

                                <section className="border-border-subtle bg-surface-primary space-y-4 rounded-xl border p-6">
                                    <h2 className="text-base font-semibold">Học vấn ({locale.toUpperCase()})</h2>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <label className="space-y-1 text-sm">
                                            <span className="font-medium">Trường đại học</span>
                                            <input
                                                type="text"
                                                value={currentContent.education.institution}
                                                onChange={(e) =>
                                                    updateCurrentDraft((c) => ({
                                                        ...c,
                                                        education: { ...c.education, institution: e.target.value },
                                                    }))
                                                }
                                                className="border-border-strong bg-bg-primary w-full rounded-md border px-3 py-2"
                                            />
                                        </label>

                                        <label className="space-y-1 text-sm">
                                            <span className="font-medium">Chuyên ngành / Bằng cấp</span>
                                            <input
                                                type="text"
                                                value={currentContent.education.degree}
                                                onChange={(e) =>
                                                    updateCurrentDraft((c) => ({
                                                        ...c,
                                                        education: { ...c.education, degree: e.target.value },
                                                    }))
                                                }
                                                className="border-border-strong bg-bg-primary w-full rounded-md border px-3 py-2"
                                            />
                                        </label>

                                        <label className="space-y-1 text-sm">
                                            <span className="font-medium">GPA</span>
                                            <input
                                                type="text"
                                                value={currentContent.education.gpa}
                                                onChange={(e) =>
                                                    updateCurrentDraft((c) => ({
                                                        ...c,
                                                        education: { ...c.education, gpa: e.target.value },
                                                    }))
                                                }
                                                className="border-border-strong bg-bg-primary w-full rounded-md border px-3 py-2"
                                            />
                                        </label>

                                        <label className="space-y-1 text-sm">
                                            <span className="font-medium">Niên khóa</span>
                                            <input
                                                type="text"
                                                value={currentContent.education.period}
                                                onChange={(e) =>
                                                    updateCurrentDraft((c) => ({
                                                        ...c,
                                                        education: { ...c.education, period: e.target.value },
                                                    }))
                                                }
                                                className="border-border-strong bg-bg-primary w-full rounded-md border px-3 py-2"
                                            />
                                        </label>
                                    </div>
                                </section>
                            </div>
                        )}

                        {/* TAB 3: EXPERIENCES, PROJECTS & SKILLS */}
                        {activeTab === "items" && (
                            <div className="space-y-8">
                                {/* Experiences */}
                                <section className="border-border-subtle bg-surface-primary space-y-4 rounded-xl border p-6">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-base font-semibold">
                                            Kinh nghiệm làm việc ({currentContent.experiences.length})
                                        </h2>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                updateCurrentDraft((c) => ({
                                                    ...c,
                                                    experiences: [
                                                        {
                                                            id: `exp-${Date.now()}`,
                                                            company: "Tên công ty",
                                                            position: "Vị trí",
                                                            kind: "technical",
                                                            startDate: "2026-01",
                                                            endDate: null,
                                                            description: "",
                                                            responsibilities: ["Mô tả công việc chính"],
                                                        },
                                                        ...c.experiences,
                                                    ],
                                                }))
                                            }
                                            className="bg-accent-primary text-accent-contrast rounded-md px-3 py-1.5 text-xs font-medium"
                                        >
                                            + Thêm kinh nghiệm
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        {currentContent.experiences.map((exp, idx) => (
                                            <div
                                                key={exp.id}
                                                className="border-border-subtle bg-bg-primary space-y-3 rounded-lg border p-4"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-text-muted font-mono text-xs">#{idx + 1}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            updateCurrentDraft((c) => ({
                                                                ...c,
                                                                experiences: c.experiences.filter((_, i) => i !== idx),
                                                            }))
                                                        }
                                                        className="text-xs text-red-500 hover:underline"
                                                    >
                                                        Xóa mục này
                                                    </button>
                                                </div>

                                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                                    <input
                                                        type="text"
                                                        placeholder="Công ty"
                                                        value={exp.company}
                                                        onChange={(e) => {
                                                            const next: Experience[] = [...currentContent.experiences];
                                                            next[idx] = { ...exp, company: e.target.value };
                                                            updateCurrentDraft((c) => ({ ...c, experiences: next }));
                                                        }}
                                                        className="border-border-strong bg-surface-primary rounded border px-2.5 py-1.5 text-sm"
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="Vị trí"
                                                        value={exp.position}
                                                        onChange={(e) => {
                                                            const next: Experience[] = [...currentContent.experiences];
                                                            next[idx] = { ...exp, position: e.target.value };
                                                            updateCurrentDraft((c) => ({ ...c, experiences: next }));
                                                        }}
                                                        className="border-border-strong bg-surface-primary rounded border px-2.5 py-1.5 text-sm"
                                                    />
                                                    <select
                                                        value={exp.kind}
                                                        onChange={(e) => {
                                                            const next: Experience[] = [...currentContent.experiences];
                                                            next[idx] = {
                                                                ...exp,
                                                                kind: e.target.value as Experience["kind"],
                                                            };
                                                            updateCurrentDraft((c) => ({ ...c, experiences: next }));
                                                        }}
                                                        className="border-border-strong bg-surface-primary rounded border px-2.5 py-1.5 text-sm"
                                                    >
                                                        <option value="technical">Technical (IT/Data)</option>
                                                        <option value="non-technical">Non-technical (Kinh doanh/Vận hành)</option>
                                                    </select>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Từ (2026-10)"
                                                            value={exp.startDate}
                                                            onChange={(e) => {
                                                                const next: Experience[] = [...currentContent.experiences];
                                                                next[idx] = { ...exp, startDate: e.target.value };
                                                                updateCurrentDraft((c) => ({ ...c, experiences: next }));
                                                            }}
                                                            className="border-border-strong bg-surface-primary w-1/2 rounded border px-2 py-1.5 text-sm"
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="Đến (trống = Hiện tại)"
                                                            value={exp.endDate ?? ""}
                                                            onChange={(e) => {
                                                                const next: Experience[] = [...currentContent.experiences];
                                                                next[idx] = {
                                                                    ...exp,
                                                                    endDate: e.target.value.trim() ? e.target.value : null,
                                                                };
                                                                updateCurrentDraft((c) => ({ ...c, experiences: next }));
                                                            }}
                                                            className="border-border-strong bg-surface-primary w-1/2 rounded border px-2 py-1.5 text-sm"
                                                        />
                                                    </div>
                                                </div>

                                                <textarea
                                                    rows={3}
                                                    placeholder="Mỗi dòng là 1 gạch đầu dòng trách nhiệm..."
                                                    value={exp.responsibilities.join("\n")}
                                                    onChange={(e) => {
                                                        const next: Experience[] = [...currentContent.experiences];
                                                        next[idx] = {
                                                            ...exp,
                                                            responsibilities: e.target.value
                                                                .split("\n")
                                                                .map((r) => r.trim())
                                                                .filter(Boolean),
                                                        };
                                                        updateCurrentDraft((c) => ({ ...c, experiences: next }));
                                                    }}
                                                    className="border-border-strong bg-surface-primary w-full rounded border px-2.5 py-1.5 text-sm"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                {/* Projects */}
                                <section className="border-border-subtle bg-surface-primary space-y-4 rounded-xl border p-6">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-base font-semibold">
                                            Dự án nổi bật ({currentContent.projects.length})
                                        </h2>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                updateCurrentDraft((c) => ({
                                                    ...c,
                                                    projects: [
                                                        {
                                                            id: `proj-${Date.now()}`,
                                                            slug: `project-${Date.now()}`,
                                                            name: "Tên dự án mới",
                                                            description: "Mô tả tổng quan dự án",
                                                            technologies: ["TypeScript", "SQL Server"],
                                                            features: ["Tính năng chính 1"],
                                                            role: "Backend / Database Developer",
                                                            imageUrl: null,
                                                            repositoryUrl: null,
                                                            demoUrl: null,
                                                            projectType: "personal",
                                                        },
                                                        ...c.projects,
                                                    ],
                                                }))
                                            }
                                            className="bg-accent-primary text-accent-contrast rounded-md px-3 py-1.5 text-xs font-medium"
                                        >
                                            + Thêm dự án
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        {currentContent.projects.map((proj, idx) => (
                                            <div
                                                key={proj.id}
                                                className="border-border-subtle bg-bg-primary space-y-3 rounded-lg border p-4"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-text-muted font-mono text-xs">
                                                        Slug: {proj.slug}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            updateCurrentDraft((c) => ({
                                                                ...c,
                                                                projects: c.projects.filter((_, i) => i !== idx),
                                                            }))
                                                        }
                                                        className="text-xs text-red-500 hover:underline"
                                                    >
                                                        Xóa dự án
                                                    </button>
                                                </div>

                                                <div className="grid gap-3 sm:grid-cols-3">
                                                    <input
                                                        type="text"
                                                        placeholder="Tên dự án"
                                                        value={proj.name}
                                                        onChange={(e) => {
                                                            const next: Project[] = [...currentContent.projects];
                                                            next[idx] = { ...proj, name: e.target.value };
                                                            updateCurrentDraft((c) => ({ ...c, projects: next }));
                                                        }}
                                                        className="border-border-strong bg-surface-primary rounded border px-2.5 py-1.5 text-sm"
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="Slug URL (vd: his-reporting)"
                                                        value={proj.slug}
                                                        onChange={(e) => {
                                                            const next: Project[] = [...currentContent.projects];
                                                            next[idx] = { ...proj, slug: e.target.value };
                                                            updateCurrentDraft((c) => ({ ...c, projects: next }));
                                                        }}
                                                        className="border-border-strong bg-surface-primary rounded border px-2.5 py-1.5 text-sm font-mono"
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="Link GitHub Repo"
                                                        value={proj.repositoryUrl ?? ""}
                                                        onChange={(e) => {
                                                            const next: Project[] = [...currentContent.projects];
                                                            next[idx] = {
                                                                ...proj,
                                                                repositoryUrl: e.target.value.trim() ? e.target.value : null,
                                                            };
                                                            updateCurrentDraft((c) => ({ ...c, projects: next }));
                                                        }}
                                                        className="border-border-strong bg-surface-primary rounded border px-2.5 py-1.5 text-sm"
                                                    />
                                                </div>

                                                <textarea
                                                    rows={2}
                                                    placeholder="Mô tả dự án"
                                                    value={proj.description}
                                                    onChange={(e) => {
                                                        const next: Project[] = [...currentContent.projects];
                                                        next[idx] = { ...proj, description: e.target.value };
                                                        updateCurrentDraft((c) => ({ ...c, projects: next }));
                                                    }}
                                                    className="border-border-strong bg-surface-primary w-full rounded border px-2.5 py-1.5 text-sm"
                                                />

                                                <input
                                                    type="text"
                                                    placeholder="Công nghệ sử dụng (phân cách bằng dấu phẩy)"
                                                    value={proj.technologies.join(", ")}
                                                    onChange={(e) => {
                                                        const next: Project[] = [...currentContent.projects];
                                                        next[idx] = {
                                                            ...proj,
                                                            technologies: e.target.value
                                                                .split(",")
                                                                .map((t) => t.trim())
                                                                .filter(Boolean),
                                                        };
                                                        updateCurrentDraft((c) => ({ ...c, projects: next }));
                                                    }}
                                                    className="border-border-strong bg-surface-primary w-full rounded border px-2.5 py-1.5 text-sm"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                {/* Skills */}
                                <section className="border-border-subtle bg-surface-primary space-y-4 rounded-xl border p-6">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-base font-semibold">
                                            Kỹ năng chuyên môn ({currentContent.skills.length})
                                        </h2>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                updateCurrentDraft((c) => ({
                                                    ...c,
                                                    skills: [
                                                        ...c.skills,
                                                        { name: "Kỹ năng mới", category: "databases", proficiency: null },
                                                    ],
                                                }))
                                            }
                                            className="bg-accent-primary text-accent-contrast rounded-md px-3 py-1.5 text-xs font-medium"
                                        >
                                            + Thêm kỹ năng
                                        </button>
                                    </div>

                                    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                                        {currentContent.skills.map((skill, idx) => (
                                            <div
                                                key={`${skill.name}-${idx}`}
                                                className="border-border-subtle bg-bg-primary flex items-center gap-2 rounded-md border p-2"
                                            >
                                                <input
                                                    type="text"
                                                    value={skill.name}
                                                    onChange={(e) => {
                                                        const next: Skill[] = [...currentContent.skills];
                                                        next[idx] = { ...skill, name: e.target.value };
                                                        updateCurrentDraft((c) => ({ ...c, skills: next }));
                                                    }}
                                                    className="border-border-strong bg-surface-primary min-w-0 flex-1 rounded border px-2 py-1 text-sm"
                                                />
                                                <select
                                                    value={skill.category}
                                                    onChange={(e) => {
                                                        const next: Skill[] = [...currentContent.skills];
                                                        next[idx] = {
                                                            ...skill,
                                                            category: e.target.value as SkillCategory,
                                                        };
                                                        updateCurrentDraft((c) => ({ ...c, skills: next }));
                                                    }}
                                                    className="border-border-strong bg-surface-primary rounded border px-1.5 py-1 text-xs"
                                                >
                                                    <option value="databases">Databases</option>
                                                    <option value="backend">Backend</option>
                                                    <option value="healthcare">Healthcare</option>
                                                    <option value="other">Other</option>
                                                </select>
                                                <button
                                                    type="button"
                                                    aria-label="Xóa kỹ năng"
                                                    onClick={() =>
                                                        updateCurrentDraft((c) => ({
                                                            ...c,
                                                            skills: c.skills.filter((_, i) => i !== idx),
                                                        }))
                                                    }
                                                    className="px-1.5 text-xs text-red-500 hover:font-bold"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        )}

                        {/* TAB 4: RAW JSON EDITOR */}
                        {activeTab === "json" && (
                            <section className="border-border-subtle bg-surface-primary space-y-4 rounded-xl border p-6">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <h2 className="text-base font-semibold">
                                            Chỉnh sửa trực tiếp JSON ({locale.toUpperCase()})
                                        </h2>
                                        <p className="text-text-muted text-xs">
                                            Dùng để sửa nhanh chứng chỉ, thuật ngữ HIS hoặc sao lưu cấu trúc dữ liệu.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleResetDefault}
                                        className="border-border-strong hover:bg-surface-muted rounded-md border px-3 py-1.5 text-xs font-medium"
                                    >
                                        Khôi phục mặc định từ code gốc
                                    </button>
                                </div>

                                <textarea
                                    rows={22}
                                    spellCheck={false}
                                    value={jsonBuffer}
                                    onChange={(e) => setJsonBuffer(e.target.value)}
                                    className="border-border-strong bg-bg-primary w-full rounded-lg border p-3 font-mono text-xs leading-relaxed"
                                />
                            </section>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}