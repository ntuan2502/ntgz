# 📝 Nhật Ký Thay Đổi (Changelog) - Nông Trại GenZ Auto by Tún

Tất cả các thay đổi đáng chú ý của dự án **Nông Trại GenZ Auto by Tún** sẽ được ghi chép chi tiết trong tệp này.
Định dạng dựa trên [Keep a Changelog](https://keepachangelog.com/vi/1.0.0/) và tuân thủ [Semantic Versioning](https://semver.org/).

---

## [Unreleased] - 2026-10-24

### 🚀 Kiến Trúc & Công Nghệ Mới (TypeScript & Modular Architecture)
- **Chuyển đổi 100% sang TypeScript**: Toàn bộ dự án được viết bằng TypeScript với hệ thống kiểu dữ liệu nghiêm ngặt (`strict: true`), loại bỏ hoàn toàn các lỗi tiềm ẩn do sai kiểu hoặc `undefined`.
- **Module hóa toàn diện (Modular Architecture)**: Phân tách 2 tệp monolithic khổng lồ (`content.js` ~2.735 dòng và `page-hook.js` ~2.137 dòng) thành hơn 20 module nhỏ gọn, độc lập và dễ bảo trì:
  - `src/shared/`: Định nghĩa kiểu dữ liệu chuẩn (`config`, `protocol`, `game-state`, `github`) và cấu hình mặc định.
  - `src/services/`: Dịch vụ tích hợp GitHub Releases API và so sánh phiên bản SemVer.
  - `src/background/`: Service Worker quản lý badge trạng thái và phím tắt extension.
  - `src/popup/`: Giao diện popup extension tối giản và nút kiểm tra cập nhật nhanh.
  - `src/page-hook/`: Tương tác trực tiếp với engine game (Phaser 3 & Zustand Store) chia theo từng phân hệ (`farm`, `wharf`, `sea`).
  - `src/content/`: Điều phối lịch trình (`scheduler`), cầu nối RPC (`bridge`) và giao diện Shadow DOM HUD (`ui`).
- **Đóng gói siêu tốc với esbuild**: Tốc độ build toàn bộ extension dưới 100ms, hỗ trợ chế độ `--watch` tự động cập nhật bundle khi lưu file.

### ✨ Tính Năng Mới
- **Kiểm tra cập nhật trực tiếp từ GitHub Releases**:
  - Tích hợp nút **🔄 Kiểm Tra Cập Nhật** trên cả **Popup Extension** và **Thanh tiêu đề Menu Game HUD**.
  - So sánh phiên bản hiện tại với release mới nhất trên kho lưu trữ `ntuan2502/ntgz`.
  - Tự động hiển thị huy hiệu thông báo khi có bản cập nhật mới.
  - Hiển thị cửa sổ Modal trực quan với nội dung **Nhật ký thay đổi (Changelog Markdown)** và nút bấm tải nhanh bản cập nhật mới nhất.

### 🛠️ Quy Trình Phát Triển (DX)
- Chuẩn hóa Commit Messages theo định dạng Conventional Commits với **Commitlint**.
- Tự động kiểm tra chất lượng mã nguồn trước khi commit bằng Git Hooks (**Husky**).

---

## [1.0.0] - 2026-10-24

### 🌟 Bản Phát Hành Chính Thức Đầu Tiên (Official Release)

Phiên bản hoàn chỉnh đầu tiên của tiện ích mở rộng **Nông Trại GenZ Auto by Tún**, hỗ trợ tự động hóa thông minh và toàn diện trên cả giao diện DOM và Canvas (Phaser 3) cho tựa game **Nông Trại GenZ** (`https://nongtraigenz.online/play/`).

---

### 🌾 1. Khu Vực Nông Trại & Ruộng Đồng
- **Sắp xếp thứ tự linh hoạt (Drag & Drop)**: Hỗ trợ kéo thả biểu tượng `⠿` hoặc bấm `▲ / ▼` để sắp xếp thứ tự thực thi của 8 cụm chức năng nội bộ nông trại:
  1. 🏠 **Nhà & Nhu cầu**:
     - 💬 Tự tắt cuộc gọi Điện thoại (Bà Nội, Ông Sáu...) và loa thông báo thị trấn.
     - 🍳 Tự học công thức và nấu các món ăn trong Bếp gia đình (Cơm tấm, Bánh mì ốp la, Canh củ cải, Nước ép cà rốt, Bắp nướng, Trứng luộc, Bánh bắp).
     - 🍲 Tự ăn khi Đói: Tùy chỉnh nguồn thức ăn (*Ưu tiên Bếp, thiếu mua Tiệm bánh* / *Chỉ ăn Bếp* / *Chỉ mua Tiệm bánh*) và món ưu tiên.
     - 🥤 Tự uống khi Khát: Tùy chỉnh nguồn nước (*Ưu tiên Bếp* / *Chỉ mua Tiệm giải khát* / *Linh hoạt cả hai*) và loại nước ưu tiên.
     - ☕ Tự uống Cà phê sữa đá đầu ngày (+50% tốc độ di chuyển toàn ngày).
     - 🔋 Tự sạc điện cho Xe máy điện EV khi pin thấp với ngưỡng tùy chỉnh.
     - 💆 Tiệm Tóc & Spa Chị Linh Tây: Gội đầu dưỡng sinh (Buff thư giãn) và Tắm trắng nâng tông da.
     - 🛏️ Tự đi ngủ qua ngày mới đúng giờ hoặc ngủ ngay khi hết lượt câu buổi tối.
  2. 🌾 **Ruộng đồng & Cây trồng**:
     - Thu hoạch nông sản chín, mua thuốc diệt sâu bọ, tưới nước giữ ẩm, bón phân NPK.
     - Tự động gieo hạt giống (Lúa, Bắp, Cà rốt, Củ cải hoặc Tự chọn tối ưu).
     - Tự mua thêm ô đất ruộng khi đủ điều kiện mở rộng.
  3. 🐕 **Thú cưng**: Tự mua thức ăn, cho ăn, vuốt ve tăng vui vẻ, tắm rửa và huấn luyện trò vui (+XP).
  4. 🐃 **Chuồng trâu & Bò sữa**: Cho trâu ăn cỏ, tắm bùn, cho thuê trâu cày, cho bò ăn cỏ khô, chữa bệnh cho bò, vắt sữa bán và trả lương người phụ chuồng.
  5. 🐔 **Chuồng gà**: Lượm trứng gà, mua thêm gà con khi chuồng trống, trả lương người làm chuồng gà.
  6. 🐟 **Ao cá**: Kéo lưới thu hoạch cá lớn, rải cám hàng ngày, thả cá giống (Chép, Trê, Rô), trả lương người làm ao cá.
  7. 🏪 **Chợ Lớn & Tiệm Vàng Cô Kim**:
     - Giao đơn hàng Tạp hóa Chị Na và Bảng tin làng.
     - Bán nông sản Xu hướng Trend (x2 giá, kiểm soát quota nghiêm ngặt không bán quá số lượng nhân đôi).
     - Bán nông sản trả nhiệm vụ Sổ tay ngày.
     - Tùy chọn bán nông sản dư thừa trong kho với ngưỡng giữ lại an toàn.
     - 🪙 **Đầu tư Vàng Cô Kim**: Tự động tính toán biến động giá vàng thị trường theo seed thực tế; tự mua vàng tích lũy và tự bán chốt lời khi đạt tỷ lệ lãi mong muốn.
  8. 👵 **Quầy Dì Bảy & Sổ Tay Nhiệm Vụ**:
     - Tự nhận thưởng Việc hôm nay, Mục tiêu chương và Thành tựu Sổ tay.
     - Hỗ trợ chuỗi hướng dẫn Ngày 1 & 2 (thắp nhang bàn thờ Ông Năm, rau mầm...).
     - Thu thập trang Sổ tay Ông Năm và ngâm ủ giống lúa thơm.
     - Bỏ ống heo tiết kiệm mỗi ngày, đập heo đất khi đủ 7 ngày streak, mua heo đất mới.
     - Gửi sổ tiết kiệm Dì Bảy với hạn mức giữ tiền mặt an toàn.

---

### 🛶 2. Khu Vực Bến Đò & Câu Cá Sông
- **Tự động câu cá thông minh**:
  - Nhận diện chính xác trạng thái phao chìm hẳn mới giật cần.
  - Tự động ghìm cần ngược hướng cá bơi để bắt cá thành công.
- **Lựa chọn điểm câu đa dạng**:
  - 🌉 **Cầu tàu chính**
  - 🎋 **Cầu tre**
  - 🌿 **Bờ sông**
- **Bán cá & Giữ cá quý**:
  - Tự động bấm ⭐ Giữ lại cá Lạ / Cầu vồng / Thần thoại.
  - Tự động mang giỏ cá ra Vựa Anh Tư bán khi đạt số lượng cấu hình.
- **Mua mồi & Xin mồi miễn phí**:
  - Tự ghé Tiệm mồi Chú Đực mua mồi (Thau 60 mồi, Thùng 150 mồi, Hộp 20 mồi hoặc xin 10 mồi miễn phí).
- **Hồi phục Sức câu & May mắn**:
  - 💆 **Tóc gội Út Mười**: Tự gội đầu massage hồi +50 Sức câu (chỉ tốn 25 vỏ sò).
  - 🍱 **Quán cơm Dì Tám** & ăn đồ trong Balo (Cơm tấm, Lẩu mắm, Hủ tiếu, Cháo cá, Bánh mì).
  - 🍀 **Xe trà đá Chị Thơm**: Uống nước tăng May mắn (Nước mía, Rau má, Cà phê, Dừa tươi).
- **Tiện ích giải trí Bến Đò**:
  - 🏮 **Sạp lồng đèn Cô Bảy**: Tự quay Vòng quay may mắn khi cá nhả vé quay và tùy chọn mua thêm vé (600 vỏ sò).
  - 🎟️ **Đại lý vé số Bến Đò (Chú Bảy / Cu Tí)**: Tự động đổi thưởng khi trúng giải và mua 1 vé số cầu may mỗi ngày (10 vỏ sò).
  - 🏧 **Cây ATM**: Tự đổi vỏ sò dư thừa ra tiền mặt.

---

### 🏖️ 3. Khu Vực Biển & Câu Hải Sản
- **Câu cá biển tự động**: Tự động nhận diện thời điểm giật cần chuẩn xác, ghìm cần theo hướng cá và cất hải sản vào giỏ.
- **Điểm câu**: Cầu tàu, Bãi đá, Mép bãi cát.
- **Chòi Ông Tư**: Mua mồi câu (Trùn biển, Tôm) và bán cá khi giỏ đầy hoặc trước khi về ngủ.
- **Bách khoa toàn thư**: Tự nhận thưởng Sổ cá biển Ông Tư khi đạt mốc mới.
- **Hồi sức Biển**: Tự ăn uống hồi đói khát khi câu biển.

---

### ⚡ 4. Tối Ưu Hóa & Cải Tiến Kỹ Thuật
- **Cơ chế chống mua lặp (Anti-Double-Action Debounce)**: Tích hợp bộ đệm thời gian `actionCooldowns` (tối thiểu 3.5s - 5s) cho toàn bộ thao tác mua bán, ăn uống, gội đầu, quay thưởng, đổi vé số; khắc phục triệt để lỗi mua 2 lần.
- **Khóa Tab Auto độc lập (`lockedTabArea`)**: Khi bật `🎯 AUTO <TAB>`, khu vực auto được khóa cố định. Người chơi có thể tự do chuyển sang xem các tab khác trên giao diện mà không làm chuyển hướng auto đang chạy.
- **Tùy chỉnh ngưỡng phần trăm (%) chi tiết**: Cho phép nhập số linh hoạt cho Pin xe điện EV, Đói, Khát, Sức câu, Lãi chốt lời vàng, Tiền mặt tối thiểu.
- **Giao diện HUD V2 hiện đại**:
  - Bảng điều khiển nổi có thể kéo thả tự do, thu gọn / mở rộng mà không bị co hẹp chiều ngang.
  - 100% các dòng chức năng có Icon mô tả trực quan, đồng nhất.
  - Tích hợp 2 nút chạy kép ngay trên thanh tiêu đề: `▶️ Tất cả` và `🎯 <Tab khóa>`.
  - Hỗ trợ thanh kéo điều chỉnh khoảng trễ giữa các tác vụ (`taskDelayMs`).
- **Popup tiện ích tối giản**:
  - 1-Click mở nhanh trang game Nông Trại GenZ.
  - Nút bật/tắt Auto và ẩn/hiện menu nhanh.
  - Phím tắt toàn cục: **Alt+A** (Bật/Tắt Auto), **Alt+P** (Ẩn/Hiện Menu).
