export interface ProductFilterState {
  segment: number | "";
  family: number | "";
  class: number | "";
  commodity: number | "";
  search: string;
  /** Part of a supplier name or of its SNID. */
  supplier: string;
  index: number;
  limit: number;
}
