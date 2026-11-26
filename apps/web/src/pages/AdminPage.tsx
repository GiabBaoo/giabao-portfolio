import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
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
import { applyLinkedInImportToContent } from "../lib/linkedin-csv.ts";
import type { Locale } from "../i18n/index.ts";

type AdminTab = "media" | "profile" | "items" | "json";
const STORAGE_KEY = "giabao_portfolio_admin_token";

function cloneDefaultContent(locale: Locale): PortfolioContent {
    return JSON.parse(JSON.stringify(getPortfolioContent(locale))) as PortfolioContent;
}

function safeReadSessionToken(): string {
    try {
        return window.sessionStorage.getItem(STORAGE_KEY) ?? "";
    } catch {
        return "";
    }
}

function safeWriteSessionToken(token: string): void {
    try {
        window.sessionStorage.setItem(STORAGE_KEY, token);
    } catch {
        // Ignore storage errors in restricted environments
    }
}

function safeRemoveSessionToken(): void {
    try {
        window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
        // Ignore storage errors in restricted environments
    }
}

function normalizePortfolioPayload(content: PortfolioContent): PortfolioContent {
    return {
        ...content,
        skills: content.skills.map((s) => ({
            ...s,
            proficiency: s.proficiency ?? null,
        })),
    };
}

function normalizeRepoUrl(url: string | null): string | null {
    return url ? url.trim().replace(/\/+$/, "").toLowerCase() : null;
}

function normalizeProjectSlug(slug: string): string {
    return slug.trim().toLowerCase();
}

export function mergeGitHubProjectsIntoList(
    existingProjects: readonly Project[],
    incomingProjects: readonly Project[],
): Project[] {
    const matchedIncomingIndexes = new Set<number>();

    const updatedExisting = existingProjects.map((existing) => {
        const existingUrl = normalizeRepoUrl(existing.repositoryUrl);
        const existingSlug = normalizeProjectSlug(existing.slug);

        const matchIdx = incomingProjects.findIndex((incoming, idx) => {
            if (matchedIncomingIndexes.has(idx)) return false;
            const incomingUrl = normalizeRepoUrl(incoming.repositoryUrl);
            const incomingSlug = normalizeProjectSlug(incoming.slug);
            if (existingUrl && incomingUrl && existingUrl === incomingUrl) return true;
            if (existingSlug && incomingSlug && existingSlug === incomingSlug) return true;
            return false;
        });

        if (matchIdx === -1) {
            return existing;
        }

        const matched = incomingProjects[matchIdx]!;
        matchedIncomingIndexes.add(matchIdx);
        return {
            ...existing,
            name: matched.name,
            description: matched.description,
            technologies: matched.technologies,
            features: matched.features,
            demoUrl: matched.demoUrl,
            repositoryUrl: matched.repositoryUrl ?? existing.repositoryUrl,
        };
    });

    const newProjects = incomingProjects.filter((_, idx) => !matchedIncomingIndexes.has(idx));
    return [...newProjects, ...updatedExisting].slice(0, 30);
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function AdminPage() {
    const [adminToken, setAdminToken] = useState<string>(() => safeReadSessionToken());
    const [passwordInput, setPasswordInput] = useState("");
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authChecking, setAuthChecking] = useState<boolean>(() => Boolean(safeReadSessionToken()));
    const [authError, setAuthError] = useState<string | null>(null);

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
    const [syncingGithub, setSyncingGithub] = useState(false);
    const [githubNotice, setGithubNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
    const [uploadingType, setUploadingType] = useState<"avatar" | "cv" | null>(null);
    const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

    const currentContent = drafts[locale];

    const verifyToken = useCallback(async (tokenToCheck: string): Promise<boolean> => {
        try {
            const res = await fetch("/api/admin/session", {
                headers: { Authorization: `Bearer ${tokenToCheck}` },
            });
            return res.ok;
        } catch {
            return false;
        }
    }, []);

    useEffect(() => {
        if (!adminToken) {
            setAuthChecking(false);
            return;
        }
        let active = true;
        void verifyToken(adminToken).then((valid) => {
            if (!active) return;
            if (valid) {
                setIsAuthenticated(true);
            } else {
                safeRemoveSessionToken();
                setAdminToken("");
                setIsAuthenticated(false);
            }
            setAuthChecking(false);
        });
        return () => {
            active = false;
        };
    }, [adminToken, verifyToken]);

    const loadInitialData = useCallback(async () => {
        if (!isAuthenticated) return;
        setLoading(true);
        try {
            const res = await fetch("/api/portfolio", { headers: { Accept: "application/json" } });
            if (res.ok) {
                const data = (await res.json()) as PortfolioPublicResponse;
                const nextVi = data.contentByLocale.vi ?? cloneDefaultContent("vi");
                const nextEn = data.contentByLocale.en ?? cloneDefaultContent("en");
                setDrafts({ vi: nextVi, en: nextEn });
                setJsonBuffer(JSON.stringify(nextVi, null, 2));
                setMedia(data.media);
            }
        } catch {
            setNotice({ kind: "error", text: "Không thể tải dữ liệu từ máy chủ, đang dùng dữ liệu mặc định." });
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        void loadInitialData();
    }, [loadInitialData]);

    const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const trimmed = passwordInput.trim();
        if (!trimmed) return;

        setAuthChecking(true);
        setAuthError(null);
        const valid = await verifyToken(trimmed);
        setAuthChecking(false);

        if (valid) {
            safeWriteSessionToken(trimmed);
            setAdminToken(trimmed);
            setIsAuthenticated(true);
            setPasswordInput("");
        } else {
            setAuthError("Mật khẩu quản trị không chính xác.");
        }
    };

    const handleLogout = () => {
        safeRemoveSessionToken();
        setAdminToken("");
        setIsAuthenticated(false);
        setNotice(null);
        setGithubNotice(null);
    };

    const switchLocale = (nextLocale: Locale) => {
        setLocale(nextLocale);
        setJsonBuffer(JSON.stringify(drafts[nextLocale], null, 2));
        setNotice(null);
        setGithubNotice(null);
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
                headers: { Authorization: `Bearer ${adminToken}` },
                body: formData,
            });

            const body = (await res.json()) as {
                ok?: boolean;
                media?: MediaAssetInfo;
                error?: { message?: string };
            };

            if (res.status === 401) {
                handleLogout();
                return;
            }

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
            const res = await fetch(`/api/admin/media/${type}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${adminToken}` },
            });
            if (res.status === 401) {
                handleLogout();
                return;
            }
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
            let nextDrafts: Record<Locale, PortfolioContent> = drafts;

            if (activeTab === "json") {
                const parsedJson = JSON.parse(jsonBuffer) as PortfolioContent;
                nextDrafts = { ...drafts, [locale]: parsedJson };
                setDrafts(nextDrafts);
            }

            const normalizedVi = normalizePortfolioPayload(nextDrafts.vi);
            const normalizedEn = normalizePortfolioPayload(nextDrafts.en);

            if (locale === "vi") {
                const viRes = await fetch("/api/admin/portfolio/vi", {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${adminToken}`,
                    },
                    body: JSON.stringify(normalizedVi),
                });

                if (viRes.status === 401) {
                    handleLogout();
                    return;
                }

                const viBody = (await viRes.json()) as {
                    ok?: boolean;
                    content?: PortfolioContent;
                    translatedProjects?: Project[];
                    error?: { message?: string };
                };
                if (!viRes.ok || !viBody.ok) {
                    throw new Error(viBody.error?.message || "Lưu nội dung thất bại");
                }

                const translatedProjects = Array.isArray(viBody.translatedProjects)
                    ? viBody.translatedProjects
                    : normalizedVi.projects;
                const syncedEn: PortfolioContent = {
                    ...normalizedEn,
                    projects: translatedProjects,
                };

                const enRes = await fetch("/api/admin/portfolio/en", {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${adminToken}`,
                    },
                    body: JSON.stringify(syncedEn),
                });

                if (enRes.status === 401) {
                    handleLogout();
                    return;
                }

                const enBody = (await enRes.json()) as {
                    ok?: boolean;
                    error?: { message?: string };
                };
                if (!enRes.ok || !enBody.ok) {
                    throw new Error(enBody.error?.message || "Lưu bản Tiếng Anh (EN) thất bại");
                }

                setDrafts((prev) => ({ ...prev, en: syncedEn }));
                invalidatePortfolioCache();
                setNotice({
                    kind: "success",
                    text: "Đã lưu đồng bộ cả 2 bản Tiếng Việt (VI) và Tiếng Anh (EN) lên D1!",
                });
            } else {
                const enRes = await fetch("/api/admin/portfolio/en", {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${adminToken}`,
                    },
                    body: JSON.stringify(normalizedEn),
                });

                if (enRes.status === 401) {
                    handleLogout();
                    return;
                }

                const enBody = (await enRes.json()) as {
                    ok?: boolean;
                    error?: { message?: string };
                };
                if (!enRes.ok || !enBody.ok) {
                    throw new Error(enBody.error?.message || "Lưu nội dung thất bại");
                }

                invalidatePortfolioCache();
                setNotice({
                    kind: "success",
                    text: "Đã lưu nội dung bản Tiếng Anh (EN) lên D1!",
                });
            }
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
            text: "Đã nạp lại dữ liệu gốc vào trình soạn thảo. Bấm 'Lưu bản' để áp dụng lên web.",
        });
    };

    const handleLinkedInCsvImport = async (event: ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(event.target.files ?? []);
        event.target.value = "";
        if (selectedFiles.length === 0) return;

        setNotice(null);
        try {
            const csvTexts = await Promise.all(selectedFiles.map((file) => file.text()));

            const { content: mergedContent, summary } = applyLinkedInImportToContent(
                currentContent,
                csvTexts,
            );
            updateCurrentDraft(() => mergedContent);

            const importedParts: string[] = [];
            if (summary.profileUpdated) importedParts.push("hồ sơ cá nhân");
            if (summary.educationUpdated) importedParts.push("học vấn");
            if (summary.experiencesAdded > 0) importedParts.push(`${summary.experiencesAdded} kinh nghiệm`);
            if (summary.skillsAdded > 0) importedParts.push(`${summary.skillsAdded} kỹ năng`);

            if (importedParts.length === 0) {
                setNotice({
                    kind: "error",
                    text: "Không có dữ liệu mới nào được nhập (tệp CSV không đúng định dạng LinkedIn hoặc các mục đã tồn tại).",
                });
                return;
            }

            setNotice({
                kind: "success",
                text: `Đã nhập từ LinkedIn CSV (${locale.toUpperCase()}): ${importedParts.join(", ")}. Bấm 'Lưu bản ${locale.toUpperCase()}' để áp dụng.`,
            });
        } catch (err) {
            setNotice({
                kind: "error",
                text: err instanceof Error ? err.message : "Không thể đọc tệp CSV từ LinkedIn",
            });
        }
    };

    const handleSyncGitHub = async () => {
        setSyncingGithub(true);
        setNotice(null);
        setGithubNotice(null);
        try {
            const res = await fetch("/api/admin/sync/github", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${adminToken}`,
                },
                body: JSON.stringify({ username: "GiabBaoo", includeForks: false }),
            });

            if (res.status === 401) {
                handleLogout();
                return;
            }

            let body: {
                ok?: boolean;
                projects?: Project[];
                error?: { message?: string };
            } = {};
            try {
                body = (await res.json()) as typeof body;
            } catch {
                body = {};
            }

            if (!res.ok || !body.ok || !Array.isArray(body.projects)) {
                throw new Error(
                    body.error?.message || `Đồng bộ dự án từ GitHub thất bại (HTTP ${res.status})`,
                );
            }

            const syncedProjects = body.projects;
            let baseDrafts = drafts;
            if (activeTab === "json") {
                try {
                    const parsedJson = JSON.parse(jsonBuffer) as PortfolioContent;
                    baseDrafts = { ...drafts, [locale]: parsedJson };
                } catch {
                    baseDrafts = drafts;
                }
            }

            const nextVi: PortfolioContent = {
                ...baseDrafts.vi,
                projects: mergeGitHubProjectsIntoList(baseDrafts.vi.projects, syncedProjects),
            };
            const nextEn: PortfolioContent = {
                ...baseDrafts.en,
                projects: mergeGitHubProjectsIntoList(baseDrafts.en.projects, syncedProjects),
            };

            setDrafts({ vi: nextVi, en: nextEn });
            setJsonBuffer(JSON.stringify(locale === "vi" ? nextVi : nextEn, null, 2));

            const successNotice = {
                kind: "success" as const,
                text: `Đã đồng bộ ${syncedProjects.length} dự án từ GitHub (lấy từ README.md) cho cả 2 bản VI và EN. Bấm 'Lưu cả 2 bản (VI & EN)' để áp dụng.`,
            };
            setGithubNotice(successNotice);
            setNotice(successNotice);
        } catch (err) {
            const errorNotice = {
                kind: "error" as const,
                text: err instanceof Error ? err.message : "Có lỗi xảy ra khi đồng bộ GitHub",
            };
            setGithubNotice(errorNotice);
            setNotice(errorNotice);
        } finally {
            setSyncingGithub(false);
        }
    };

    const renderLinkedInImportSection = () => (
        <section className="border-border-subtle bg-surface-primary flex flex-wrap items-center justify-between gap-4 rounded-xl border p-5">
            <div className="space-y-1">
                <h2 className="text-sm font-semibold">Import từ LinkedIn CSV ({locale.toUpperCase()})</h2>
                <p className="text-text-muted text-xs">
                    Chọn cùng lúc nhiều tệp xuất từ LinkedIn (Profile.csv, Education.csv, Positions.csv, Skills.csv) để
                    trộn vào bản nháp hiện tại.
                </p>
            </div>
            <label className="bg-accent-primary text-accent-contrast hover:bg-accent-hover cursor-pointer rounded-md px-3.5 py-2 text-xs font-medium">
                Chọn file CSV LinkedIn
                <input
                    type="file"
                    accept=".csv,text/csv"
                    multiple
                    className="hidden"
                    onChange={(e) => void handleLinkedInCsvImport(e)}
                />
            </label>
        </section>
    );

    if (!isAuthenticated) {
        return (
            <div className="bg-bg-primary text-text-primary flex min-h-screen items-center justify-center px-4">
                <form
                    onSubmit={(e) => void handleLoginSubmit(e)}
                    className="border-border-subtle bg-surface-primary w-full max-w-md space-y-4 rounded-xl border p-6 shadow-sm"
                >
                    <div>
                        <h1 className="text-lg font-semibold">Đăng nhập Portfolio CMS</h1>
                        <p className="text-text-muted text-xs">
                            Nhập mật khẩu quản trị (ADMIN_PASSWORD) để chỉnh sửa nội dung, ảnh đại diện và CV.
                        </p>
                    </div>

                    {authError && (
                        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                            {authError}
                        </div>
                    )}

                    <label className="block space-y-1 text-sm">
                        <span className="font-medium">Mật khẩu quản trị</span>
                        <input
                            type="password"
                            required
                            autoFocus
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                            placeholder="Nhập mật khẩu..."
                            className="border-border-strong bg-bg-primary w-full rounded-md border px-3 py-2"
                        />
                    </label>

                    <div className="flex items-center justify-between pt-1">
                        <Link to="/vi" className="text-text-muted hover:text-text-primary text-xs underline">
                            ← Quay về trang chủ
                        </Link>
                        <button
                            type="submit"
                            disabled={authChecking}
                            className="bg-accent-primary text-accent-contrast hover:bg-accent-hover rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
                        >
                            {authChecking ? "Đang kiểm tra..." : "Đăng nhập"}
                        </button>
                    </div>
                </form>
            </div>
        );
    }

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
                                {saving
                                    ? "Đang lưu..."
                                    : locale === "vi"
                                        ? "Lưu cả 2 bản (VI & EN)"
                                        : "Lưu bản EN"}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="border-border-strong text-text-secondary hover:text-text-primary rounded-md border px-3 py-1.5 text-sm font-medium"
                        >
                            Đăng xuất
                        </button>
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
                                {renderLinkedInImportSection()}
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
                                {renderLinkedInImportSection()}
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

                                <section className="border-border-subtle bg-surface-primary space-y-4 rounded-xl border p-6">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <h2 className="text-base font-semibold">
                                            Dự án nổi bật ({currentContent.projects.length})
                                        </h2>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <button
                                                type="button"
                                                disabled={syncingGithub}
                                                onClick={() => void handleSyncGitHub()}
                                                className="border-border-strong hover:bg-surface-muted rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                                            >
                                                {syncingGithub ? "Đang đồng bộ..." : "Đồng bộ từ GitHub (GiabBaoo)"}
                                            </button>
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
                                    </div>

                                    {githubNotice && (
                                        <div
                                            role={githubNotice.kind === "error" ? "alert" : "status"}
                                            className={`rounded-lg border px-4 py-2.5 text-xs ${githubNotice.kind === "success"
                                                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                                : "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300"
                                                }`}
                                        >
                                            {githubNotice.text}
                                        </div>
                                    )}

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