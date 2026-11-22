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
*(Cần chép từng file `GT Hán Ngữ 2..6.pdf` vào `sources/` trước khi làm; lưu ý kiểm tra ảnh trang vì PDF scan có lớp OCR lỗi)*
- [ ] Quyển 2 (Bài 16–30, từ `sources/GT Hán Ngữ 2 .pdf` → `data/hn2-full.js`)
- [ ] Quyển 3 (Bài 1–10, từ `sources/GT Hán Ngữ 3.pdf` → `data/hn3-full.js`)
- [ ] Quyển 4 (Bài 11–20, từ `sources/GT Hán Ngữ 4.pdf` → `data/hn4-full.js`)
- [ ] Quyển 5 (Bài 1–13, từ `sources/GT Hán Ngữ 5.pdf` → `data/hn5-full.js`)
- [ ] Quyển 6 (Bài 14–26, từ `sources/GT Hán Ngữ 6.pdf` → `data/hn6-full.js`)

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
