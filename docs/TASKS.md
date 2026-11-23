# Lộ trình & Tiến độ dự án Hanyu AI (TASKS)

## Milestone 0 — Dựng nền dự án (Baseline v20)
- [x] Tạo `.gitignore` (bỏ qua `sources/`, PDF, ZIP, MP3, `dist/`)
- [x] Tạo `AGENTS.md` khóa toàn bộ quy chuẩn dự án từ tài liệu bàn giao
- [x] Tạo `docs/ARCHITECTURE.md` & `docs/TASKS.md`
- [x] Tạo thư mục `sources/` và `docs/references/` kèm hướng dẫn tệp cần bổ sung
- [x] Tạo bản làm việc `index.html` khớp 100% với `data gemini/hanyu-ai-chuc-nang-20.html` (giữ `data gemini/` làm backup bất biến)
- [x] Cài đặt Git (MinGit 64-bit tại `%LOCALAPPDATA%\Programs\Git\cmd\git.exe`), chạy `git init` và commit mốc đầu tiên (`chore: baseline v20 (Milestone 0)`)

---

## Milestone 1 — Tách cấu trúc mô-đun ("2 trong 1") & Script đóng gói 1 file
- [x] Tách `index.html` (5.718 dòng) thành `index.html` (820 dòng) + `css/` (2 file) + `data/*.js` (4 file) + `js/` (6 file) theo đúng kiến trúc "2 trong 1" (xem sơ đồ thực tế trong `docs/ARCHITECTURE.md`)
- [x] Đảm bảo giữ nguyên 100% tính năng bản 20, `SCHEMA_VERSION = 10`, `localStorage['hanyu_ai_data']`, `IndexedDB hanyu_ai_db v2`, `#hanyu-modal` nằm trước `<script>`
- [x] Viết script PowerShell thuần `scripts/build-single.ps1` đóng gói lại thành 1 file duy nhất `dist/hanyu-ai.html` (744.359 bytes / 726,91 KB)
- [x] Kiểm thử toàn diện cả `index.html` và `dist/hanyu-ai.html` trên Chrome (cả qua HTTP cục bộ lẫn mở thẳng `file://`): 0 lỗi console/JS exception, bảng màu đỏ gốm–kem, Lộ trình 15 bài Quyển 1, Chi tiết bài học, Trình xem giáo trình (Bài 1–15), Flashcard/SRS & toàn bộ 8 module, Modal sao lưu & bộ nạp audio `.zip/.mp3`

---

## Milestone 2 — Nạp nội dung Giáo trình Hán ngữ Quyển 2–6 (61 bài còn lại)
*(Đọc trực tiếp ảnh trang từng file `GT Hán Ngữ 2..6.pdf` trong `data hanyu/` hoặc `sources/` vì PDF scan có lớp OCR lỗi)*
- [x] Kiến trúc Tải bài theo yêu cầu (On-demand Lesson Download): mặc định chỉ tải sẵn Bài 1–2 Hán ngữ 1 (`data/hn-starter.js`), các bài còn lại bấm **⬇ Tải** ở từng bài để nạp lười từ `data/*-full.js` (hỗ trợ cả `file://`, HTTP cục bộ & bản 1 file `dist/hanyu-ai.html`, tự dọn gọn 1 lần các bài chưa học trên trình duyệt cũ và giữ nguyên 100% SRS)
- [x] Quyển 2 (Bài 16–30, từ `GT Hán Ngữ 2 .pdf` → `data/hn2-full.js`; đã xử lý lỗi in trùng trang tập viết p.171 của Bài 26)
- [ ] Quyển 3 (Bài 1–10, từ `sources/GT Hán Ngữ 3.pdf` → `data/hn3-full.js`)
- [ ] Quyển 4 (Bài 11–20, từ `sources/GT Hán Ngữ 4.pdf` → `data/hn4-full.js`)
- [ ] Quyển 5 (Bài 1–13, từ `sources/GT Hán Ngữ 5.pdf` → `data/hn5-full.js`)
- [ ] Quyển 6 (Bài 14–26, từ `sources/GT Hán Ngữ 6.pdf` → `data/hn6-full.js`)

---

## Nâng cấp Giao diện & Chức năng (4 Đợt · theo bộ 22 ảnh thiết kế)
*(Thực hiện trước khi trích xuất Quyển 3–6 & NEW HSK 3.0)*
- [x] **Đợt 1:** Brand Kit đỏ gốm – kem (`#8B2E2E`, `#C7463B`, `#E9967A`, `#F8E8DE`, `#FFF9F4`), Responsive Tablet/PC (`>= 900px` Sidebar 6 mục + 2 cột; Mobile 5 tab `Trang chủ · Học tập · Ôn luyện · Luyện nói · Cá nhân`), tile lối tắt pastel trên `#home`, và cấu trúc bài học 9 phần (5 bắt buộc để mở khóa `Qua bài tiếp theo →` + 4 mở rộng 2×2 tính vào 100%)
- [x] **Tinh chỉnh sau Đợt 1:** Màn `#roadmap-view` 15 bài đường cong chữ S (logo app, nền thủy mặc hoa đào – đình – trường thành, 4 trạng thái nút 3D viền vàng); layout `#lesson` mới (topbar gọn + hero minh họa + số liệu thật + `Mục tiêu bài học` dưới tiến độ + 1 khung `Học bắt buộc` + lưới ngang 2×2 `Học mở rộng` + CTA đỏ gốm); tab `#vocab` bỏ `Nhìn nghĩa` (chạm trực tiếp từ/thẻ để hiện/ẩn nghĩa), bỏ toàn bộ `Mã #...`, và thiết kế lại khối mở rộng *Hack não* (công thức 1 khung kèm `Mẹo nhớ`) + *Sơ đồ tư duy* (hình sao SVG 6 nhánh phân trang từ `data/hanzi-ext-db.js`)
- [ ] **Đợt 2:** Module *Chép bài khóa*, *Luyện dịch (Việt ↔ Trung)*, trình phát hội thoại & bố cục ghi chú 3 cột trên Tablet
- [ ] **Đợt 3:** Nâng cấp các module học tập (*Phân biệt thanh điệu*, *Hướng dẫn sửa lỗi phát âm*, khung so sánh chữ Hán 2 ô, chồng thẻ SRS `Ôn tập hôm nay`)
- [ ] **Đợt 4:** Hub lộ trình song song Hán ngữ 1–6 / HSK 1–6 & 4 tab thống kê `#me` (XP/Streak cục bộ)

---

## Milestone 3 — Nạp NEW HSK 3.0 (Cấp 1–3 + SBT 1–2 + Đáp án + Lời thoại)
*(Khớp với 407 track MP3 đã khai báo sẵn trong `HSK_AUDIO_MANIFEST`)*
- [ ] Cấp 1 (15 bài + Đề thi thử `模拟测试` + SBT 1 + Đáp án)
- [ ] Cấp 2 (15 bài + Đề thi thử `模拟测试` + SBT 2 + Đáp án + Lời thoại nghe)
- [ ] Cấp 3 (18 bài)

---

## Milestone 4 — Nạp Khẩu ngữ tốc thành & Bổ trợ Chữ Hán
- [ ] Bộ *Khẩu ngữ tốc thành* (`HanYu KouYu SuCheng` 1m–5m) vào nhóm `kouyu`
- [ ] Bộ *Hack não 3000 chữ Hán* (tập 1–3) & *Sơ đồ tư duy 3300 chữ Hán* vào nhóm `hanzi` và liên kết `optionalExtensions` cho các quyển sau

---

## Milestone 5 — Kiểm thử Audio đầy đủ & Tinh chỉnh UI/UX
- [ ] Kiểm thử nạp hàng loạt các gói `.zip` audio thật (Hán ngữ Q1–Q6 và HSK 3.0 407 track) trên `IndexedDB media`
- [ ] Đối chiếu và tinh chỉnh UI theo 2 ảnh demo chuẩn trong `docs/references/` (nếu có điểm nào cần hoàn thiện thêm)

---

## Cách mở chat mới cho Milestone 1
- **Model & Effort khuyến nghị:** `Orchestrator (Gemini 4 Neon)` — mức `Medium` (hoặc `High` khi muốn rà kỹ).
- **Prompt gợi ý để dán vào chat mới:**
  > Hãy đọc `@AGENTS.md`, `@docs/ARCHITECTURE.md` và `@docs/TASKS.md`. Thực hiện **Milestone 1**: tách `index.html` (bản 20) thành cấu trúc `index.html` + `css/` + `js/` + `data/*.js` theo đúng kiến trúc "2 trong 1", viết thêm `scripts/build-single.ps1` để gộp ra `dist/hanyu-ai.html`, rồi kiểm thử toàn diện cả hai bản để đảm bảo không mất bất kỳ tính năng hay dữ liệu SRS nào.
