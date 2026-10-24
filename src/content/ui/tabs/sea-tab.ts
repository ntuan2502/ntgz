/**
 * Tab Biển (Sea) UI
 */

export function getSeaTabHtml(): string {
  return `
    <div class="tab-pane" id="pane-sea">
      <div class="area-enable-banner" id="bannerArea_sea">
        <span>🏖️ Cho phép chạy Khu vực Biển</span>
        <input type="checkbox" id="chkArea_sea">
      </div>

      <div class="sub-card">
        <div class="sub-card-head" style="cursor:default;">
          <div class="sub-card-head-left">🌊 Vị Trí &amp; Thao Tác Câu Ở Biển</div>
        </div>
        <div class="sub-card-body">
          <div class="hint-note">
            ✨ Tự nhận biết cá cắn câu để giật, tự ghìm cần theo hướng cá và cất cá vào giỏ.
          </div>
          <label class="opt-row">
            <span>📍 Tự đi bộ ra vị trí ngồi câu</span>
            <input type="checkbox" data-key="seaAutoSpot">
          </label>
          <div class="opt-sub" data-show-if="seaAutoSpot">
            <div class="opt-row">
              <span>Vị trí ngồi câu ở Biển:</span>
              <select data-key="seaSpot">
                <option value="pier">🌉 Cầu tàu</option>
                <option value="rocks">🪨 Bãi đá</option>
                <option value="beach">🏖️ Mép bãi cát</option>
              </select>
            </div>
          </div>

          <label class="opt-row">
            <span>📖 Tự nhận thưởng Sổ cá Bách khoa Ông Tư</span>
            <input type="checkbox" data-key="seaAutoClaimDex">
          </label>
          <label class="opt-row">
            <span>🍙 Tự ăn uống hồi phục Đói Khát khi câu Biển</span>
            <input type="checkbox" data-key="seaAutoEat">
          </label>
        </div>
      </div>

      <div class="sub-card">
        <div class="sub-card-head" style="cursor:default;">
          <div class="sub-card-head-left">🛖 Chòi Ông Tư (Mua Mồi &amp; Bán Cá)</div>
        </div>
        <div class="sub-card-body">
          <label class="opt-row">
            <span>🦐 Tự mua mồi câu khi hết mồi</span>
            <input type="checkbox" data-key="seaAutoBuyBait">
          </label>
          <div class="opt-sub" data-show-if="seaAutoBuyBait">
            <div class="opt-row">
              <span>Loại mồi ưu tiên:</span>
              <select data-key="seaPreferBait">
                <option value="worm">🪱 Mồi Giun / Trùn (Câu thường)</option>
                <option value="shrimp">🦐 Mồi Tôm (Câu cá hiếm)</option>
              </select>
            </div>
            <div class="opt-row">
              <span>Số gói mua mỗi lần:</span>
              <input type="number" data-key="seaBaitPacks" min="1" max="20" step="1">
            </div>
          </div>

          <label class="opt-row">
            <span>🐟 Tự bán hải sản trong giỏ cho Ông Tư</span>
            <input type="checkbox" data-key="seaAutoSell">
          </label>
          <div class="opt-sub" data-show-if="seaAutoSell">
            <div class="opt-row">
              <span>Bán khi giỏ có từ (con):</span>
              <input type="number" data-key="seaSellThreshold" min="1" max="30" step="1">
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}
