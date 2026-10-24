# Kế Hoạch Chuyển Đổi TypeScript & Tách Module Nông Trại GenZ Auto

> **Tệp kế hoạch**: `typescript-modular-migration.md`  
> **Nhánh thực hiện dự kiến**: `feature/typescript-modular-migration`  
> **Mục tiêu**: Chuyển đổi toàn bộ mã nguồn sang TypeScript, module hóa kiến trúc, và tích hợp tính năng kiểm tra cập nhật từ GitHub Releases.

---

## 1. Đánh Giá Tính Khả Thi & Tương Thích (Feasibility & Compatibility)

### 1.1 Khả năng viết Chrome Extension bằng TypeScript
- **Khả thi 100%**: Hầu hết các Extension lớn hiện nay đều viết bằng TypeScript.
- **Nguyên lý hoạt động**: Chrome không chạy trực tiếp tệp `.ts`. Chúng ta sử dụng công cụ đóng gói hiện đại (**Vite** / **tsup** / **esbuild**) để biên dịch từ `src/**/*.ts` sang `dist/**/*.js` (chuẩn JavaScript ES2022 / IIFE). File `manifest.json` sẽ trỏ trực tiếp vào thư mục `dist/`.
- **Tương thích Manifest V3**:
  - `background`: Service worker dạng ES module.
  - `content`: Content script chạy cách ly trong isolate world.
  - `page-hook`: Web Accessible Resource đóng gói dạng IIFE (hoặc standalone script) để tự do tương tác trực tiếp với `window.Phaser` và `window.useGameStore` trong page world mà không xung đột module.
  - `popup`: Giao diện popup nhẹ nhàng.

### 1.2 Ưu điểm sau khi chuyển đổi
1. **Kiểm soát kiểu dữ liệu chặt chẽ (Strict Types)**: Định nghĩa rõ ràng cấu trúc dữ liệu game (Store, Inventory, Settings, Coordinates, Message Protocol). Loại bỏ hoàn toàn lỗi gõ nhầm biến hay `undefined`.
2. **Cấu trúc Module hóa (Modular Architecture)**: Thay vì 2 file nguyên khối dài >2.700 dòng (`content.js`) và >2.100 dòng (`page-hook.js`), mã nguồn sẽ được chia thành các file nhỏ (dưới 150-250 dòng) theo từng khu vực: Farm, Wharf, Sea, Market, HUD, Scheduler.
3. **Mở rộng dễ dàng**: Khi game thêm khu vực mới (như Thành Phố), chỉ cần thêm 1 module trong `src/modules/city/` mà không ảnh hưởng tới các khu vực khác.
4. **Tự động build siêu tốc**: Chế độ `pnpm run dev` (watch mode) tự động re-build dưới 100ms mỗi khi lưu file.

---

## 2. Kiến Trúc Thư Mục Đề Xuất (Target Architecture)

```
nongtraigenz/
├── src/
│   ├── background/
│   │   └── index.ts                 # Service worker quản lý phím tắt & badge
│   ├── popup/
│   │   ├── popup.html               # Giao diện popup extension
│   │   ├── popup.css                # CSS popup
│   │   └── popup.ts                 # Script điều khiển popup & nút check update
│   ├── content/
│   │   ├── index.ts                 # Entry content script khởi tạo HUD & Scheduler
│   │   ├── ui/
│   │   │   ├── hud-core.ts          # Khung HUD nổi, kéo thả, thu gọn
│   │   │   ├── tabs/
│   │   │   │   ├── farm-tab.ts      # Tab Nông trại & 8 cụm kéo thả
│   │   │   │   ├── wharf-tab.ts     # Tab Bến đò & các dịch vụ
│   │   │   │   ├── sea-tab.ts       # Tab Biển & câu cá biển
│   │   │   │   └── city-tab.ts      # Tab Thành phố (Coming Soon)
│   │   │   └── update-modal.ts      # Modal hiển thị thông báo cập nhật & Changelog
│   │   ├── scheduler/
│   │   │   ├── task-runner.ts       # Điều phối vòng lặp và thứ tự chạy task
│   │   │   └── debounce-guard.ts    # Bộ đệm chống lặp và cooldown
│   │   └── bridge/
│   │       └── content-bridge.ts    # Gửi/nhận postMessage với Page Hook
│   ├── page-hook/
│   │   ├── index.ts                 # Entry page-hook inject vào thế giới trang
│   │   ├── core/
│   │   │   ├── engine-access.ts     # Lấy biến Phaser Scene & Game instance
│   │   │   └── store-watcher.ts     # Lắng nghe Zustand store (Balo, Tiền, Sức...)
│   │   ├── navigation/
│   │   │   └── movement.ts          # Điều khiển nhân vật di chuyển
│   │   ├── modules/
│   │   │   ├── farm/
│   │   │   │   ├── crops.ts         # Trồng trọt, tưới nước, bón phân
│   │   │   │   ├── animals.ts       # Gà, Trâu, Bò, Chó
│   │   │   │   ├── market.ts        # Chợ, Giao đơn hàng, Trend
│   │   │   │   ├── gold.ts          # Thuật toán Vàng Cô Kim
│   │   │   │   └── tasks.ts         # Sổ tay, Nuôi heo, Tiết kiệm
│   │   │   ├── wharf/
│   │   │   │   ├── river-fishing.ts # Minigame câu sông & giật phao
│   │   │   │   └── services.ts      # Út Mười, Cô Bảy, Vé số, ATM
│   │   │   └── sea/
│   │   │       └── ocean-fishing.ts # Câu cá biển & Bách khoa Ông Tư
│   ├── shared/
│   │   ├── types/
│   │   │   ├── config.ts            # Schema cấu hình Auto & Task Priorities
│   │   │   ├── game-state.ts        # Kiểu dữ liệu Store, Items, NPCs
│   │   │   ├── github.ts            # Kiểu dữ liệu GitHub Release API
│   │   │   └── protocol.ts          # Định nghĩa Message giữa Content và Hook
│   │   └── constants/
│   │       ├── default-config.ts    # Cấu hình mặc định ban đầu
│   │       └── game-constants.ts    # ID vật phẩm, tên NPC
│   └── services/
│       └── github-service.ts        # Gọi GitHub API kiểm tra release mới & parse Changelog
├── dist/                            # Thư mục build đầu ra (Load unpacked vào Chrome)
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   ├── page-hook.js
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── vite.config.ts                   # Cấu hình Vite build multi-entry
├── tsconfig.json                    # Cấu hình TypeScript nghiêm ngặt
├── package.json
└── README.md
```

---

## 3. Tính Năng Kiểm Tra Cập Nhật & Hiển Thị Changelog Từ GitHub

### 3.1 Luồng hoạt động (Workflow)
1. **Nguồn dữ liệu**:
   - Sử dụng GitHub REST API công khai:
     ```
     GET https://api.github.com/repos/ntuan2502/ntgz/releases/latest
     ```
   - Không yêu cầu token xác thực, phản hồi nhanh (cache 60s).
2. **Dữ liệu phân tích**:
   - `tag_name`: Phiên bản mới nhất (vd: `v1.0.1`).
   - `name`: Tiêu đề release.
   - `body`: Nội dung ghi chú cập nhật (Changelog Markdown).
   - `html_url`: Đường dẫn tải về hoặc xem chi tiết.
   - `assets`: Danh sách file nén đính kèm (`nongtraigenz-auto-vX.X.X.zip`).
3. **So sánh phiên bản (SemVer Compare)**:
   - Lấy phiên bản cục bộ: `chrome.runtime.getManifest().version` (`1.0.0`).
   - So sánh với `tag_name` từ GitHub:
     - Nếu `remoteVersion > localVersion`: Đổi màu nút cập nhật (huy hiệu chấm đỏ / `Cập nhật mới!`).
     - Nếu `remoteVersion === localVersion`: Hiển thị "Bạn đang dùng phiên bản mới nhất (v1.0.0)".
4. **Giao diện người dùng**:
   - **Trên Popup Extension**: Nút "Kiểm tra cập nhật". Khi bấm sẽ gọi API và hiển thị popup nhỏ với nội dung tóm tắt changelog + nút "Tải bản mới".
   - **Trên Bảng Điều Khiển Game (HUD)**: Thêm biểu tượng 🔄 nhỏ trên thanh tiêu đề HUD. Bấm vào sẽ mở popup xem trực tiếp changelog Markdown được định dạng đẹp mắt ngay trong game.

---

## 4. Lộ Trình Triển Khai Chi Tiết (Task Breakdown)

### Giai đoạn 1: Chuẩn bị & Thiết lập Môi trường Build
- [ ] **Task 1.1**: Tạo nhánh mới `feature/typescript-modular-migration` từ `main`.
- [ ] **Task 1.2**: Cài đặt các công cụ build TypeScript bằng `pnpm`:
  - `pnpm add -D typescript vite @types/chrome vite-plugin-static-copy`
- [ ] **Task 1.3**: Tạo `tsconfig.json` tối ưu cho Chrome Extension (ES2022, moduleResolution: bundler, strict: true).
- [ ] **Task 1.4**: Tạo `vite.config.ts` hỗ trợ build 4 entry point: `content`, `page-hook`, `background`, `popup`.
- [ ] **Task 1.5**: Cập nhật `package.json` với các lệnh: `pnpm run build`, `pnpm run dev` (watch), `pnpm run type-check`.

### Giai đoạn 2: Định nghĩa Kiểu Dữ Liệu (Shared Types)
- [ ] **Task 2.1**: Tạo `src/shared/types/config.ts`: Chuyển đổi toàn bộ schema cấu hình (`defaultConfig`) sang interface/type rõ ràng.
- [ ] **Task 2.2**: Tạo `src/shared/types/protocol.ts`: Định nghĩa các sự kiện Message giữa `content` và `page-hook` (type-safe messaging).
- [ ] **Task 2.3**: Tạo `src/shared/types/game-state.ts`: Định nghĩa cấu trúc Zustand store, Inventory, Task cluster.
- [ ] **Task 2.4**: Tạo `src/shared/types/github.ts`: Định nghĩa schema response của GitHub Releases API.

### Giai đoạn 3: Module Hóa Page-Hook (In-Game Logic)
- [ ] **Task 3.1**: Tách `src/page-hook/core/engine-access.ts` và `store-watcher.ts`.
- [ ] **Task 3.2**: Tách logic nông trại sang `src/page-hook/modules/farm/` (crops, animals, market, gold, tasks).
- [ ] **Task 3.3**: Tách logic bến đò sang `src/page-hook/modules/wharf/` (river-fishing, services).
- [ ] **Task 3.4**: Tách logic biển sang `src/page-hook/modules/sea/` (ocean-fishing).
- [ ] **Task 3.5**: Tạo `src/page-hook/index.ts` kết nối tất cả các module.

### Giai đoạn 4: Module Hóa Content Script & HUD UI
- [ ] **Task 4.1**: Tách `src/content/ui/hud-core.ts` (khung nổi, drag-drop, thu gọn).
- [ ] **Task 4.2**: Tách các tab giao diện: `farm-tab.ts`, `wharf-tab.ts`, `sea-tab.ts`.
- [ ] **Task 4.3**: Tách `src/content/scheduler/` (task-runner và debounce-guard).
- [ ] **Task 4.4**: Tạo `src/content/index.ts` tích hợp toàn bộ luồng.

### Giai đoạn 5: Tích hợp Tính Năng Check Cập Nhật & Changelog từ GitHub
- [ ] **Task 5.1**: Tạo `src/services/github-service.ts`: Viết hàm `checkForUpdates()` và `fetchLatestRelease()`.
- [ ] **Task 5.2**: Tích hợp nút kiểm tra cập nhật vào Popup (`src/popup/`).
- [ ] **Task 5.3**: Tạo Modal hiển thị Changelog trực tiếp trong Game HUD (`src/content/ui/update-modal.ts`).

### Giai đoạn 6: Tích hợp Background & Popup
- [ ] **Task 6.1**: Chuyển đổi `background.js` sang `src/background/index.ts`.
- [ ] **Task 6.2**: Chuyển đổi `popup.js` sang `src/popup/popup.ts`.
- [ ] **Task 6.3**: Cập nhật `manifest.json` trong `dist/` khớp với cấu trúc mới.

### Giai đoạn 7 (Phase X): Xác minh & Kiểm thử Hoàn chỉnh
- [ ] Chạy `pnpm run type-check` (tsc --noEmit) không có bất kỳ lỗi type nào.
- [ ] Chạy `pnpm run build` xuất ra thư mục `dist/` hoàn chỉnh.
- [ ] Tải `dist/` vào Chrome (`chrome://extensions/`) test thực tế trên game `https://nongtraigenz.online/play/`.
- [ ] Kiểm tra tính năng kéo thả thứ tự, các thao tác auto nông trại, bến đò, biển hoạt động chính xác.
- [ ] Kiểm tra nút "Kiểm tra cập nhật" hiển thị đúng trạng thái so với GitHub release `v1.0.0`.
- [ ] Kiểm tra Husky `pre-commit` và `commit-msg` hoạt động tốt.

---

## 5. Tiêu Chí Đánh Giá Thành Công (Success Criteria)
1. Toàn bộ mã nguồn viết bằng TypeScript 100%, không còn file JS khổng lồ.
2. Mỗi module có phạm vi trách nhiệm rõ ràng, dễ bảo trì và thêm tính năng mới.
3. Bản build `dist/` hoạt động mượt mà, đầy đủ tính năng như bản v1.0.0 hiện tại.
4. Nút kiểm tra cập nhật gọi API GitHub chuẩn xác, hiển thị Changelog trực quan.
