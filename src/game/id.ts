declare const _cellIdBrand: unique symbol;
export type CellId = string & { [_cellIdBrand]: string };

export const cellIdFromXY = (x: number, y: number) => `${x}-${y}` as CellId;

export const xyFromCellId = (id: CellId): { x: number; y: number } => {
  const [x, y] = id.split("-");
  return { x: Number(x), y: Number(y) };
};
