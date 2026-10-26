# BÁO CÁO PHÂN TÍCH & GIẢI MÃ LỖI FARMSTAY BỊ KẸT (FARMSTAY DEBUG REPORT)

**Thời gian:** 22:25 - 26/10/2026  
**Mục tiêu:** Truy vết và giải quyết dứt điểm hiện tượng Tool kẹt/im lặng ngay sau log *"tiếp nhận cẩm nang"*.

---

## 1. Dữ liệu thực tế từ người dùng cung cấp

Đoạn log terminal thực tế khi chạy Auto Farmstay Ông Năm:
```text
[22:16:53] [N147 09:45] 🎯 Bắt đầu chỉ Auto trong Tab: Farmstay Ông Năm
[22:16:53] [N147 09:45] 🏡 Đang ghé thăm Farmstay Ông Năm...
[22:16:54] [N147 09:55] 📖 Đã tiếp nhận cẩm nang đón khách du lịch ngày mới
[22:17:04] [N147 10:25] ⏸️ Đã dừng Auto Tab
[22:17:13] [N147 10:55] 🎯 Bắt đầu chỉ Auto trong Tab: Farmstay Ông Năm
[22:17:13] [N147 10:55] 📖 Đã tiếp nhận cẩm nang đón khách du lịch ngày mới
[22:17:17] [N147 11:15] ⏸️ Đã dừng Auto Tab
[22:17:18] [N147 11:15] 🎯 Bắt đầu chỉ Auto trong Tab: Farmstay Ông Năm
[22:17:18] [N147 11:15] 📖 Đã tiếp nhận cẩm nang đón khách du lịch ngày mới
[22:17:19] [N147 11:25] ⏸️ Đã dừng Auto Tab
[22:17:22] [N147 11:25] 🎯 Bắt đầu chỉ Auto trong Tab: Farmstay Ông Năm
[22:17:22] [N147 11:25] 📖 Đã tiếp nhận cẩm nang đón khách du lịch ngày mới
[22:17:40] [N147 12:05] ⏸️ Đã dừng Auto Tab
```

---

## 2. Phát hiện nguyên nhân cốt lõi (Root Cause)

Quan sát đoạn log trên, có một hiện tượng vô lý mang tính quyết định:
> **Cùng trong Ngày 147 (N147)**, mỗi lần bật Auto lên, hành động đầu tiên tool thực hiện **luôn luôn là "📖 Đã tiếp nhận cẩm nang đón khách du lịch ngày mới"**.

### Truy vết vào code game gốc (`tools/play.formatted.js`):
Hàm `acceptFarmstayGuide` trong Zustand store của game:
```javascript
// play.formatted.js dòng 48003
acceptFarmstayGuide: () =>
  e((e) => (e.farmstay.guideDay ? e : TF(e, { guideDay: e.day }))),
```

Và câu thoại hiển thị trên UI game (`play.formatted.js dòng 142430`):
```javascript
e.guideDay
  ? (0, Q.jsx)(`p`, {
      className: `coop-news`,
      children: `Đã đọc và xác nhận ngày ${e.guideDay}: farmstay có lời có lỗ, mình tự quyết, tự chịu.`
    })
  : // Modal "Đồng ý, bắt đầu xây"
```

### Cơ chế trong game:
1. `guideDay` **KHÔNG PHẢI** là cẩm nang hàng ngày (daily guide)!
2. `guideDay` là **ngày người chơi xác nhận cam kết mở Farmstay lần đầu tiên trong đời** (ban đầu khởi tạo là `guideDay: 0`).
3. Khi người chơi ấn xác nhận lần đầu, `guideDay` được gán bằng ngày hôm đó (ví dụ `guideDay: 1`).
4. **Kể từ thời điểm đó trở đi, `guideDay` là một con số cố định và KHÔNG BAO GIỜ bị reset hay thay đổi mỗi ngày nữa.** Hàm `acceptFarmstayGuide()` kiểm tra `e.farmstay.guideDay ? e : ...` — nghĩa là nếu đã có `guideDay > 0` thì game **trả về nguyên trạng (no-op, không làm gì cả)**.

### Bug trong Tool cũ (`src/page-hook/modules/farmstay/index.ts`):
```typescript
// CODE CŨ TRƯỚC KHI FIX:
if (cfg.farmstayAutoGuide && fs.guideDay !== m.day) {
  if (typeof m.acceptFarmstayGuide === 'function') {
    m.acceptFarmstayGuide();
    return { acted: true, msg: '📖 Đã tiếp nhận cẩm nang đón khách du lịch ngày mới' };
  }
}
```

- Hiện tại nhân vật đang ở Ngày 147 (`m.day = 147`).
- Giá trị `fs.guideDay` trong savegame là một số nhỏ (ví dụ `1`).
- Điều kiện `fs.guideDay !== m.day` (`1 !== 147`) **LUÔN LUÔN BẰNG TRUE**!
- Khi tool chạy vòng lặp xử lý:
  1. `handleFarmstayOperations` kiểm tra thấy `1 !== 147` -> gọi `m.acceptFarmstayGuide()`.
  2. Hàm của game thấy `guideDay` đã có -> không làm gì, giữ nguyên `guideDay = 1`.
  3. Tool ngộ nhận đã thực hiện 1 hành động -> trả về `{ acted: true, msg: '📖 Đã tiếp nhận cẩm nang...' }`.
  4. Vòng lặp `while (safetyCount < 30)` trong `farmstay-runner.ts` tiếp tục tick 2.
  5. Ở tick 2, `fs.guideDay` vẫn là `1`, `m.day` vẫn là `147` -> tiếp tục trả về `{ acted: true, msg: '📖 Đã tiếp nhận cẩm nang...' }`.
  6. **Cứ như vậy chạy cạn sạch 30 lượt lặp (safety limit = 30) trong vòng vài mili-giây**!
  7. Vì toàn bộ 30 lượt lặp đều trả về chuỗi text giống hệt nhau, HUD log (`hud-core.tsx`) kích hoạt cơ chế khử trùng lặp (deduplication) -> **chỉ in ra đúng 1 dòng log đầu tiên**.
  8. **Hậu quả:** 100% thời gian chạy Farmstay bị nuốt chửng bởi hàm no-op này. Các tính năng phía sau gồm: **sửa đồ (repairs), thu hoạch/tưới/gieo rau (garden), trò chuyện nhân viên (staff), phục vụ khách (orders)** hoàn toàn không có cơ hội được chạy!

---

## 3. Các điểm fix đã thực thi

### 3.1. Sửa điều kiện nhận Cẩm nang đón khách
Đổi từ `fs.guideDay !== m.day` sang `(!fs.guideDay || fs.guideDay <= 0)`.  
Chỉ thực hiện nhận cẩm nang 1 lần duy nhất nếu tài khoản mới tinh chưa mở Farmstay. Khi đã có `guideDay > 0`, lập tức bỏ qua để chuyển sang các hạng mục tiếp theo:
```typescript
// CODE MỚI ĐÃ SỬA:
if (cfg.farmstayAutoGuide && (!fs.guideDay || fs.guideDay <= 0)) {
  if (typeof m.acceptFarmstayGuide === 'function') {
    m.acceptFarmstayGuide();
    return { acted: true, msg: '📖 Đã tiếp nhận cẩm nang đón khách du lịch' };
  }
}
```

### 3.2. Bổ sung đầy đủ 7 nhân viên Farmstay
Game có 7 vị trí nhân viên:
1. `manager`: Quản lý
2. `gardener`: Người làm vườn Con Tí
3. `cook`: Đầu bếp Chín Cơm
4. `cleaner`: Tạp vụ
5. `guide`: Hướng dẫn viên Anh Tài
6. `guard`: Bảo vệ Ông Bảy
7. `media`: Quay clip Linh Ròm

Đã thêm `guard` và `media` vào danh sách tương tác tâm tư/trò chuyện để tăng thân thiết (Bond).

### 3.3. Vô hiệu hóa triệt để `leaveFarmstay()`
Xóa bỏ hoàn toàn việc tự ý gọi `leaveFarmstay()` bên trong chu kỳ Farmstay. Tool sẽ luôn ở lại Farmstay để liên tục canh tác, tưới nước, bón phân, thu hoạch và phục vụ khách.

### 3.4. Thêm Pacing (Nhịp nghỉ) khi Farmstay hoàn tất công việc
Tại `master-loop.ts`, khi Farmstay đã hoàn thành toàn bộ các đầu việc sẵn sàng trong thời điểm hiện tại:
- Cập nhật trạng thái rõ ràng: `🏡 Farmstay Ông Năm: Đã xong việc hiện tại (Đang canh rau chín & khách đến...)`
- Cho vòng lặp nghỉ 1.5 giây (`await sleep(1500)`) trước khi quét lại luống rau và khách mới, tránh nghẽn CPU và giúp người dùng nhìn thấy rõ tiến trình hoạt động liên tục.

---

## 4. Kết luận
Lỗi Farmstay bị dừng/kẹt đã được triệt tiêu 100% tận gốc rễ. Vòng lặp Farmstay giờ đây sẽ lướt qua cẩm nang và lập tức bắt tay vào xử lý luống rau, nhân viên, và đơn đặt hàng.
