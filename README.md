# 🌾 Nông Trại GenZ Auto by Tún (v1.0.0)

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
- ⚡ **Công Nghệ & Trải Nghiệm**:
  - **Chống mua lặp (Anti-Double-Action)**: Bộ đệm thông minh ngăn ngừa tuyệt đối lỗi mua 2 lần do mạng trễ.
  - **Khóa Tab Auto độc lập**: Chạy auto cố định theo khu vực đã chọn mà không bị gián đoạn khi chuyển tab xem thông tin.
  - **Giao diện HUD V2 hiện đại**: Bảng điều khiển nổi tự do kéo thả khắp màn hình, giữ nguyên kích thước khi thu gọn, tích hợp icon trực quan cho từng tác vụ và thanh trượt tùy chỉnh tốc độ trễ.

👉 **Chi tiết toàn bộ tính năng và danh sách cập nhật đầy đủ được ghi chép tại [CHANGELOG.md](CHANGELOG.md).**

---

## 🚀 Hướng Dẫn Cài Đặt (Google Chrome)

1. Tải mã nguồn về máy tính (tải file nén `.zip` hoặc `git clone`) và **giải nén vào một thư mục bất kỳ trên máy của bạn**.
2. Mở trình duyệt **Google Chrome** và truy cập đường dẫn:
   ```
   chrome://extensions/
   ```
3. Bật công tắc **Chế độ dành cho nhà phát triển (Developer mode)** ở góc trên bên phải màn hình.
4. Bấm nút **Tải tiện ích đã giải nén (Load unpacked)** ở góc trên bên trái.
5. Tìm và chọn **thư mục bạn vừa giải nén mã nguồn**.
6. Truy cập vào trang game [https://nongtraigenz.online/play/](https://nongtraigenz.online/play/) (hoặc bấm nút **🚀 Vào Game Nông Trại GenZ** trên Popup Extension) để bắt đầu trải nghiệm!

---

## ⌨️ Phím Tắt Nhanh

| Phím Tắt | Chức Năng |
| :--- | :--- |
| **`Alt + A`** | Bật / Tắt chế độ Tự Động (Auto Toggle) |
| **`Alt + P`** | Ẩn / Hiện Bảng điều khiển nổi trên màn hình game |

---

## 📁 Cấu Trúc Dự Án

```
nongtraigenz/
├── manifest.json       # Tệp khai báo tiện ích Chrome Extension (Manifest V3)
├── background.js       # Service worker nền xử lý phím tắt & điều hướng
├── popup.html          # Giao diện menu nhỏ khi bấm vào biểu tượng Extension
├── popup.css           # Định kiểu giao diện Popup tối giản
├── popup.js            # Điều khiển Popup: 1-click vào game, bật/tắt auto
├── content.js          # Content Script: Tạo giao diện HUD, quản lý cấu hình & lịch trình
├── page-hook.js        # Script can thiệp thế giới trang (Phaser 3 Engine & Zustand Store)
├── CHANGELOG.md        # Nhật ký thay đổi chi tiết toàn bộ các tính năng qua các phiên bản
└── README.md           # Tài liệu giới thiệu tổng quan và hướng dẫn sử dụng tiếng Việt
```

---

## 📝 Nhật Ký Thay Đổi Chi Tiết

Xem toàn bộ lịch sử cập nhật và mô tả chức năng chi tiết tại [CHANGELOG.md](CHANGELOG.md).

---

## 👤 Tác Giả & Bản Quyền

- **Tác giả**: Tún (Nông Trại GenZ Auto by Tún)
- **Phiên bản hiện tại**: `v1.0.0`
- **Giấy phép**: Bản quyền mã nguồn dành riêng cho cộng đồng người chơi Nông Trại GenZ.
