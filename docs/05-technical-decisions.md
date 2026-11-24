# 05 – Nhật ký Quyết định Kỹ thuật (ADR Log)

> Định dạng: Architecture Decision Records (ADR – Hồ sơ ghi nhận các quyết định kiến trúc) rút gọn. Các giá trị trạng thái: Đề xuất (Proposed) / Đã chấp thuận (Accepted) / Đã thay thế (Superseded).
> Toàn bộ các ADR dưới đây đang ở trạng thái **Đề xuất (Proposed)** cho đến khi chủ dự án phê duyệt Giai đoạn 1.

---

## ADR-001 – Sử dụng kiến trúc Monorepo với pnpm workspaces
- **Bối cảnh:** Giao diện frontend, hệ thống API và các lược đồ kiểm tra dữ liệu dùng chung cần được phát triển đồng bộ với nhau bởi một lập trình viên duy nhất.
- **Quyết định:** Sử dụng pnpm workspaces gồm các gói: `apps/web`, `apps/api`, `packages/shared`, `db/migrations`, `docs`.
- **Phương án thay thế đã cân nhắc:** Turborepo hoặc Nx (quá cồng kềnh cho 3 gói nhỏ); tách thành nhiều kho mã nguồn riêng (gây trùng lặp lược đồ kiểm tra dữ liệu, phức tạp hóa CI); gộp chung vào một gói duy nhất (làm mờ ranh giới giữa môi trường trình duyệt và Workers).
- **Hệ quả:** Chỉ cần cài đặt phụ thuộc một lần, một quy trình CI duy nhất; phân giải thư viện nhanh và chặt chẽ. Các lệnh ở thư mục gốc sử dụng cờ `pnpm -r`.

## ADR-002 – Một Cloudflare Worker duy nhất phục vụ cả SPA và API (Workers Static Assets) trên tên miền `*.workers.dev`
- **Bối cảnh:** Chủ dự án xác nhận sử dụng Cloudflare Workers, ưu tiên domain miễn phí dạng `*.workers.dev`, chưa mua custom domain và hiện chưa triển khai production.
- **Quyết định:** Triển khai một Worker duy nhất trên tên miền `*.workers.dev` (khi đến giai đoạn triển khai). Tài nguyên tĩnh được phục vụ trực tiếp bởi hạ tầng Cloudflare; các yêu cầu tới `/api/*` được định tuyến vào ứng dụng Hono thông qua cấu hình `run_worker_first`; các đường dẫn không khớp tài nguyên tĩnh sẽ được chuyển về `index.html` (`not_found_handling: "single-page-application"`).
- **Phương án thay thế đã cân nhắc:** Cloudflare Pages + Pages Functions (hiện tại Cloudflare khuyến nghị dùng trực tiếp Workers cho dự án mới); tách riêng Worker cho frontend và Worker cho API (phát sinh cấu hình CORS hoặc Service Bindings không cần thiết); mua custom domain ngay từ đầu (không cần thiết ở giai đoạn hiện tại vì `*.workers.dev` đáp ứng đầy đủ tính năng và miễn phí).
- **Hệ quả:** Cùng nguồn gốc tên miền (same-origin) trên `*.workers.dev` nên không cần bật CORS; triển khai một lần duy nhất; các yêu cầu tải file tĩnh không làm tiêu tốn lượt gọi hàm của Worker (nhanh và tiết kiệm chi phí); canonical URL và hostname của Turnstile sẽ được cấu hình theo domain `*.workers.dev` khi triển khai production.

## ADR-003 – Chọn Hono làm framework xây dựng API
- **Bối cảnh:** Cần một bộ định tuyến (router), cơ chế middleware và hỗ trợ định kiểu chặt chẽ cho các tài nguyên gắn kết (Bindings) trên môi trường Cloudflare Workers.
- **Quyết định:** Sử dụng Hono với kiểu `Bindings` tường minh; tận dụng middleware có sẵn như `bodyLimit`, `secureHeaders`; kiểm tra dữ liệu bằng Zod thông qua `@hono/zod-validator` hoặc gọi `safeParse` trực tiếp (sẽ chọn cách kiểm soát định dạng lỗi tốt nhất ở Giai đoạn 5).
- **Phương án thay thế đã cân nhắc:** Viết hàm xử lý `fetch` thuần (nhiều mã lặp lại); itty-router (hệ sinh thái nhỏ hơn); Express (không tương thích tự nhiên với môi trường Workers).
- **Hệ quả:** Tuân thủ các Web Standard APIs (chuẩn giao diện web quốc tế), tương thích hạng nhất với Cloudflare Workers, dung lượng gói mã nguồn rất nhỏ.

## ADR-004 – Chia sẻ lược đồ Zod giữa trình duyệt và máy chủ
- **Quyết định:** Đặt lược đồ kiểm tra dữ liệu liên hệ trong `packages/shared`; phía frontend dùng để phản hồi lỗi tức thì cho người dùng, phía máy chủ dùng làm chốt chặn kiểm tra có thẩm quyền cuối cùng.
- **Hệ quả:** Một nguồn quy định duy nhất cho mọi giới hạn dữ liệu; kiểu TypeScript được suy luận tự động bằng `z.infer`. Máy chủ tuyệt đối không phụ thuộc hay tin tưởng vào kết quả kiểm tra từ phía trình duyệt.

## ADR-005 – Giới hạn tần suất gửi bằng Workers Rate Limiting binding
- **Bối cảnh:** Endpoint liên hệ cần được giới hạn tần suất truy cập mà không làm phát sinh thêm hạ tầng lưu trữ phức tạp.
- **Quyết định:** Sử dụng **Rate Limiting binding** tích hợp sẵn của Cloudflare Workers (cấu hình `ratelimits`), khóa định danh là địa chỉ `CF-Connecting-IP`, ngưỡng đề xuất là 5 yêu cầu / chu kỳ 60 giây (binding hỗ trợ chu kỳ 10 giây hoặc 60 giây – sẽ kiểm tra lại thông số ở Giai đoạn 5).
- **Phương án thay thế đã cân nhắc:**
  - Dùng bảng đếm trong D1: nhất quán toàn cầu nhưng tốn thêm một lệnh ghi cơ sở dữ liệu cho mỗi yêu cầu và cần cơ chế dọn dẹp bản ghi cũ. Giữ lại làm phương án dự phòng đã được tài liệu hóa.
  - Durable Objects: đảm bảo tính nhất quán mạnh nhưng độ phức tạp vượt quá nhu cầu.
  - Quy tắc giới hạn tần suất trên Cloudflare WAF (Web Application Firewall): yêu cầu phải có tên miền riêng trên Cloudflare Zone; có thể bổ sung thêm ở tầng ngoài sau này.
- **Hệ quả:** Bộ đếm hoạt động theo từng trung tâm dữ liệu biên (edge location) và mang tính xấp xỉ – hoàn toàn phù hợp cho quy mô portfolio cá nhân vì Turnstile đã là lớp chống bot chính. Khi kiểm thử sẽ dùng mock binding.

## ADR-006 – Kiến trúc React SPA với React Router và chiến lược tối ưu SEO
- **Bối cảnh:** Nội dung trang web chủ yếu là thông tin tĩnh; yêu cầu công nghệ chỉ định rõ React + Vite + React Router.
- **Quyết định:** Xây dựng ứng dụng đơn trang kết xuất phía trình duyệt (Client-rendered SPA) với các đường dẫn có tiền tố ngôn ngữ (`/en/...`, `/vi/...`), kết hợp bộ giải pháp SEO toàn diện:
  - Thiết lập thẻ **canonical URL** (`<link rel="canonical">`) và thẻ ngôn ngữ thay thế (`hreflang`) cho từng route.
  - Nhúng đầy đủ các thẻ meta mặc định và bộ thẻ **Open Graph** (`og:title`, `og:description`, `og:image`, `og:url`, `og:type`, `og:locale`) ngay trong `index.html`, đồng thời cập nhật động tiêu đề/mô tả theo từng trang.
  - Cung cấp file tĩnh `sitemap.xml` và `robots.txt`.
  - Thực hiện bước **kiểm tra khả năng lập chỉ mục (indexability check)** của React SPA bằng công cụ kiểm toán SEO (Lighthouse, kiểm tra DOM kết xuất và công cụ kiểm tra URL của máy chủ tìm kiếm).
- **Phương án thay thế đã cân nhắc:** Các framework SSR/SSG (Server-Side Rendering / Static Site Generation như Next.js, Astro, hoặc React Router framework mode) – hỗ trợ SEO cho bot không chạy JS tốt hơn nhưng làm tăng độ phức tạp và nằm ngoài bộ công nghệ đã chốt.
- **Hệ quả:** Giữ được kiến trúc SPA gọn nhẹ đúng yêu cầu, đồng thời đảm bảo các trình thu thập dữ liệu tìm kiếm hiện đại và bot chia sẻ liên kết mạng xã hội nhận diện đầy đủ thông tin trang. Có thể xem xét kết xuất tĩnh trước (pre-rendering) ở các phiên bản sau nếu phát sinh nhu cầu.

## ADR-007 – Sử dụng Cloudflare D1 với SQL migrations thuần (không dùng ORM)
- **Bối cảnh:** Hệ thống chỉ có một bảng dữ liệu duy nhất; định vị chuyên môn của chủ dự án là lập trình viên tập trung vào cơ sở dữ liệu (database-focused).
- **Quyết định:** Viết trực tiếp các file SQL migration trong `db/migrations`, áp dụng qua lệnh `wrangler d1 migrations apply`; thực hiện truy vấn qua cơ chế prepared statements của D1.
- **Phương án thay thế đã cân nhắc:** Drizzle hoặc Kysely (hữu ích khi dự án có nhiều bảng phức tạp, nhưng lại che khuất năng lực viết SQL thuần mà portfolio này muốn thể hiện).
- **Hệ quả:** Câu lệnh SQL tường minh, dễ đánh giá chất lượng; các ràng buộc `CHECK` trong cơ sở dữ liệu phản chiếu chính xác giới hạn của Zod (phòng thủ theo chiều sâu); cấu hình `migrations_dir` trong `wrangler.jsonc` trỏ thẳng về thư mục gốc `db/migrations`.

## ADR-008 – Xác thực Turnstile phía máy chủ và phân tách mã trạng thái lỗi HTTP
- **Bối cảnh:** Biểu mẫu liên hệ cần được bảo vệ khỏi bot tự động bằng Cloudflare Turnstile, đồng thời API cần phân biệt rõ lỗi dữ liệu người dùng, lỗi xác thực token và lỗi sự cố từ dịch vụ bên thứ ba.
- **Quyết định:** Trình duyệt hiển thị widget Turnstile (chế độ explicit render) và gửi kèm token lên máy chủ; máy chủ gửi yêu cầu POST tới `https://challenges.cloudflare.com/turnstile/v0/siteverify` kèm theo khóa bí mật, token và `remoteip` (có thiết lập thời gian chờ – timeout). Phân tách mã phản hồi HTTP rõ ràng:
  - **HTTP 400 (`VALIDATION_ERROR`)**: Dữ liệu biểu mẫu không hợp lệ hoặc thiếu trường theo kiểm tra của Zod (thực hiện trước khi gọi Siteverify).
  - **HTTP 403 (`TURNSTILE_FAILED`)**: Dịch vụ Siteverify phản hồi bình thường nhưng trả về `success: false` (token không hợp lệ, đã hết hạn, đã được sử dụng hoặc không khớp `hostname`).
  - **HTTP 503 (`TURNSTILE_UNAVAILABLE`)**: Yêu cầu gọi tới Siteverify bị quá thời gian chờ (timeout), lỗi kết nối mạng hoặc máy chủ Siteverify trả về lỗi `5xx`. Hệ thống vẫn từ chối lưu tin nhắn để đảm bảo an toàn (fail closed), nhưng báo mã `503` để giao diện thông báo cho người dùng biết dịch vụ xác thực đang tạm thời gián đoạn và có thể thử lại.
- **Hệ quả:** Token của Turnstile chỉ dùng được một lần và hết hạn sau khoảng 300 giây → giao diện phải tự động làm mới (reset) widget sau mỗi lần gửi hoặc khi xảy ra lỗi. Môi trường phát triển cục bộ sử dụng bộ khóa kiểm thử (test keys) chính thức của Cloudflare.

## ADR-009 – Tự động hóa CI/CD bằng GitHub Actions
- **Quyết định (đề xuất):** Sử dụng GitHub Actions để chạy quy trình CI (lint, kiểm tra định dạng, kiểm tra kiểu dữ liệu, chạy test, đóng gói build) trên mỗi Pull Request; tự động triển khai khi gộp mã vào nhánh `main` thông qua `cloudflare/wrangler-action` (chạy migration D1 trước rồi mới deploy Worker).
- **Phương án thay thế đã cân nhắc:** Cloudflare Workers Builds (tích hợp Git trực tiếp trên Cloudflare) – cấu hình đơn giản hơn, nhưng việc kiểm soát thứ tự chạy migration trước khi deploy và chặn lỗi kiểm thử kém tường minh hơn.
- **Hệ quả:** File cấu hình quy trình CI/CD hiển thị công khai ngay trong kho mã nguồn – trở thành bằng chứng thực tế về quy trình kỹ thuật chuyên nghiệp trước nhà tuyển dụng.

## ADR-010 – Tự xây dựng bộ xử lý đa ngôn ngữ (i18n) có kiểu dữ liệu chặt chẽ
- **Quyết định:** Sử dụng các từ điển định kiểu TypeScript cho từng ngôn ngữ kết hợp với React context; không cài đặt thư viện ngoài như `i18next` hay `react-intl`.
- **Lý do:** Dự án chỉ có hai ngôn ngữ (Anh – Việt) với nội dung tĩnh, không có quy tắc số nhiều phức tạp; trình biên dịch TypeScript giúp kiểm tra sự đồng bộ giữa hai bộ từ điển ngay tại thời điểm viết mã.
- **Hệ quả:** Không phát sinh thư viện phụ thuộc; nếu sau này yêu cầu mở rộng (nhiều ngôn ngữ, định dạng ICU phức tạp) có thể dễ dàng chuyển sang thư viện chuyên dụng.

## ADR-011 – Quản lý giao diện Sáng/Tối bằng chiến lược `class` của Tailwind
- **Quyết định:** Gắn class `dark` lên thẻ `<html>`; giá trị khởi tạo ưu tiên lấy từ `localStorage` → thiết lập hệ thống `prefers-color-scheme`; được gán ngay bằng một đoạn script inline nhỏ trước khi trình duyệt vẽ khung hình đầu tiên.
- **Hệ quả:** Loại bỏ hoàn toàn hiện tượng chớp sai màu giao diện khi tải trang; chính sách `Content-Security-Policy` cần cho phép mã băm (hash) của đoạn script inline này.

## ADR-012 – Xử lý lỗi an toàn và bảo mật quyền riêng tư dữ liệu liên hệ
- **Bối cảnh:** Biểu mẫu liên hệ thu thập thông tin cá nhân của người gửi (họ tên, email, nội dung tin nhắn). Hệ thống cần đảm bảo an toàn thông tin và tuân thủ nguyên tắc bảo vệ quyền riêng tư.
- **Quyết định:**
  1. **Cấu trúc lỗi đồng nhất & Không lộ chi tiết nội bộ**: Mọi phản hồi lỗi đều tuân theo một khung JSON chuẩn với mã `code` cố định; bộ bắt lỗi toàn cục `app.onError` chỉ trả về thông báo `INTERNAL_ERROR` chung chung cho máy khách.
  2. **Chính sách hạn chế thu thập dữ liệu (Data Minimization)**: Chỉ lưu các trường tối thiểu cần thiết để chủ dự án phản hồi và chống thư rác.
  3. **Không lưu địa chỉ IP gốc**: Địa chỉ IP của máy khách không bao giờ được lưu trực tiếp; hệ thống chỉ lưu giá trị băm một chiều `SHA-256(ip + IP_HASH_SALT)` vào cột `ip_hash`.
  4. **Không ghi log nội dung tin nhắn**: Tuyệt đối không đưa nội dung trường `message`, địa chỉ `email`, họ tên hay IP gốc vào hệ thống log (`console.log` / `console.error` / Workers Logs). Chỉ ghi log mã lỗi kỹ thuật và ngữ cảnh hệ thống.
  5. **Không mở Endpoint công khai để đọc tin nhắn**: Không xây dựng bất kỳ API công khai nào cho phép truy xuất dữ liệu từ bảng `contact_messages`. Việc đọc tin nhắn chỉ được thực hiện nội bộ bởi chủ dự án qua công cụ quản trị Cloudflare D1 hoặc Wrangler CLI.
  6. **Thời hạn lưu trữ và kế hoạch xóa dữ liệu cũ**: Đề xuất thời hạn lưu trữ tối đa là **180 ngày** (**⚠ CHỜ XÁC NHẬN** phê duyệt từ chủ dự án). Các bản ghi quá 180 ngày sẽ được xóa định kỳ thông qua câu lệnh SQL (`DELETE FROM contact_messages WHERE created_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-180 days')`) được kích hoạt bởi Cloudflare Workers Cron Trigger hoặc lệnh bảo trì định kỳ.
- **Hệ quả:** Ngăn chặn rủi ro rò rỉ stack trace, câu lệnh SQL và dữ liệu cá nhân của người liên hệ; vẫn duy trì được khả năng chống lạm dụng hệ thống và giữ cơ sở dữ liệu gọn sạch.

## ADR-013 – Chiến lược kiểm thử với Vitest và Workers pool
- **Quyết định:** Sử dụng `@cloudflare/vitest-pool-workers` cho các bài kiểm thử API (chạy trực tiếp trên môi trường `workerd` thực tế, mỗi bài test có một cơ sở dữ liệu D1 cục bộ cô lập đã chạy sẵn migration); sử dụng `jsdom` + Testing Library cho giao diện web. Giữ chỉ số bao phủ mã nguồn (coverage) **≥ 90%** cho API và gói shared làm **mục tiêu tham khảo**, nhưng đặt ưu tiên cao nhất vào chất lượng kiểm thử các luồng nghiệp vụ chính và các tình huống lỗi quan trọng (`400`, `403`, `413`, `415`, `429`, `500`, `503`, bẫy honeypot, kiểm tra không lưu IP gốc).
- **Hệ quả:** Phát hiện sớm các lỗi không tương thích giữa Node.js và Cloudflare Workers; tránh việc chạy theo con số phần trăm hình thức mà bỏ sót các kịch bản lỗi thực tế. Cần kiểm tra tính tương thích phiên bản giữa Vitest và Workers pool ở Giai đoạn 2.

## ADR-014 – Chính sách tương thích với môi trường thực thi Cloudflare Workers
- **Quyết định:** Chỉ sử dụng các giao diện lập trình chuẩn Web (Web-standard APIs: `fetch`, Web Crypto, `Request`/`Response`). Chỉ bật cờ `nodejs_compat` khi một thư viện phụ thuộc bắt buộc phải dùng. Thiết lập `compatibility_date` ở mốc thời gian gần nhất.
- **Các lựa chọn đã xác nhận tương thích:** Hono (hỗ trợ Workers tự nhiên), Zod (JavaScript thuần), D1 binding, Rate Limiting binding, gọi Turnstile qua `fetch`.

## ADR-015 – Lưu trữ nội dung hồ sơ dưới dạng mã nguồn có kiểu tĩnh và bảo mật thông tin WinSoft
- **Quyết định:** Toàn bộ thông tin hồ sơ, kinh nghiệm, dự án và kỹ năng được lưu trữ trong `apps/web/src/content` dưới dạng các module TypeScript có kiểu dữ liệu chặt chẽ, thay vì lưu trong D1.
  - **Quy tắc bảo mật đối với nội dung kinh nghiệm tại WinSoft (đã được chủ dự án xác nhận):**
    - Sử dụng chức danh chính thức duy nhất: `Database & Data Intern`.
    - Nội dung kinh nghiệm chỉ được mô tả ở mức tổng quát: kinh nghiệm làm việc với SQL Server, T-SQL, Stored Procedures, phân tích dữ liệu và báo cáo viện phí.
    - Tuyệt đối không công khai database schema, tên bảng, tên cột, dữ liệu bệnh nhân, thông tin bệnh viện hoặc quy trình nội bộ có tính bảo mật.
    - Không sử dụng hình ảnh hệ thống nội bộ.
  - **Quy tắc tính trung thực đối với dữ liệu dự án (đã được chủ dự án xác nhận):**
    - MONO APP và App Money Tracker là cùng một dự án, chỉ biểu diễn bằng một mục dự án duy nhất trong mảng dữ liệu dự án.
    - Hệ thống kiểu hỗ trợ hai nhóm phân loại `Academic Projects` và `Personal Projects`, nhưng giữ giá trị `null` (trạng thái Pending Confirmation) cho từng dự án cho đến khi chủ dự án xác định chính xác từng dự án thuộc nhóm nào.
    - Ghi nhận database của dự án Coffee Shop E-commerce là `Supabase` theo xác nhận chính thức của chủ dự án; tuyệt đối không tự suy đoán hay tự điền bất kỳ trường thông tin nào khác còn thiếu.
- **Lý do:** Không cần xây dựng hệ quản trị nội dung (CMS); mọi thay đổi nội dung đều được kiểm soát qua lịch sử Git; không tốn truy vấn cơ sở dữ liệu khi người dùng xem trang; đảm bảo không vô tình làm lộ bí mật kinh doanh của doanh nghiệp hoặc đưa thông tin suy đoán thiếu chính xác vào kho mã nguồn công khai.
- **Hệ quả:** Cơ sở dữ liệu D1 chỉ phục vụ duy nhất cho tính năng lưu tin nhắn liên hệ.

## ADR-016 – Hệ thống Design Tokens với Tailwind CSS v4 (`@theme inline` + CSS Variables) và SVG inline tối giản
- **Trạng thái:** Đã chấp thuận (Triển khai ở Giai đoạn 3)
- **Bối cảnh:** Giai đoạn 3 yêu cầu xây dựng Design System linh hoạt cho cả Dark/Light theme, đạt chuẩn tương phản WCAG AA, không hardcode màu trong component và không cài thư viện UI/icon nặng.
- **Quyết định:**
  1. Khai báo toàn bộ color, shadow và motion tokens bằng CSS custom properties trong `:root` (Light) và `.dark` (Dark) tại `apps/web/src/styles/tokens.css`, ánh xạ sang tiện ích Tailwind v4 bằng `@theme inline` và `@custom-variant dark (&:where(.dark, .dark *));`.
  2. Xây dựng bộ 10 component cơ sở thuần React + TypeScript (`apps/web/src/components/ui/`) và sử dụng SVG inline tối giản cho các icon điều khiển (`ThemeToggle`, menu mobile), không cài thư viện UI (MUI/Chakra/AntD) hay thư viện icon nặng ở giai đoạn nền tảng.
  3. Tách riêng `apps/web/vitest.config.ts` (môi trường `jsdom`) khỏi `apps/web/vite.config.ts` (có `@cloudflare/vite-plugin`) để kiểm thử giao diện nhanh và độc lập với runtime Worker.
- **Phương án thay thế đã cân nhắc:** Cài đặt `lucide-react` hoặc thư viện UI như Radix/shadcn ngay từ đầu (chưa cần thiết cho 10 component cơ bản, làm tăng kích thước phụ thuộc); dùng chung `vite.config.ts` cho Vitest (dễ xung đột với Cloudflare Vite plugin trong môi trường `jsdom`).
- **Hệ quả:** Bundle CSS/JS rất nhẹ, kiểm soát tuyệt đối chuẩn tương phản WCAG AA, không có màu hardcode rải rác; nếu Giai đoạn 4 cần nhiều icon hơn có thể bổ sung thư viện icon tree-shakeable một cách có kiểm soát.

---

## Các hạng mục Trì hoãn hoặc Từ chối (Deferred / Rejected)

| Hạng mục | Trạng thái | Lý do |
|---|---|---|
| Trang quản trị (Admin dashboard), hệ thống đăng nhập, endpoint đọc tin nhắn | Từ chối (Ngoài phạm vi) | Bị loại trừ rõ ràng để giảm bề mặt tấn công và giữ kiến trúc tinh gọn |
| Gửi thông báo qua email khi có tin nhắn liên hệ mới | Trì hoãn | Cần chủ dự án xác nhận nhu cầu và chọn nhà cung cấp dịch vụ (ví dụ: Cloudflare Email Routing hoặc API bên thứ ba) |
| Kiểm thử đầu-cuối tự động (E2E tests với Playwright) | Trì hoãn | Giá trị mang lại thấp so với chi phí thiết lập cho bản MVP |
| Kết xuất tĩnh trước / SSG (Pre-rendering) | Trì hoãn | Xem xét lại nếu kết quả kiểm tra khả năng lập chỉ mục của React SPA cho thấy cần cải thiện thêm |
| Công cụ phân tích truy cập (Analytics) | Trì hoãn | Đang chờ chủ dự án xác nhận (đề xuất dùng Cloudflare Web Analytics không dùng cookie) |
