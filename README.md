# Gia Bao Portfolio

Dự án Monorepo xây dựng trang web Portfolio cá nhân sử dụng **React + TypeScript + Vite + Tailwind CSS + React Router** cho Frontend, **Hono** cho Backend API và triển khai thống nhất trên một **Cloudflare Worker** duy nhất với **Workers Static Assets** và **Cloudflare D1**.

> Trạng thái hiện tại: **Stage 6 – Integration, Testing & Hardening (đã hoàn tất triển khai kỹ thuật & kiểm thử tự động; chờ chạy kiểm toán Lighthouse/axe trên trình duyệt để chốt cổng phê duyệt trước Stage 7)**.

## Cấu trúc Monorepo

```text
giabao-portfolio/
├── apps/
│   ├── web/            # React SPA (Vite, Tailwind CSS, React Router, @cloudflare/vite-plugin)
│   └── api/            # Hono API Worker (wrangler.jsonc, /api/health, Vitest Workers)
├── packages/
│   └── shared/         # Zod schemas & TypeScript types dùng chung
├── db/
│   └── migrations/     # SQL migrations cho Cloudflare D1 (0001_create_contact_messages.sql)
├── docs/               # Bộ tài liệu yêu cầu, nội dung, kiến trúc, lộ trình & ADR
├── eslint.config.js
├── tsconfig.base.json
├── pnpm-workspace.yaml
└── package.json
```

## Yêu cầu môi trường

- **Node.js**: >= 22 LTS (xem `.nvmrc`)
- **pnpm**: >= 10

## Cài đặt & Phát triển cục bộ

```bash
# Cài đặt toàn bộ dependencies
pnpm install

# Chạy đồng thời Frontend (React SPA) và Backend API (/api/*) trên Cloudflare Workers runtime
pnpm dev
```

Sau khi khởi động `pnpm dev`:

- Giao diện SPA: `http://localhost:5173/`
- API Health check: `http://localhost:5173/api/health`

## Các lệnh chính (Root Scripts)

| Lệnh                | Mô tả                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| `pnpm dev`          | Khởi chạy dev server cục bộ tích hợp Cloudflare Vite Plugin (SPA + Worker API)                  |
| `pnpm build`        | Build `packages/shared`, React SPA và Worker bundle                                             |
| `pnpm preview`      | Xem trước bản build production trong môi trường Workers cục bộ                                  |
| `pnpm lint`         | Kiểm tra chất lượng mã nguồn bằng ESLint                                                        |
| `pnpm typecheck`    | Kiểm tra kiểu dữ liệu TypeScript toàn bộ workspace                                              |
| `pnpm test`         | Chạy unit/component/integration tests (`shared`, `web`, `api` trên Workers runtime) bằng Vitest |
| `pnpm format`       | Tự động định dạng mã nguồn bằng Prettier                                                        |
| `pnpm format:check` | Kiểm tra định dạng mã nguồn bằng Prettier                                                       |

## Tài liệu dự án

Xem thư mục [`docs/`](./docs/) để theo dõi đầy đủ yêu cầu, kiểm kê nội dung, kiến trúc, lộ trình phát triển và nhật ký quyết định kỹ thuật (ADR).
