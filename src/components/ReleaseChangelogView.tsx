import React from 'react';
import { UpdateCheckResult } from '@/shared/types/github';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Download,
  CheckCircle2,
  History,
  ExternalLink,
  X,
  FileText,
} from 'lucide-react';

export interface ReleaseChangelogViewProps {
  updateInfo: UpdateCheckResult;
  onClose?: () => void;
  showHeader?: boolean;
}

export function ReleaseChangelogView({
  updateInfo,
  onClose,
  showHeader = true,
}: ReleaseChangelogViewProps) {
  const hasUpdate = updateInfo.hasUpdate;
  const older = updateInfo.olderReleases || [];

  return (
    <div className="flex flex-col h-full max-h-full font-sans text-slate-800 bg-white overflow-hidden">
      {/* Sticky Header */}
      {showHeader && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white shrink-0 select-none">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
              <FileText className="h-4 w-4" />
            </div>
            <span className="font-bold text-xs text-slate-900 tracking-tight">
              Nhật Ký Phiên Bản (Changelog)
            </span>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Đóng (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Scrollable Body with custom scrollbar */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3">
        {/* Status Header Banner */}
        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 border border-slate-200 select-none">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                hasUpdate
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  : 'bg-blue-50 text-blue-600 border-blue-200'
              }`}
            >
              {hasUpdate ? <Sparkles className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">
                {hasUpdate ? 'Đã Có Phiên Bản Mới!' : 'Bản Đang Dùng Mới Nhất'}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                {hasUpdate
                  ? `v${updateInfo.currentVersion} ➔ v${updateInfo.latestVersion}`
                  : `Phiên bản hiện tại v${updateInfo.currentVersion}`}
              </div>
            </div>
          </div>

          <Badge
            variant={hasUpdate ? 'default' : 'secondary'}
            className={`text-[9px] uppercase font-bold px-1.5 py-0.5 ${
              hasUpdate ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {hasUpdate ? 'UPDATE' : 'LATEST'}
          </Badge>
        </div>

        {/* Latest Release Details (Scrollable Text) */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 space-y-2">
          <div className="flex items-center justify-between border-b border-emerald-200/60 pb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs text-emerald-800">
                ✨ {updateInfo.releaseName || `Release v${updateInfo.latestVersion}`}
              </span>
            </div>
            {updateInfo.publishedAt && (
              <span className="text-[10px] text-slate-500 font-mono">
                {new Date(updateInfo.publishedAt).toLocaleDateString('vi-VN')}
              </span>
            )}
          </div>

          {/* Dedicated scrollable box for release notes */}
          <div
            tabIndex={0}
            className="max-h-[200px] overflow-y-auto pr-1.5 text-[11px] text-slate-700 whitespace-pre-wrap leading-relaxed font-sans rounded-lg bg-white/80 p-2.5 border border-emerald-100 shadow-2xs select-text focus:outline-none"
          >
            {updateInfo.releaseNotes || 'Không có nhật ký chi tiết cho bản phát hành này.'}
          </div>

          {hasUpdate && updateInfo.downloadUrl && (
            <div className="pt-1">
              <Button
                variant="default"
                size="sm"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8 shadow-xs"
                onClick={() => {
                  if (updateInfo.downloadUrl) {
                    window.open(updateInfo.downloadUrl, '_blank');
                  }
                }}
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Tải Bản Cập Nhật v{updateInfo.latestVersion}
              </Button>
            </div>
          )}
        </div>

        {/* Older Releases (Collapsed in Accordion, Scrollable Content) */}
        {older.length > 0 && (
          <div className="space-y-1 pt-1">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 px-1 select-none">
              <History className="h-3.5 w-3.5 text-slate-500" />
              <span>Lịch sử các phiên bản trước:</span>
            </div>

            <Accordion type="single" collapsible className="w-full space-y-1">
              {older.map((rel, idx) => (
                <AccordionItem
                  key={rel.tag || idx}
                  value={rel.tag || String(idx)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-0 text-xs shadow-xs"
                >
                  <AccordionTrigger className="py-2 hover:no-underline text-xs text-slate-800 font-medium">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-emerald-700 font-bold border border-slate-200">
                        {rel.tag}
                      </span>
                      <span className="truncate max-w-[200px]">{rel.name || rel.tag}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-2.5 pt-1 border-t border-slate-100 mt-1">
                    {/* Crucial fix: max-h-[180px] overflow-y-auto prevents modal from blowing up */}
                    <div
                      tabIndex={0}
                      className="max-h-[180px] overflow-y-auto pr-1.5 text-[11px] text-slate-600 whitespace-pre-wrap leading-relaxed select-text focus:outline-none"
                    >
                      {rel.body || 'Không có ghi chú.'}
                    </div>
                    {rel.htmlUrl && (
                      <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between">
                        <a
                          href={rel.htmlUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-emerald-700 hover:underline font-medium"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Xem chi tiết trên GitHub
                        </a>
                        {rel.downloadUrl && (
                          <a
                            href={rel.downloadUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-emerald-700 hover:underline"
                          >
                            <Download className="h-3 w-3" />
                            Tải zip
                          </a>
                        )}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}
      </div>

      {/* Sticky Bottom Footer */}
      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0 select-none">
        <div className="text-[10px] text-slate-400 font-mono">
          {hasUpdate ? `Có bản mới v${updateInfo.latestVersion}` : `v${updateInfo.currentVersion} mới nhất`}
        </div>

        <div className="flex items-center gap-2">
          {hasUpdate && updateInfo.downloadUrl && (
            <Button
              variant="default"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs h-7 px-3 shadow-xs"
              onClick={() => {
                if (updateInfo.downloadUrl) {
                  window.open(updateInfo.downloadUrl, '_blank');
                }
              }}
            >
              <Download className="h-3 w-3 mr-1" />
              Tải Cập Nhật
            </Button>
          )}

          {onClose && (
            <Button
              variant="outline"
              size="sm"
              className="border-slate-200 text-slate-700 hover:bg-slate-100 text-xs h-7 px-3 shadow-xs"
              onClick={onClose}
            >
              Đóng
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
