import { useEffect, useState } from "react";
import type { PortfolioPublicResponse } from "@giabao-portfolio/shared";
import type { Locale } from "../i18n/index.ts";
import { getPortfolioContent, type PortfolioContent } from "./index.ts";

let cachedPublicData: PortfolioPublicResponse | null = null;
let inflightRequest: Promise<PortfolioPublicResponse | null> | null = null;

export function invalidatePortfolioCache(): void {
    cachedPublicData = null;
    inflightRequest = null;
}

async function fetchPublicPortfolio(): Promise<PortfolioPublicResponse | null> {
    if (import.meta.env.MODE === "test") {
        return null;
    }
    if (cachedPublicData) {
        return cachedPublicData;
    }
    if (inflightRequest) {
        return inflightRequest;
    }

    inflightRequest = fetch("/api/portfolio", {
        headers: { Accept: "application/json" },
    })
        .then(async (res) => {
            if (!res.ok) {
                return null;
            }
            const data = (await res.json()) as PortfolioPublicResponse;
            if (data && data.ok) {
                cachedPublicData = data;
                return data;
            }
            return null;
        })
        .catch(() => null)
        .finally(() => {
            inflightRequest = null;
        });

    return inflightRequest;
}

function mergePortfolioContent(
    locale: Locale,
    remote: PortfolioPublicResponse | null,
): PortfolioContent {
    const fallback = getPortfolioContent(locale);
    if (!remote) {
        return fallback;
    }

    const base = remote.contentByLocale[locale] ?? fallback;
    const avatarUrl = remote.media.avatar?.url ?? base.profile.avatarUrl;
    const cvUrl = remote.media.cv ? `${remote.media.cv.url}&download=1` : base.profile.cvUrl;

    return {
        ...base,
        profile: {
            ...base.profile,
            avatarUrl,
            cvUrl,
        },
    };
}

export function usePortfolioData(locale: Locale): PortfolioContent {
    const [content, setContent] = useState<PortfolioContent>(() =>
        mergePortfolioContent(locale, cachedPublicData),
    );

    useEffect(() => {
        let active = true;
        setContent(mergePortfolioContent(locale, cachedPublicData));

        void fetchPublicPortfolio().then((remote) => {
            if (active && remote) {
                setContent(mergePortfolioContent(locale, remote));
            }
        });

        return () => {
            active = false;
        };
    }, [locale]);

    return content;
}