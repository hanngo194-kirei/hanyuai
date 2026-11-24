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
- [x] **Đợt 2:** Nâng cấp *Bài khóa* (`#dialog`: 3 tab `Nội dung · Từ mới · Ngữ pháp`, trình phát audio MP3/TTS kèm tốc độ & ẩn/hiện pinyin, chạm từng từ/cụm từ xem `Pinyin · Nghĩa · Loại từ` và lưu ghi chú), bổ sung *Chép bài khóa* (`#copy`: lưới ô vuông nét đứt theo mẫu mờ + viết tay Apple Pencil / S Pen có lực nhấn, Bút/Tẩy/Hoàn tác/Xóa/Lưu), *Luyện dịch* (`#trans`: `Việt ↔ Trung`, `Viết tay` Apple Pencil/S Pen + `Bàn phím` kiểm tra & đáp án tham khảo), bỏ nhãn `Sắp có` ở `#lesson` (đạt 9/9 mục) và bố cục 3 cột kèm khung *Ghi chú bài học* trên Tablet/PC (`css/dot2.css`, `js/modules-dot2.js`)
- [x] **Tiền Đợt 3 (Nền, Học tập 2 tab & Song song HSK 1–6):** Khôi phục background toàn khung trên Trang chủ và các mục (`css/tokens-core.css`), chia tab *Học tập* thành 2 phần **Bài học** (lộ trình 15 bài đường cong chữ S) & **Giáo trình** (kho sách & HSK 3.0 Cấp 1–6), thêm Onboarding 2 bước chọn cấp độ HSK 1–6 + hệ giáo trình (*Hán ngữ* / *NEW HSK 3.0* / *Học song song cả hai*) với tiến độ độc lập 100% giữa 2 hệ (`learningSetup`, `getCourseProgressStats`, `switchToCourse`), và thay toàn bộ 9 ảnh bìa thật cho Hán ngữ 1–6 + NEW HSK 3.0 Cấp 1–3 (`data/course-covers.js`)
- [x] **Đợt 3:** Nâng cấp 4 module học tập (*Luyện nghe* bổ sung chế độ **Phân biệt thanh điệu 1–4** theo bài học + lưu lỗi thanh thật `toneMistakes`; *Luyện nói & Phát âm* có **Hướng dẫn sửa lỗi 3 tab** `Âm đầu · Vần · Thanh điệu` kèm SVG đường cong cao độ, so sánh `Mẫu ↔ Giọng mình`, **Lịch sử luyện** & tự đánh giá trung thực không bịa điểm AI; *Luyện viết chữ Hán* hỗ trợ bút cảm ứng lực nhấn Apple Pencil / S Pen + **Khung đối chiếu 2 ô** `Bản của bạn | Mẫu chuẩn` + **3 ô mini Luyện thêm**; *Ôn tập SRS* hiển thị trực tiếp **chồng thẻ flashcard**, thẻ ví dụ `例句`, chạm lật nghĩa và chân trang số liệu thật; đồng bộ khi chuyển bài & cập nhật `css/dot3.css`)
- [x] **Đợt 4:** Hub lộ trình song song Hán ngữ 1–6 / NEW HSK 3.0 1–6 trên `#home` & `#learn` (chọn nhanh hệ song song gọn kiểu demo, bìa thật, tiến độ tách riêng 100%), dải **Chuỗi streak** kiểu lịch tuần thanh ray + ngọn lửa mốc tuần, trang Cá nhân `#me` 4 tab (**Tổng quan · Kỹ năng · Mục tiêu · Lịch sử**, XP/Cấp độ cục bộ từ dữ liệu thật, 4 vòng kỹ năng & khối *Cần cải thiện*, timeline lịch sử); tinh chỉnh khung câu ví dụ từ vựng nhỏ gọn (mọi từ đều có câu ví dụ tô đỏ đúng từ mới), cắt sạch liên kết cứng Bài 4 khỏi toàn bộ module và bổ sung **Bài tập áp dụng 4 dạng** ngay dưới lý thuyết Ngữ pháp cho mọi bài (`css/dot4.css`)

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
