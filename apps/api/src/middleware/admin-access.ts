import type { MiddlewareHandler } from "hono";
import type { AppBindings } from "../env.ts";
import { ApiError } from "./error-handler.ts";

function constantTimeEqual(a: string, b: string): boolean {
    const encoder = new TextEncoder();
    const bytesA = encoder.encode(a);
    const bytesB = encoder.encode(b);
    if (bytesA.length !== bytesB.length) {
        return false;
    }
    let diff = 0;
    for (let i = 0; i < bytesA.length; i += 1) {
        diff |= bytesA[i]! ^ bytesB[i]!;
    }
    return diff === 0;
}

export const adminAccessMiddleware: MiddlewareHandler<{ Bindings: AppBindings }> = async (
    c,
    next,
) => {
    const configuredPassword = c.env.ADMIN_PASSWORD?.trim();

    if (!configuredPassword) {
        if (c.env.APP_ENV !== "production") {
            c.set("adminEmail" as never, "admin@local" as never);
            await next();
            return;
        }
        throw new ApiError(503, "SERVICE_UNAVAILABLE", "Chưa cấu hình ADMIN_PASSWORD trên máy chủ");
    }

    const authHeader = c.req.header("authorization")?.trim() ?? "";
    const bearerToken = authHeader.toLowerCase().startsWith("bearer ")
        ? authHeader.slice(7).trim()
        : "";

    if (!bearerToken || !constantTimeEqual(bearerToken, configuredPassword)) {
        throw new ApiError(401, "UNAUTHORIZED", "Mật khẩu quản trị không đúng hoặc đã hết phiên");
    }

    c.set("adminEmail" as never, "truyennguyen744@gmail.com" as never);
    await next();
};