import { saveInventoryCountDraft } from '@/data/local/database';

export type InventoryLocation = {
  id: string;
  label: string;
  parent?: string;
};

export type InventoryStock = {
  materialCode: string;
  locationId: string;
  quantity: number;
  uom: string;
  unitCost?: number;
};

export type InventoryCount = {
  materialCode: string;
  description: string;
  locationId: string;
  physicalQuantity: number;
  bookQuantity?: number;
  uom: string;
};

export const inventoryLocations: InventoryLocation[] = [
  { id: 'MAIN_STORE', label: 'Main Store' },
  { id: 'BEVERAGE_STORE', label: 'Beverage Store', parent: 'Main Store' },
  { id: 'COLD_ROOM', label: 'Cold Room', parent: 'Main Store' },
  { id: 'FREEZER', label: 'Freezer', parent: 'Main Store' },
  { id: 'DRY_STORE', label: 'Dry Store', parent: 'Main Store' },
  { id: 'ENGINEERING_STORE', label: 'Engineering Store' },
  { id: 'HOUSEKEEPING_STORE', label: 'Housekeeping Store' },
];

const stock: InventoryStock[] = [
  { materialCode: 'MAT-000845', locationId: 'BEVERAGE_STORE', quantity: 29, uom: 'CASE', unitCost: 78 },
  { materialCode: 'MAT-001245', locationId: 'COLD_ROOM', quantity: 24, uom: 'CASE', unitCost: 112 },
  { materialCode: 'MAT-003102', locationId: 'MAIN_STORE', quantity: 100, uom: 'KG', unitCost: 4.8 },
];

export async function getInventoryStock(materialCode: string, locationId: string): Promise<InventoryStock> {
  return stock.find((item) => item.materialCode === materialCode && item.locationId === locationId) ?? {
    materialCode,
    locationId,
    quantity: 0,
    uom: 'EA',
  };
}

export function calculateVariance(physicalQuantity: number, bookQuantity?: number) {
  if (bookQuantity === undefined) return null;
  const quantity = physicalQuantity - bookQuantity;
  return {
    quantity,
    percentage: bookQuantity === 0 ? 0 : (quantity / bookQuantity) * 100,
  };
}

export async function saveInventoryCount(count: InventoryCount): Promise<{ countId: string; status: 'SAVED_LOCALLY' }> {
  const countId = await saveInventoryCountDraft({
    items: [{
      materialCode: count.materialCode,
      locationCode: count.locationId,
      physicalQuantity: count.physicalQuantity,
      bookQuantity: count.bookQuantity ?? null,
      uom: count.uom,
      payload: count,
    }],
  });
  return { countId, status: 'SAVED_LOCALLY' };
}