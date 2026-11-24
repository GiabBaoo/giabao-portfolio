# Thư mục D1 Migrations

Thư mục này lưu các file SQL migration cho Cloudflare D1 (`migrations_dir` trong `apps/api/wrangler.jsonc`).

## Danh sách Migration hiện có

- `0001_create_contact_messages.sql`: Tạo bảng `contact_messages` kèm các ràng buộc `CHECK` đồng bộ với Zod schema tại `packages/shared` và các index cho `created_at`, `status`.

## Áp dụng cục bộ

```bash
pnpm --filter @giabao-portfolio/api exec wrangler d1 migrations apply giabao-portfolio-db --local
```
