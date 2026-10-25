# 🌾 Nông Trại GenZ Auto by Tún (v1.3.1)

> **Công cụ Auto đa khu vực (DOM + Canvas) thông minh, toàn diện dành riêng cho tựa game [Nông Trại GenZ](https://nongtraigenz.online/play/).**  
> Bản quyền phát triển bởi **Tún**. Tiện ích mở rộng Google Chrome Extension theo chuẩn **Manifest V3**.

---

## 📌 Giới Thiệu Tổng Quan

**Nông Trại GenZ Auto by Tún** là tiện ích mở rộng cao cấp giúp tự động hóa mọi hoạt động trong game *Nông Trại GenZ* từ trồng trọt, chăn nuôi, giao thương chợ búa, gửi tiết kiệm, đầu tư vàng cho đến câu cá giải trí tại Bến Đò và Biển khơi.

Tiện ích hoạt động mượt mà kết hợp giữa can thiệp giao diện người dùng (DOM) và tương tác trực tiếp với engine game Canvas (Phaser 3), đảm bảo tốc độ phản hồi nhanh, độ chính xác cao và an toàn cho tài khoản người chơi.

---

## 🌟 Tổng Quan Tính Năng Chính

- 🌾 **Khu Vực Nông Trại**: Tự động hóa toàn diện 8 cụm công việc (Nhà & Nhu cầu, Ruộng đồng, Thú cưng, Chuồng trâu/bò, Chuồng gà, Ao cá, Chợ Lớn & Tiệm Vàng Cô Kim, Quầy Dì Bảy & Sổ tay). Hỗ trợ kéo thả hoặc bấm nút để thay đổi thứ tự ưu tiên các cụm việc theo ý muốn.
- 🛶 **Khu Vực Bến Đò**: Tự động nhận diện phao câu chìm giật cần chuẩn xác, chọn đa dạng điểm câu (Cầu tàu, Cầu tre, Bờ sông), mua/xin mồi câu Chú Đực, bán cá Vựa Anh Tư, gội đầu dưỡng sinh Út Mười hồi phục sức câu, ăn uống Dì Tám/Chị Thơm, sạp lồng đèn Cô Bảy, vé số Chú Bảy và đổi tiền tại cây ATM.
- 🏖️ **Khu Vực Biển**: Tự động canh lực giật cần biển, ghìm cá ngược hướng bơi, câu tại 3 điểm (Cầu tàu, Bãi đá, Mép cát), mua mồi và bán cá Chòi Ông Tư, tự nhận thưởng Sổ cá biển bách khoa toàn thư.
- 🔄 **Kiểm Tra Cập Nhật Trực Tiếp**: Tích hợp nút kiểm tra cập nhật trên cả Popup Extension và Menu Game HUD, tự động so sánh phiên bản với GitHub Releases và hiển thị nội dung Changelog Markdown chi tiết kèm đường dẫn tải bản mới.
- ⚡ **Công Nghệ & Trải Nghiệm**:
  - **100% TypeScript & Modular**: Kiến trúc module hóa tách biệt rõ ràng, type safety nghiêm ngặt, build siêu tốc bằng `esbuild`.
  - **Chống mua lặp (Anti-Double-Action)**: Bộ đệm thông minh ngăn ngừa tuyệt đối lỗi mua 2 lần do mạng trễ.
  - **Khóa Tab Auto độc lập**: Chạy auto cố định theo khu vực đã chọn mà không bị gián đoạn khi chuyển tab xem thông tin.
  - **Giao diện HUD V2 hiện đại**: Kích thước mặc định `400×800`, hỗ trợ kéo giãn (resize) tự do, tích hợp cửa sổ **Terminal Lịch Sử Hoạt Động** của phiên hiện tại, nút chạy kép `▶️ Tất cả` và `🎯 Tab này`, thanh trượt điều chỉnh tốc độ trễ `taskDelayMs`.
  - **Hệ thống Select & Input cao cấp**: Sử dụng Shadcn UI Radix Select chống tràn chữ (`...`), đồng bộ chiều cao chuẩn `32px` với các ô nhập số.
  - **Tự động hóa nâng cao**: Tự động hóa chu kỳ quay vé lồng đèn Cô Bảy (tự chọn món săn, quay vé, ghi log trúng thưởng vào Terminal và nhấn xác nhận); hỗ trợ chế độ "Hiển thị đầy đủ thao tác" (`showFullActions`).

👉 **Chi tiết toàn bộ tính năng và danh sách cập nhật đầy đủ được ghi chép tại [CHANGELOG.md](CHANGELOG.md).**

---

## 🚀 Hướng Dẫn Cài Đặt (Google Chrome)

### Cách 1: Sử dụng Bản Phát Hành Sẵn (.zip từ GitHub Releases)
1. Tải bản phát hành `.zip` mới nhất tại mục [Releases](https://github.com/ntuan2502/ntgz/releases) và giải nén vào một thư mục trên máy tính của bạn.
2. Mở trình duyệt **Google Chrome** và truy cập:
   ```
   chrome://extensions/
   ```
3. Bật công tắc **Chế độ dành cho nhà phát triển (Developer mode)** ở góc trên bên phải màn hình.
4. Bấm nút **Tải tiện ích đã giải nén (Load unpacked)** ở góc trên bên trái.
5. Chọn **thư mục bạn vừa giải nén**.
6. Truy cập vào trang game [https://nongtraigenz.online/play/](https://nongtraigenz.online/play/) (hoặc bấm nút **🚀 Vào Game Nông Trại GenZ** trên Popup Extension) để bắt đầu trải nghiệm!

### Cách 2: Biên Dịch Từ Mã Nguồn (Dành Cho Nhà Phát Triển)
1. Clone mã nguồn về máy:
   ```bash
   git clone https://github.com/ntuan2502/ntgz.git
   cd ntgz
   ```
2. Cài đặt thư viện bằng `pnpm`:
   ```bash
   pnpm install
   ```
3. Biên dịch dự án:
   ```bash
   pnpm run build
   ```
4. Mở `chrome://extensions/` -> Bật **Developer mode** -> Chọn **Tải tiện ích đã giải nén** -> Chọn thư mục **`dist`** trong dự án.

---

## 🛠️ Lệnh Dành Cho Nhà Phát Triển

| Lệnh | Chức Năng |
| :--- | :--- |
| **`pnpm run build`** | Biên dịch toàn bộ extension từ `src/` ra thư mục `dist/` |
| **`pnpm run dev`** | Chạy chế độ theo dõi file tự động re-build khi lưu code (Watch mode) |
| **`pnpm run type-check`** | Kiểm tra toàn bộ kiểu dữ liệu TypeScript (`tsc --noEmit`) |
| **`pnpm run check-syntax`** | Kiểm tra cú pháp của tất cả các file bundle trong `dist/` |

---

## ⌨️ Phím Tắt Nhanh

| Phím Tắt | Chức Năng |
| :--- | :--- |
| **`Alt + A`** | Bật / Tắt chế độ Tự Động (Auto Toggle) |
| **`Alt + P`** | Ẩn / Hiện Bảng điều khiển nổi trên màn hình game |

---

## 📁 Cấu Trúc Dự Án (Modular TypeScript)

```
nongtraigenz/
├── src/
│   ├── background/         # Service worker quản lý phím tắt & badge
│   ├── popup/              # Giao diện & logic popup extension
│   ├── content/            # Content script, scheduler, UI HUD, update modal
│   │   ├── bridge/         # Cầu nối gửi nhận message giữa Content và Page Hook
│   │   ├── scheduler/      # Bộ điều phối vòng lặp auto và xử lý minigame
│   │   └── ui/             # Giao diện Shadow DOM HUD nổi và các tab khu vực
│   ├── page-hook/          # Logic can thiệp thế giới trang (Phaser 3 Engine & Zustand Store)
│   │   ├── core/           # Truy cập engine, store watcher, cooldown & interrupts
│   │   └── modules/        # Chia module theo khu vực: farm, wharf, sea
│   ├── services/           # Dịch vụ gọi GitHub API kiểm tra cập nhật & parse Changelog
│   └── shared/             # Types, constants và cấu hình mặc định dùng chung
├── dist/                   # Thư mục build đầu ra (Load unpacked vào Chrome)
├── build.mjs               # Script build multi-entry siêu tốc bằng esbuild
├── tsconfig.json           # Cấu hình TypeScript nghiêm ngặt (strict mode)
├── commitlint.config.ts    # Cấu hình chuẩn hóa Conventional Commits
├── CHANGELOG.md            # Nhật ký thay đổi chi tiết toàn bộ các tính năng
└── README.md               # Tài liệu giới thiệu tổng quan và hướng dẫn sử dụng tiếng Việt
```

---

## 📝 Nhật Ký Thay Đổi Chi Tiết

Xem toàn bộ lịch sử cập nhật và mô tả chức năng chi tiết tại [CHANGELOG.md](CHANGELOG.md).

---

## 👤 Tác Giả & Bản Quyền

- **Tác giả**: Tún (Nông Trại GenZ Auto by Tún)
- **Phiên bản hiện tại**: `v1.3.1`
- **Giấy phép**: Bản quyền mã nguồn dành riêng cho cộng đồng người chơi Nông Trại GenZ.
