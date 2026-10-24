export function getWharfTabHtml(): string {
  return `
    <div class="area-enable-banner" id="bannerArea_benDo">
      <span>🛶 Cho phép chạy Khu vực Bến Đò</span>
      <input type="checkbox" id="chkArea_benDo">
    </div>

    <div class="sub-card">
      <div class="sub-card-head" style="cursor:default;">
        <div class="sub-card-head-left">🎣 Vị Trí &amp; Thao Tác Câu Bến Đò</div>
      </div>
      <div class="sub-card-body">
        <div class="hint-note">
          ✨ Tự nhận diện phao chìm hẳn mới giật và tự ghìm cần ngược hướng cá chạy.
        </div>
        <label class="opt-row">
          <span>📍 Tự đi bộ ra vị trí ngồi câu</span>
          <input type="checkbox" data-key="benAutoSpot">
        </label>
        <div class="opt-sub" data-show-if="benAutoSpot">
          <div class="opt-row">
            <span>Vị trí ngồi câu:</span>
            <select data-key="benSpot">
              <option value="dock">🌉 Cầu tàu chính</option>
              <option value="bamboo">🎋 Cầu tre</option>
              <option value="bank">🌿 Bờ sông</option>
            </select>
          </div>
        </div>

        <label class="opt-row">
          <span>⭐ Tự bấm Giữ lại cá Lạ / Cầu vồng / Thần thoại</span>
          <input type="checkbox" data-key="benAutoKeepRare">
        </label>
      </div>
    </div>

    <div class="sub-card">
      <div class="sub-card-head" style="cursor:default;">
        <div class="sub-card-head-left">🪱 Mồi Câu, Bán Cá &amp; Hồi Sức Bến Đò</div>
      </div>
      <div class="sub-card-body">
        <label class="opt-row">
          <span>🪱 Tự đi mua mồi Chú Đực khi hết mồi</span>
          <input type="checkbox" data-key="benAutoBuyBait">
        </label>
        <div class="opt-sub" data-show-if="benAutoBuyBait">
          <div class="opt-row">
            <span>Loại mồi ưu tiên:</span>
            <select data-key="benPreferBait">
              <option value="moi60">🪱 Thau 60 mồi (40 vỏ sò)</option>
              <option value="moi150">🪱 Thùng 150 mồi (90 vỏ sò)</option>
              <option value="moi20">🪱 Hộp 20 mồi (15 vỏ sò)</option>
              <option value="xinMoi">🤲 Xin 10 mồi miễn phí</option>
            </select>
          </div>
        </div>

        <label class="opt-row">
          <span>🐟 Tự đi bán cá tại Vựa Anh Tư</span>
          <input type="checkbox" data-key="benAutoSell">
        </label>
        <div class="opt-sub" data-show-if="benAutoSell">
          <div class="opt-row">
            <span>Bán khi giỏ cá đạt (con):</span>
            <input type="number" data-key="benSellThreshold" min="1" max="60" step="1">
          </div>
        </div>

        <label class="opt-row">
          <span>🍱 Tự ăn hồi Sức câu (⚡) khi đuối sức</span>
          <input type="checkbox" data-key="benAutoRecoverStamina">
        </label>
        <div class="opt-sub" data-show-if="benAutoRecoverStamina">
          <div class="opt-row">
            <span>Hồi khi Sức (⚡) dưới:</span>
            <input type="number" data-key="benStaminaThreshold" min="5" max="80" step="5">
          </div>
          <div class="opt-row">
            <span>Món ăn tại Quán Dì Tám:</span>
            <select data-key="benPreferFood">
              <option value="comTam">🍛 Cơm tấm (+60⚡ · 28🐚)</option>
              <option value="lauMam">🍲 Lẩu cá linh (+100⚡ · 45🐚)</option>
              <option value="huTieu">🍜 Hủ tiếu (+40⚡ · 20🐚)</option>
              <option value="chaoCa">🥣 Cháo cá lóc (+28⚡ · 14🐚)</option>
              <option value="banhMi">🥖 Bánh mì (+20⚡ · 10🐚)</option>
            </select>
          </div>
        </div>

        <label class="opt-row">
          <span>💆 Tóc gội Út Mười: Gội đầu massage (+50⚡ · 25🐚)</span>
          <input type="checkbox" data-key="benAutoGoiDau">
        </label>

        <label class="opt-row">
          <span>🍀 Xe trà đá Chị Thơm: Uống nước tăng May mắn</span>
          <input type="checkbox" data-key="benAutoLuckDrink">
        </label>
        <div class="opt-sub" data-show-if="benAutoLuckDrink">
          <div class="opt-row">
            <span>Loại nước uống Chị Thơm:</span>
            <select data-key="benPreferDrink">
              <option value="nuocMia">🥤 Nước mía (+1 May mắn · 15🐚)</option>
              <option value="rauMa">🥬 Nước rau má (+2 May mắn · 30🐚)</option>
              <option value="caPhe">☕ Cà phê đen (+2 May mắn · 35🐚)</option>
              <option value="duaTuoi">🥥 Dừa tươi Bến Tre (+3 May mắn · 80🐚)</option>
              <option value="traDa">🧊 Trà đá (+8⚡ · 3🐚)</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <div class="sub-card">
      <div class="sub-card-head" style="cursor:default;">
        <div class="sub-card-head-left">🏮 Giải Trí &amp; Tiện Ích Bến Đò</div>
      </div>
      <div class="sub-card-body">
        <label class="opt-row">
          <span>🏮 Sạp lồng đèn Cô Bảy: Tự quay khi có vé</span>
          <input type="checkbox" data-key="benAutoLantern">
        </label>
        <div class="opt-sub" data-show-if="benAutoLantern">
          <label class="opt-row">
            <span>🎟️ Tự mua thêm vé quay Cô Bảy (600🐚/vé)</span>
            <input type="checkbox" data-key="benBuyLanternTicket">
          </label>
        </div>

        <label class="opt-row">
          <span>🎟️ Đại lý vé số Bến Đò: Tự đổi thưởng khi trúng</span>
          <input type="checkbox" data-key="benAutoLotto">
        </label>
        <div class="opt-sub" data-show-if="benAutoLotto">
          <label class="opt-row">
            <span>🍀 Mua 1 vé số cầu may mỗi ngày (10🐚)</span>
            <input type="checkbox" data-key="benAutoBuyLotto">
          </label>
        </div>

        <label class="opt-row">
          <span>🏧 Cây ATM Bến Đò: Tự đổi vỏ sò ra tiền mặt</span>
          <input type="checkbox" data-key="benAutoAtm">
        </label>
        <div class="opt-sub" data-show-if="benAutoAtm">
          <div class="opt-row">
            <span>Đổi khi vỏ sò &gt;=:</span>
            <input type="number" data-key="benAtmThreshold" min="100" max="5000" step="50">
          </div>
        </div>
      </div>
    </div>
  `;
}
