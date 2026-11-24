# 06 – Hướng dẫn Cấu hình Bảo mật & Anti-spam cho Contact API

> Phạm vi: Checkpoint 5.3 – Security & Anti-spam (Backend Contact API).
> Lưu ý: Tích hợp widget Turnstile trên giao diện frontend (`ContactSection.tsx`) thuộc checkpoint frontend tiếp theo; tài liệu này tập trung vào cấu hình và vận hành phía Worker/Backend.

---

## 1. Phân biệt Cấu hình Công khai và Secret Nội bộ

Tuyệt đối không commit bất kỳ secret thật nào vào Git.

| Tên biến | Phân loại | Nơi sử dụng | Mục đích |
|---|---|---|---|
| `VITE_TURNSTILE_SITE_KEY` *(dự kiến cho frontend)* | **Public configuration** | Frontend (trình duyệt) | Site Key để hiển thị widget Cloudflare Turnstile ở checkpoint frontend tiếp theo |
| `TURNSTILE_EXPECTED_HOSTNAME` | **Public configuration** | Worker (`wrangler.jsonc` `vars`) | Hostname kỳ vọng khớp với trường `hostname` mà Siteverify trả về (`localhost` ở local; `<worker>.<subdomain>.workers.dev` ở production) |
| `TURNSTILE_EXPECTED_ACTION` *(tùy chọn)* | **Public configuration** | Worker (`wrangler.jsonc` `vars`) | Tên action kỳ vọng (ví dụ `contact_form`) nếu bật kiểm tra action cho widget Turnstile |
| `TURNSTILE_SECRET_KEY` | **Private secret** | Chỉ Worker (`.dev.vars` local / `wrangler secret put` production) | Khóa bí mật gọi Cloudflare Turnstile Siteverify từ backend |
| `IP_HASH_SALT` | **Private secret** | Chỉ Worker (`.dev.vars` local / `wrangler secret put` production) | Muối bí mật dùng cho `SHA-256(IP + IP_HASH_SALT)` trước khi lưu `ip_hash` vào D1 |

---

## 2. Tạo Cloudflare Turnstile Widget & Lấy Key

1. Đăng nhập **Cloudflare Dashboard** → chọn mục **Turnstile** → nhấn **Add widget**.
2. Nhập tên widget (ví dụ `giabao-portfolio-contact`).
3. Trong mục **Add Hostnames**, khai báo hostname production (ví dụ `<worker-name>.<subdomain>.workers.dev`). Khi cần thử nghiệm thủ công trên máy cục bộ, sử dụng bộ **Cloudflare Turnstile Test Keys** chính thức thay vì mở `localhost` cho production key.
4. Chọn **Widget Mode** phù hợp (khuyến nghị `Managed`).
5. Sau khi tạo, Cloudflare cung cấp 2 giá trị:
   - **Site Key** (công khai – dành cho frontend ở checkpoint tiếp theo).
   - **Secret Key** (bí mật – chỉ cấu hình vào Worker secret `TURNSTILE_SECRET_KEY`, không bao giờ đặt ở frontend hay commit lên Git).

---

## 3. Cấu hình Rate Limiting Binding trong Wrangler

File `apps/api/wrangler.jsonc` đã khai báo Cloudflare Workers Rate Limiting binding:

```jsonc
"ratelimits": [
  {
    "name": "RATE_LIMITER",
    "namespace_id": "1001",
    "simple": {
      "limit": 5,
      "period": 60
    }
  }
]
```

**Lưu ý kỹ thuật quan trọng:**
- Khóa đếm được tạo từ header `CF-Connecting-IP` do Cloudflare gắn vào request; backend không tin tưởng `X-Forwarded-For` hay header IP do client tự gửi.
- Cloudflare Workers Rate Limiting hoạt động **theo từng location/colo** và mang tính **eventual consistency** (nhất quán sau cùng). Đây là lớp giảm tải spam phù hợp với portfolio cá nhân, **không phải** bộ đếm toàn cầu tuyệt đối hay hệ thống chống DDoS hoàn chỉnh.
- Không sử dụng `Map` trong bộ nhớ Worker để giả lập rate limiting production.

---

## 4. Cấu hình Biến Môi trường Local và Production

### 4.1 Môi trường Local (`apps/api/.dev.vars`)

File `.dev.vars` đã được đưa vào `.gitignore` và **chỉ** nạp khi chạy cục bộ (không bao giờ deploy lên production). Sao chép từ `apps/api/.dev.vars.example` sang `apps/api/.dev.vars`:

```ini
APP_ENV="development"

# Khóa kiểm thử Turnstile của Cloudflare (chỉ dùng cho local dev/E2E)
# Dummy secret luôn pass của Cloudflare trả về hostname = "example.com" và metadata.result_with_testing_key = true
TURNSTILE_SECRET_KEY="1x0000000000000000000000000000000AA"
TURNSTILE_EXPECTED_HOSTNAME="example.com"

# Chuỗi ngẫu nhiên đủ dài dùng để hash IP ở local (không dùng chung với production)
IP_HASH_SALT="replace-with-local-random-salt"
```

Trong production (`APP_ENV="production"` hoặc khi không khai báo `APP_ENV`), backend tự động từ chối Cloudflare dummy test secret, hostname cục bộ/test (`localhost`, `127.0.0.1`, `example.com`) và phản hồi có `metadata.result_with_testing_key === true`. Nếu bật kiểm tra action, thêm `TURNSTILE_EXPECTED_ACTION` vào mục `vars`.

### 4.2 Môi trường Production (khi đến giai đoạn deploy)

1. Cập nhật `TURNSTILE_EXPECTED_HOSTNAME` trong `apps/api/wrangler.jsonc` sang đúng hostname production (ví dụ `<worker-name>.<subdomain>.workers.dev`).
2. Nạp Worker secrets bằng Wrangler CLI (từ thư mục `apps/api`):

```bash
pnpm --filter @giabao-portfolio/api exec wrangler secret put TURNSTILE_SECRET_KEY
pnpm --filter @giabao-portfolio/api exec wrangler secret put IP_HASH_SALT
```

Khuyến nghị tạo `IP_HASH_SALT` ngẫu nhiên tối thiểu 32 byte (ví dụ `openssl rand -hex 32`).

---

## 5. Pipeline Bảo mật, Hash IP (Pseudonymization) và User-Agent

### 5.1 Thứ tự Pipeline `POST /api/contact`

1. **Content-Type:** Bắt buộc `application/json` (`415 UNSUPPORTED_MEDIA_TYPE`).
2. **Body size limit:** Giới hạn tối đa 10 KB (`413 PAYLOAD_TOO_LARGE`).
3. **Rate Limiting:** Kiểm tra qua Workers binding `RATE_LIMITER` theo `CF-Connecting-IP` (`429 RATE_LIMITED`; nếu thiếu hoặc lỗi binding thì trả `500 INTERNAL_ERROR`, không bypass).
4. **Parse JSON object:** Từ chối body rỗng, JSON lỗi cú pháp hoặc không phải object (`400 VALIDATION_ERROR`).
5. **Honeypot (`website`):** Kiểm tra trực tiếp từ JSON object sau khi parse. Chỉ coi là bot nếu `website` là `string` và sau `.trim()` có nội dung → trả `201 { "ok": true }` giả, không gọi Turnstile, không ghi D1, không log nội dung honeypot. `website` rỗng/chỉ có khoảng trắng được xử lý như người dùng bình thường.
6. **Zod validation:** Loại bỏ trường `website` trước khi đưa vào `contactSubmissionSchema.safeParse()` để bot gửi `website` sai kiểu không nhận được lỗi validation tiết lộ honeypot.
7. **Cloudflare Turnstile Siteverify:** Gửi `POST` tới Siteverify API. Timeout (`AbortController`) bao phủ **toàn bộ quá trình `fetch()` và đọc response body (`response.json()`)** và chỉ `clearTimeout` trong `finally`. Timeout/lỗi mạng/5xx/thiếu cấu hình trả `503 TURNSTILE_UNAVAILABLE`; token/hostname/action không hợp lệ trả `403 TURNSTILE_FAILED`.
8. **IP hashing:** Băm `SHA-256(IP + IP_HASH_SALT)` bằng Web Crypto.
9. **User-Agent normalization:** Cắt tối đa 512 ký tự (tùy chọn).
10. **D1 insert:** Ghi dữ liệu đã chuẩn hóa bằng prepared statement.

### 5.2 Chính sách `IP_HASH_SALT`, Hash IP và User-Agent

- **Hash IP:** Backend chỉ đọc `CF-Connecting-IP`, băm bằng Web Crypto `SHA-256(IP + IP_HASH_SALT)` ra chuỗi hexadecimal 64 ký tự và lưu vào cột `ip_hash`. IP gốc không bao giờ được lưu vào D1 hoặc ghi vào log.
- **Chính sách `IP_HASH_SALT`:**
  - **Local:** Cho phép thiếu `IP_HASH_SALT` để không cản trở phát triển cục bộ; khi thiếu salt, API lưu `ip_hash = NULL`, ghi cảnh báo an toàn `[api] ip_hash_salt_missing` và **không** từ chối lưu contact, **không** ghi log IP gốc hay salt.
  - **Production:** **Bắt buộc** cấu hình `IP_HASH_SALT` qua `wrangler secret put IP_HASH_SALT` trước khi deploy (xem mục 7 – Pre-deploy Checklist).
- **Bản chất quyền riêng tư:** `ip_hash` là dữ liệu **giả danh hóa (pseudonymized)**, không phải dữ liệu ẩn danh tuyệt đối (do không gian địa chỉ IPv4 hữu hạn và phụ thuộc vào độ bí mật của `IP_HASH_SALT`).
- **Thiếu `CF-Connecting-IP`:** API không đọc `X-Forwarded-For`, không sinh hash giả, lưu `ip_hash = NULL` và vẫn xử lý an toàn không crash.
- **User-Agent:** Tùy chọn, được cắt tối đa 512 ký tự trước khi lưu vào cột `user_agent`, không dùng làm yếu tố xác thực danh tính và không ghi toàn bộ vào log.

---

## 6. Chạy Kiểm thử Local & Phân biệt Môi trường Kiểm thử

```bash
# Chạy toàn bộ kiểm tra
pnpm lint
pnpm typecheck
pnpm test
pnpm build

# Hoặc chạy riêng test của API
pnpm --filter @giabao-portfolio/api test
```

### 6.1 Phân biệt 3 cấp độ môi trường kiểm thử

| Cấp độ | Phạm vi xác minh | Giới hạn |
|---|---|---|
| **Mock test** | Hành vi Turnstile Siteverify (token đúng/sai, hostname/action mismatch, HTTP 5xx, JSON hỏng, timeout `fetch` và timeout khi response body bị treo), `RATE_LIMITER` lỗi/undefined, D1 lỗi | Không gọi mạng Cloudflare thật |
| **Miniflare local runtime** (`@cloudflare/vitest-plugin`) | Workers runtime (`workerd`), D1 local đã chạy migration, `env.RATE_LIMITER` local (đã xác minh chặn request thứ 6 với cấu hình `limit: 5 / 60s`), Web Crypto SHA-256, honeypot, pipeline đầy đủ | Chạy cục bộ trên 1 tiến trình; không mô phỏng edge colo toàn cầu, `CF-Connecting-IP` thật hay Worker Secrets production |
| **Cloudflare production** | Edge network, `CF-Connecting-IP` thật, `RATE_LIMITER` theo từng colo (eventual consistency), Turnstile Siteverify thật với widget frontend, Cloudflare Secrets, D1 remote | **Chưa triển khai và chưa xác minh** trong Checkpoint 5.3 |

### 6.2 Ghi nhận trạng thái kiểm thử Checkpoint 5.3

- **Baseline trước đó (48 tests):** Không thể xác nhận PASS do không có log chạy hoàn chỉnh.
- **Baseline trong sandbox:** Gặp lỗi khởi tạo `workerd` (`MiniflareCoreError [ERR_RUNTIME_FAILURE]: No such module "cloudflare:test-internal"`), không thể chạy API test trong sandbox.
- **Kết quả trước lượt sửa cuối (chạy ngoài sandbox):** 66 tests PASS.
- **Kết quả sau lượt sửa cuối Checkpoint 5.3 (chạy ngoài sandbox):** 71 tests PASS (13 `packages/shared`, 21 `apps/web`, 37 `apps/api`).
- **Kết quả Stage 6 Remediation (2026-11-23, chạy thực tế trên code hiện tại):** **102 tests PASS** (13 `packages/shared`, 51 `apps/web`, 38 `apps/api` chạy ngoài sandbox trên Miniflare/`workerd`), kèm xác minh live preview headers (`_headers` + `/api/*`).

---

## 7. Pre-deploy Checklist & Hạng mục Chỉ Xác minh Được Trên Cloudflare Production

### 7.1 Pre-deploy Checklist (Bắt buộc trước khi deploy production)

- [ ] Đã tạo Turnstile widget production trên Cloudflare Dashboard cho đúng hostname (`<worker-name>.<subdomain>.workers.dev`).
- [ ] Đã cập nhật `TURNSTILE_EXPECTED_HOSTNAME` trong `apps/api/wrangler.jsonc` khớp hostname production.
- [ ] Đã nạp secret `TURNSTILE_SECRET_KEY` bằng `wrangler secret put TURNSTILE_SECRET_KEY`.
- [ ] **Bắt buộc:** Đã tạo muối ngẫu nhiên tối thiểu 32 byte (vd `openssl rand -hex 32`) và nạp secret `IP_HASH_SALT` bằng `wrangler secret put IP_HASH_SALT`.
- [ ] Đã kiểm tra cấu hình `ratelimits` (`RATE_LIMITER`, `limit: 5`, `period: 60`) trong `apps/api/wrangler.jsonc`.
- [ ] Đã áp dụng D1 migration lên remote (`wrangler d1 migrations apply giabao-portfolio-db --remote`).
- [ ] Đã xác nhận không có file `.dev.vars` hay secret thật nào nằm trong Git.

### 7.2 Những Hạng mục Chỉ Xác minh Được Sau Khi Deploy Cloudflare

Các kiểm thử tự động hiện tại xác minh logic pipeline, Zod validation, D1 local, honeypot, hash IP, User-Agent, `RATE_LIMITER` cục bộ trên Miniflare và hành vi mock của Rate Limiter / Turnstile Siteverify. Các hạng mục sau **chỉ có thể xác minh thực tế sau khi deploy lên Cloudflare Workers**:

1. **Cloudflare Workers Rate Limiting binding thật (`RATE_LIMITER`):** Hành vi thực tế của giới hạn 5 req / 60s theo từng edge colo và đặc tính eventual consistency trên hạ tầng Cloudflare.
2. **Header `CF-Connecting-IP` thật:** Do mạng edge của Cloudflare tự động gắn vào request từ Internet (môi trường local/test phải tự truyền header mô phỏng).
3. **Cloudflare Turnstile Siteverify thật:** Xác thực token sinh ra từ Turnstile widget thật trên trình duyệt (sau khi hoàn thành checkpoint tích hợp frontend `ContactSection.tsx`), khớp `hostname` production (`*.workers.dev`) và `action` thật.
4. **Worker Secrets production (`wrangler secret put`):** Khả năng đọc `TURNSTILE_SECRET_KEY` và `IP_HASH_SALT` từ Cloudflare Secrets runtime.
5. **Cloudflare D1 remote:** Áp dụng migration và ghi bản ghi thật trên D1 production.
