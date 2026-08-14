declare const _cellIdBrand: unique symbol;
export type CellId = string & { [_cellIdBrand]: string };

export const cellIdFromXY = (x: number, y: number) => `${x}-${y}` as CellId;
