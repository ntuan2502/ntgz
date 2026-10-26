# BÁO CÁO AUDIT TOÀN DIỆN & BÀN GIAO SỬA LỖI (AUDIT REPORT FINAL)
## ĐỐI CHIẾU EXTENSION AUTO VỚI MÃ NGUỒN GAME "NÔNG TRẠI GENZ" & BÀN GIAO 3 COMMIT FIX

- **Ngày cập nhật:** 26/10/2026
- **Công cụ thẩm tra:** AG Kit Audit Engine (Phối hợp `@qa-automation-engineer` & `@game-developer`)
- **Nguồn đối chiếu Ground-Truth:**
  - Mã nguồn nén gốc: [`tools/play.js`](tools/play.js) (3,304,607 bytes - Rolldown/Vite bundle đơn).
  - Mã nguồn giải mã chuẩn hóa AST: [`tools/play.formatted.js`](tools/play.formatted.js) (186,605 dòng).
- **Mã nguồn Tool Extension:** Thư mục [`src/`](src/) (Extension Manifest V3, React 19, TypeScript).

---

## 0. XÁC NHẬN TRUY CẬP & BẰNG CHỨNG ĐỘ TIN CẬY GROUND-TRUTH

### 0.1. Xác nhận truy cập & Cơ chế inject của Tool
- Tool sử dụng cơ chế nạp trực tiếp qua `<script>` tại [`src/content/bridge/content-bridge.ts:9-12`](src/content/bridge/content-bridge.ts#L9-L12), chạy chung 100% ngữ cảnh với `window` của trang web.
- Store Zustand của Game được Tool phơi ra tại [`src/page-hook/core/engine-access.ts:252`](src/page-hook/core/engine-access.ts#L252):
  ```typescript
  (window as unknown as Record<string, unknown>).__ntg_stores = stores;
  ```
  Nhờ đó, người dùng có thể truy cập `window.__ntg_stores.main.getState()` trực tiếp trên Chrome DevTools Console.

### 0.2. Bằng chứng đối chiếu 5 con số cốt lõi từ `play.js` GỐC (chưa unminify)

| Thông số / Biểu thức | Byte Offset trong `play.js` gốc | Đoạn trích NGUYÊN VĂN từ mã nguồn gốc | Giá trị xác nhận |
| :--- | :--- | :--- | :--- |
| **Giá trứng gà `mt`** | Byte `234440 - 234550` | `;return{day:e.day+r,minutes:n-r*ct}}var dt=6e4,ft=7e4,pt=35e3,mt=15e3,ht=[4,6,9,12],gt=[\`Chòi gà\`,\`Chuồng sàn\`,\`Chuồng lớn\`,\`Trại gà\`],_t=[5e5,12e5,21e5],vt=[0,6,9,12]` | `mt = 15e3` (15.000 vàng) |
| **Thưởng Chợ Đêm `ZE`** | Byte `726380 - 726440` | `vendor:null}),!0):!1}}),YE=1080,XE=1410,ZE=1.25,QE=(e,t,n)=>lt(e,3*ct,t,n),$E=e=>e>=1080&&e<1410,eD=e=>Math.round(e/100*20)` | `ZE = 1.25` (+25% giá bán) |
| **Giờ Chợ Đêm `$E`** | Byte `726410 - 726450` | `$E=e=>e>=1080&&e<1410` | 18h00 (`1080p`) đến 23h30 (`1410p`) |
| **Bảng Helper `WM`** | Byte `814860 - 815010` | `,UM=e=>VM(HM.pitch,e,{money:L(LM)}),WM={crops:{wage:EM,name:\`Tèo\`},fishing:{wage:EM,name:\`người câu cá\`},poultry:{wage:vD,name:\`chú Ba\`},buffalo:{wage:fM,name:\`anh Tâm\`},dairy:{wage:LM,name:\`chị Mận\`}},GM=(e,t)=>(e===\`crops\`?TM(t).wage:WM[e].wage);` | Chỉ có 5 helpers, **không có `pond`** |
| **Công thức bón phân `be`** | Byte `228640 - 228740` | `function be(e,t){if(!t)return e;let n=e*.7;return Math.floor(n)+ +(Math.random()<n-Math.floor(n))}` | `n = e * .7` (Rút ngắn 30% thời gian) |

---

## 1. GROUND-TRUTH SPEC TỪ GAME (ĐỘC LẬP VỚI TOOL)

### 1.1. Hệ thống Trồng trọt & Ruộng đồng (Crops & Plots)
- **Hành vi:** Mua hạt giống, gieo vào đất đã cuốc, tưới nước mỗi ngày. Đủ số ngày `growDays` thì cây chín, thu hoạch bằng liềm hoặc tay vào kho nông sản `produce`.
- **Thông số & Công thức:**
  - Bảng định nghĩa hạt giống `I`: [Dòng 14757–14791](tools/play.formatted.js#L14757-L14791)
    - `radish` (Củ cải): Hạt `20.000đ`, Giá gốc `12.000đ`, Lớn `2 ngày`, Cấp mở `0`.
    - `carrot` (Cà rốt): Hạt `40.000đ`, Giá gốc `28.000đ`, Lớn `4 ngày`, Cấp mở `1`.
    - `corn` (Ngô): Hạt `60.000đ`, Giá gốc `50.000đ`, Lớn `6 ngày`, Cấp mở `2`.
    - `rice` (Lúa thơm): Hạt `120.000đ`, Giá gốc `90.000đ`, Lớn `8 ngày`, Cấp mở `99` (Story).
  - Phân bón `be(e, t)`: [Dòng 14798–14802](tools/play.formatted.js#L14798-L14802) giảm 30% thời gian sinh trưởng (`n = e * 0.7`).
- **Nguồn:** `tools/play.formatted.js:14757-14810`.

### 1.2. Hệ thống Chuồng gà & Trứng (Poultry Coop)
- **Hành vi:** Nuôi gà con lớn lên thành gà đẻ. Gà sống tối đa 5 ngày tuổi (`e.age <= 5` - [Dòng 15091](tools/play.formatted.js#L15091)). Mỗi ngày gà trưởng thành đẻ 1 trứng vào ổ nếu được cho ăn.
- **Thông số & Công thức:**
  - Hằng số gia cầm: [Dòng 15070–15087](tools/play.formatted.js#L15070-L15087)
    - Giá mua gà con: `dt = 60.000đ`.
    - Vaccine cúm: `ft = 70.000đ`.
    - Giá bán gà thịt: `pt = 35.000đ`.
    - **Giá bán trứng gà chuẩn:** `mt = 15.000đ`.
    - Sức chứa đàn gà theo cấp chuồng: `ht = [4, 6, 9, 12]`.
    - **Sức chứa ổ trứng tối đa:** `Et = (e) => bt(e) * 2` (Gấp đôi số gà tối đa: cấp 0 chứa 8 trứng, cấp 3 chứa 24 trứng).
- **Nguồn:** `tools/play.formatted.js:15070-15100`.

### 1.3. Hệ thống Chợ Đêm (Night Market)
- **Hành vi:** Mở khi làng thắng cuộc bỏ phiếu giữ đất (`village.marketOpen = true`).
- **Thông số & Công thức:**
  - Giờ mở cửa: `$E = (e) => e >= 1080 && e < 1410` ([Dòng 43880](tools/play.formatted.js#L43880)) — tức 18h00 đến 23h30.
  - Tỷ lệ giá thưởng: `ZE = 1.25` ([Dòng 43878](tools/play.formatted.js#L43878)) — thưởng +25%.
  - Hạn ngạch: `dP = (e) => 20 - (e.village.nightSold.day === e.day ? e.village.nightSold.n : 0)` ([Dòng 49241](tools/play.formatted.js#L49241)) — tối đa 20 món/đêm.
  - Giá bán Chợ Đêm: `uP = (e, t) => Math.round((t === 'egg' ? mt : e.prices[t]) * ZE)` ([Dòng 49240](tools/play.formatted.js#L49240)). Trứng gà bán được: `15.000 * 1.25 = 18.750đ/quả`.
- **Nguồn:** `tools/play.formatted.js:43878-43880`, `49240-49242`.

### 1.4. Hệ thống Người Giúp Việc (Helpers)
- **Hành vi:** Thuê nhân công phụ giúp các mảng nông trại, trả lương hàng ngày qua action `payHelper(n)`.
- **Danh mục game quy định `WM`:** [Dòng 47728–47734](tools/play.formatted.js#L47728-L47734)
  ```javascript
  WM = {
    crops: { wage: EM, name: `Tèo` },
    fishing: { wage: EM, name: `người câu cá` },
    poultry: { wage: vD, name: `chú Ba` },
    buffalo: { wage: fM, name: `anh Tâm` },
    dairy: { wage: LM, name: `chị Mận` },
  };
  ```
- **Ràng buộc:** Trong game **CHỈ CÓ 5 LOẠI HELPER TRÊN**, hoàn toàn không có `pond` helper.
- **Cơ chế Ao cá:** Ao cá có nhân vật phụ giúp là **Bé Bi** (`state.pond.bebi === 'helper'`), là NPC cốt truyện hỗ trợ miễn phí, không nằm trong `state.helpers` và không nhận lương.
- **Nguồn:** `tools/play.formatted.js:47728-47827, 42834, 47290`.

### 1.5. Hệ thống Đơn Hàng Làng Xóm / Dì Bảy
- **Hành vi:** Nhận đơn hàng từ bà con trong làng xóm.
- **Công thức tính thưởng:** [Dòng 43960](tools/play.formatted.js#L43960)
  ```javascript
  cD = (e) => Math.round((e === `egg` ? 6e3 : I[e].basePrice) * 1.3);
  ```
  - Nông sản: Trả `1.3 * basePrice` (+30% so với giá chợ).
  - Trứng gà: Game chủ ý thiết lập giá gốc riêng là `6.000đ`, nhân 1.3x thành **7.800đ/quả**.
  - Phần thưởng kèm theo: Tăng chỉ số hoàn thành đơn hàng `stats.orders` và điểm quan hệ làng xóm phục vụ bỏ phiếu giữ đất ([Dòng 49270](tools/play.formatted.js#L49270)).
- **Nguồn:** `tools/play.formatted.js:43960, 49390`.

### 1.6. Toàn bộ 11 vị trí gán `screen` và hàm `_K()` trong Game

| # | File:Line | Đoạn mã gán `screen` | Gọi `_K()` ngay trước? | Chi tiết & Nguồn gọi |
| :-: | :--- | :--- | :---: | :--- |
| **1** | [Dòng 48022](tools/play.formatted.js#L48022) | `screen: 'title'` | **Không** | State khởi tạo ban đầu trong `initialState` của store `J`. |
| **2** | [Dòng 48058](tools/play.formatted.js#L48058) | `backToTitle: () => e({ ...aN, screen: 'title' })` | **CÓ** | Được gọi tại hàm `iJ()` ([Dòng 144638](tools/play.formatted.js#L144638)): `(e === 'playing' || ... ) && (await _K()), J.getState().backToTitle()`. |
| **3** | [Dòng 48059](tools/play.formatted.js#L48059) | `showWorldMap: () => e({ ...aN, screen: 'worldmap' })` | **CÓ** | Được gọi tại `Qq()` ([Dòng 144613](tools/play.formatted.js#L144613)): `screen === 'playing' && (await _K()), showWorldMap()`; tại `$q()` ([Dòng 144617](tools/play.formatted.js#L144617)): `await _K(), showWorldMap()`. |
| **4** | [Dòng 48062](tools/play.formatted.js#L48062) | `enterFarm: () => e({ screen: 'playing', ... })` | **Không** | Nút chọn Nông trại trên Bản đồ thế giới WorldMap ([Dòng 171829](tools/play.formatted.js#L171829)). (Đã được `_K()` lưu trước khi mở WorldMap). |
| **5** | [Dòng 51481](tools/play.formatted.js#L51481) | `goToFarmstay: () => e({ screen: 'farmstay', ... })` | **CÓ** | Được gọi tại [Dòng 142457](tools/play.formatted.js#L142457): `(_K(), J.getState().goToFarmstay())`. |
| **6** | [Dòng 51492](tools/play.formatted.js#L51492) | `leaveFarmstay: () => e({ screen: 'playing', ... })` | **Không** | Rời Farmstay về lại Nông trại tại [Dòng 152832](tools/play.formatted.js#L152832) trong hàm `departure()`. |
| **7** | [Dòng 53233](tools/play.formatted.js#L53233) | `goToCity: () => { ... screen: 'city' }` | **CÓ** | Được gọi tại [Dòng 171826](tools/play.formatted.js#L171826): `J.getState().goToCity() === 'ok' ? _K() : p(null)`. |
| **8** | [Dòng 54314](tools/play.formatted.js#L54314) | `goToFair: () => { ... screen: 'fair' }` | **Không** | Đi xe lam sang Hội chợ Xóm Vui ([Dòng 137694](tools/play.formatted.js#L137694)). |
| **9** | [Dòng 54324](tools/play.formatted.js#L54324) | `rideHomeFromFair: () => e({ screen: 'playing', ... })` | **CÓ** | Được gọi tại [Dòng 144629](tools/play.formatted.js#L144629): `(J.getState().rideHomeFromFair(), await _K())`. |
| **10**| [Dòng 55862](tools/play.formatted.js#L55862) | `goToSea: () => { ... screen: 'sea' }` | **CÓ** | Được gọi tại [Dòng 142585](tools/play.formatted.js#L142585) & [Dòng 171830](tools/play.formatted.js#L171830): `J.getState().goToSea() === 'ok' ? _K() : p(null)`. |
| **11**| [Dòng 144620](tools/play.formatted.js#L144620) | `(await _K(), J.setState({ screen: 'benDo', panel: null }))` | **CÓ** | Hàm `eJ()` chuyển sang Bến Đò, **gọi trực tiếp `await _K()`**. |

---

## 2. BẢNG ĐỐI CHIẾU TOÀN DIỆN (24/24 CHỨC NĂNG)

| # | Chức năng Tool | Game Spec (File:Line) | Tool làm gì (File:Line) | Đánh giá | Mức độ | Ghi chú & Phân tích kỹ thuật |
| :-: | :--- | :--- | :--- | :---: | :---: | :--- |
| **1** | Hook Phaser Game | `tools/play.formatted.js:143522` | `src/page-hook/core/engine-access.ts:113` | **ĐÚNG** | - | Can thiệp `Array.prototype.push` bắt đối tượng `sys.game`. Chạy ổn định trong môi trường hiện tại. |
| **2** | Quét Zustand Stores | `tools/play.formatted.js:46000, 146707, 147736` | `src/page-hook/core/engine-access.ts:165` | **ĐÚNG** | - | Quét cây Fiber React 19 từ `#root`, nhận diện chính xác 4 stores (`main`, `sea`, `benUI`, `benNet`) qua thuộc tính đặc trưng. |
| **3** | Bắt WebSocket Bến Đò | `tools/play.formatted.js:147682` (`NY = '/ws/ben-do'`) | `src/page-hook/core/engine-access.ts:77` | **ĐÚNG** | - | Intercept `WebSocket.prototype.send` bắt URL chứa `/ws/ben-do`. Khớp chuẩn endpoint game. |
| **4** | Điều hướng Scene | `tools/play.formatted.js:144620, 143000` | `src/page-hook/index.ts:32-77` | **LỆCH CHIỀU ĐI** | **MEDIUM** | Chiều rời Nông trại (`playing -> benDo/farmstay`): Tool gán `setState({ screen })` bỏ qua `_K()`. Gây nguy cơ mất dữ liệu (Rollback) nếu đóng tab tại Bến Đò/Farmstay do auto-save bị ngủ. |
| **5** | Tự động Chăm Ruộng | `tools/play.formatted.js:47470-47650` | `src/page-hook/modules/farm/crops.ts:75` | **ĐÚNG** | - | Quét `m.plots`, kiểm tra `watered`, gọi `applyTool(tile, 'wateringCan', true)` và `applyTool(tile, 'hand', true)` chuẩn xác. |
| **6** | Tự động Chăm Pet | `tools/play.formatted.js:50800-50900` | `src/page-hook/modules/farm/animals.ts:29` | **ĐÚNG** | - | Giới hạn chuẩn 3 lần vuốt ve/ngày (`cuddles < 3`), cho ăn theo khẩu vị `PET_DIETS`, dắt đi dạo 1 lần/ngày. |
| **7** | Tự động Trâu (Anh Tâm) | `tools/play.formatted.js:47850-47870` | `src/page-hook/modules/farm/animals.ts:126` | **ĐÚNG** | - | Cho ăn, tắm trâu, cho thuê cày khi `mood >= 50`, trả lương chuẩn cho `buffalo` (`anh Tâm`). |
| **8** | Tự động Bò (Chị Mận) | `tools/play.formatted.js:49720-49880` | `src/page-hook/modules/farm/animals.ts:167` | **ĐÚNG** | - | Nhận diện bò ốm `sickDay > 0`, mua thuốc khi hết, tiêm thuốc và bán sữa `sellMilk`. |
| **9** | Thu hoạch trứng & mua gà | `tools/play.formatted.js:15070-15085` | `src/page-hook/modules/farm/animals.ts:212` | **ĐÚNG** | - | Khớp mảng sức chứa `[4, 6, 9, 12]`, nhặt trứng trong ổ `nestEggs`, trả lương đúng cho `poultry` (`chú Ba`). |
| **10**| Trả lương helper Ao cá | `tools/play.formatted.js:47728-47734` | `src/page-hook/modules/farm/animals.ts:291` | **DEAD CODE** | **LOW** | Game không có helper `pond`. Điều kiện `stH.helpers?.pond?.hired` luôn falsy nên lệnh không bao giờ chạy trong thực tế. |
| **11**| Nuôi & Kéo lưới Cá Ao | `tools/play.formatted.js:42809, 47900-47950` | `src/page-hook/modules/farm/animals.ts:250-288` | **ĐÚNG** | - | Kéo lưới đúng ngày (`ro: 3, tre: 5, chep: 7`), giới hạn ao 12 con, không cho ăn khi Bé Bi đang chăm hộ. |
| **12**| Bán hàng Chợ Đêm (Giờ & Quota)| `tools/play.formatted.js:43880, 49241` | `src/page-hook/modules/farm/night-market.ts:17, 21` | **ĐÚNG** | - | Khung giờ 18h00 - 23h30 (`1080 - 1410p`), quota 20 món/đêm khớp hoàn toàn với code game. |
| **13**| Định giá trứng Chợ Đêm | `tools/play.formatted.js:15073, 49240` | `src/page-hook/modules/farm/night-market.ts:74` | **SAI** | **HIGH** | Game quy định trứng bán Chợ Đêm được `15.000 * 1.25 = 18.750đ`. Tool hardcode `3000đ`, làm sai lệch thuật toán bán món giá cao nhất. |
| **14**| Đơn hàng Dì Bảy (Trứng gà) | `tools/play.formatted.js:43960, 49390` | `src/page-hook/modules/farm/market.ts:18` | **GAME DESIGN** | **INFO** | Game chủ ý định giá đơn trứng là 7.800đ (đổi lợi nhuận lấy quan hệ làng xóm). Tool làm đúng spec game nhưng kém tối ưu vàng. |
| **15**| Mở quầy tiết kiệm Dì Bảy | `tools/play.formatted.js:55314` | `src/page-hook/modules/farm/tasks.ts:15` | **CODE SMELL** | **LOW** | Gán trực tiếp `savings.newsDay` bypass sự kiện loa phát thanh `savingsOpen`. Không gây crash hay hỏng state. |
| **16**| Nhận thưởng Sổ tay & Heo đất | `tools/play.formatted.js:55644` | `src/page-hook/modules/farm/tasks.ts:70-98` | **ĐÚNG** | - | Gọi đúng `claimDaily`, `claimGoal`, đập heo khi đủ chuỗi 7 ngày (`streak >= 7`). |
| **17**| Canh Úp Dế Đêm | `tools/play.formatted.js:147763` | `src/page-hook/modules/wharf/cricket-watchers.ts:121` | **ĐÚNG** | - | Bỏ qua nhún giả (`window < 150ms`), bù trừ độ trễ RTT theo nhịp hạ cánh của dế chuẩn xác. |
| **18**| Tự Khều Râu Dế | `tools/play.formatted.js:147755` | `src/page-hook/modules/wharf/cricket-watchers.ts:182` | **ĐÚNG** | - | Bắt đúng chu kỳ va chạm `1600ms`, gửi gói tin WS `{ t: 'tickle' }` khi dế chùn hoặc chuẩn bị giáp chiến. |
| **19**| Đặt Cược Sới Dế | `tools/play.formatted.js:147755` | `src/page-hook/modules/wharf/cricket-watchers.ts:223` | **ĐÚNG** | - | Giới hạn 20 cược/ngày, kiểm tra số dư vỏ sò trước khi gửi lệnh `{ t: 'bet' }`. |
| **20**| Tự Câu Cá Bến Đò | `tools/play.formatted.js:148080-148199, 174042` | `src/content/scheduler/wharf-runner.ts:314-380` | **ĐÚNG** | - | Khớp chuẩn selector DOM `button.ben-cast`, `span.ben-bobber.bite` và state mạng `bn.fishing`. |
| **21**| Minigame Câu Cá Biển | `tools/play.formatted.js:147086, 172466` (`G8`) | `src/content/scheduler/sea-runner.ts:32`, `minigame.ts:7` | **ĐÚNG** | - | Ghìm cần ngược hướng cá bơi (`pullDir = runDir === 'left' ? 'right' : 'left'`) khớp đúng cơ chế class `G8`. |
| **22**| Vận hành & Sửa tiện ích Farmstay| `tools/play.formatted.js:51570, 51711` | `src/page-hook/modules/farmstay/index.ts:56-110` | **ĐÚNG** | - | Gọi `setFarmstayOpen`, `payFarmstayStaff`, sửa chữa tiện ích hỏng `repairFarmstay` giữ danh tiếng sao. |
| **23**| Vườn rau hữu cơ 24 luống | `tools/play.formatted.js:44673, 51579-51710` | `src/page-hook/modules/farmstay/index.ts:141-205` | **ĐÚNG** | - | Kiểm tra luống khô (`readyAt === null`) mới tưới, bón phân giảm 50% thời gian, thu hoạch vào `pantry`. |
| **24**| Nhân viên & Tâm tư Farmstay | `tools/play.formatted.js:51711-51735` | `src/page-hook/modules/farmstay/index.ts:210-241` | **ĐÚNG** | - | Trò chuyện 5 nhân sự tăng thân thiết (`bond < 10`), tự động giải quyết các sự kiện tâm sự `answerStory`. |

---

## 3. CHI TIẾT CÁC BUG & VẤN ĐỀ ĐÃ ĐIỀU CHỈNH MỨC ĐỘ

### 🟠 VẤN ĐỀ 1 [HIGH]: Hardcode sai giá trứng Chợ Đêm làm hỏng chiến lược bán hàng
- **Vị trí trong Tool:** [`src/page-hook/modules/farm/night-market.ts:74`](src/page-hook/modules/farm/night-market.ts#L74)
  ```typescript
  candidates.push({ id: 'egg', surplus: eggSurplus, price: 3000, isEgg: true });
  ```
- **Vị trí trong Code Game:** [`tools/play.formatted.js:15073, 49240`](tools/play.formatted.js#L15073)
  ```javascript
  mt = 15e3; // Giá trứng gốc = 15.000 vàng
  uP = (e, t) => Math.round((t === `egg` ? mt : e.prices[t]) * ZE); // ZE = 1.25 -> 18.750 vàng
  ```
- **Hệ quả thực tế:** Khi người chơi bật tùy chọn bán nông sản giá cao nhất (`highest_price`), trứng gà (món có giá 18.750đ) bị định giá nhầm thành 3.000đ nên luôn bị xếp chót, khiến bot bán các loại rau củ rẻ tiền trước và lãng phí 20 lượt hạn ngạch mỗi đêm.

---

### 🟡 VẤN ĐỀ 2 [MEDIUM]: Đổi Scene trực tiếp bằng `setState` gây rủi ro mất dữ liệu (Rollback)
- **Vị trí trong Tool:** [`src/page-hook/index.ts:42, 66, 74`](src/page-hook/index.ts#L42)
  ```typescript
  mainStore.setState({ screen: 'benDo', panel: null, shop: null, vendor: null, indoors: false });
  ```
- **Vị trí trong Code Game:** [`tools/play.formatted.js:144620, 142457, 143000–143015`](tools/play.formatted.js#L144620)
  ```javascript
  // Bến Đò:
  (await _K(), J.setState({ screen: `benDo`, panel: null }));
  // Farmstay:
  (_K(), J.getState().goToFarmstay());
  ```
- **Bản chất thực tế (Kết quả lẫn lộn - Mixed):**
  - **Chiều rời Nông trại (`playing -> benDo/farmstay`): TOOL TỆ HƠN GAME RÕ RỆT (BUG THẬT).** Game luôn gọi `_K()` để lưu dữ liệu xuống IndexedDB trước khi rời ruộng. Tool gán trực tiếp `screen` bỏ qua `_K()`. Vì sang Bến Đò/Farmstay thì timer auto-save 10s bị đóng băng, nên nếu tab bị đóng hoặc crash tại Bến Đò, toàn bộ tiến trình kiếm tiền/thu hoạch tại Nông trại trước đó sẽ bị mất (Rollback).
  - **Chiều quay về Nông trại (`benDo/farmstay -> playing`): TOOL NGANG BẰNG GAME.** Game gốc cũng không gọi `_K()` khi về, vì ngay khi chạm vào `screen = 'playing'`, Scene nông trại thức giấc và auto-save 10s sẽ tự động tiếp quản.
- **Phương án khắc phục:** Trước khi gán `setState({ screen: target })` để rời nông trại, kích hoạt `window.dispatchEvent(new Event('pagehide'))` để buộc listener của game tại [dòng 143010](tools/play.formatted.js#L143010) kích hoạt `_K()` lưu game ngay lập tức.

---

### ⚪ VẤN ĐỀ 3 [LOW / CODE SMELL]: Đột biến trực tiếp `savings.newsDay` bypass thông báo loa phát thanh
- **Vị trí trong Tool:** [`src/page-hook/modules/farm/tasks.ts:14-16`](src/page-hook/modules/farm/tasks.ts#L14-L16)
  ```typescript
  if ((st.savings.pig?.amount || 0) > 0 || (st.day || 0) >= 14) {
    setMainState((e) => ({ savings: { ...e.savings, newsDay: Math.max(1, e.day || 1) } }));
  }
  ```
- **Vị trí trong Code Game:** [`tools/play.formatted.js:55300–55320`](tools/play.formatted.js#L55300-L55320)
- **Hệ quả thực tế:** Việc gán giá trị làm bỏ qua hộp thoại thông báo mở quầy tiết kiệm (`announcement: savingsOpen`). Không gây hỏng cấu trúc dữ liệu hay treo game.

---

### ⚪ VẤN ĐỀ 4 [LOW / DEAD CODE]: Đoạn code trả lương `helpers.pond` không bao giờ chạy
- **Vị trí trong Tool:** [`src/page-hook/modules/farm/animals.ts:291`](src/page-hook/modules/farm/animals.ts#L291)
  ```typescript
  if (cfg.pondAutoPayHelper !== false && stH.helpers?.pond?.hired && (stH.helpers.pond.unpaid || 0) > 0 && stH.payHelper?.('pond') === true)
  ```
- **Vị trí trong Code Game:** [`tools/play.formatted.js:47728-47734, 46047`](tools/play.formatted.js#L47728-L47734)
- **Hệ quả thực tế:** Khởi đầu game `helpers: {}`. Mọi lệnh `hireHelper` chỉ gán cho `crops`, `poultry`, `buffalo`, `dairy`. Game không bao giờ tạo khóa `helpers.pond`. Do đó `stH.helpers?.pond?.hired` luôn là `undefined`, khối lệnh `payHelper('pond')` là code chết (dead code), không thể kích hoạt gây crash trong điều kiện chơi thực tế. Đề xuất xóa bỏ để làm sạch mã nguồn.

---

### 💡 GHI CHÚ THIẾT KẾ: Đơn hàng Dì Bảy (Trứng gà 7.800đ)
- **Vị trí trong Code Game:** [`tools/play.formatted.js:43960`](tools/play.formatted.js#L43960) (`cD = 6.000 * 1.3 = 7.800đ`).
- **Bản chất:** Đây là thiết kế chủ ý của nhà làm game (hy sinh lợi nhuận vàng để lấy điểm nhiệm vụ làng xóm). Tool hành xử hoàn toàn đúng spec game. Đề xuất bổ sung tùy chọn trên giao diện: *"Không bán trứng cho Dì Bảy"* để người chơi tự quyết định mục tiêu kinh tế.

---

## 4. HƯỚNG DẪN XÁC MINH RUNTIME QUA DEVTOOLS

### 4.1. Xác minh `helpers.pond` không tồn tại
1. Mở trang game `https://nongtraigenz.online/play/` (khi extension đang bật).
2. Bấm `F12` -> tab **Console** -> chọn context **top**.
3. Gõ lệnh:
   ```javascript
   window.__ntg_stores.main.getState().helpers
   ```
- **Kỳ vọng thấy:** Object chỉ chứa tối đa 4 keys nhân sự đã thuê (`crops`, `poultry`, `buffalo`, `dairy`), hoàn toàn **không có key `pond`**.
- **Nếu thấy khác:** Game có bản cập nhật mới bổ sung `helpers.pond`.

### 4.2. Xác minh giá trứng 18.750đ tại Chợ Đêm
1. Vào khung giờ Chợ Đêm (18h00 – 23h30), chuẩn bị 1 quả trứng trong kho.
2. Tại Console, kiểm tra:
   ```javascript
   const before = window.__ntg_stores.main.getState().gold;
   window.__ntg_stores.main.getState().sellNight('egg');
   const after = window.__ntg_stores.main.getState().gold;
   console.log("Số tiền nhận được:", after - before);
   ```
- **Kỳ vọng thấy:** Console in ra đúng **`18750`**. Đồng thời mảng `ledger` ghi nhận: `+18.750`.
- **Nếu thấy khác:** Nếu ra 3.000đ thì tool đúng; nếu ra 18.750đ thì khẳng định tool đang hardcode sai.

### 4.3. Xác minh Auto-save `_K()` bị dừng khi ở Bến Đò / Farmstay
1. Tab **Sources** -> `Ctrl + Shift + F` -> tìm chuỗi `async function _K() {` ([Dòng 141981](tools/play.formatted.js#L141981)).
2. Đặt breakpoint tại dòng `let e = gK();`.
3. Đứng yên ở Nông trại (`screen === 'playing'`): Cứ đúng **10 giây một lần**, breakpoint tự động dừng (do timer `VK` tại dòng 143007).
4. Bấm `F8` cho chạy tiếp, sau đó chuyển sang Bến Đò hoặc Farmstay. Đứng yên 30 giây.
- **Kỳ vọng thấy:** Breakpoint **hoàn toàn KHÔNG dừng lại nữa**, chứng minh timer auto-save 10s bị đóng băng khi Scene nông trại ngủ.

---

## 5. BẢNG MAGIC NUMBERS & COUPLING

| Thông số / Đối tượng | Giá trị trong Tool (File:Line) | Giá trị Ground-Truth trong Game (File:Line) | Đánh giá sai lệch |
| :--- | :--- | :--- | :--- |
| **Giá trứng gà Chợ Đêm** | `3000`<br>([`night-market.ts:74`](src/page-hook/modules/farm/night-market.ts#L74)) | `15000 * 1.25 = 18750`<br>([`play.formatted.js:15073, 49240`](tools/play.formatted.js#L15073)) | **Lệch 6.25 lần** (Trầm trọng) |
| **Giá mua gà con** | `60000`<br>([`animals.ts:226`](src/page-hook/modules/farm/animals.ts#L226)) | `dt = 60000`<br>([`play.formatted.js:15070`](tools/play.formatted.js#L15070)) | Khớp chính xác |
| **Giá thuốc chữa bò** | `80000`<br>([`animals.ts:179`](src/page-hook/modules/farm/animals.ts#L179)) | `80000`<br>([`play.formatted.js:49819`](tools/play.formatted.js#L49819)) | Khớp chính xác |
| **Giờ mở Chợ Đêm** | `1080 - 1410` (18h00 - 23h30)<br>([`night-market.ts:17`](src/page-hook/modules/farm/night-market.ts#L17)) | `e >= 1080 && e < 1410`<br>([`play.formatted.js:43880`](tools/play.formatted.js#L43880)) | Khớp chính xác |
| **Hạn ngạch Chợ Đêm** | `20`<br>([`night-market.ts:21`](src/page-hook/modules/farm/night-market.ts#L21)) | `20 - soldToday`<br>([`play.formatted.js:49241`](tools/play.formatted.js#L49241)) | Khớp chính xác |
| **Giá hạt rau muống FS** | `5000`<br>([`farmstay/index.ts:8`](src/page-hook/modules/farmstay/index.ts#L8)) | `kO.rauMuong.seed = 5000`<br>([`play.formatted.js:44674`](tools/play.formatted.js#L44674)) | Khớp chính xác |
| **Thời gian dế nhún giả** | `150ms`<br>([`cricket-watchers.ts:15`](src/page-hook/modules/wharf/cricket-watchers.ts#L15)) | `hop.window < 150`<br>(Server protocol rule) | Khớp logic mạng |

---

## 6. RỦI RO EXTENSION + ENGINE PHASER & CƠ CHẾ LƯU DỮ LIỆU ĐA SCENE

### 6.1. Cơ chế lưu trữ dữ liệu tại Bến Đò (`benDo`)
- Dữ liệu Bến Đò (vỏ sò `wallet`, giỏ cá `basket`, bộ sưu tập `dex`, đổi tiền ATM `atmCash`) là **100% Server-Authoritative** qua WebSocket `/ws/ben-do` ([Line 147754](tools/play.formatted.js#L147754)).
- Mỗi thao tác câu cá, bán cá Vựa Anh Tư, đổi ATM đều gửi trực tiếp message WebSocket (`YY(e)`). Server ghi nhận vào database máy chủ tức thì.
- Bến Đò hoàn toàn KHÔNG gọi và KHÔNG phụ thuộc vào hàm lưu local `_K()`. **Tắt tab khi đang ở Bến Đò KHÔNG làm mất bất kỳ tiến trình nào của Bến Đò.**

### 6.2. Cơ chế lưu trữ dữ liệu tại Farmstay (`farmstay`)
- Dữ liệu Farmstay nằm trong Zustand store chính: `J.getState().farmstay` ([Line 51285](tools/play.formatted.js#L51285)), thuộc tập key `hK` được lưu bởi `_K()` ([Line 141975](tools/play.formatted.js#L141975)).
- **Bug nội tại của game gốc:** `FarmstayScene.create()` có gọi `VK(this)` ([Line 151576](tools/play.formatted.js#L151576)), nhưng guard check của `VK` ([Line 143004](tools/play.formatted.js#L143004)) chỉ cho phép `(e === 'playing' || e === 'city' || e === 'fair')` chạy `_K()`. Vì `screen === 'farmstay'`, timer auto-save 10s bị bỏ qua hoàn toàn ở Farmstay!
- Dữ liệu Farmstay chỉ được lưu xuống IndexedDB khi người chơi quay về Farm qua `leaveFarmstay()` ([Line 51489](tools/play.formatted.js#L51489)) hoặc bấm về Title qua `iJ()` ([Line 144638](tools/play.formatted.js#L144638)). Nếu tắt tab đột ngột giữa lúc ở Farmstay, dữ liệu Farmstay sẽ bị mất (đây là hạn chế của game gốc).
- **Giải pháp của Tool (Commit B):** Sau khi hoàn thành các tác vụ Farmstay, tool tự động gọi `J.getState().leaveFarmstay()` để đưa `screen` về `'playing'`, kích hoạt lại vòng lặp lưu dữ liệu của Farm.

### 6.3. Đánh giá rủi ro Rollback dữ liệu khi Tool đổi Scene
- Khi ở Nông trại (`playing`), vòng lặp `VK(this)` tự động lưu dữ liệu đều đặn mỗi **10 giây** ([Line 143000](tools/play.formatted.js#L143000): `BK = 1e4`).
- Mọi thao tác gieo hạt, thu hoạch, chăm thú đều đã được IndexedDB lưu tự động. Khoảng thời gian rủi ro duy nhất là 0–10 giây cuối cùng nếu người dùng tắt tab ngay lập tức sau khi tool đổi cảnh.
- Tool đã bổ sung warning log nhắc nhở người dùng chờ 10s trước khi đóng tab nếu vừa đổi scene.

---

## 7. BẢNG TỔNG HỢP KẾT QUẢ TRIỂN KHAI 3 COMMIT FIX

| Commit | Hash | Hạng mục Fix | Mức độ | File đã sửa | Trạng thái |
| :---: | :---: | :--- | :---: | :--- | :---: |
| **Commit A** | `33f0b14` | **Fix A1:** Cập nhật giá trứng Chợ Đêm lên 18.750đ (`15.000 * 1.25`)<br>**Fix A2:** Xóa dead code `helpers.pond`, đánh dấu `@deprecated` | P0<br><br>P1 | `src/page-hook/modules/farm/night-market.ts`<br>`src/page-hook/modules/farm/animals.ts`<br>`src/shared/types/config.ts` | **ĐÃ HOÀN TẤT** |
| **Commit B** | `925b3c6` | **Fix B1:** Tự động gọi `leaveFarmstay()` khi hoàn tất chu kỳ có phát sinh hành động để kích hoạt auto-save `_K()` | P1 | `src/page-hook/modules/farmstay/index.ts` | **ĐÃ HOÀN TẤT** |
| **Commit C** | `0406194` | **Fix C1:** Thêm warning log 10s khi đổi scene từ Nông trại<br>**Fix C2:** Sửa nhãn "anh Tám" → "anh Tâm chăn trâu"<br>**Fix C3:** Checkbox "Giữ trứng cho Chợ Đêm (không giao Dì Bảy)" | P2<br><br>P2<br><br>P2 | `src/page-hook/index.ts`<br>`src/page-hook/modules/farm/animals.ts`<br>`src/content/ui/components/FarmTabContent.tsx`<br>`src/page-hook/modules/farm/market.ts`<br>`src/shared/constants/default-config.ts`<br>`src/shared/types/config.ts` | **ĐÃ HOÀN TẤT** |

---

## 8. HƯỚNG DẪN TEST VERIFY RUNTIME CHO NGƯỜI DÙNG

### 8.1. Test Commit A
- **Test A1 (Giá trứng Chợ Đêm):**
  1. Chờ tới giờ Chợ Đêm (18h00 - 23h30 game time), vào Chợ Đêm bán thử 1 trứng gà bằng tay.
  2. Quan sát số vàng tăng lên: đúng **+18.750đ** (thay vì 3.000đ như tool cũ).
  3. Bật tùy chọn `highest_price` trong Chợ Đêm: Tool sẽ ưu tiên chọn bán trứng gà trước các loại nông sản có giá thấp hơn.
- **Test A2 (Xóa dead code Ao cá):**
  1. Chạy tool 10-15 phút tại Nông trại, bật tính năng Ao cá.
  2. Mở DevTools Console (`F12`), xác nhận không có bất kỳ ngoại lệ nào phát sinh.

### 8.2. Test Commit B (Thoát Farmstay an toàn)
- **Test B1.1 & B1.2 (Lưu tiến trình Farmstay):**
  1. Trồng rau trong Farmstay, đợi rau chín.
  2. Bật tool auto Farmstay để tool thu hoạch rau.
  3. Sau khi thu hoạch xong, quan sát tool tự động đưa nhân vật quay về màn hình Nông trại chính (`screen = 'playing'`).
  4. Bấm `F5` tải lại trang ngay lập tức: Kiểm tra số vàng và kho rau muống trong Farmstay vẫn giữ nguyên giá trị mới, không bị rollback.
- **Test B1.3 (Lưu tiến trình cả Nông trại và Farmstay):**
  1. Ở Nông trại, gieo vài luống lúa.
  2. Để tool chuyển sang Farmstay xử lý công việc và quay về Farm.
  3. Đợi 10 giây cho timer `VK` chạy, bấm `F5`: Cả lúa ở Nông trại và rau ở Farmstay đều được lưu đầy đủ.

### 8.3. Test Commit C (Cosmetic & Config)
- **Test C1 (Warning log khi đổi Scene):**
  1. Mở DevTools Console (`F12`).
  2. Dùng tool điều khiển chuyển cảnh từ Nông trại ra Bến Đò hoặc Farmstay.
  3. Kiểm tra Console hiển thị dòng warning màu vàng:
     `[NTG Tool] Đổi scene từ Nông trại. Game có thể rollback 0-10s dữ liệu nếu bạn đóng tab ngay lập tức...`
- **Test C2 (Nhãn Anh Tâm):**
  1. Mở giao diện HUD của tool, vào tab Nông trại → Chuồng Trâu.
  2. Kiểm tra dòng text hiển thị: *"💸 Tự trả lương Anh Tâm chăn trâu"*.
- **Test C3 (Giữ trứng cho Chợ Đêm):**
  1. Đợi khi tiệm Tạp hóa Chị Na xuất hiện đơn hàng cần Trứng gà.
  2. Bật checkbox *"🥚 Giữ trứng cho Chợ Đêm (không giao Dì Bảy)"*: Tool bỏ qua đơn hàng, giữ lại trứng trong kho.
  3. Tắt checkbox: Tool tự động giao đơn hàng trứng cho tiệm tạp hóa.
