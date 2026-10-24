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
import { Sparkles, Download, CheckCircle2, History, ExternalLink } from 'lucide-react';

interface ReleaseChangelogViewProps {
  updateInfo: UpdateCheckResult;
  onClose?: () => void;
}

export function ReleaseChangelogView({ updateInfo, onClose }: ReleaseChangelogViewProps) {
  const hasUpdate = updateInfo.hasUpdate;
  const older = updateInfo.olderReleases || [];

  return (
    <div className="flex flex-col space-y-3 font-sans text-slate-800">
      {/* Status Header */}
      <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-200">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
              hasUpdate
                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                : 'bg-blue-50 text-blue-600 border-blue-200'
            }`}
          >
            {hasUpdate ? <Sparkles className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">
              {hasUpdate ? 'Đã Có Phiên Bản Mới!' : 'Bản Đang Dùng Mới Nhất'}
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              {hasUpdate
                ? `v${updateInfo.currentVersion} ➔ v${updateInfo.latestVersion}`
                : `Phiên bản hiện tại v${updateInfo.currentVersion}`}
            </div>
          </div>
        </div>

        <Badge
          variant={hasUpdate ? 'default' : 'secondary'}
          className={`text-[10px] uppercase font-bold ${
            hasUpdate ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
          }`}
        >
          {hasUpdate ? 'UPDATE' : 'LATEST'}
        </Badge>
      </div>

      {/* Latest Release Details (Always Expanded) */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 space-y-2">
        <div className="flex items-center justify-between border-b border-emerald-200/60 pb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-xs text-emerald-800">
              ✨ {updateInfo.releaseName || `Release v${updateInfo.latestVersion}`}
            </span>
          </div>
          {updateInfo.publishedAt && (
            <span className="text-[10px] text-slate-500">
              {new Date(updateInfo.publishedAt).toLocaleDateString('vi-VN')}
            </span>
          )}
        </div>

        <div className="max-h-[140px] overflow-y-auto pr-1 text-[11px] text-slate-700 whitespace-pre-wrap leading-relaxed font-sans">
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

      {/* Older Releases (Collapsed in Accordion) */}
      {older.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 px-1 pt-1">
            <History className="h-3.5 w-3.5" />
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
                <AccordionContent className="pb-2.5 pt-1 text-[11px] text-slate-600 whitespace-pre-wrap leading-relaxed border-t border-slate-100 mt-1">
                  <div>{rel.body || 'Không có ghi chú.'}</div>
                  {rel.htmlUrl && (
                    <div className="mt-2 pt-1 border-t border-slate-100">
                      <a
                        href={rel.htmlUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-emerald-700 hover:underline font-medium"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Xem trên GitHub
                      </a>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}

      {/* Close button if provided */}
      {onClose && (
        <div className="pt-1">
          <Button
            variant="outline"
            size="sm"
            className="w-full border-slate-200 text-slate-700 hover:bg-slate-100 text-xs shadow-xs"
            onClick={onClose}
          >
            Đóng
          </Button>
        </div>
      )}
    </div>
  );
}
