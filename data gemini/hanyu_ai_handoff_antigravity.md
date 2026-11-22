# Hanyu AI — Bản Tóm Tắt Bàn Giao Dự Án (Handoff cho Antigravity)

> **Cập nhật lần cuối:** 23/11/2026  
> **Phiên bản mới nhất:** **Bản 20** — `hanyu-ai-chuc-nang-20.html` (single-file Web App / PWA, ~744 KB, `SCHEMA_VERSION = 10`)  
> **Trạng thái hiện tại:** Đã hoàn thiện đến **bản 20** (gồm giao diện Trang chủ + Lộ trình uốn lượn bản 18, Chi tiết bài học bản 19, và ánh xạ 407 audio HSK 3.0 + nạp `.zip/.mp3` + nhóm bổ trợ Chữ Hán bản 20). Có thể đưa thẳng `hanyu-ai-chuc-nang-20.html` sang Antigravity để tiếp tục ngay.

## 1. Mục tiêu dự án

Xây dựng **Hanyu AI** — ứng dụng web học tiếng Trung (chữ Giản thể) cá nhân với giao diện tiếng Việt, phong cách đỏ gốm – kem ấm áp, chạy hoàn toàn cục bộ trên trình duyệt (`localStorage` + `IndexedDB`), phục vụ học cá nhân phi thương mại từ toàn bộ giáo trình người dùng đã mua bản quyền:

- Tích hợp trọn bộ tài liệu đã tải lên thành các hệ thống học tách bạch, vừa **xem/đọc trực tiếp từng quyển – từng bài**, vừa **luyện tập ngay trên 8 module tương tác** (Flashcard/SRS, Sổ từ khó & yêu thích, Ngữ pháp, Bài tập tương tác, Luyện nghe, Luyện nói/Phát âm AI, Luyện viết chữ Hán, Thống kê & Mục tiêu ngày).
- Đối chiếu và phát trực tiếp audio MP3 gốc (nạp từ file `.mp3` hoặc giải nén trực tiếp từ `.zip` vào `IndexedDB`).

## 2. Những gì đã hoàn thành (đến `hanyu-ai-chuc-nang-20.html`)

### 2.1. Kiến trúc dữ liệu & Lưu trữ (`v09`–`v20`)
- **`SCHEMA_VERSION = 10`**, `IndexedDB` (`hanyu_ai_db`, `DB_VER = 2`) gồm 4 kho: `courses`, `lessons`, `pdfs`, `media` (lưu Blob MP3 cục bộ).
- Bảo vệ `HanyuIDB.open()` bằng timeout 1,2 giây + `onblocked`, đồng thời **nạp đồng bộ danh mục và bài học mặc định trước khi chờ IndexedDB** để app hiển thị tức thì ngay cả trong iframe xem trước.
- Đã sửa triệt để lỗi khởi chạy (`#hanyu-modal` và `#hanyu-modal-box` đã đặt **trước thẻ `<script>`**).
- Tách **5 nhóm giáo trình độc lập** trong Thư viện học tập (kèm bộ lọc chip tương ứng):
  1. `hanngu` — Giáo trình Hán ngữ (Hệ thống chính 1)
  2. `hsk` — NEW HSK 3.0 (Hệ thống chính 2)
  3. `kouyu` — Khẩu ngữ bổ trợ (Độc lập)
  4. `hanzi` — Bổ trợ Chữ Hán (Độc lập: *Hack não 3000 chữ Hán* & *Sơ đồ tư duy 3300 chữ Hán*)
  5. `personal` — Giáo trình cá nhân
- Hỗ trợ nút **🎧 Nạp Audio (.zip/.mp3)** (`#btn-load-audio-top` và `#cd-import-audio`), nhận cả file `.mp3` lẻ lẫn gói `.zip` để lưu vào `IndexedDB media` và phát qua `<audio controls>` trong Chi tiết bài học.
- Hỗ trợ trường `workbook` (SBT, Đáp án, Lời thoại nghe) và `optionalExtensions` (`hackNaoIds`, `mindMapRootChars` có nút bật/ẩn, không ép vào SRS).

### 2.2. Nội dung giáo trình & Ánh xạ Audio đã nạp
- **Giáo trình Hán ngữ 1–6 (76 bài):**
  - Đã nạp đủ **76 tiêu đề chính thức** (tiếng Trung giản thể, Pinyin, tiếng Việt) và mã audio đối chiếu `Quyển X Bài Y.mp3` cho cả 6 quyển (`course_hn_1`–`course_hn_6`).
  - Đã nạp **nội dung chi tiết đầy đủ cả 15 bài Quyển 1 (`Bài 1`–`Bài 15`)** trích từ `GT Hán Ngữ 1 .pdf`: Từ mới (đồng bộ vào `vocabBank`), Bài khóa/Hội thoại, Ngữ pháp trọng điểm, Tập viết chữ Hán, số trang tham chiếu, mã audio và liên kết bổ trợ chữ Hán (`HN1_EXT_MAP`). Tất cả 15 bài đều ở trạng thái `published`.
  - Tự động đặt `course_hn_1` làm khóa mặc định trên Lộ trình Trang chủ.
- **NEW HSK 3.0 (Cấp 1–3 + SBT 1–2):**
  - Đã nạp khung bài học cho Cấp 1 (15 bài + Đề thi thử `模拟测试`), Cấp 2 (15 bài + Đề thi thử `模拟测试`), Cấp 3 (18 bài).
  - Đã xây dựng **`HSK_AUDIO_MANIFEST`** ánh xạ đủ **407 track MP3** từ 5 gói ZIP (`HSK 1`: 93, `HSK 2`: 120, `HSK 3`: 144, `SBT 1`: 34, `SBT 2`: 16) vào từng bài tương ứng.
- **Bổ trợ Chữ Hán (`hanzi`) & Khẩu ngữ (`kouyu`):**
  - Đã tạo khung khóa học độc lập và gắn sẵn liên kết *Hack não / Sơ đồ tư duy* cho 15 bài Quyển 1 (`HN1_EXT_MAP`).

### 2.3. Giao diện & Trải nghiệm (`v11`–`v19`)
- **Trình xem giáo trình (`textbook-reader`):**
  - Bỏ nút tải lên PDF ở các giáo trình đã nạp; thay bằng nút **📖 Xem giáo trình** ở Trang chủ, thanh đầu mục Giáo trình, góc phải mỗi thẻ quyển và Chi tiết quyển.
  - Hỗ trợ chuyển nhanh giữa các quyển cùng bộ, xem mục lục bài (`●` đủ nội dung, `○` khung bài, `✓` đã học), đọc Từ mới + nghe TTS, Bài khóa, Ngữ pháp, Chữ Hán, nút *Bài trước / Bài tiếp* và nút **Học bài này →**.
- **Trang chủ & Lộ trình học theo ảnh demo (`v18`):**
  - Sửa lỗi chữ tràn biểu tượng ở thẻ **Tiếp tục học** (`#hm-cont-sub`).
  - Giữ bố cục **2 cột song song** trên cả màn hình điện thoại cho cặp *Mục tiêu hôm nay – Tiến độ học*, cặp *Tiếp tục học – Ôn tập hôm nay* và hàng 5 ô *Khám phá thêm*.
  - Đường cong **Lộ trình học uốn lượn SVG** nối 15 bài Quyển 1, bài đang học có thẻ **Đang học** kèm mũi tên, vòng tròn Play đỏ có quầng sáng và khung tiêu đề màu kem ấm; nút **Xem toàn bộ lộ trình** (`#hm-all-roadmap`) mở thẳng danh sách 15 bài Quyển 1.
- **Chi tiết bài học theo ảnh demo (`v19`):**
  - Làm mới màn hình `lesson` theo ảnh demo `987A1750-8FAA-4A7D-90EE-2010706DEF80.png`: hero bài học kèm minh họa SVG, thanh tiến độ bài, thẻ mục tiêu 2 cột gọn gàng, danh sách hoạt động có preview từ vựng/chữ Hán/sóng audio và nút CTA bo tròn phía dưới.

## 3. Các quyết định đã chốt & Lý do (ưu tiên quyết định mới nhất)

1. **Bản quyền & Phạm vi nạp nội dung:** Người dùng đã mua bản quyền toàn bộ PDF và audio, chỉ dùng cho mục đích **học cá nhân, phi thương mại** → nạp đầy đủ nội dung từng bài từ PDF gốc vào ứng dụng.
2. **Thứ tự triển khai:** Hoàn thiện **Giáo trình Hán ngữ** trước (đã xong khung 76 bài + chi tiết 15 bài Quyển 1), sau đó mở rộng sang Quyển 2–6, NEW HSK 3.0, Khẩu ngữ và Bổ trợ Chữ Hán.
3. **Nút hành động trên giáo trình đã nạp:** Bỏ nút tải lên PDF khỏi các giáo trình đã nạp sẵn; thay bằng **📖 Xem giáo trình** để đọc trực tiếp từng quyển – từng bài.
4. **Chuẩn giao diện theo ảnh demo:**
   - Trang chủ & Lộ trình học bám sát `207E0D9A-E3CB-4602-9891-521210AA32ED.png`.
   - Chi tiết bài học bám sát `987A1750-8FAA-4A7D-90EE-2010706DEF80.png`.
5. **Kiến trúc kỹ thuật tối giản:**
   - **Không** dùng cơ sở dữ liệu ngoài / Supabase, **không** dùng AI API trả phí.
   - **Không** bịa nội dung sách hay giả lập điểm chấm phát âm AI chưa có nguồn thật.
   - **Bảo toàn tuyệt đối** giao diện đỏ gốm – kem, 8 module luyện tập và toàn bộ tiến độ SRS trong `localStorage['hanyu_ai_data']`.
   - Ngôn ngữ giao diện và trao đổi luôn là **tiếng Việt**.

## 4. Tên, cấu trúc & thông số kỹ thuật bắt buộc giữ nguyên

| Thành phần | Giá trị / Quy ước cần giữ nguyên |
|---|---|
| Tên ứng dụng | **Hanyu AI** |
| File mã nguồn mới nhất | `hanyu-ai-chuc-nang-20.html` |
| Bảng màu chủ đạo | Đỏ gốm – kem (`--accent`, `--btn-a`, `--btn-b`, `--surface`, `--surface2`, `--line`, `--gold`) |
| Schema & Lưu trữ tiến độ | `SCHEMA_VERSION = 10`; `localStorage['hanyu_ai_data']` (tương thích ngược dữ liệu SRS cũ) |
| IndexedDB | `DB_NAME = 'hanyu_ai_db'`, `DB_VER = 2`, 4 stores: `courses`, `lessons`, `pdfs`, `media` |
| Mã nhóm khóa học (`group`) | `hanngu`, `hsk`, `kouyu`, `hanzi`, `personal` |
| Mã khóa học Hán ngữ 1–6 | `course_hn_1`, `course_hn_2`, `course_hn_3`, `course_hn_4`, `course_hn_5`, `course_hn_6` |
| Mã bài học Hán ngữ | `lesson_hn{quyển}_b{số_bài}` (VD: `lesson_hn1_b1` … `lesson_hn1_b15`) |
| Biến dữ liệu nội bộ | `HN_CATALOG_TITLES`, `HN1_FULL_DATA`, `HN1_EXT_MAP`, `HSK_AUDIO_MANIFEST`, `buildStandardCatalogSeed()`, `seedStandardCatalog(interactive)` |
| DOM IDs quan trọng | `#hanyu-modal` & `#hanyu-modal-box` (**bắt buộc nằm TRƯỚC `<script>`**), `#hm-cont-sub`, `#hm-lvl`, `#hm-road-in`, `#hm-all-roadmap`, `#hm-free-btn`, `#rm-view-textbook`, `#btn-view-textbook-top`, `#btn-load-audio-top`, `#cd-view-textbook`, `#textbook-reader`, `#tb-volume-switcher`, `#tb-lesson-toc`, `#tb-lesson-content` |
| Quy ước tên Audio MP3 | Hán ngữ: `Quyển {1..6} Bài {số}.mp3` (76 file); HSK 3.0: ánh xạ theo `HSK_AUDIO_MANIFEST` (407 file) |
| Lưu ý kỹ thuật đọc PDF | 6 file `GT Hán Ngữ 1–6.pdf` là PDF scan có lớp OCR lỗi ký tự → cần render ảnh trang (`pdftoppm`) hoặc OCR tiếng Trung/Việt chuẩn khi trích xuất bài mới |

## 5. Việc còn dang dở & Bước tiếp theo

### Việc còn dang dở
1. **Giáo trình Hán ngữ Quyển 2–6 (61 bài còn lại):** Đã có tiêu đề chuẩn + mã MP3, chưa trích xuất nội dung chi tiết (Từ mới, Bài khóa, Ngữ pháp, Chữ Hán) từ `GT Hán Ngữ 2 .pdf` – `GT Hán Ngữ 6.pdf`.
2. **NEW HSK 3.0 (Cấp 1–3 + SBT 1–2 + Đáp án + Lời thoại):** Đã có khung bài và ánh xạ đủ 407 track MP3, chưa trích xuất nội dung chi tiết từng bài, bài tập SBT, đáp án và lời thoại nghe.
3. **Khẩu ngữ tốc thành (`HanYu KouYu SuCheng` 1m–5m):** Mới có khung nhóm `kouyu`, chưa trích xuất nội dung bài hội thoại.
4. **Bổ trợ Chữ Hán (*Hack não 3000* tập 1–3 & *Sơ đồ tư duy 3300*):** Mới gắn liên kết `HN1_EXT_MAP` cho Quyển 1, chưa trích xuất chi tiết truyện nhớ chữ / sơ đồ gốc chữ cho các quyển sau.
5. **Tổ chức cấu trúc thư mục khi sang Antigravity:** Hiện toàn bộ ứng dụng nằm trong 1 file `hanyu-ai-chuc-nang-20.html` (~744 KB). Khi nạp thêm Quyển 2–6 và HSK 3.0, nên tách dữ liệu ra thư mục `data/` (`hanngu-q1.json`…`hanngu-q6.json`, `hsk1.json`…`hsk3.json`) và `audio/` để dễ bảo trì và tải nhanh.

### Bước tiếp theo khuyến nghị trong Antigravity
1. Tạo thư mục dự án, đưa `hanyu-ai-chuc-nang-20.html` (có thể đổi tên bản làm việc thành `index.html`), 2 ảnh demo và toàn bộ tài liệu PDF/Audio bên dưới vào đúng thư mục.
2. Chạy kiểm thử nhanh `hanyu-ai-chuc-nang-20.html` (thử nạp 1 file `.zip` audio qua nút **🎧 Nạp Audio (.zip/.mp3)** và kiểm tra Trang chủ, Lộ trình, Chi tiết bài học, Trình xem giáo trình).
3. Quyết định giữ single-file hay tách thư mục `data/` + `assets/` trong Antigravity.
4. Trích xuất và nạp tiếp nội dung chi tiết theo thứ tự: **Hán ngữ Quyển 2 (Bài 16–30)** → **Quyển 3–6** → **NEW HSK 3.0 (Cấp 1–3 + SBT + Đáp án)** → **Khẩu ngữ 1m–5m** → **Hack não / Sơ đồ tư duy**.

## 6. Danh sách đầy đủ tệp cần đưa vào thư mục dự án

### 6.1. Tệp mã nguồn, tài liệu & ảnh demo (Bắt buộc)
- `hanyu-ai-chuc-nang-20.html` — **File ứng dụng mới nhất (Bản 20)** dùng làm điểm bắt đầu chính
- `hanyu-ai-handoff-antigravity.md` — File tóm tắt bàn giao này
- `hanyu-ai-giai-doan-8a-bao-cao.md` — Báo cáo kiểm toán cấu trúc giáo trình giai đoạn 8A (tham khảo)
- `207E0D9A-E3CB-4602-9891-521210AA32ED.png` — **Ảnh demo chuẩn** Trang chủ & Lộ trình học
- `987A1750-8FAA-4A7D-90EE-2010706DEF80.png` — **Ảnh demo chuẩn** Chi tiết bài học

### 6.2. Bộ Giáo trình Hán ngữ 6 quyển + Audio (76 bài / 76 MP3)
- `GT Hán Ngữ 1 .pdf` (177 trang — Bài 1–15, **đã nạp đầy đủ**)
- `GT Hán Ngữ 2 .pdf` (245 trang — Bài 16–30)
- `GT Hán Ngữ 3.pdf` (185 trang — Bài 1–10)
- `GT Hán Ngữ 4.pdf` (181 trang — Bài 11–20)
- `GT Hán Ngữ 5.pdf` (209 trang — Bài 1–13)
- `GT Hán Ngữ 6.pdf` (237 trang — Bài 14–26)
- `MP3 Q1.zip` (15 MP3: Quyển 1)
- `TIẾNG TRUNG ACS_ AUDIO HÁN NGỮ 6 QUYỂN 23.zip` (25 MP3: Quyển 2 & 3)
- `TIẾNG TRUNG ACS_ AUDIO HÁN NGỮ 6 QUYỂN 45.zip` (23 MP3: Quyển 4 & 5)
- `MP3 Q6.zip` (13 MP3: Quyển 6)

### 6.3. Bộ NEW HSK 3.0 (Cấp 1–3, SBT, Đáp án, Lời thoại + 407 Audio)
- `HSK1 - Tiếng Việt (3.0).pdf`
- `HSK2 - Tiếng Việt (3.0).pdf`
- `HSK3 - Tiếng Việt (3.0).pdf`
- `SBT HSK1 - Tiếng Việt (3.0).pdf`
- `SBT HSK2 - Tiếng Việt (3.0).pdf`
- `Đáp án SBT HSK 1.pdf`
- `Đáp án SBT HSK2.pdf`
- `Lời thoại phần nghe SBT HSK2.pdf`
- `HSK 1 (HSK3.0) Audio.zip` (93 MP3)
- `HSK 2 (HSK3.0) Audio.zip` (120 MP3)
- `HSK 3 (HSK3.0) Audio.zip` (144 MP3)
- `HSK SBT 1 (HSK3.0) Audio.zip` (34 file audio)
- `HSK SBT 2 (HSK3.0) Audio.zip` (16 file audio)

### 6.4. Bộ Khẩu ngữ tốc thành (`HanYu KouYu SuCheng` 1m–5m)
- `HanYu KouYu SuCheng 1m.pdf`
- `HanYu KouYu SuCheng 2m.pdf`
- `HanYu KouYu SuCheng 3m.pdf`
- `HanYu KouYu SuCheng 4m.pdf`
- `HanYu KouYu SuCheng 5m.pdf`

### 6.5. Bộ bổ trợ chữ Hán (Tùy chọn mở rộng)
- `Hack não 3000 chữ Hán tập 1.pdf`
- `Hack não 3000 chữ hán tập 2.pdf`
- `Hack_nao_3000_chu_Han_tap_3_nen.pdf`
- `So_do_tu_duy_3300_chu_Han_nen.pdf`
