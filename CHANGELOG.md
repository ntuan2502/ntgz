# 📝 Nhật Ký Thay Đổi (Changelog) - Nông Trại GenZ Auto by Tún

Tất cả các thay đổi đáng chú ý của dự án **Nông Trại GenZ Auto by Tún** sẽ được ghi chép chi tiết trong tệp này.
Định dạng dựa trên [Keep a Changelog](https://keepachangelog.com/vi/1.0.0/) và tuân thủ [Semantic Versioning](https://semver.org/).

---

## [1.9.0] - 2026-10-28

### 🌟 Tính Năng Mới & Nâng Cấp Toàn Diện (Major Features & Enhancements)
- **Tối Ưu Hóa & Tách Biệt Độc Lập Khu Vực Bến Đò (Wharf Area Independence)**:
  - Tách biệt hoàn toàn cấu hình Bến Đò khỏi các thiết lập điều phối và hiển thị toàn cục của các khu vực offline (nông trại, biển, farmstay).
  - Loại bỏ Bến Đò khỏi thứ tự điều phối luân phiên thông thường để đảm bảo hoạt động trực tuyến liên tục, không ngắt quãng.
  - **Cơ chế lội bộ an toàn (Safe Walk to NPC)**: Bắt buộc nhân vật di chuyển tới gần Sạp Lồng Đèn Cô Bảy (`x:37, y:28`) và Cây ATM (`x:34, y:35`) trước khi tương tác, loại bỏ hoàn toàn các gói tin WebSocket kiểm tra từ xa giúp chống phát hiện bot và tránh lỗi máy chủ.
  - **Vòng quay lồng đèn thông minh**: Tự động quay liên tục toàn bộ số vé x10 hiện có (ví dụ: 29 vé -> quay 2 lần x10 liên tiếp) mà không bị phân tán sang các tác vụ khác; ghi log chi tiết phần thưởng quay ra (vỏ sò, mồi câu, cánh, trang phục...).
  - **Đổi tiền Cây ATM chi tiết**: Ghi log rõ ràng số vỏ sò đổi thành công và số tiền mặt nhận được vào tài khoản.

- **Đồng Hồ Đếm Ngược ATM Thời Gian Thực (Phân Tách Online vs Offline)**:
  - Hiển thị thanh thông báo đếm ngược ATM thời gian thực từng giây tại tab Bến Đò (`⏳ Cây ATM: Mở đổi lúc HH:mm:ss (còn X phút Y giây)`).
  - Tự động chuyển sang trạng thái sẵn sàng đổi tiền màu xanh khi đến giờ mở đổi (`🏧 Cây ATM: Đã đến giờ đổi tiền! Có thể ra rút tiền ngay (Hạn mức còn ...đ)`).
  - Phân tách tuyệt đối giữa Bến Đò (khu vực online - chỉ hiển thị thông báo ATM) và Nông trại / Biển / Farmstay (khu vực offline - chỉ hiển thị thông báo bão lũ, giá vàng, loa xã).

- **Bộ Chọn Giữ Lại Đa Lựa Chọn Chuẩn Shadcn (Multi-Select Combobox)**:
  - Xây dựng component chọn đa mục hiện đại với popover, thao tác nhanh "Chọn hết", "Bỏ chọn" và nút "Đóng".
  - Tương thích 100% Shadow DOM (hỗ trợ `composedPath`), triệt tiêu hiện tượng click vào item bị tự đóng menu.
  - Tự động đảo hướng mở thông minh (Smart Flip): Tự động mở lật ngược lên trên khi combobox nằm gần đáy màn hình (< 230px), loại bỏ hoàn toàn tình trạng bị che khuất hoặc tràn khỏi khung nhìn.
  - Áp dụng đồng bộ cho cả **Bộ chọn độ hiếm cá giữ lại** và **Bộ chọn loài dế nuôi ống tre**.
  - Bổ sung tính năng tự động bán cá giữ lại trùng: Cho phép giữ nhiều loại cá khác nhau, nhưng mỗi loại chỉ giữ lại 1 con có giá trị cao nhất.

- **Nâng Cấp Toàn Diện Bắt Dế Đêm & 6 Ống Tre Nuôi Dế**:
  - **Đồng bộ khung giờ thực tế Việt Nam (UTC+7)**: Khung giờ bắt dế đêm (18h00 – 05h00) và khung giờ hoàng kim dế quý hiếm (23h00 – 04h00), không còn bị nhầm lẫn với giờ ngày nông trại offline.
  - **Cơ chế săn dế chống hành vi bot**: Nhân vật đứng yên tại bụi cỏ rọi đèn liên tục; chỉ di chuyển sang bụi cỏ tiếp theo khi nhận được thông báo rọi không thấy dế (`gotAway.why === 'none'`).
  - **Thuật toán thả dế thông minh khi ống tre đầy (6/6)**: Tự động thả dế không thuộc danh sách muốn giữ; ưu tiên giữ dế có độ hiếm cao hơn (`Huyền thoại > Sử thi > Hiếm > Đặc biệt > Thường`), giữ dế có CP cao hơn trong cùng độ hiếm hoặc cùng loài, thả con có CP thấp hơn để nhận lại vỏ sò (+5 đến +400🐚).
  - **Hiển thị hồ sơ dế chi tiết chuẩn ingame**: Đầy đủ 12 loài dế, badge độ hiếm, thời gian sống còn lại (`diesAt`), trạng thái nghỉ ngơi/sẵn sàng (`restUntil`), và thanh tiến trình luyện tập chỉ số Công ⚔️, Lỳ 🛡️, Gan ⚡ so với tiềm năng tối đa.
  - Định dạng phân cách hàng nghìn tiếng Việt chuẩn xác cho vỏ sò, thể lực, mồi câu, vé quay (`613.803 🐚`, `23.448 🪱`).

- **Tinh Gọn Giao Diện HUD & Cải Tiến Trải Nghiệm (UI/UX)**:
  - Tiêu đề **NTG Auto** được đưa ra chính giữa thanh tiêu đề Header.
  - Cụm nút Giám Sát (🎒) và Cài Đặt (⚙️) được chuyển thành icon tinh gọn ở góc trên bên phải Header.
  - Loại bỏ thanh công cụ phụ chứa nhãn 500ms và công tắc chạy ngầm dư thừa.
  - Đồng nhất thanh điều hướng phụ (`HudSubHeader`) giữa trang Cài Đặt và trang Changelog.
  - Hỗ trợ nhập thủ công kích thước HUD (Width & Height theo px) và lưu tức thì.
  - Widget Xem Nhanh Bến Đò cho phép thu nhỏ / mở rộng linh hoạt.
  - Căn chỉnh hoàn hảo theo chiều dọc các item trong hàng tài nguyên và lưới 6 ống tre.

- **🌾 Nông Trại**: Tự động mở rộng mua thêm ô đất ruộng khi làng mở bán mà không cần bấm thủ công.

### 🐛 Sửa Lỗi & Ổn Định Hệ Thống (Bug Fixes & Stability)
- Khắc phục lỗi rớt mạng / mất kết nối WebSocket khi thay đổi trang phục trong tủ đồ Bến Đò.
- Khắc phục lỗi sự kiện click trong Shadow DOM làm đóng menu Combobox Multi-Select ngay khi vừa click.
- Khắc phục lỗi `overflow-hidden` che khuất bảng chọn loài dế giữ lại.
- Dọn dẹp log di chuyển ATM (bỏ hiển thị số vỏ sò mang đi đổi vì ATM có hạn mức mỗi giờ).

---

## [1.8.0] - 2026-10-27

### 🌟 Tính Năng Mới & Nâng Cấp Toàn Diện (Major Features & Enhancements)
- **Trang Cài Đặt Chuyên Dụng (`SettingsView`)**:
  - Tách biệt cài đặt tốc độ trễ, chế độ thao tác ẩn danh và sắp xếp thứ tự ưu tiên khu vực ra trang Cài Đặt độc lập, trực quan và chuyên nghiệp.
  - Phân tách 2 khái niệm độ trễ độc lập:
    1. **Tốc độ delay mỗi lệnh (`taskDelayMs`)**: Độ trễ khi chuyển đổi giữa 2 thao tác khác nhau (ví dụ: chuyển từ thu hoạch sang tưới nước hoặc gieo hạt).
    2. **Tốc độ delay giữa 2 lệnh giống nhau (`actionRepeatDelayMs`)**: Độ trễ khi thực hiện liên tiếp các thao tác cùng loại (ví dụ: tưới 12 ô đất liên tiếp).
  - Hỗ trợ chế độ siêu tốc **Turbo Batch Mode (0ms)**: Hoàn tất tưới nước, gieo hạt hoặc bón phân toàn bộ 12 ô đất ruộng làng và 24 ô farmstay tức thì trong 1 khung hình duy nhất mà không tốn thời gian chờ đợi từng ô.
  - Đồng nhất cơ chế thao tác ẩn danh (`showFullActions = false`): Khi tắt hiển thị đầy đủ thao tác, mọi hoạt động mở bảng menu game (ăn uống, đổi tiền ATM, quay lồng đèn...) đều được chạy ngầm tự động thông qua bridge engine mà không mở popup UI che màn hình.

- **Thanh Thông Tin Realtime & Tối Giản Header**:
  - Tối giản phần Header của HUD: Lược bỏ các nhãn dư thừa (`by Tún`, `v1.7.0`, `Alt+P`), dời nút Giám Sát xuống thanh công cụ nhanh cùng dòng với Chạy ngầm và Cài đặt.
  - Thanh Stats phân tách ngữ cảnh thông minh:
    - Khi ở Bến Đò: Hiển thị đồng hồ ngày giờ thời gian thực (giây cập nhật liên tục), số vỏ sò 🐚, mồi câu 🪱, vé vòng quay 🎟️, sức ⚡ và chỉ số may mắn 🍀.
    - Khi ở Nông trại / Biển / Farmstay: Hiển thị Ngày, Giờ game, Vàng, Độ no, Độ khát, Năng lượng.

- **Tối Ưu Hóa Bến Đò & Tự Động Hóa Vòng Quay / ATM**:
  - Vòng quay lồng đèn Cô Bảy: Bổ sung tùy chọn mua thêm 5 vé quay hàng ngày, ưu tiên mua hết vé trước khi quay; hỗ trợ tùy chọn quay x10 nghiêm ngặt (chỉ quay khi đủ 10 vé).
  - Cây ATM đổi vỏ sò: Tự động đổi tối đa số vỏ sò (tối đa 20.000.000đ/giờ), dừng đổi nếu số vỏ sò < ngưỡng cấu hình (mặc định 10.000), tự động so sánh thời gian lần đổi gần nhất và tính đúng mốc mở đổi tiếp theo kèm log đếm ngược chuẩn xác.
  - Mua mồi câu Chú Đực: Bổ sung ô nhập số lượng mồi tối đa (dừng khi đạt mốc, mặc định 10.000) và ngưỡng giữ tiền mặt an toàn.
  - Vị trí ngồi câu cá: Cập nhật tọa độ chuẩn xác của 4 điểm câu tại bến đò (Cầu tàu lớn, Cầu tre lắt lẻo, Bờ sông bến giữa, Cầu ván qua lạch).

### 🐛 Sửa Lỗi & Tăng Cường Độ Ổn Định (Bug Fixes & Stability)
- **Khắc phục lỗi sập giao diện (Crash / Unmount) khi mở Cần câu ở Bến Đò**:
  - Sửa lỗi `TypeError: Objects are not valid as a React child` trong `WharfPackTab` do game trả về mảng object `{ rod, until }`.
  - Tích hợp từ điển 14 loại Cần câu đặc biệt từ mã nguồn game (`SPECIAL_RODS_MAP`) với tên tiếng Việt đầy đủ, cấp bậc (`Tối thượng`, `Huyền thoại`, `Quý`, `Hiếm`, `Tốt`), màu sắc, mô tả và thời gian thuê còn lại.
- **Bổ sung cơ chế chống sập giao diện (`TabErrorBoundary`)**:
  - Bọc `TabErrorBoundary` cho toàn bộ 10 tab trong cửa sổ Giám sát (`MonitorHub`), đảm bảo nếu có dữ liệu bất thường từ game ở một tab thì chỉ riêng tab đó hiện nút "Thử tải lại tab", toàn bộ hệ thống HUD và các tab khác vẫn hoạt động ổn định 100%.
- **Việt hóa toàn diện mọi mã ID kỹ thuật tiếng Anh**:
  - Chuyển toàn bộ các mã độ hiếm tiếng Anh (`junk`, `common`, `uncommon`, `rare`, `epic`, `legendary`, `mythic`) sang tiếng Việt (`Rác`, `Thường`, `Hơi hiếm`, `Hiếm`, `Rất hiếm`, `Huyền thoại`, `Thần thoại`).
  - Việt hóa giống thú cưng trong Gia súc (`vang`, `muc`, `husky`, `muop`, `tamThe`...).
  - Việt hóa giỏ cá trong Kho đồ (`inventory-data.ts`) và các món đồ ăn mang theo bến đò (`wharf-catalog-data.json`).

---

## [1.7.0] - 2026-10-27

### 🌟 Tính Năng Mới & Nâng Cấp Toàn Diện (Major Features & Enhancements)
- **Hệ Thống Xem Nhanh Thời Gian Thực Bến Đò (Wharf Realtime Quick-View & Monitor)**:
  - Bổ sung trọn vẹn 6 phân hệ Bến Đò vào cửa sổ Giám Sát Realtime (`MonitorHub`), mô phỏng trung thực 100% cơ chế, giao diện và dữ liệu gốc trong game:
    1. **🦗 Ống tre dế (`CricketDeckTab`)**:
       - Hiển thị 6 ống tre nuôi dế với các chỉ số Sức (HP), Lì (Grit), Gan (Spirit), cấp độ, loài và mức trần kỹ năng (caps).
       - Tích hợp radar khung giờ vàng săn dế đêm (18h00 - 05h00) và nút 1-click mở trực tiếp Sới dế trong game.
    2. **📖 Sổ cá Bến Đò (`FishDexTab`)**:
       - Toàn bộ 103 loài cá và mục ve chai với thông số kích thước (min/max cm), giá vỏ sò và độ hiếm.
       - Đầy đủ các tab độ hiếm chuẩn màu game: Thường, Hơi hiếm, Hiếm, Rất hiếm, Huyền thoại, Thần thoại, Rác, cùng 2 biến thể đặc biệt Cá lạ ✨ và Cá cầu vồng 🌈.
       - Hiển thị số lượng đã câu, kích thước kỷ lục cá nhân và kỷ lục toàn bến (với nhãn nhận diện nếu bạn đang giữ kỷ lục).
       - Gợi ý chi tiết điều kiện câu (cần bốc tối thiểu, bờ sông/cầu tre, khung giờ, ngày cuối tuần) cho các loài chưa câu được.
       - Tích hợp tab Cẩm nang câu cá 📜 và thanh tìm kiếm tức thời theo tên loài.
    3. **🏆 Bảng vàng Bến Đò (`WharfBoardTab`)**:
       - Bảng xếp hạng trực tuyến 8 hạng mục: Nhiều loài, Cá to, Chăm câu, Giàu vỏ sò, Săn thần thoại, Ve chai, Giữ kỷ lục, và Vua câu tuần.
       - Hiển thị Top 3 với huy chương 🥇 🥈 🥉, thứ hạng hiện tại của chính bạn (`#rank`) và thành tích cá nhân.
       - Đồng hồ đếm ngược tuần và thông tin người đạt giải tuần trước.
    4. **👕 Tủ đồ ở Bến (`WharfClosetTab`)**:
       - Quản lý trang phục bến đò: Áo, Quần, Nón, Đồ đeo lưng (cánh, lồng đèn, diều...), Thú cưng.
       - Xem trang phục đang mặc, lọc theo đồ đã sở hữu hoặc toàn bộ mẫu tại tiệm bến đò.
       - Cho phép bấm "Chọn" để đổi đồ ngay tức thì mà không cần di chuyển nhân vật trong game.
    5. **👥 Bạn bè & Bến đò (`FriendsTab`)**:
       - Danh sách các phòng bến đò đang mở, số người online (`x/20`), thanh tải bến, định vị bến hiện tại và nút bấm chuyển phòng bến đò tức thì.
       - Danh bạ bạn bè với mã kết bạn (sao chép 1 chạm), số lượt tặng quà còn lại trong ngày, cấp ngày nông trại, thời gian online lần cuối và trạng thái đã giúp đỡ.
    6. **🎒 Túi đồ Bến Đò (`WharfPackTab`)**:
       - Chip tài nguyên thời gian thực: Vỏ sò 🐚, Thể lực ⚡/100, Mồi câu 🪱.
       - Tab Đồ ăn: Hiển thị lượng đồ ăn hồi sức trong túi (Bánh mì, Bánh bao, Xôi bắp, Cơm tấm, Lẩu cá linh...) và lượng thể lực hồi phục (+⚡).
       - Tab Giỏ cá: Danh sách cá đang giữ với kích thước, độ hiếm, giá bán và nút bật/tắt ghim giữ cá ⭐ (`Giữ` / `Bỏ giữ`).
       - Tab Cần câu: Cấp cần chuẩn (Tre -> Sợi thuỷ tinh -> Carbon -> Nano) và danh sách cần bốc tiệm Chú Đực với nút trang bị ngay.
  - **Bộ chuyển đổi phân hệ Giám sát (`MonitorHub`)**:
    - Bổ sung bộ lọc danh mục: `🌾 Nông Trại` (4 tab) | `🛶 Bến Đò` (6 tab) | `✨ Tất cả` (10 tab) giúp chuyển đổi mượt mà giữa các không gian giám sát.
  - **Khối truy cập nhanh trong HUD Bến Đò (`WharfTabContent`)**:
    - Thêm khối "Xem Nhanh Bến Đò (Thời gian thực)" với 6 thẻ trực quan: bấm để mở cửa sổ Giám sát tại tab tương ứng hoặc bấm icon ↗️ để mở modal gốc trong game.
  - **Mở rộng Store Watcher & Engine Access**:
    - Khám phá và đồng bộ hóa real-time toàn bộ dữ liệu `dex`, `title`, `closet`, `look`, `board`, `rods`, `rooms`, `room`, `friends` từ Zustand store `benNet` và `friends`.
    - Bổ sung bộ điều khiển hành động WebSocket chuyên dụng (`BEN_SET_PANEL`, `BEN_REFRESH`, `BEN_USE_ROD`, `BEN_SET_LOOK`, `BEN_KEEP_FISH`, `BEN_SWITCH_ROOM`).

---

## [1.6.3] - 2026-10-27

### 🌟 Tính Năng Mới & Tối Ưu Hóa (Features & Optimizations)
- **Tối Ưu Vòng Quay Lồng Đèn Cô Bảy (Lantern Wheel Optimization)**:
  - **Ưu tiên mua vé trước khi quay**: Đảo thứ tự xử lý, gom mua toàn bộ 5 lượt vé quay hàng ngày (600🐚/lượt, tối đa 5/5) trước khi quay, loại bỏ hoàn toàn tình trạng mua 1 vé rồi quay 1 vé lặp lại.
  - **Tùy chọn chế độ quay linh hoạt (`benLanternSpinMode`)**:
    - `⚡ Quay x10 (hoặc tối đa vé còn lại)`: Tận dụng trực tiếp nút quay đa vé của game (`Quay ${Math.min(10, remaining)} · 🎟️`), quay nhanh gọn toàn bộ vé chỉ trong 1 lần nhấn.
    - `🎟️ Quay x1 từng vé`: Giữ nhịp quay truyền thống từng lượt.
  - **Tùy chọn tự mua thêm vé quay (`benBuyLanternTicket`)**: Cho phép người chơi tự do bật/tắt việc mua thêm 5 vé quay hàng ngày.
- **Chuẩn Hóa Logic Rút Tiền Cây ATM Bến Đò (Shell ATM Exchange)**:
  - **Khống chế chuẩn hạn mức 20 triệu/giờ**: Tự động tính toán số tiền tối đa có thể rút (tối đa 20.000.000đ tiền mặt mỗi giờ theo quy định game hoặc số dư hạn mức còn lại `left`), quy đổi ra lượng vỏ sò tương ứng theo tỷ giá của ngày chơi (`shellsToCash = Math.min(shells, Math.floor(20M / rate))`), không đổi lố toàn bộ số vỏ sò trong túi.
  - **Thăm dò trạng thái ATM từ xa**: Tự động gửi gói tin WebSocket `{ t: 'atm' }` để nắm bắt tỷ giá, hạn mức còn lại và mốc giờ mở đổi tiếp theo (`reopen`) mà không cần nhân vật phải chạy ra ATM.
  - **Kiểm tra thông minh & Hẹn giờ (Timer Scheduler)**: Nếu chưa tới giờ đổi (đã nhận đủ 20 triệu hoặc chưa tới mốc `reopen`), bot không đi ra cây ATM mà tiếp tục câu cá bình thường, tự động set timer tới đúng giờ mở đổi và hiển thị log đếm ngược rõ ràng (`⏳ Cây ATM: Chưa tới giờ đổi (mở đổi lúc HH:mm:ss, còn X phút Y giây)`).
  - **Ngưỡng dừng bảo lưu vốn (`benAtmThreshold`)**: Mặc định 10.000 vỏ sò, bot tự động dừng không đổi tiền nếu số vỏ sò tụt xuống dưới ngưỡng này.
- **Khảo Sát & Chuẩn Hóa Tọa Độ Điểm Ngồi Câu (Fishing Spots & Cast Validation)**:
  - Phân tích toán học toàn bộ ma trận map Bến Đò (60×40) và thuật toán ném cần `Zh(e)` / `Qh(x, y)` từ mã nguồn game.
  - Sửa dứt điểm lỗi tọa độ cũ của Cầu tre `(31, 4)` không câu được do nằm giữa sàn gỗ không tiếp giáp nước (game trả về `null` nên nút câu bị khóa).
  - Cập nhật 4 vị trí câu tiếp giáp mép nước chuẩn xác vào menu chọn:
    - `🌾 Bờ sông bến giữa` **`(24, 10)`**: Đứng sát mép bờ ném cần ra giữa dòng sông `(24, 7)`.
    - `🌉 Cầu tàu lớn (Đầu mũi)` **`(31, 3)`**: Đứng sát mũi cầu tàu dài ném ra vùng nước sâu `(31, 0)` săn cá to.
    - `🎋 Cầu tre lắt lẻo` **`(7, 6)`**: Đứng ở chóp cầu tre bờ Tây ném ra vụng sông `(7, 3)`.
    - `🪵 Cầu ván qua lạch` **`(46, 15)`**: Đứng trên cầu ván ném cần vào nhánh lạch `(46, 12)`.
  - Nhân vật tự động đi bộ đến đúng tọa độ được chọn trước khi vung cần câu.
- **Nâng Cấp Bộ Cài Đặt Mua Mồi Chú Đực Khi Hết Mồi (Bait Stocking Logic)**:
  - Thêm ô cấu hình số lượng mồi tối đa trong túi `benBaitMaxCount` (mặc định 10.000 mồi, dừng mua khi mồi >= x).
  - Thêm ô cấu hình ngưỡng vỏ sò dừng mua `benBaitMinShells` (mặc định 10.000 vỏ sò, dừng mua khi vỏ sò < x).
  - Cơ chế gom mồi thông minh: Khi hết mồi, bot chạy ra sạp Chú Đực và gom mồi theo đợt liên tục cho đến khi đạt hạn mức hoặc chạm ngưỡng dừng, giúp người chơi cắm câu hàng ngàn lượt mà không bị chạy đi chạy lại liên tục.

---

## [1.6.2] - 2026-10-27

### 🌟 Tính Năng Mới & Nâng Cấp Giao Diện (Features & UI Enhancements)
- **Tích Hợp Biểu Tượng Extension Chính Thức (Extension Icon)**:
  - Bổ sung tài nguyên ảnh nhận diện thương hiệu `src/images/icon-192.png`.
  - Cấu hình chuẩn hóa Manifest V3 cho toàn bộ kích thước hiển thị (`16`, `32`, `48`, `128`, `192`) và biểu tượng Action Toolbar trên trình duyệt.
  - Tích hợp hiển thị logo nhận diện chính thức trên thanh tiêu đề Popup lẫn thanh Header bảng điều khiển HUD trong game.
- **Tái Cấu Trúc Toàn Diện Giao Diện Changelog Trong HUD (Full-Panel Changelog View)**:
  - Loại bỏ hoàn toàn cửa sổ Modal popup chồng đè (`fixed inset-0`) vốn bị giới hạn bởi thuộc tính `transform` của container HUD dẫn đến lỗi tràn viền và che khuất nội dung.
  - Tái sử dụng trọn vẹn mô hình View Mode của Extension Popup: Khi bấm kiểm tra cập nhật (hoặc nhấp vào badge phiên bản `v1.6.2`), toàn bộ thân bảng điều khiển HUD sẽ chuyển sang màn hình Changelog chuyên dụng với nút `← Quay lại bảng điều khiển` ở đầu trang.
  - Tự động co giãn theo kích thước HUD, cuộn mượt mà, hỗ trợ phím `Esc` để quay lại bất kỳ lúc nào.

### 🐛 Sửa Lỗi Logic (Bug Fixes)
- **Chuẩn Hóa Logic Gửi Tiết Kiệm Dì Bảy (Savings Deposit Logic)**:
  - Sửa lại công thức gửi tiền: Khi bật *"Gửi tối đa hạn mức cho phép"*, bot gửi trọn vẹn hạn mức cao nhất của sổ theo quy định của game (`cap`: 5M, 8M, 12M, 20M) thay vì trừ trước ngưỡng bảo lưu vốn.
  - Ngưỡng *"Dừng gửi khi tiền dưới (triệu)"* hoạt động chuẩn xác theo cơ chế Chặn dừng (Guard Check): Ngừng mở thêm sổ mới ngay khi số dư ví giảm xuống dưới ngưỡng cài đặt.

---

## [1.6.1] - 2026-10-27

### 🌟 Tính Năng Mới & Nâng Cấp (Features & Improvements)
- **Tự Động Mua Bò Sữa Khi Chuồng Trống (Dairy Auto Buy Cow)**:
  - Bổ sung tùy chọn **"🐄 Tự mua thêm Bò sữa khi chuồng trống (-1.800.000đ)"** tại phân khu Bò Sữa (Chị Mận).
  - Tự động kiểm tra và nhận diện chính xác tổng đàn bò (bao gồm bò hiện có trong chuồng và bò đang trên đường giao về `cows + coming`).
  - Khi chuồng còn chỗ trống (`< 4 con`) và tài khoản sở hữu từ `1.800.000đ` trở lên, bot sẽ tự động đặt mua thêm bò sữa để duy trì tối đa quy mô đàn bò 4 con, tối ưu hóa năng suất sữa bò tươi (đạt tối đa 32 lít/ngày).
  - Thao tác được cách ly trong khối xử lý an toàn độc lập, hiển thị log thông báo chi tiết và minh bạch.

---

## [1.6.0] - 2026-10-27

### 🌟 Tính Năng Mới & Nâng Cấp Hệ Thống (Major Features & Optimizations)
- **Banner Cảnh Báo Quan Trọng Trong Ngày (Important Alerts)**:
  - Tự động bóc tách và ghim các thông báo khẩn cấp từ Loa xã, Điện thoại và Bản tin (*bão lớn, tin đồn giá vàng tăng/giảm, tin cá biển, dịch bệnh gia súc, tin hụi Dì Bảy*) thành Banner cảnh báo nổi bật ngay dưới thanh Stats HUD.
  - Vẫn tự động đóng popup để không làm nghẽn tiến trình auto, nhưng đảm bảo người chơi không bao giờ bị bỏ lỡ các sự kiện quan trọng trong ngày.
- **Tùy Biến Nhu Cầu & Tự Động Ăn/Uống Toàn Diện (Hunger & Thirst Overhaul)**:
  - Ngưỡng Đói và Khát: Mở rộng toàn dải cài đặt từ `0 – 100%` (bước nhảy 1%, mặc định an toàn là **10%**).
  - Bổ sung tùy chọn **"Ăn no tới khi đầy 100%"** & **"Uống tới khi đã khát 100%"**: Một khi chỉ số tụt dưới ngưỡng đã cài, bot sẽ tự động dùng món liên tục cho đến khi đạt đầy 100% rồi mới tiếp tục các công việc khác.
  - Bỏ tính năng uống Cà phê sữa mỗi sáng (-30.000đ) để tiết kiệm vàng tối đa cho người chơi.
  - Ngưỡng sạc pin xe điện EV: Mở rộng dải cài đặt từ `0 – 100%` (bước nhảy 1%, mặc định **10%**).
- **Tối Ưu Chu Trình Đi Ngủ & Menu Biển (Sleep & Sea Logic)**:
  - Bỏ ô nhập giờ ngủ buổi tối thủ công tại Tab Nông Trại; bot tự động về nhà đi ngủ khi xong hết việc ban đêm (sau 22h30).
  - Chuyển tùy chọn **"😴 Tự về nhà đi ngủ khi hết câu được buổi tối"** sang **Tab Biển** (`SeaTabContent`), tự động về nhà ngủ ngay khi kết thúc giờ câu cá đêm ở Biển (`minutes > 1350`).
- **Tách Riêng Hoàn Toàn Giữa Sử Dụng & Mua Vật Phẩm (Separated Buy & Use)**:
  - **Ruộng đồng (Tèo)**: Tách riêng `Tự xịt thuốc sâu` và switch phụ con `Tự mua thuốc sâu khi hết (-8.000đ)`.
  - **Phân bón**: Tách riêng `Tự bón phân NPK` và switch phụ con `Tự mua phân NPK khi hết (-15.000đ)`.
  - **Gieo hạt**: Tách riêng `Tự gieo hạt giống có sẵn` và switch phụ con `Tự mua hạt giống khi hết`.
  - **Bò sữa (Chị Mận)**: Tách riêng `Tự tiêm thuốc chữa bệnh cho Bò` và switch phụ con `Tự mua thuốc tiêm khi hết (-80.000đ)`.
  - Giúp người chơi kiểm soát 100% chi tiêu, không bao giờ bị trừ vàng tự động khi chưa cho phép.
- **Xóa Bỏ Lương Bé Bi Ao Cá (Pond Dead Code Removal)**:
  - Đối chiếu chính xác theo Game Engine: Game chỉ có 4 helper nhận lương (`crops`, `poultry`, `buffalo`, `dairy`). Bé Bi hoàn toàn không có cơ chế nhận lương. Xóa bỏ hoàn toàn switch `pondAutoPayHelper`.
- **Đại Tu Phân Khu Tạp Hóa Chị Na & Quầy Dì Bảy (Market & Savings Overhaul)**:
  - **Bỏ logic giữ trứng gà**: Xóa bỏ cờ giữ trứng cho chợ đêm, đơn hàng Chị Na hoặc Bảng tin làng cần trứng gà sẽ được giao bình thường.
  - **Bỏ tự bán nông sản sổ tay & bán thông minh**: Xóa bỏ hoàn toàn các hàm tự bán nông sản dư thừa ngoài trend (`sellForDailyTask`, `sellSmart`), loại bỏ nguy cơ hao hụt kho dự trữ.
  - **Bỏ nhiệm vụ tân thủ**: Bỏ chuỗi hướng dẫn Ngày 1 & 2 và thu thập trang sổ tay Ông Năm để tinh gọn vòng lặp.
  - **Nâng cấp Sổ Tiết Kiệm Dì Bảy**:
    - Hỗ trợ đầy đủ 3 kỳ hạn chuẩn của game: **3 ngày (+5% lãi)**, **7 ngày (+15% lãi)**, **14 ngày (+35% lãi)**.
    - Hỗ trợ tùy chọn **"Gửi tối đa hạn mức cho phép"** (5M ➔ 8M ➔ 12M ➔ 20M theo cấp) hoặc nhập số tiền gửi cụ thể.
    - Bổ sung cấu hình **"Dừng gửi khi tiền dưới (triệu)"** (mặc định 10 triệu) bảo toàn vốn lưu động.
- **Cải Tổ Toàn Diện Chợ Đêm (Night Market Overhaul)**:
  - Bỏ bán trứng gà, bỏ bảo lưu đơn Chị Na.
  - Thêm điều kiện an toàn: **"Chặn không bán nếu tồn kho dưới X món"** (mặc định **50 món**).
  - Tích hợp 3 chiến lược bán linh hoạt:
    1. 💰 *Bán nông sản có giá cao nhất* (`highest_price`)
    2. 📦 *Bán nông sản có số lượng nhiều nhất* (`max_stock`)
    3. 🎯 *Bán nông sản được chỉ định* (`selected_crop`) với Dropdown chọn cụ thể loại cây (*Củ cải, Cà rốt, Bắp ngô, Lúa thơm*).

---

## [1.5.1] - 2026-10-26

### 🐛 Sửa Lỗi Nghiêm Trọng & Nâng Cao Độ Ổn Định (Bug Fixes & Stability)
- **Khu Vực Farmstay Ông Năm (Farmstay Fixes)**:
  - **Khắc phục lỗi kẹt vòng lặp Cẩm nang**: Sửa điều kiện nhận cẩm nang đón khách ngày mới (`guideDay !== day`), ngăn chặn hiện tượng spam nhận cẩm nang liên tục trong ngày gây đứng tool.
  - **Vô hiệu hóa tự động rời Farmstay (`leaveFarmstay`)**: Loại bỏ việc tự ý gọi lệnh thoát Farmstay khi đang chạy auto theo Tab, đảm bảo bot duy trì vận hành ổn định trong khu vực Farmstay mà không bị văng scene.
  - **Bổ sung đầy đủ 7 vị trí nhân viên Farmstay**: Quản lý (`manager`), Làm vườn (`gardener`), Đầu bếp (`cook`), Bảo vệ (`guard`), Hướng dẫn viên (`guide`), Truyền thông (`media`), Tạp vụ (`cleaner`) khi tự động trò chuyện hàng ngày (tăng thân thiết Bond) và thanh toán nợ lương.
  - **Chuẩn hóa kiểm tra công việc tồn đọng (`hasPendingFarmstayWork`)**: Đối chiếu chính xác cấu trúc dữ liệu game: vườn rau chín (`readyAt`), luống khô (`watered`), tiện ích hỏng (`broken`), đơn hàng khách (`orders`), đoàn khách chờ (`guests`), và cẩm nang du lịch ngày mới.
- **Khu Vực Thú Cưng (Pet Crash Fix)**:
  - **Khắc phục lỗi Crash Silent khi chăm thú cưng**: Bổ sung kiểm tra phòng vệ `Array.isArray(pet.gear)` trước khi gọi các hành động của game, loại bỏ hoàn toàn lỗi văng ngoại lệ `TypeError: Cannot read properties of undefined (reading 'includes')` từ `play-BWW_C6XM.js` khiến sập toàn bộ vòng lặp auto.
  - **Cách ly ngoại lệ cấp phân khu (`execFarmSubAreaStep`)**: Bọc `try/catch` độc lập cho từng hành động của Pet và từng phân khu nông trại; nếu một tính năng gặp lỗi dữ liệu bất thường từ game, tool sẽ ghi cảnh báo và tiếp tục xử lý các phân khu khác mà không bị đứng hình.
  - **Đảm bảo trạng thái thú cưng**: Tự động kích hoạt `setPetFollow(true)` khi dắt pet đi dạo mát.
- **Khu Vực Chợ Lớn & Nông Sản (Market & Trend Fixes)**:
  - **Sửa lỗi tính sai cây Trend sốt dẻo (x2 giá)**: Loại bỏ lúa (`rice`, thuộc cây cốt truyện `story: true`) khỏi danh sách cây trồng tính toán chỉ số xu hướng (`TREND_CROPS`), khắc phục triệt để hiện tượng lệch index khiến bot nhận diện sai cây trend sốt dẻo (trước đây bán nhầm bắp ngô thay vì cà rốt).
  - **Chốt chặn an toàn khi bán nông sản (`sellSmart`)**: Bổ sung cờ bảo vệ `autoSellProduce` trong cơ chế Bán thông minh. Tool sẽ không tự ý bán nông sản thô dư thừa khi người dùng chỉ bật tính năng bán theo trend hoặc chỉ muốn bán món ăn nấu chín (`produce_only`), bảo toàn tối đa nông sản trong kho.
- **Khu Vực Chợ Đêm & Mã Nguồn (Night Market & Cleanup)**:
  - **Chuẩn hóa giá trứng Chợ Đêm**: Cập nhật giá bán trứng gà tại Chợ Đêm theo đúng công thức game: `15.000đ × 1.25 = 18.750đ` (thay vì mức giá cũ 3.000đ).
  - **Dọn dẹp mã nguồn thừa (Dead code)**: Loại bỏ các đoạn code kiểm tra `helpers.pond` không còn sử dụng.
  - **Tăng cường khả năng chẩn đoán**: Thêm logging trực quan và bọc bắt lỗi toàn diện trên tất cả các tác vụ chạy ngầm.

---

## [1.5.0] - 2026-10-26

### 🌟 Tính Năng Mới & Nâng Cấp Hệ Thống (Major Features)
- **Tự Động Hóa Khu Vực Farmstay Ông Năm (Thay thế Phố Xá Coming Soon)**:
  - Thay thế hoàn toàn khu vực giữ chỗ `🏙️ Phố xá` bằng `🏡 Farmstay Ông Năm`, tích hợp đầy đủ giao diện, bộ điều phối và logic tự động.
  - **1. Vận Hành & Đón Khách (Operation)**:
    - Tự động mở cửa Farmstay khi đã hoàn thành Cổng chào và có Quản lý.
    - Tự động tiếp nhận cẩm nang đón khách du lịch ngày mới.
    - Tự động thanh toán nợ lương nhân viên Farmstay với ngưỡng dự trữ vàng an toàn.
  - **2. Bảo Trì & Sửa Chữa Tiện Ích (Repairs)**:
    - Tự động quét và sửa chữa tức thì các tiện ích bị du khách làm hư hỏng (karaoke, thuyền, hồ bơi, v.v.), bảo toàn điểm đánh giá 5 sao không bị trừ và tiếp tục tạo doanh thu.
  - **3. Vườn Rau Hữu Cơ Trải Nghiệm (Organic Garden - 24 Luống)**:
    - Tự động thu hoạch rau chín vào kho bếp Farmstay.
    - Tự động tưới nước cho các luống rau khô.
    - Tự động bón phân hữu cơ khi có phân bón trong kho.
    - Tự động gieo hạt giống (Rau muống, Cà chua, Dưa leo, Ớt, Dưa hấu) vào các luống trống.
    - Tùy chọn tự động khai hoang mua thêm luống rau mới (tối đa 24 luống).
  - **4. Nhân Viên & Tăng Điểm Thân Thiết (Staff & Bonds)**:
    - Tự động trò chuyện hàng ngày với 5 nhân sự (Quản lý, Làm vườn, Đầu bếp, Tạp vụ, Hướng dẫn viên) để tăng điểm Thân thiết (Bond) lên 10 mở khóa đặc quyền.
    - Tự động giải quyết các sự kiện tâm sự, tâm tư của nhân viên khi xuất hiện.
  - **5. Phục Vụ Khách & Tour Đoàn Du Lịch (Orders & Groups)**:
    - Tự động kiểm tra kho bếp và giao món ăn, nông sản theo đơn đặt hàng của khách để nhận tiền bo (tips) và nâng sao danh tiếng.
    - Tự động duyệt nhận các tour đoàn du lịch đông người của Chị Hồng.
  - **Kéo Thả Sắp Xếp Thứ Tự Ưu Tiên Farmstay (Drag & Drop Reordering)**:
    - Cho phép kéo thả hoặc bấm nút mũi tên để tùy biến thứ tự ưu tiên giữa 5 phân khu Farmstay, bật/tắt từng phân khu và thu gọn/mở rộng trực quan.
  - **Tương Thích Ngược Tuyệt Đối (Backward Compatibility)**:
    - Tự động chuyển đổi cấu hình lưu trữ cũ (`city` ➔ `farmstay`) trong danh sách ưu tiên khu vực và tab hiện tại mà không làm mất cài đặt người dùng.

---

## [1.4.0] - 2026-10-26

### 🌟 Tính Năng Mới & Nâng Cấp Hệ Thống (Major Features)
- **Sới Dế Bến Đò & Thách Đấu Thang Boss (Cricket Arena & Boss Ladder)**:
  - Tự động di chuyển tới Sới Dế Ông Sáu tại gốc đa (`x:4, y:29`).
  - Thách đấu thang Boss hàng ngày: **Cu Bin** (+15🐚) ➔ **Út Mập** (+30🐚) ➔ **Anh Lực xe ôm** (+60🐚) ➔ **Bác Chín thợ rèn** (+110🐚) ➔ **Ông Sáu chủ sới** (+220🐚).
  - Tự động tuyển chọn con dế có tổng chỉ số mạnh nhất (`power + tough + nerve`) trong ống tre, kiểm tra dế hồi phục thể lực và so sánh tỷ lệ sức mạnh tối thiểu với Boss trước khi vào trận.
  - **Khều Râu Dế Theo Nhịp**: Khều râu tự động đúng nhịp trong trận đấu (khi dế chùn hoặc chuẩn bị giáp chiến) giúp dế hăng máu, dồn sức húc và lật kèo đối thủ.
  - **Đặt Cược Sới Dế PvP**: Tự động soi tỷ lệ cược nhà cái và so sánh chỉ số hai bên dế để đặt cược cửa có tỷ lệ thắng cao (tối đa 20 cược/ngày).
- **Bắt Dế Đêm (18h00 – 05h00) & Nuôi Dế Ống Tre (Cricket Hunt & Care)**:
  - **Tự động nhận diện giờ thực tế**: Đồng bộ theo giờ Việt Nam UTC+7 của máy chủ Bến Đò cho khung giờ săn dế đêm (18h–5h) và khung giờ săn dế hiếm (23h–4h).
  - **Tùy chọn khu vực săn dế đa dạng**:
    - 🌾 *Đồng cỏ phía đông* (mặc định): Mọi loài dế, đặc biệt là Dế vương (Huyền thoại) lúc 0h–3h.
    - 🎋 *Bãi lau sậy*: Săn Dế ngọc và Dế ma (Sử thi) lúc 23h–4h.
    - 🌾 *Bờ ruộng*: Săn Dế trũi, Dế vàng, Dế sắt.
    - 🥬 *Quanh luống rau*: Săn Dế cồ, Dế lửa.
    - 🌱 *Bãi cỏ khắp bến*: Săn Dế đất, Dế cồ.
    - 🔄 *Tự luân phiên qua lại các khu*: Tự động tuần tra lần lượt qua toàn bộ các khu vực săn dế trên bến.
  - **Cơ chế tuần tra chống spam lãng phí thể lực**: Khi rọi đèn xong hoặc gặp trạng thái vắng dế ("Im re, không nghe con nào gáy. Đi chỗ khác rọi thử nha 🔦"), bot tự động bước sang vị trí/bụi cỏ tiếp theo trong khu vực trước khi rọi lại, bảo toàn ⚡3 Sức mỗi lượt.
  - **Úp dế chuẩn xác với bù trừ độ trễ Ping**: Tự động đo độ trễ mạng thực tế (RTT) để canh thời điểm úp đúng lúc dế chạm đất và nằm yên (`hop.air - rttMs + 60ms`). Kích hoạt phím bấm 1–5 và click bụi cỏ `.ben-tuft` kèm viền vàng trực quan.
  - **Quản lý ống tre thông minh**: Tự động thả dế thường/dế chỉ số thấp nhận lại vỏ sò khi ống tre đầy (6/6) để nhường chỗ bắt dế hiếm.
  - **Bồi bổ thức ăn cho dế**: Tùy chọn mua thức ăn (Lá non +Lì, Trứng kiến +Sức, Ớt hiểm +Gan) để nâng cấp chỉ số cho con dế mạnh nhất.
- **Kéo Thả Sắp Xếp Độ Ưu Tiên Bến Đò (Wharf Drag & Drop Reordering)**:
  - Cho phép kéo thả trực tiếp hoặc bấm nút mũi tên để tùy biến thứ tự thực hiện giữa các cụm việc tại Bến Đò: Câu cá, Sới dế, Bắt dế đêm, Giải trí.
  - Tách bạch tác vụ giới hạn (Boss, Lồng đèn, Vé số, ATM) và tác vụ liên tục (Câu cá, Săn dế đêm), loại bỏ hoàn toàn hiện tượng di chuyển giật cục (ping-pong) giữa bãi cỏ và bờ sông.

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
