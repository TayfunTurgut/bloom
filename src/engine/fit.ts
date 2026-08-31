export type TInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export const ZERO_INSETS: TInsets = { top: 0, right: 0, bottom: 0, left: 0 };

export type TFit = { scale: number; x: number; y: number };

/** Contain-fits a design box into a window minus its safe-area insets. */
export const fitDesignBox = (
  width: number,
  height: number,
  insets: TInsets,
  designWidth: number,
  designHeight: number,
): TFit => {
  const availWidth = Math.max(1, width - insets.left - insets.right);
  const availHeight = Math.max(1, height - insets.top - insets.bottom);
  const scale = Math.min(availWidth / designWidth, availHeight / designHeight);
  return {
    scale,
    x: insets.left + (availWidth - designWidth * scale) * 0.5,
    y: insets.top + (availHeight - designHeight * scale) * 0.5,
  };
};
