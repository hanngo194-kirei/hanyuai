# Kiến trúc dự án Hanyu AI

## 1. Hiện trạng Bản 20 (`index.html`)

File [index.html](file:///f:/Antigravity/kirei%20hanyu/index.html) hiện là bản sao nguyên vẹn 100% từ [hanyu-ai-chuc-nang-20.html](file:///f:/Antigravity/kirei%20hanyu/data%20gemini/hanyu-ai-chuc-nang-20.html) (5.718 dòng, ~744 KB, single-file Web App / PWA).

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

## 3. Kiến trúc đích "2 trong 1" (Mục tiêu của Milestone 1)

Khi thêm Quyển 2–6 (61 bài) và NEW HSK 3.0, giữ tất cả trong 1 file HTML sẽ khiến file phình lên hàng chục nghìn dòng, chậm và dễ lỗi khi agent sửa code. Vì vậy từ Milestone 1, dự án áp dụng kiến trúc **"2 trong 1"**:

### Cấu trúc thư mục khi phát triển
```text
kirei hanyu/
├── index.html                  # Khung HTML (views, SVG sprites, #hanyu-modal trước <script>) + nạp CSS/Data/JS
├── css/
│   ├── tokens-core.css         # Bảng màu đỏ gốm–kem, layout chính, lộ trình SVG, trình xem giáo trình
│   └── modules.css             # CSS các module học tập & chi tiết bài học v19
├── data/
│   ├── hn-catalog.js           # HN_CATALOG_TITLES (76 bài Q1–Q6)
│   ├── hn1-full.js             # HN1_FULL_DATA (Q1 Bài 1–15)
│   ├── hn1-ext.js              # HN1_EXT_MAP (liên kết bổ trợ Chữ Hán Q1)
│   ├── hsk-audio-manifest.js   # HSK_AUDIO_MANIFEST (407 track audio HSK 3.0)
│   ├── hn2-full.js ... hn6-full.js  # Nạp dần ở Milestone 2
│   └── hsk1.js ... hsk3.js          # Nạp dần ở Milestone 3
├── js/
│   ├── storage-idb.js          # localStorage schema v10 + HanyuIDB (timeout 1,2s + onblocked)
│   ├── catalog-seed.js         # buildStandardCatalogSeed() & seedStandardCatalog()
│   ├── audio-zip.js            # Nạp .zip/.mp3 vào IndexedDB media & trình phát audio
│   ├── textbook-reader.js      # Trình xem giáo trình (chuyển quyển, mục lục, bài trước/tiếp)
│   ├── modules.js              # 8 module luyện tập (Flashcard/SRS, Từ vựng, Ngữ pháp, Bài tập, Nghe, Nói, Viết, Thống kê)
│   └── app-main.js             # Trang chủ, Lộ trình SVG, Chi tiết bài học, modal & khởi chạy app
├── scripts/
│   └── build-single.ps1        # Script PowerShell thuần gộp thành 1 file HTML duy nhất
└── dist/                       # Nơi chứa file đóng gói 1 file (git ignored)
    └── hanyu-ai.html
```

### Tại sao dùng file dữ liệu `.js` thay vì `.json`?
- Mở file `index.html` trực tiếp trên máy tính (giao thức `file://`) sẽ bị trình duyệt chặn `fetch('data/xxx.json')` vì chính sách bảo mật CORS.
- Khi lưu dữ liệu dưới dạng `data/*.js` (gán biến toàn cục như `window.HN2_FULL_DATA = ...` và nạp qua `<script src="data/hn2-full.js"></script>`), người dùng **vẫn nháy đúp thẳng vào `index.html` để học ngay không cần cài server**, đồng thời mỗi quyển nằm ở 1 file gọn nhẹ riêng biệt để mở chat riêng trích xuất song song mà không đụng file code chính.

### Cơ chế đóng gói 1 file (`scripts/build-single.ps1`)
- Viết bằng **Windows PowerShell thuần** (không cần Node.js hay Python).
- Khi chạy, script đọc `index.html`, thay thế các thẻ `<link rel="stylesheet" href="css/...">` bằng `<style>...</style>` nội tuyến và các thẻ `<script src="data|js/..."></script>` bằng `<script>...</script>` nội tuyến, xuất ra `dist/hanyu-ai.html` để bạn chép 1 file duy nhất sang điện thoại hoặc lưu trữ bất kỳ lúc nào.
