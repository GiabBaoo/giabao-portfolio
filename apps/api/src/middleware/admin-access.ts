import type { MiddlewareHandler } from "hono";
import type { AppBindings } from "../env.ts";
import { ApiError } from "./error-handler.ts";

const ALLOWED_ADMIN_EMAIL = "truyennguyen744@gmail.com";

export const adminAccessMiddleware: MiddlewareHandler<{ Bindings: AppBindings }> = async (
    c,
    next,
) => {
    // Cho phép test trực tiếp trên môi trường local dev
    if (c.env.APP_ENV !== "production") {
        c.set("adminEmail" as never, ALLOWED_ADMIN_EMAIL as never);
        await next();
        return;
    }

    const accessJwt = c.req.header("cf-access-jwt-assertion");
    if (!accessJwt || accessJwt.trim().length === 0) {
        throw new ApiError(401, "UNAUTHORIZED", "Yêu cầu xác thực qua Cloudflare Access");
    }

    const authenticatedEmail = c.req.header("cf-access-authenticated-user-email")?.trim().toLowerCase();
    if (authenticatedEmail && authenticatedEmail !== ALLOWED_ADMIN_EMAIL) {
        throw new ApiError(403, "FORBIDDEN", "Tài khoản không có quyền quản trị");
    }

    c.set("adminEmail" as never, (authenticatedEmail || ALLOWED_ADMIN_EMAIL) as never);
    await next();
};