import React, { useState, useRef, useEffect } from 'react';
import { Lock, Delete, RotateCcw, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { unlockOnlinePin } from '../hud-core';

interface OnlinePinGateProps {
  onUnlocked: () => void;
}

const PIN_LENGTH = 6;

export function OnlinePinGate({ onUnlocked }: OnlinePinGateProps) {
  const [pin, setPin] = useState<string>('');
  const [showDigits, setShowDigits] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 80);
    return () => clearTimeout(timer);
  }, []);

  const verifyPinCode = (candidate: string) => {
    if (candidate.length !== PIN_LENGTH) return;
    if (unlockOnlinePin(candidate)) {
      setErrorMsg('');
      onUnlocked();
    } else {
      setErrorMsg('Mã PIN không chính xác, vui lòng nhập lại!');
      setIsShaking(true);
      setTimeout(() => {
        setIsShaking(false);
        setPin('');
        inputRef.current?.focus();
      }, 420);
    }
  };

  const handleSetPin = (nextRaw: string) => {
    const digitsOnly = nextRaw.replace(/\D/g, '').slice(0, PIN_LENGTH);
    if (errorMsg && digitsOnly.length > 0) {
      setErrorMsg('');
    }
    setPin(digitsOnly);
    if (digitsOnly.length === PIN_LENGTH) {
      verifyPinCode(digitsOnly);
    }
  };

  const handleDigitClick = (digit: string) => {
    if (pin.length >= PIN_LENGTH) return;
    const next = pin + digit;
    handleSetPin(next);
    inputRef.current?.focus();
  };

  const handleBackspace = () => {
    if (pin.length === 0) return;
    setErrorMsg('');
    setPin((prev) => prev.slice(0, -1));
    inputRef.current?.focus();
  };

  const handleClear = () => {
    setErrorMsg('');
    setPin('');
    inputRef.current?.focus();
  };

  return (
    <div
      className="flex flex-col flex-1 min-h-0 items-center justify-center p-4 bg-slate-50/95 select-none overflow-y-auto"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="w-full max-w-[310px] rounded-2xl border border-slate-200/90 bg-white p-4 shadow-md space-y-3.5 text-center">
        {/* Header Icon & Title */}
        <div className="flex flex-col items-center space-y-1.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 shadow-2xs">
            <Lock className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 tracking-tight">
            Khóa Bảo Mật Khu Vực Online
          </h3>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Nhập mã PIN <strong>6 chữ số</strong> để mở khóa tính năng Online trong phiên làm việc này.
          </p>
        </div>

        {/* Hidden / Transparent Input for Direct Keyboard Typing */}
        <div className="relative">
          <input
            ref={inputRef}
            type="tel"
            inputMode="numeric"
            autoComplete="off"
            maxLength={PIN_LENGTH}
            value={pin}
            onChange={(e) => handleSetPin(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Escape') {
                handleClear();
              }
            }}
            aria-label="Nhập mã PIN 6 số"
            className="sr-only"
          />

          {/* 6 PIN Boxes */}
          <div
            className={`grid grid-cols-6 gap-1.5 justify-center transition-transform ${
              isShaking ? 'translate-x-1 border-red-400' : ''
            }`}
          >
            {Array.from({ length: PIN_LENGTH }).map((_, idx) => {
              const char = pin[idx] || '';
              const isCurrent = idx === pin.length;
              const isFilled = Boolean(char);
              return (
                <div
                  key={idx}
                  onClick={() => inputRef.current?.focus()}
                  className={`flex h-11 items-center justify-center rounded-xl border text-base font-mono font-bold transition-all cursor-text ${
                    errorMsg
                      ? 'border-red-300 bg-red-50/60 text-red-700'
                      : isFilled
                        ? 'border-emerald-500 bg-emerald-50/50 text-emerald-800 shadow-2xs'
                        : isCurrent
                          ? 'border-emerald-500 bg-white ring-2 ring-emerald-500/20 text-slate-800'
                          : 'border-slate-200 bg-slate-50 text-slate-400'
                  }`}
                >
                  {isFilled ? (showDigits ? char : '•') : ''}
                </div>
              );
            })}
          </div>
        </div>

        {/* Toggle Show/Hide PIN & Error Feedback */}
        <div className="min-h-[20px] flex items-center justify-between px-0.5">
          {errorMsg ? (
            <div className="flex items-center gap-1 text-[11px] font-medium text-red-600 text-left">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          ) : (
            <span className="text-[10px] text-slate-400">
              Có thể gõ phím số hoặc bấm bảng bên dưới
            </span>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowDigits((prev) => !prev);
              inputRef.current?.focus();
            }}
            className="flex items-center gap-1 text-[10px] font-medium text-slate-500 hover:text-slate-800 cursor-pointer shrink-0 ml-2"
            title={showDigits ? 'Ẩn số PIN' : 'Hiện số PIN'}
          >
            {showDigits ? (
              <>
                <EyeOff className="h-3 w-3" />
                <span>Ẩn</span>
              </>
            ) : (
              <>
                <Eye className="h-3 w-3" />
                <span>Hiện</span>
              </>
            )}
          </button>
        </div>

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-1.5 pt-0.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDigitClick(digit);
              }}
              className="flex h-9 items-center justify-center rounded-xl border border-slate-200/90 bg-slate-50/80 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 active:scale-[0.97] text-sm font-bold text-slate-700 transition-all cursor-pointer shadow-2xs"
            >
              {digit}
            </button>
          ))}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            title="Nhập lại từ đầu"
            className="flex h-9 items-center justify-center rounded-xl border border-slate-200/90 bg-slate-100/80 hover:bg-slate-200/80 active:scale-[0.97] text-xs font-semibold text-slate-600 transition-all cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDigitClick('0');
            }}
            className="flex h-9 items-center justify-center rounded-xl border border-slate-200/90 bg-slate-50/80 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 active:scale-[0.97] text-sm font-bold text-slate-700 transition-all cursor-pointer shadow-2xs"
          >
            0
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleBackspace();
            }}
            title="Xóa 1 số"
            className="flex h-9 items-center justify-center rounded-xl border border-slate-200/90 bg-slate-100/80 hover:bg-red-50 hover:border-red-200 hover:text-red-600 active:scale-[0.97] text-xs font-semibold text-slate-600 transition-all cursor-pointer"
          >
            <Delete className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Session Note */}
        <div className="pt-1 border-t border-slate-100 text-[10px] text-slate-400 leading-normal">
          💡 Mở khóa có hiệu lực suốt phiên tab hiện tại (game tự reload không cần nhập lại).
        </div>
      </div>
    </div>
  );
}
