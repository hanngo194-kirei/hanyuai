# Kiến trúc dự án Hanyu AI

## 1. Bản gốc tham chiếu — Bản 20 (`data gemini/`)

File [hanyu-ai-chuc-nang-20.html](file:///f:/Antigravity/kirei%20hanyu/data%20gemini/hanyu-ai-chuc-nang-20.html) là bản gốc bất biến từ Gemini Web (5.718 dòng, 744.197 bytes / ~726,75 KB, single-file Web App / PWA). Từ Milestone 1 trở đi, [index.html](file:///f:/Antigravity/kirei%20hanyu/index.html) đã được tách sang kiến trúc **"2 trong 1"** (mục 3 bên dưới) mà vẫn bảo toàn 100% mã nguồn, thứ tự CSS cascade và thứ tự thực thi JS của Bản 20.

### Bản đồ vị trí mã nguồn Bản 20
| Khoảng dòng | Thành phần | Ghi chú quan trọng |
|---|---|---|
| L1–L3 | `<!DOCTYPE html>`, `<html lang="vi">`, `<head>` meta | Viewport, charset UTF-8 |
| L4–L321 | Khối `<style>` 1 | CSS cho Flashcard, Ôn tập SRS, Sổ từ vựng, Bài tập, Ngữ pháp, Phát âm AI và màn hình Chi tiết bài học (`v19`) |
| L322–L328 | `<title>` & Icon nhúng | `Hanyu AI`, icon PNG base64 (~130 KB) |
| L329–L729 | Khối `<style>` 2 | CSS tokens bảng màu đỏ gốm – kem, layout chung, Lộ trình SVG (`v18`), Trình xem giáo trình |
| L730–L1525 | `<body>` | Toàn bộ màn hình/view, SVG sprite icon, thanh tab điều hướng, `#toast` và `#hanyu-modal` + `#hanyu-modal-box` (tại L1523–L1525, **bắt buộc nằm trước `<script>`**) |
| L1526–L5716 | Khối `<script>` | Toàn bộ dữ liệu và logic JS |

### Điểm neo quan trọng trong `<script>`
- `L1642`: `SCHEMA_VERSION = 10`
- `L3879`: `HanyuIDB` (`hanyu_ai_db`, `DB_VER = 2`)
- `L3999`: `HN_CATALOG_TITLES` (76 tiêu đề Hán ngữ Quyển 1–6)
- `L4000`: `HN1_FULL_DATA` (nội dung chi tiết 15 bài Quyển 1)
- `L4002`: `HSK_AUDIO_MANIFEST` (ánh xạ 407 file audio NEW HSK 3.0)
- `L4003`: `HN1_EXT_MAP` (liên kết bổ trợ *Hack não* & *Sơ đồ tư duy* cho Quyển 1)
- `L4004`: `buildStandardCatalogSeed()` (dựng danh mục & bài học mặc định)

---

## 2. Kiến trúc lưu trữ & Schema dữ liệu

### Lưu trữ trên trình duyệt
- **`localStorage['hanyu_ai_data']`** (`SCHEMA_VERSION = 10`): Lưu trạng thái SRS của từ vựng (`words`), `difficultIds`, `favoriteIds`, mục tiêu ngày, thống kê học tập. Mọi nâng cấp đều phải tương thích ngược với dữ liệu đã lưu của người dùng.
- **`IndexedDB` (`DB_NAME = 'hanyu_ai_db'`, `DB_VER = 2`)** gồm 4 object stores:
  - `courses`: Danh mục khóa học thuộc 5 nhóm (`hanngu`, `hsk`, `kouyu`, `hanzi`, `personal`).
  - `lessons`: Dữ liệu từng bài học (`lesson_hn{quyển}_b{số_bài}`, bài HSK...).
  - `pdfs`: Siêu dữ liệu các PDF người dùng từng nạp thêm thủ công.
  - `media`: Lưu Blob audio `.mp3` nạp từ file lẻ hoặc giải nén từ `.zip` (phát trực tiếp qua `<audio controls>`).

### Cấu trúc dữ liệu chuẩn một bài học (theo `HN1_FULL_DATA`)
```js
{
  pages: "1–12",
  words: [
    { zh: "你好", py: "nǐ hǎo", vi: "xin chào", pos: "đại/tính" } // pos tùy chọn
  ],
  dialog: [
    { speaker: "A", name: "A", zh: "你好！", py: "Nǐ hǎo!", vi: "Xin chào!" }
  ],
  grammar: {
    g1: {
      title: "Tiêu đề điểm ngữ pháp",
      explain: "Giải thích chi tiết bằng tiếng Việt",
      examples: [{ zh: "...", py: "...", vi: "..." }] // hoặc chuỗi `ex`
    }
  },
  chars: ["一", "八", "五"],
  // Trường mở rộng tùy chọn ở cấp lesson:
  workbook: null,
  optionalExtensions: {
    hackNaoIds: [],
    mindMapRootChars: []
  }
}
```

---

## 3. Kiến trúc "2 trong 1" (Đã hoàn thành tại Milestone 1)

Khi thêm Quyển 2–6 (61 bài) và NEW HSK 3.0, giữ tất cả trong 1 file HTML sẽ khiến file phình lên hàng chục nghìn dòng, chậm và dễ lỗi khi agent sửa code. Vì vậy từ Milestone 1, dự án áp dụng kiến trúc **"2 trong 1"**: phát triển trên các file tách gọn nhẹ (vẫn mở thẳng `index.html` bằng `file://` không cần server) và đóng gói ra 1 file duy nhất `dist/hanyu-ai.html` bất kỳ lúc nào bằng PowerShell thuần.

### Cấu trúc thư mục thực tế sau Milestone 1
```text
kirei hanyu/
├── index.html                        # 820 dòng (~324 KB) — Khung HTML views, SVG sprites, icon base64, #hanyu-modal (L806–L808) đặt trước toàn bộ <script>
├── css/
│   ├── modules.css                   # 317 dòng (~27 KB)  — Style block 1 (Flashcard, SRS, Sổ từ, Bài tập, Ngữ pháp, Phát âm AI, Chi tiết bài học v19); nạp TRƯỚC <title>/Fonts
│   └── tokens-core.css               # 399 dòng (~101 KB) — Style block 2 (Tokens đỏ gốm–kem, layout chính, Lộ trình SVG v18, Trình xem giáo trình); nạp SAU Google Fonts
├── data/
│   ├── hn-catalog.js                 #   1 dòng (~7 KB)   — HN_CATALOG_TITLES (76 tiêu đề Hán ngữ Q1–Q6)
│   ├── hn1-full.js                   #   1 dòng (~50 KB)  — HN1_FULL_DATA (15 bài chi tiết Quyển 1)
│   ├── hn2-full.js                   #   HN2_FULL_DATA (15 bài chi tiết Quyển 2: Bài 16–30)
│   ├── hsk-audio-manifest.js         #   1 dòng (~6 KB)   — HSK_AUDIO_MANIFEST (407 track audio NEW HSK 3.0)
│   ├── hn1-ext.js                    #   1 dòng (~3 KB)   — HN1_EXT_MAP (liên kết bổ trợ Hack não & Sơ đồ tư duy Q1)
│   ├── hn3-full.js ... hn6-full.js   # (Sẽ nạp dần ở Milestone 2)
│   └── hsk1.js ... hsk3.js           # (Sẽ nạp dần ở Milestone 3)
├── js/
│   ├── core-storage.js               # 374 dòng (~22 KB)  — Dữ liệu mẫu, tiện ích, router, click chung, localStorage SCHEMA_VERSION=10, SRS, tìm kiếm & cài đặt
│   ├── modules-vocab-grammar.js      # 659 dòng (~39 KB)  — Flashcard, Ôn tập theo lịch, Sổ từ khó & yêu thích, Bài tập tương tác 5 dạng, Ngữ pháp
│   ├── modules-listen-speak-write.js # 1.304 dòng (~68 KB)— Luyện nghe/Chép chính tả, Hội thoại, Luyện nói/Ghi âm/Thanh điệu, Luyện viết chữ Hán, lọc thư viện, Thống kê/Streak/Mục tiêu ngày
│   ├── curriculum-idb-seed.js        # 453 dòng (~24 KB)  — HanyuIDB (hanyu_ai_db v2, 4 stores, timeout 1,2s + onblocked), COURSES/LESSONS, buildStandardCatalogSeed(), seedStandardCatalog(), initCurriculumStore()
│   ├── views-reader.js               # 582 dòng (~33 KB)  — applyActiveLesson(), Chi tiết bài học (#lesson), Lộ trình SVG (#home), Thư viện (#learn), Chi tiết giáo trình, Trình xem giáo trình (#textbook-reader)
│   └── editor-import-boot.js         # 812 dòng (~40 KB)  — Modal giáo trình & Sao lưu JSON, Trình biên soạn bài học, Nhập PDF, Nạp Audio .zip/.mp3, sự kiện Công đoạn 8 & khởi chạy cuối file
├── scripts/
│   └── build-single.ps1              # Script Windows PowerShell 5.1 thuần đóng gói 1 file duy nhất
└── dist/                             # Nơi chứa file đóng gói 1 file (git ignored)
    └── hanyu-ai.html                 # 5.727 dòng (744.359 bytes / 726,91 KB)
```

### Thứ tự nạp bắt buộc trong `index.html`
1. **CSS (giữ nguyên thứ tự cascade của Bản 20):** `css/modules.css` (trước `<title>`, base64 icons, Google Fonts) → `css/tokens-core.css` (sau Google Fonts).
2. **DOM trước `<script>`:** `#hanyu-modal` và `#hanyu-modal-box` nằm ở cuối `<body>` (L806–L808), **trước toàn bộ thẻ `<script>`**.
3. **Script (đúng thứ tự thực thi):**
   `data/hn-catalog.js` → `data/hn1-full.js` → `data/hn2-full.js` → `data/hsk-audio-manifest.js` → `data/hn1-ext.js` → `js/core-storage.js` → `js/modules-vocab-grammar.js` → `js/modules-listen-speak-write.js` → `js/curriculum-idb-seed.js` → `js/views-reader.js` → `js/editor-import-boot.js`.

### Tại sao dùng file dữ liệu `.js` thay vì `.json`?
- Mở file `index.html` trực tiếp trên máy tính (giao thức `file://`) sẽ bị trình duyệt chặn `fetch('data/xxx.json')` vì chính sách bảo mật CORS.
- Khi lưu dữ liệu dưới dạng `data/*.js` (khai báo hằng số toàn cục như `const HN1_FULL_DATA = ...` và nạp qua `<script src="data/hn1-full.js"></script>`), người dùng **vẫn nháy đúp thẳng vào `index.html` để học ngay không cần cài server**, đồng thời mỗi quyển nằm ở 1 file gọn nhẹ riêng biệt để mở chat riêng trích xuất song song mà không đụng file code chính.

### Cơ chế đóng gói 1 file (`scripts/build-single.ps1`)
- Viết bằng **Windows PowerShell 5.1 thuần** (không cần Node.js hay Python), đọc/ghi chuẩn UTF-8 không BOM.
- Chạy bằng lệnh: `powershell -ExecutionPolicy Bypass -File scripts/build-single.ps1`
- Script đọc `index.html`, dùng `[regex]::Replace` với `MatchEvaluator` (tránh lỗi ký tự `$` trong JS như `$('#toast')`, `${...}`) để chỉ nhúng nội tuyến `<link rel="stylesheet" href="css/..."/>` thành `<style>...</style>` và `<script src="(data|js)/..."></script>` thành `<script>...</script>`, giữ nguyên link Google Fonts và icon base64, đồng thời tự động kiểm tra `#hanyu-modal` nằm trước `<script>` trước khi xuất `dist/hanyu-ai.html`.
