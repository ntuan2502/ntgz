import { checkForUpdates } from '../../services/github-service';
import { UpdateCheckResult } from '../../shared/types/github';

let modalEl: HTMLDivElement | null = null;

export async function openUpdateModal(): Promise<void> {
  if (modalEl) {
    modalEl.remove();
    modalEl = null;
  }

  const overlay = document.createElement('div');
  overlay.id = 'ntg-update-modal-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(15, 23, 42, 0.75);
    backdrop-filter: blur(4px);
    z-index: 9999999;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  `;

  const box = document.createElement('div');
  box.style.cssText = `
    width: 480px;
    max-width: 90vw;
    max-height: 85vh;
    background: #0f172a;
    border: 1px solid #334155;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
    border-radius: 14px;
    color: #f8fafc;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `;

  box.innerHTML = `
    <div style="padding: 16px 20px; border-bottom: 1px solid #1e293b; display: flex; align-items: center; justify-content: space-between; background: #1e293b;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 20px;">🔄</span>
        <span style="font-weight: 700; font-size: 15px; color: #38bdf8;">Kiểm Tra Cập Nhật - NTG Auto</span>
      </div>
      <button id="ntg-modal-close-btn" style="background: none; border: none; color: #94a3b8; font-size: 20px; cursor: pointer; padding: 4px 8px; border-radius: 6px;">✕</button>
    </div>
    <div id="ntg-modal-content" style="padding: 20px; overflow-y: auto; flex: 1; font-size: 13px; line-height: 1.5;">
      <div style="text-align: center; color: #94a3b8; padding: 24px 0;">
        <div style="font-size: 24px; margin-bottom: 8px; animation: spin 1s linear infinite;">⏳</div>
        <div>Đang kiểm tra phiên bản mới nhất từ GitHub...</div>
      </div>
    </div>
  `;

  overlay.appendChild(box);
  document.body.appendChild(overlay);
  modalEl = overlay;

  const closeBtn = box.querySelector('#ntg-modal-close-btn') as HTMLButtonElement;
  closeBtn.onclick = () => {
    overlay.remove();
    modalEl = null;
  };
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      overlay.remove();
      modalEl = null;
    }
  };

  const contentDiv = box.querySelector('#ntg-modal-content') as HTMLDivElement;

  try {
    const res: UpdateCheckResult = await checkForUpdates();
    if (res.hasUpdate) {
      contentDiv.innerHTML = `
        <div style="background: #1e293b; border: 1px solid #10b981; border-radius: 10px; padding: 14px; margin-bottom: 16px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-weight: 700; color: #10b981; font-size: 14px;">🎉 Đã Có Bản Cập Nhật Mới!</span>
            <span style="background: #10b981; color: #064e3b; font-weight: 700; font-size: 11px; padding: 2px 8px; border-radius: 999px;">v${res.latestVersion}</span>
          </div>
          <div style="color: #cbd5e1; font-size: 12px;">Phiên bản hiện tại: <b>v${res.currentVersion}</b> → Phiên bản mới: <b style="color:#10b981;">v${res.latestVersion}</b></div>
        </div>

        <div style="font-weight: 700; color: #94a3b8; margin-bottom: 8px; font-size: 12px; text-transform: uppercase;">Nhật ký thay đổi (Changelog):</div>
        <div style="background: #020617; border: 1px solid #1e293b; border-radius: 8px; padding: 12px; max-height: 240px; overflow-y: auto; white-space: pre-wrap; font-family: monospace; font-size: 11.5px; color: #e2e8f0; line-height: 1.4;">${escapeHtml(res.releaseNotes || 'Không có ghi chú thay đổi.')}</div>

        <div style="margin-top: 18px; display: flex; gap: 10px; justify-content: flex-end;">
          <a href="${res.downloadUrl || res.releaseUrl}" target="_blank" rel="noopener noreferrer" style="background: #0284c7; color: white; padding: 9px 16px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 13px; display: inline-flex; align-items: center; gap: 6px;">
            ⬇️ Tải Bản Mới Ngay
          </a>
        </div>
      `;
    } else {
      contentDiv.innerHTML = `
        <div style="text-align: center; padding: 20px 0;">
          <div style="font-size: 40px; margin-bottom: 12px;">✅</div>
          <div style="font-weight: 700; color: #38bdf8; font-size: 16px; margin-bottom: 6px;">Bạn Đang Dùng Bản Mới Nhất</div>
          <div style="color: #94a3b8; font-size: 13px;">Phiên bản hiện tại: <b>v${res.currentVersion}</b></div>
          <div style="margin-top: 16px; font-size: 12px; color: #64748b;">(Được kiểm tra trực tiếp từ GitHub Releases)</div>
        </div>
      `;
    }
  } catch (err: any) {
    contentDiv.innerHTML = `
      <div style="text-align: center; padding: 20px 0;">
        <div style="font-size: 36px; margin-bottom: 10px;">⚠️</div>
        <div style="font-weight: 700; color: #f87171; font-size: 14px; margin-bottom: 6px;">Không thể kiểm tra cập nhật</div>
        <div style="color: #94a3b8; font-size: 12px;">${escapeHtml(err?.message || 'Lỗi kết nối mạng')}</div>
      </div>
    `;
  }
}

function escapeHtml(str: string): string {
  return str.replace(/[&<>'"]/g, (tag) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}
