import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { ThemeProvider } from "./app/providers/ThemeProvider.tsx";
import { router } from "./app/router.tsx";
import { ErrorBoundary } from "./components/ui/ErrorBoundary.tsx";
import { clearChunkReloadFlag } from "./lib/chunk-error.ts";
import "./styles/index.css";

clearChunkReloadFlag();

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root was not found in DOM.");
}

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider>
      <ErrorBoundary>
        <RouterProvider router={router} />
      </ErrorBoundary>
    </ThemeProvider>
  </StrictMode>,
);
