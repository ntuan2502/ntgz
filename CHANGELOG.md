# 📝 Nhật Ký Thay Đổi (Changelog) - Nông Trại GenZ Auto by Tún

Tất cả các thay đổi đáng chú ý của dự án **Nông Trại GenZ Auto by Tún** sẽ được ghi chép chi tiết trong tệp này.
Định dạng dựa trên [Keep a Changelog](https://keepachangelog.com/vi/1.0.0/) và tuân thủ [Semantic Versioning](https://semver.org/).

---

## [1.3.1] - 2026-10-25

### 🌟 Tính Năng Mới (New Feature)
- **Khu Vực Chợ Đêm Trong Nông Trại (18h00 – 23h30)**:
  - Bổ sung nhóm tính năng **🏮 Chợ Đêm** trực tiếp vào Tab Nông Trại (`FarmSubAreaId: 'nightMarket'`).
  - **Khung Giờ Mở Cửa**: Tự động nhận diện khung giờ mở cửa Chợ Đêm từ 18:00 đến 23:30 (1080 – 1410 phút trong game).
  - **Thưởng Giá Bán +25%**: Tự động bán nông sản và trứng gà tại Chợ Đêm với giá cao hơn 1.25x so với ban ngày.
  - **Quản Lý Hạn Mức Tự Động**: Theo dõi chính xác hạn mức 20 món/đêm của game (`quotaLeft = 20 - nightSold.n`), tự động dừng khi đã bán đủ 20 món.
  - **Chiến Lược Bán Thông Minh**:
    - Ưu tiên nông sản tồn kho nhiều nhất (`max_stock`).
    - Ưu tiên nông sản có giá bán cao nhất (`highest_price`).
    - Ưu tiên nông sản giá thấp xả kho (`lowest_price`).
  - **Bảo Lưu Nông Sản**:
    - Tự động trừ và bảo lưu số lượng cần thiết cho Đơn hàng Tạp hóa Chị Na và Bảng tin làng trước khi bán Chợ Đêm.
    - Cấu hình số lượng nông sản tối thiểu muốn lưu kho (`nightMarketMinKeep`).
    - Tùy chọn cho phép bán Trứng gà khi chuồng có dư.
  - **Giao Diện Trực Quan**: Mở giao diện sạp đèn lồng chợ đêm gốc của game nếu người dùng bật *"Hiển thị đầy đủ thao tác"*.

---

## [1.3.0] - 2026-10-25

### 🌟 Tính Năng Mới & Nâng Cấp Hệ Thống (Major Features & Architecture)
- **Phân Nhóm Tính Năng Nông Trại Theo Chuẩn NPC & Khu Vực Game**:
  - Tái cấu trúc toàn bộ Tab Nông Trại thành các nhóm rõ ràng theo NPC và khu vực thực tế trong game:
    - 🏠 **Nhà & Bếp**: Tự nấu món ăn, tự ăn uống hồi Đói/Khát, sạc pin xe điện.
    - 🌱 **Ruộng Đồng (Tèo)**: Tự thu hoạch, xịt sâu, tưới nước, bón phân NPK, gieo hạt, trả lương Tèo phụ ruộng, mở rộng ô đất.
    - 🐕 **Thú Cưng**: Tự động dắt thú cưng đi dạo mát quanh làng (`petAutoWalk`), cho ăn theo khẩu vị/thông minh/khoái khẩu, tự mua đồ ăn thích hợp, vuốt ve, tắm rửa, chơi ném bóng và tập trò.
    - 🐃 **Chuồng Trâu (Anh Tám)**: Cho ăn rơm, tắm mát, cho thuê cày ruộng, trả lương Anh Tám.
    - 🐄 **Bò Sữa (Chị Mận)**: Cho ăn cỏ, chích thuốc chữa bệnh, vắt & bán sữa bò, trả lương Chị Mận.
    - 🐔 **Chuồng Gà (Chú Ba)**: Nhặt trứng gà, mua gà con, trả lương Chú Ba.
    - 🐟 **Ao Cá (Bé Bi)**: Kéo lưới bán cá, thả cá giống (chép/trê/rô đồng), rải cám, trả lương Bé Bi.
    - 💆 **Salon Chị Linh Tây**: Gội đầu dưỡng sinh (buff thư giãn), tắm trắng nâng tông khi đen da.
    - 🏪 **Tạp Hóa Chị Na & Bảng Tin Làng**: Tự giao đơn hàng Chị Na, giao đơn bảng tin (Anh Khang), bắt trend sốt dẻo x2 giá.
    - 🐷 **Quầy Tiết Kiệm Dì Bảy & Sổ Tay**: Thắp nhang bàn thờ Ông Năm, thu thập trang sổ tay, ngâm giống lúa thơm, khui/mua heo đất, gửi sổ tiết kiệm Dì Bảy 7 ngày.
    - 🪙 **Tiệm Vàng Cô Kim (Chợ Lớn)**: Tự động mua tích lũy và chốt lời vàng miếng 9999, nhẫn trơn, vàng 18K.
- **Cơ Chế Bán Thông Minh Toàn Diện (Smart Produce & Dish Selling)**:
  - Tùy chọn chiến lược bán đa dạng: Bán tất cả thông minh, chỉ bán món ăn nấu chín, hoặc chỉ bán nông sản.
  - Tự động bảo lưu nông sản cho các đơn hàng của Chị Na và Bảng tin làng trước khi bán.
  - Cho phép tùy chỉnh số lượng nông sản tối thiểu muốn giữ lại kho (Min Keep) để không bao giờ bị hụt hàng làm nhiệm vụ.
  - Tự động bán món ăn dư thừa trong Bếp kiếm thêm thu nhập từ các món đã nấu.
- **Vòng Lặp Tác Vụ Bền Bỉ (Robust Farm Task Loop)**:
  - Khắc phục triệt để tình trạng dừng chuyển tác vụ khi đang tưới nước/gieo hạt giữa chừng.
  - Cơ chế ghi nhớ tác vụ đang dở và hoàn tất toàn bộ chu trình trước khi chuyển sang nhóm việc tiếp theo.
- **Ghi Nhận Đầy Đủ Thông Báo Loa Xã & Điện Thoại**:
  - Tự động bóc tách và hiển thị đầy đủ tiêu đề, nội dung phát thanh của Loa xã (`📢 [Loa xã]: "..."`) và cuộc gọi/tin nhắn điện thoại (`👵 [Điện thoại Bà Nội]`, `📞 [Điện thoại Ông Sáu]`) vào Terminal log, tránh bỏ lỡ các sự kiện quan trọng trong game.

### 🎨 Tinh Chỉnh Giao Diện & Trải Nghiệm (UI/UX Refinements)
- **Chuẩn Hóa Danh Xưng Toàn Bộ NPC**: Cập nhật danh xưng chính xác theo game data: Tèo (Tèo phụ ruộng), Anh Tám, Chị Mận, Chú Ba, Bé Bi, Chị Linh Tây, Chị Na, Anh Khang, Dì Bảy, Ông Năm, Cô Kim.
- **Hiển Thị Tên / Nhãn Tiếng Việt Thân Thiện**: Thay thế triệt để các ID kỹ thuật thô bằng tên món ăn, nông sản, thức ăn pet, cá ao và vàng đầu tư trong toàn bộ log thông báo.
- **Lược Bỏ ID Thô Vị Trí Biển**: Bỏ nhãn kỹ thuật `(beach)` khi quăng câu ở Biển, hiển thị gọn gàng `🎣 Biển: Quăng câu!`.
- **Tối Giản Thanh HUD Stats**: Loại bỏ badge trạng thái thừa thãi (`Biển: reel`) trên thanh chỉ số, giúp giao diện trên cùng gọn gàng và không gây rối mắt.

---

## [1.2.0] - 2026-10-25

### 🌟 Tính Năng Mới & Nâng Cấp Kiến Trúc Giao Diện (Major UI Architecture)
- **Tách Cửa Sổ Terminal Độc Lập Khỏi HUD (Standalone Floating Terminal)**:
  - Tách cửa sổ Terminal ra khỏi thân HUD gốc, hiển thị dưới dạng một cửa sổ nổi riêng biệt khi nhấn nút `>_ Log (N...)`.
  - **Tự động chuyển vị trí thông minh**: Hệ thống tự động xác định vị trí HUD đang gần mép màn hình nào hơn để neo Terminal vào bên Trái hoặc bên Phải HUD, tránh tuyệt đối việc bị tràn ra ngoài màn hình.
  - **Đồng bộ chiều cao (Shared Height)**: Chiều cao của Terminal luôn bằng với HUD gốc; khi người dùng resize chiều cao ở một trong 2 cửa sổ, cửa sổ còn lại sẽ tự động thay đổi chiều cao tương ứng.
  - **Chiều ngang độc lập (Independent Width)**: Cho phép kéo dãn chiều rộng Terminal riêng biệt từ 280px đến 800px (mặc định 380px), nhấp đúp vào góc để trở về mặc định.
  - **Kéo di chuyển đồng bộ**: Kéo thanh tiêu đề của HUD hoặc Terminal sẽ di chuyển mượt mà cả hai cửa sổ cùng lúc.
  - **Tiện ích tích hợp**: Nút sao chép toàn bộ log 1-click, nút chuyển đổi tự động cuộn (Auto-scroll), nút Xoá và nút Đóng.
- **Vị Trí HUD Mặc Định Bên Trái**:
  - Chuyển vị trí xuất hiện mặc định của HUD sang góc trái màn hình (`x = 16, y = 16`), thuận tiện cho việc thao tác và quan sát.
- **Khống Chế Ranh Giới Màn Hình Tuyệt Đối (Screen Bounds Clamping)**:
  - Khắc phục triệt để lỗi cho phép kéo HUD tràn tụt xuống dưới đáy màn hình.
  - Chặn toàn bộ 4 cạnh (trên, dưới, trái, phải) trong phạm vi hiển thị an toàn của trình duyệt.
  - Tự động kéo HUD vào trong khung nhìn nếu người dùng thu nhỏ cửa sổ trình duyệt (`window.resize`).

---

## [1.1.2] - 2026-10-25

### 🚀 Cải Tiến Trải Nghiệm Người Dùng (Improvements)
- **Terminal Ghi Log Không Giới Hạn (Unlimited Session Logs)**:
  - Gỡ bỏ hoàn toàn giới hạn 300 dòng; toàn bộ lịch sử thao tác trong phiên được ghi lại trọn vẹn và liên tục.
  - Nút chuyển đổi trạng thái Terminal hiển thị chính xác tổng số dòng log trong phiên (`Log (N...)`), hỗ trợ nút "Xoá" để người dùng dọn dẹp bộ nhớ khi cần.
- **Select Tự Động Co Giãn Toàn Diện Theo Kích Thước HUD**:
  - Gỡ bỏ giới hạn chiều rộng tối đa cố định (`max-w-[195px]`) trên component `HudSelect`.
  - Thiết lập thuộc tính `flex-1 w-full min-w-0` giúp ô Select tự động kéo dài lấp đầy toàn bộ khoảng trống hàng khi người dùng kéo dãn (resize) bảng điều khiển HUD.
  - Menu danh sách thả xuống (`SelectContent`) tự động điều chỉnh độ rộng đồng bộ (`w-[var(--radix-select-trigger-width)]`), giúp các tùy chọn có tên dài (mồi câu, món ăn, thức uống, vị trí câu) hiển thị đầy đủ, không bị cắt ngắn `...`.

---

## [1.1.1] - 2026-10-25

### 🛠️ Sửa Lỗi & Tối Ưu Giao Diện (Bug Fixes & UI Improvements)
- **Khắc phục triệt để lỗi tràn màn hình của cửa sổ Nhật ký phiên bản (Changelog Modal)**:
  - Khống chế chiều cao tối đa của modal trong giới hạn màn hình `max-h-[85vh]` cùng cấu trúc `flex flex-col` và `overflow-hidden`, ngăn chặn việc nội dung dài đẩy phình modal vượt quá viewport của trình duyệt.
  - Bổ sung thanh cuộn riêng (`max-h-[200px] overflow-y-auto`) cho phần ghi chú phát hành bản mới nhất và thanh cuộn độc lập (`max-h-[180px] overflow-y-auto`) cho từng mục Accordion khi mở xem các phiên bản phát hành cũ.
  - Cố định Header (nút Đóng `✖`) và Footer (nút Tải Cập Nhật / Đóng) luôn hiển thị ở đầu và đáy modal, không bao giờ bị trôi mất.
  - Mở rộng chiều rộng modal lên chuẩn `max-w-[440px]` thoáng đãng, dễ đọc.
  - Hỗ trợ phím tắt `Escape` (Esc) và bấm chuột vào nền mờ (Backdrop click) để thoát nhanh modal.
- **Đồng bộ giao diện Changelog trên Popup Extension**:
  - Tối ưu vùng hiển thị cuộn mượt mà trong giới hạn khung nhìn `520px` của Extension Popup, giữ cố định nút Quay lại và chân trang.

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
