import { lazy, Suspense } from "react";
import { createBrowserRouter, type RouteObject } from "react-router";
import { HomePage } from "../pages/HomePage.tsx";
import { RouteErrorPage } from "../pages/RouteErrorPage.tsx";
import { LocaleLayout, RootRedirect } from "./layout/LocaleLayout.tsx";

const ProjectDetailPage = lazy(() =>
  import("../pages/ProjectDetailPage.tsx").then((module) => ({
    default: module.ProjectDetailPage,
  })),
);

const NotFoundPage = lazy(() =>
  import("../pages/NotFoundPage.tsx").then((module) => ({
    default: module.NotFoundPage,
  })),
);

const routeLoadingFallback = <div className="min-h-[60vh]" aria-hidden="true" />;

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <RootRedirect />,
    errorElement: <RouteErrorPage />,
  },
  {
    path: "/:locale",
    element: <LocaleLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "projects/:slug",
        element: (
          <Suspense fallback={routeLoadingFallback}>
            <ProjectDetailPage />
          </Suspense>
        ),
      },
      {
        path: "*",
        element: (
          <Suspense fallback={routeLoadingFallback}>
            <NotFoundPage />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: "*",
    element: <RootRedirect />,
    errorElement: <RouteErrorPage />,
  },
];

export const router = createBrowserRouter(routes);
