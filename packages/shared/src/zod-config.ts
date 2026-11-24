import { z } from "zod";

/**
 * Tắt JIT compilation của Zod v4 để tránh `new Function()` probe dưới CSP nghiêm ngặt
 * (không cần thêm `'unsafe-eval'` vào `script-src`).
 * Module này phải được import trước khi khởi tạo bất kỳ schema nào.
 */
z.config({ jitless: true });
