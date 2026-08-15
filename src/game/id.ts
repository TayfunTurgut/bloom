declare const _cellIdBrand: unique symbol;
export type CellId = string & { [_cellIdBrand]: string };

export const cellIdFromXY = (x: number, y: number) => `${x}-${y}` as CellId;

/** The inverse, for the one caller that gets an id back out of a move report
 *  and needs to know where on screen it points. Kept next to cellIdFromXY so
 *  the two cannot drift — nothing else may take the format apart. */
export const xyFromCellId = (id: CellId): { x: number; y: number } => {
  const [x, y] = id.split("-");
  return { x: Number(x), y: Number(y) };
};
