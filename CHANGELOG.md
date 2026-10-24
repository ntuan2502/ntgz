# 📝 Nhật Ký Thay Đổi (Changelog) - Nông Trại GenZ Auto by Tún

Tất cả các thay đổi đáng chú ý của dự án **Nông Trại GenZ Auto by Tún** sẽ được ghi chép chi tiết trong tệp này.
Định dạng dựa trên [Keep a Changelog](https://keepachangelog.com/vi/1.0.0/) và tuân thủ [Semantic Versioning](https://semver.org/).

---

## [1.1.0] - 2026-10-25

### 🚀 Kiến Trúc & Công Nghệ Mới (TypeScript & Modular Architecture)
- **Chuyển đổi 100% sang TypeScript**: Toàn bộ dự án được viết bằng TypeScript với hệ thống kiểu dữ liệu nghiêm ngặt (`strict: true`), loại bỏ hoàn toàn các lỗi tiềm ẩn do sai kiểu hoặc `undefined`.
- **Module hóa toàn diện (Modular Architecture)**: Phân tách 2 tệp monolithic khổng lồ (`content.js` ~2.735 dòng và `page-hook.js` ~2.137 dòng) thành hơn 20 module nhỏ gọn, độc lập và dễ bảo trì:
  - `src/shared/`: Định nghĩa kiểu dữ liệu chuẩn (`config`, `protocol`, `game-state`, `github`, `game-store`) và cấu hình mặc định.
  - `src/services/`: Dịch vụ tích hợp GitHub Releases API và so sánh phiên bản SemVer.
  - `src/background/`: Service Worker quản lý badge trạng thái và phím tắt extension.
  - `src/popup/`: Giao diện popup extension tối giản và nút kiểm tra cập nhật nhanh.
  - `src/page-hook/`: Tương tác trực tiếp với engine game (Phaser 3 & Zustand Store) chia theo từng phân hệ (`farm`, `wharf`, `sea`).
  - `src/content/`: Điều phối lịch trình (`scheduler`), cầu nối RPC (`bridge`) và giao diện Shadow DOM HUD (`ui`).
- **Đóng gói siêu tốc với esbuild & Tailwind CSS v4**: Tốc độ build toàn bộ extension dưới 1 giây, biên dịch stylesheet tự động và kiểm tra tính hợp lệ cú pháp trước khi release.

### 🖥️ Nâng Cấp Giao Diện HUD & Trải Nghiệm Người Dùng
- **Kích thước HUD mặc định 400x800 & Hỗ trợ Resize tự do**:
  - Tăng kích thước mặc định của bảng điều khiển nổi lên `400×800` (rộng rãi, hiển thị trọn vẹn thông tin các tab).
  - Bổ sung các tay cầm kéo giãn (Border & Corner Resizers) ở cạnh phải, cạnh dưới và góc dưới-phải, cho phép người dùng kéo thả co giãn kích thước HUD tùy ý; kích thước tùy chỉnh tự động lưu vào `chrome.storage.local`.
- **Cửa sổ Terminal Lịch Sử Hoạt Động (Session Logs)**:
  - Tích hợp cửa sổ Terminal chuyên dụng ngay dưới thanh trạng thái trực tiếp của HUD.
  - Lưu trữ toàn bộ lịch sử các hành động trong phiên hiện tại (tối đa 300 dòng) kèm mốc thời gian thực `[HH:mm:ss]` và thời gian game `[N... HH:mm]`.
  - Hỗ trợ cuộn tự động ghim đáy (Auto Stick-to-bottom), nút Thu gọn / Mở rộng và nút Xóa lịch sử.
  - Tối ưu định dạng văn bản inline, cho phép bôi đen copy ra ngoài gọn gàng trên 1 dòng duy nhất.
- **Chuyển đổi toàn bộ Select sang Shadcn UI (`HudSelect`)**:
  - Thay thế toàn bộ thẻ select native HTML bằng component Radix UI Select phong cách Shadcn UI sang trọng, hiện đại.
  - Tự động cắt ngắn text quá dài bằng dấu chấm lửng `...` (`truncate`), không bị tràn vỡ giao diện.
  - Tách portal hiển thị `z-index: 2147483647` ra ngoài stacking context, khắc phục triệt để lỗi menu dropdown bị che khuất dưới HUD.
- **Đồng bộ chiều cao ô Input số**:
  - Tăng chiều cao tối thiểu của tất cả các ô `<input type="number">` ở cả 3 tab (Nông trại, Bến Đò, Biển) lên `h-8 min-h-8` (`32px`), cân đối hoàn hảo với các ô Select.

### 🎣 Nâng Cấp Hệ Thống Câu Cá & Bến Đò / Biển
- **Ghi log chi tiết từng con cá câu được và khi bán cá**:
  - **Bến Đò**: Ghi rõ tên cá, độ hiếm (`Thường`, `Hơi hiếm`, `Hiếm`, `Rất hiếm`, `Huyền thoại`, `Thần thoại`), biến thể (`✨ Cá lạ`, `🌈 Cầu vồng`, `📏 Kỷ lục`), chiều dài (`cm`), giá bán (`🐚 vỏ sò`) hoặc thưởng thả sông, và số vé quay lồng đèn nếu cá ngậm vé (`🎟️ +1 vé quay`).
  - **Biển**: Ghi rõ tên hải sản, độ hiếm (`★`), cờ `KHỦNG!`, chiều dài (`cm`) và giá Ông Tư thu mua (`đ`).
  - **Bán cá**: Ghi rõ số lượng cá bán và tổng số tiền/vỏ sò thu được tại Vựa cá Anh Tư và Chòi Ông Tư.
- **Tự động hóa toàn diện Vòng quay lồng đèn Cô Bảy**:
  - Tự động đi tới sạp lồng đèn Cô Bảy và mở bảng Vòng quay.
  - Nếu vòng quay chưa đủ 3 món săn, hệ thống tự động nhận diện và chọn 3 vật phẩm chưa sở hữu rồi nhấn `"Lên vòng"`.
  - Tự động bấm `"Quay 1 · 🎟️ 1"`, ghi nhận kết quả quay được vào Terminal (vật phẩm trúng hoặc số vỏ sò an ủi), tự động nhấn nút xác nhận (**"Nhận"** / **"Chọn món mới"**) và tiếp tục quay vé tiếp theo cho đến khi hết vé mới đóng bảng quay lại câu cá.
- **Chuẩn hóa tên Tiếng Việt toàn bộ vật phẩm trong Log**:
  - Loại bỏ hoàn toàn việc hiển thị ID thô (như `lauMam`, `duaTuoi`, `moi150`, `packItems[0]`).
  - Ghi rõ tên đầy đủ: *Lẩu cá linh bông điên điển*, *Cơm tấm sườn bì*, *Hủ tiếu nam vang*, *Cháo cá lóc*, *Bánh mì thịt*, *Dừa xiêm tươi*, *Cà phê sữa đá*, *Rau má đậu xanh*, *Nước mía tắc*, *Thùng mồi cám*, *Thau mồi trùn*, *Hộp mồi trùn*, *10 mồi miễn phí*, v.v.

### 🌐 Cài Đặt Toàn Cục Mới
- **Công tắc "👁️ Hiển thị đầy đủ thao tác" (`showFullActions`)**:
  - Bổ sung tùy chọn cài đặt toàn cục trên thanh điều khiển chính (mặc định tắt - chạy ngầm tốc độ cao).
  - Khi bật: Các thao tác mua đồ ăn/nước uống, quay vé lồng đèn, rút ATM, đổi vé số hoặc nấu ăn sẽ hiển thị giao diện UI gốc của game lên màn hình để người dùng quan sát trực quan trước khi đóng lại.

### 🐛 Vá Lỗi & Tối Ưu Hóa Kỹ Thuật
- **Sửa lỗi CSS Switch Shadcn & Tailwind CSS v4 trong Shadow DOM**:
  - Khắc phục lỗi Chromium bỏ qua các khai báo `@property` bên trong ShadowRoot bằng cách inject stylesheet an toàn ở cấp Document, giúp animation trượt nút Switch hoạt động mượt mà và chuẩn xác.
- **Phục hồi đồng bộ Zustand Stores**:
  - Khắc phục sự cố mất kết nối một số chức năng nông trại (tưới nước, nhận việc sổ tay, bảng tin làng) sau khi chuyển đổi mã nguồn; đảm bảo tất cả action gọi trực tiếp vào store engine của game.
- **Kiểm tra cập nhật trực tiếp từ GitHub Releases**:
  - Tích hợp tính năng tự động kiểm tra phiên bản mới, hiển thị Changelog và link tải trực tiếp file zip release.

---

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
