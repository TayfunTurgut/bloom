declare const _cellIdBrand: unique symbol;
export type CellId = string & { [_cellIdBrand]: string };

export const cellIdFromXY = (x: number, y: number) => `${x}-${y}` as CellId;
export const XYFromCellId = (id: CellId) => {
  const [x, y] = id.split("-");
  return { x: parseInt(x), y: parseInt(y) };
};
