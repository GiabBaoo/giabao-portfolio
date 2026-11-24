const CHUNK_RELOAD_STORAGE_KEY = "giabao-portfolio-chunk-reload";

const CHUNK_ERROR_PATTERNS = [
  /ChunkLoadError/i,
  /Loading chunk [\w-]+ failed/i,
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /error loading dynamically imported module/i,
];

export function isChunkLoadError(error: unknown): boolean {
  if (!error) {
    return false;
  }

  const message =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : typeof error === "string"
        ? error
        : "";

  return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

export function attemptOneTimeChunkReload(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const alreadyReloaded = window.sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY);
    if (alreadyReloaded === "1") {
      return false;
    }
    window.sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, "1");
    window.location.reload();
    return true;
  } catch {
    return false;
  }
}

export function clearChunkReloadFlag(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.removeItem(CHUNK_RELOAD_STORAGE_KEY);
  } catch {
    // Ignore storage errors in restricted environments
  }
}
