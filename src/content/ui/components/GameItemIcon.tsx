import React from 'react';
import { useGameAsset } from '@/content/bridge/game-assets';

export interface GameItemIconProps {
  itemKey?: string | null;
  fallbackEmoji?: string | null;
  alt?: string;
  size?: number | string;
  className?: string;
  title?: string;
  pixelated?: boolean;
}

export function GameItemIcon({
  itemKey,
  fallbackEmoji,
  alt = '',
  size = 24,
  className = '',
  title,
  pixelated = true,
}: GameItemIconProps) {
  const dataUrl = useGameAsset(itemKey);

  const dimension = typeof size === 'number' ? `${size}px` : size;

  if (dataUrl) {
    return (
      <img
        src={dataUrl}
        alt={alt || itemKey || ''}
        title={title}
        draggable={false}
        className={`inline-block shrink-0 object-contain select-none pointer-events-none ${className}`}
        style={{
          width: dimension,
          height: dimension,
          imageRendering: pixelated ? 'pixelated' : 'auto',
        }}
      />
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center select-none ${className}`}
      title={title}
      style={{
        width: dimension,
        height: dimension,
        fontSize: typeof size === 'number' ? `${Math.round(size * 0.75)}px` : undefined,
      }}
    >
      {fallbackEmoji || '📦'}
    </span>
  );
}
