# AGENTS.md — Quy chuẩn dự án Hanyu AI

## 1. Tổng quan dự án
- **Tên ứng dụng:** Hanyu AI — web app học tiếng Trung (chữ Giản thể) cá nhân, phi thương mại.
- **Ngôn ngữ:** Giao diện ứng dụng và toàn bộ trao đổi/tài liệu làm việc luôn bằng **tiếng Việt**.
- **Mô hình vận hành:** Chạy hoàn toàn cục bộ trên trình duyệt (`localStorage` + `IndexedDB`), tích hợp nội dung giáo trình người dùng đã mua bản quyền vào 8 module luyện tập và trình xem giáo trình kèm phát audio MP3 cục bộ.

## 2. Môi trường máy tính hiện tại
- **Hệ điều hành & Shell:** Windows với PowerShell (`powershell.exe`).
- **Git đã cài sẵn:** MinGit 64-bit (`C:\Users\Admin\AppData\Local\Programs\Git\cmd\git.exe`), đã thêm vào User `Path` (nếu phiên hiện tại chưa nạp lại `Path` trước khi khởi động lại ứng dụng thì gọi trực tiếp đường dẫn đầy đủ này).
- **Công cụ chưa cài sẵn:** `node`, `python`, `winget` hiện chưa có trên máy.
- **Hệ quả kỹ thuật:**
  - Ưu tiên kiến trúc thuần HTML / CSS / JavaScript không cần bước build Node/npm, để người dùng mở thẳng `index.html` bằng giao thức `file://` trên trình duyệt được ngay.
  - Khi cần đóng gói lại thành 1 file HTML duy nhất, dùng script PowerShell thuần (`scripts/build-single.ps1`).
  - Khi trích xuất nội dung từ PDF sau này, ưu tiên đọc trực tiếp file PDF/ảnh bằng công cụ đọc tệp của Antigravity thay vì giả định có sẵn CLI ngoài.

## 3. Nguyên tắc bất di bất dịch
1. **Không backend / API trả phí:** Không dùng cơ sở dữ liệu ngoài (như Supabase) và không tích hợp AI API trả phí.
2. **Không bịa nội dung:** Toàn bộ từ mới, bài khóa, ngữ pháp, bài tập phải trích xuất trung thực từ PDF giáo trình gốc người dùng cung cấp; không tự sáng tác nội dung sách và không giả lập điểm chấm phát âm AI chưa có nguồn thật.
3. **Bảo toàn giao diện & tính năng hiện có:**
   - Giữ nguyên bảng màu đỏ gốm – kem (`--accent`, `--btn-a`, `--btn-b`, `--surface`, `--surface2`, `--line`, `--gold`).
   - Bảo toàn toàn bộ 8 module luyện tập và dữ liệu tiến độ SRS trong `localStorage['hanyu_ai_data']` (tương thích ngược dữ liệu cũ).
4. **Thông số kỹ thuật cốt lõi cần giữ nguyên:**
   - `SCHEMA_VERSION = 10`
   - IndexedDB: `DB_NAME = 'hanyu_ai_db'`, `DB_VER = 2`, 4 kho (`courses`, `lessons`, `pdfs`, `media`).
   - Giữ cơ chế **nạp đồng bộ danh mục và bài học mặc định trước khi chờ `HanyuIDB.open()`** (đã có timeout 1,2s + `onblocked`) để app hiển thị tức thì kể cả trong iframe hoặc mở file trực tiếp.
   - **Bắt buộc:** `#hanyu-modal` và `#hanyu-modal-box` phải luôn đặt **TRƯỚC** thẻ `<script>`.
5. **Quy ước mã & biến nội bộ:**
   - Nhóm khóa học (`group`): `hanngu`, `hsk`, `kouyu`, `hanzi`, `personal`.
   - Mã khóa Hán ngữ 1–6: `course_hn_1` … `course_hn_6`.
   - Mã bài Hán ngữ: `lesson_hn{quyển}_b{số_bài}` (ví dụ: `lesson_hn1_b1` … `lesson_hn1_b15`).
   - Tên audio MP3: Hán ngữ dùng `Quyển {1..6} Bài {số}.mp3` (76 file); HSK 3.0 ánh xạ theo `HSK_AUDIO_MANIFEST` (407 file).
   - Biến/hàm cốt lõi không tự ý đổi tên làm gãy tương thích: `HN_CATALOG_TITLES`, `HN1_FULL_DATA`, `HN1_EXT_MAP`, `HSK_AUDIO_MANIFEST`, `buildStandardCatalogSeed()`, `seedStandardCatalog(interactive)`, `HanyuIDB`.
   - DOM ID quan trọng: `#hanyu-modal`, `#hanyu-modal-box`, `#hm-cont-sub`, `#hm-lvl`, `#hm-road-in`, `#hm-all-roadmap`, `#hm-free-btn`, `#rm-view-textbook`, `#btn-view-textbook-top`, `#btn-load-audio-top`, `#cd-view-textbook`, `#textbook-reader`, `#tb-volume-switcher`, `#tb-lesson-toc`, `#tb-lesson-content`.
6. **Quy chuẩn PDF & Tiếng Trung:**
   - **Cảnh báo PDF scan:** 6 file `GT Hán Ngữ 1–6.pdf` là PDF scan có lớp text OCR bị lỗi ký tự — tuyệt đối không tin mù lớp text OCR lỗi; phải kiểm tra hình ảnh trang trực tiếp khi trích xuất.
   - Chữ Hán dùng **Giản thể chuẩn**, Pinyin có dấu thanh điệu chuẩn (bao gồm `ü`), nghĩa tiếng Việt rõ ràng, chính xác.
7. **Tải bài theo yêu cầu (On-demand Download):**
   - Mặc định chỉ tải sẵn nội dung chi tiết **Bài 1 & Bài 2 của Giáo trình Hán ngữ 1** qua `data/hn-starter.js`.
   - Các gói dữ liệu đầy đủ (`data/hn1-full.js`, `data/hn2-full.js`, ...) vẫn giữ nguyên trong kho `data/` nhưng không nạp sẵn khi mở app (`index.html` nạp `<script>` động khi người dùng bấm nút **⬇ Tải**, còn bản 1 file `dist/hanyu-ai.html` nhúng dưới dạng `<script type="text/plain" data-lazy-pack="...">` và chỉ giải mã/nạp khi bấm Tải).

## 4. Quy ước thư mục & Quy trình làm việc
- `data gemini/` là bản lưu trữ gốc từ Gemini Web — **tuyệt đối không sửa hoặc xóa**.
- File chạy chính hiện tại là `index.html`. Kế hoạch tách mô-đun ("2 trong 1": tách `css/`, `js/`, `data/*.js` + script gộp 1 file `dist/hanyu-ai.html`) xem tại `docs/ARCHITECTURE.md`.
- File PDF & Audio gốc hiện đặt tại `data hanyu/` (và `sources/`, cả hai đều nằm trong `.gitignore`); ảnh demo giao diện đặt tại `docs/references/`.
- **Quy ước chọn model cho Swarm Worker (tiết kiệm quota):** Ưu tiên dòng Gemini — dùng `gemini-4-neon-medium` cho tác vụ trích xuất PDF scan chữ Hán/Pinyin hoặc logic phức tạp nhiều tệp; dùng `gemini-4-hydrogen-medium` cho tác vụ cấu trúc đơn giản/UI; chỉ dùng dòng Claude 5.5 khi người dùng chủ động yêu cầu gợi ý thiết kế/giao diện.
- **Trước khi bắt tay làm việc mới:** Đọc `docs/TASKS.md` để nắm mốc hiện tại; làm xong việc nào nhớ cập nhật dấu `[x]` vào `docs/TASKS.md`.
