# 01 – Đặc tả Yêu cầu (Requirements)

> Trạng thái: Bản cập nhật v0.5 – Đã hoàn thành Giai đoạn 3 (Design System & Kiến trúc Nội dung).
> Chủ dự án: Nguyen Gia Bao (Nguyễn Gia Bảo) · Ngày cập nhật: 2026-11-23

## 1. Mục tiêu dự án

Xây dựng **GiaBao Portfolio**, một trang web portfolio (hồ sơ năng lực trực tuyến) chuyên nghiệp dành cho lập trình viên full-stack, với mục tiêu chính là chứng minh năng lực **Backend Development** (phát triển hệ thống phía máy chủ), **Database Engineering** (kỹ thuật cơ sở dữ liệu) và kỹ năng phát triển phần mềm tổng quát trước các **nhà tuyển dụng kỹ thuật (technical recruiters)**.

**Định vị chuyên môn (Positioning statement):** `Backend Developer | Database-focused Developer`

Chính trang web này cũng là một sản phẩm thực tế trong hồ sơ năng lực: mã nguồn của dự án (kiến trúc monorepo – quản lý nhiều gói trong một kho mã nguồn, typed API – giao diện lập trình có kiểu dữ liệu chặt chẽ, validation – kiểm tra tính hợp lệ dữ liệu, lưu trữ D1, kiểm thử tự động, CI – tích hợp liên tục) phải phản ánh đúng chất lượng kỹ thuật backend và cơ sở dữ liệu đã cam kết.

## 2. Đối tượng mục tiêu

| Đối tượng | Nhu cầu thông tin | Thời gian xem trang |
|---|---|---|
| Nhà tuyển dụng kỹ thuật / HR | Định vị chuyên môn, lộ trình kinh nghiệm, tải CV, liên hệ | 30–90 giây |
| Quản lý tuyển dụng / Kỹ sư (Hiring managers / Engineers) | Độ sâu dự án, bằng chứng kỹ năng SQL/backend, liên kết GitHub, chất lượng mã nguồn | 3–10 phút |
| Nhà tuyển dụng tại Việt Nam | Nội dung tiếng Việt chuẩn xác, tự nhiên | Bất kỳ |

## 3. Yêu cầu chức năng (Functional Requirements)

| Mã | Yêu cầu | Độ ưu tiên |
|---|---|---|
| FR-01 | **Trang chủ / Hero**: họ tên, tiêu đề định vị, tóm tắt ngắn, các nút kêu gọi hành động chính – CTA (Xem dự án, Tải CV, Liên hệ). | Bắt buộc (Must) |
| FR-02 | **Giới thiệu (About)**: tóm tắt bản thân, học vấn (HUFLIT), địa điểm. | Bắt buộc (Must) |
| FR-03 | **Kinh nghiệm (Experience)**: dòng thời gian theo thứ tự thời gian, tách biệt rõ ràng giữa *kinh nghiệm kỹ thuật* (WinSoft – chức danh chính thức đã xác nhận: `Database & Data Intern`) và *kinh nghiệm phi kỹ thuật* (JEN&CO, AR GROUP, Zwilling). Tuân thủ nghiêm ngặt quy định bảo mật thông tin của WinSoft: chỉ mô tả ở mức tổng quát về SQL Server, T-SQL, Stored Procedures, phân tích dữ liệu và báo cáo viện phí (xem mục 6). | Bắt buộc (Must) |
| FR-04 | **Dự án (Projects)**: danh sách thẻ dự án + trang chi tiết cho từng dự án (công nghệ, mô tả, vai trò, liên kết). MONO APP và App Money Tracker là cùng một dự án và chỉ hiển thị thành một mục dự án duy nhất. Các dự án trong hồ sơ thuộc cả hai nhóm *Academic Projects* (Dự án học thuật) và *Personal Projects* (Dự án cá nhân), nhưng việc phân loại cụ thể từng dự án vào nhóm nào đang ở trạng thái chờ xác nhận (Pending Confirmation) nên chỉ gắn nhãn sau khi được chủ dự án xác nhận từng dự án. | Bắt buộc (Must) |
| FR-05 | **Kỹ năng (Skills)**: phân nhóm (Databases, Backend, Other, Healthcare Domain). Không sử dụng thanh phần trăm hay điểm tự đánh giá (do không thể kiểm chứng). | Bắt buộc (Must) |
| FR-06 | **Chứng chỉ (Certifications)**: chỉ liệt kê các dữ liệu đã được xác nhận; ẩn các trường chưa xác nhận, tuyệt đối không tự suy diễn. | Nên có (Should) |
| FR-07 | **Tải CV**: phục vụ file PDF dưới dạng tài nguyên tĩnh (static asset); tách riêng phiên bản tiếng Anh (EN) và tiếng Việt (VI) nếu được cung cấp. | Bắt buộc (Must) |
| FR-08 | **Biểu mẫu liên hệ (Contact form)**: họ tên, email, tiêu đề (tùy chọn), nội dung tin nhắn; gửi dữ liệu tới một API thực tế. | Bắt buộc (Must) |
| FR-09 | **Đa ngôn ngữ (Internationalization – i18n)**: Tiếng Anh (`en`, mặc định) và Tiếng Việt (`vi`); định tuyến theo tiền tố `/en` và `/vi`, đồng bộ thuộc tính `<html lang>`, lưu lựa chọn vào `localStorage` (`giabao-portfolio-locale`). | Bắt buộc (Must) |
| FR-10 | **Giao diện (Theming)**: chế độ Tối (`dark`), Sáng (`light`) và Theo hệ thống (`system`); tôn trọng `prefers-color-scheme`, chống FOUC bằng inline script trong `index.html`, lưu lựa chọn vào `localStorage` (`giabao-portfolio-theme`). | Bắt buộc (Must) |
| FR-11 | **Đáp ứng thiết bị (Responsive)**: hiển thị tốt trên các viewport chuẩn 375 px (mobile), 768 px (tablet), 1024 px và 1440 px (desktop); không có horizontal overflow; touch target tối thiểu phù hợp trên mobile. | Bắt buộc (Must) |
| FR-12 | **Trang 404** và cơ chế điều hướng dự phòng (fallback) mượt mà cho định tuyến phía trình duyệt (client-side routing). | Bắt buộc (Must) |
| FR-13 | Liên kết mạng xã hội và liên lạc: GitHub, LinkedIn, Email. | Bắt buộc (Must) |

## 4. Yêu cầu đối với Contact API

| Mã | Yêu cầu |
|---|---|
| API-01 | `POST /api/contact` nhận dữ liệu định dạng JSON payload (gói dữ liệu gửi lên). |
| API-02 | Kiểm tra tính hợp lệ của dữ liệu đầu vào bằng **Zod** (kiểu dữ liệu, độ dài, định dạng email, cắt khoảng trắng thừa). Trả về **HTTP 400** nếu dữ liệu không hợp lệ. |
| API-03 | Xác thực token **Cloudflare Turnstile** (giải pháp chống bot) ở phía máy chủ thông qua Siteverify API trước khi lưu vào cơ sở dữ liệu. Phân biệt rõ: token không hợp lệ hoặc hết hạn trả về **HTTP 403**; dịch vụ Siteverify không phản hồi hoặc gặp sự cố trả về **HTTP 503**. |
| API-04 | **Giới hạn tần suất (Rate limiting)** theo địa chỉ IP của máy khách (đề xuất 5 yêu cầu / 60 giây – xem ADR-005; thông số cuối cùng chờ chốt). |
| API-05 | Tin nhắn hợp lệ được lưu vào cơ sở dữ liệu **Cloudflare D1** (bảng `contact_messages`). |
| API-06 | **Xử lý lỗi an toàn**: cấu trúc phản hồi lỗi JSON đồng nhất, không làm lộ stack trace (vết ngăn xếp lỗi), câu lệnh SQL hay chi tiết nội bộ; không ghi log nội dung tin nhắn. |
| API-07 | Trường ẩn bẫy bot (**Honeypot field**) làm lớp lọc thư rác chi phí thấp bổ sung. |
| API-08 | `GET /api/health` để kiểm tra nhanh tình trạng hoạt động (smoke check) sau khi triển khai. |
| API-09 | Sử dụng đúng mã trạng thái HTTP: `201`, `400`, `403`, `413`, `415`, `429`, `500`, `503`. |
| API-10 | Giới hạn kích thước gói tin gửi lên (request body size limit, ví dụ 10 KB). |
| API-11 | **Bảo mật quyền riêng tư & quản trị dữ liệu liên hệ**: hạn chế thu thập dữ liệu tối đa; không lưu IP gốc (chỉ lưu mã băm kèm muối – salted hash); không ghi log nội dung tin nhắn; không mở bất kỳ endpoint (điểm cuối API) công khai nào để đọc tin nhắn; đề xuất thời hạn lưu trữ 180 ngày kèm kế hoạch xóa dữ liệu cũ (**⚠ CHỜ XÁC NHẬN** phê duyệt từ chủ dự án). |

**Ngoài phạm vi dự án (Out of scope):** trang quản trị (admin dashboard), hệ thống đăng nhập/xác thực, hệ quản trị nội dung (CMS), giao diện đọc tin nhắn hoặc endpoint công khai để truy xuất tin nhắn. Tin nhắn chỉ được đọc nội bộ qua lệnh `wrangler d1 execute` hoặc bảng điều khiển Cloudflare Dashboard.

## 5. Yêu cầu phi chức năng (Non-Functional Requirements)

| Mã | Hạng mục | Yêu cầu |
|---|---|---|
| NFR-01 | Hiệu năng (Performance) | Điểm Lighthouse ≥ 90 (Performance, Accessibility, Best Practices, SEO) trên thiết bị di động. |
| NFR-02 | Khả năng tiếp cận (Accessibility) | Chuẩn WCAG 2.1 AA: HTML ngữ nghĩa (semantic HTML), điều hướng bằng bàn phím, trạng thái tiêu điểm (focus states) rõ ràng, độ tương phản đạt chuẩn ở cả hai giao diện Sáng/Tối, thuộc tính `lang` thay đổi theo ngôn ngữ đang chọn. |
| NFR-03 | Tối ưu máy chủ tìm kiếm (SEO) | Tiêu đề (`title`) và mô tả (`description`) riêng cho từng trang, thẻ **canonical URL** (đường dẫn chuẩn hóa), thẻ **Open Graph** (hiển thị khi chia sẻ mạng xã hội), file `sitemap.xml`, `robots.txt` và bước kiểm tra thực tế khả năng lập chỉ mục (indexability) đối với ứng dụng **React SPA** (Single-Page Application – ứng dụng đơn trang). |
| NFR-04 | Bảo mật (Security) | Chỉ lưu thông tin nhạy cảm trong Wrangler secrets; thiết lập các header bảo mật (`Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`); chỉ sử dụng truy vấn tham số hóa (parameterized queries) với D1. |
| NFR-05 | Quyền riêng tư & Dữ liệu liên hệ (Privacy) | Chính sách hạn chế thu thập dữ liệu (chỉ lưu thông tin cần thiết để phản hồi và chống lạm dụng); không lưu IP gốc (chỉ lưu mã băm có muối – salted hash); không log nội dung tin nhắn; không có endpoint công khai đọc tin nhắn; đề xuất lưu trữ tối đa 180 ngày (**⚠ CHỜ XÁC NHẬN**) và có quy trình dọn dẹp dữ liệu cũ (xem tài liệu 03 và 05). |
| NFR-06 | Khả năng bảo trì (Maintainability) | Bật chế độ kiểm tra nghiêm ngặt của TypeScript (`strict mode`), áp dụng ESLint + Prettier, cấu trúc monorepo có ranh giới module rõ ràng. |
| NFR-07 | Khả năng kiểm thử (Testability) | Kiểm thử đơn vị (unit test) và tích hợp (integration test) bằng Vitest; giữ mức độ bao phủ mã nguồn (coverage) 90% cho API/shared làm **mục tiêu tham khảo**, nhưng ưu tiên hàng đầu là kiểm thử kỹ các luồng nghiệp vụ chính và các tình huống lỗi quan trọng (400, 403, 429, 500, 503); hệ thống CI chặn hợp nhất mã (merge) nếu kiểm thử thất bại. |
| NFR-08 | Chi phí (Cost) | Vận hành hoàn toàn trong hạn mức miễn phí (free tier) của Cloudflare. |
| NFR-09 | Môi trường thực thi (Runtime) | Toàn bộ mã nguồn backend phải tương thích với môi trường thực thi Cloudflare Workers (không dùng các API chỉ có trên Node.js trừ khi được hỗ trợ qua cờ `nodejs_compat`). |

## 6. Ràng buộc dự án (Constraints)

- Hạ tầng lưu trữ (Hosting) và Tên miền (Domain): Sử dụng **Cloudflare Workers** kết hợp Workers Static Assets (triển khai trong một đơn vị duy nhất). Ưu tiên sử dụng tên miền miễn phí dạng `*.workers.dev` (hiện chưa mua custom domain và chưa triển khai môi trường production).
- Cơ sở dữ liệu: Cloudflare D1 (dựa trên SQLite).
- Bộ công nghệ cố định: React, TypeScript, Vite, Tailwind CSS, React Router, Hono, Zod, Vitest, ESLint, Prettier.
- Nội dung cá nhân: Chỉ sử dụng dữ liệu từ hồ sơ gốc và các thông tin đã được chủ dự án xác nhận (xem tài liệu 02). Không tự thêm hoặc suy đoán thông tin còn thiếu (ví dụ: không tự suy đoán phân loại cụ thể của từng dự án đang ở trạng thái Pending Confirmation, số liệu, thành tích, kỹ năng, chứng chỉ hoặc đường dẫn kho mã nguồn).
- **Bảo mật thông tin WinSoft (đã được chủ dự án xác nhận)**: Hiển thị chức danh chính thức là `Database & Data Intern`. Nội dung kinh nghiệm chỉ được mô tả ở mức tổng quát (kinh nghiệm làm việc với SQL Server, T-SQL, Stored Procedures, phân tích dữ liệu và báo cáo viện phí). Tuyệt đối không công khai database schema (lược đồ cơ sở dữ liệu), tên bảng, tên cột, dữ liệu bệnh nhân, thông tin bệnh viện hoặc quy trình nội bộ có tính bảo mật; không sử dụng hình ảnh hệ thống nội bộ.

## 7. Tiêu chí nghiệm thu cấp dự án (Acceptance Criteria)

1. Tất cả các trang hiển thị đúng ở cả hai ngôn ngữ EN và VI, trong cả giao diện Dark và Light, tại các kích thước màn hình 375 / 768 / 1280 px.
2. Chức năng tải CV hoạt động bình thường từ khu vực Hero và trang About.
3. Gửi biểu mẫu liên hệ hợp lệ kèm token Turnstile hợp lệ trả về mã `201` và tạo chính xác một bản ghi trong D1 (không lưu IP gốc, không ghi log nội dung tin nhắn).
4. Dữ liệu không hợp lệ → `400`; token Turnstile không hợp lệ hoặc hết hạn → `403`; dịch vụ Turnstile Siteverify không phản hồi hoặc lỗi → `503`; vượt giới hạn tần suất gửi → `429`; không trường hợp nào làm lộ thông tin nội bộ hệ thống.
5. Hệ thống SEO có đầy đủ canonical URL, thẻ Open Graph, `sitemap.xml`, `robots.txt` và đã qua bước kiểm tra khả năng lập chỉ mục của React SPA.
6. Quy trình CI chạy tự động các bước lint, kiểm tra kiểu dữ liệu (type-check), kiểm thử (test) và đóng gói (build) trên mọi Pull Request (PR).
7. Khi thực hiện giai đoạn triển khai, hệ thống sản phẩm (production) được triển khai thành công lên Cloudflare Workers và truy cập được qua tên miền `*.workers.dev` đã chọn.

## 8. Câu hỏi mở chờ xác nhận

Xem chi tiết tại [02-content-inventory.md §9](./02-content-inventory.md) để biết toàn bộ danh sách các mục cần chủ dự án xác nhận.
