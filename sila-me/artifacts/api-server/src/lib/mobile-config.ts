import { and, eq, isNull } from "drizzle-orm";
import { db, mobileConfigurationsTable, type MobileConfiguration } from "@workspace/db";
import type { AuthContext } from "./auth-context";

export const defaultMobileFeatures = {
  receiveGoods: false,
  inventoryCount: false,
  stockTransfer: false,
  goodsIssue: false,
  stockWriteOff: false,
  scanDocument: false,
  approvals: false,
};

export function configurationResponse(configuration?: MobileConfiguration) {
  return {
    configurationVersion: configuration?.configurationVersion ?? 1,
    updatedAt: configuration?.updatedAt ?? new Date(0),
    features: configuration
      ? {
          receiveGoods: configuration.receiveGoods,
          inventoryCount: configuration.inventoryCount,
          stockTransfer: configuration.stockTransfer,
          goodsIssue: configuration.goodsIssue,
          stockWriteOff: configuration.stockWriteOff,
          scanDocument: configuration.scanDocument,
          approvals: configuration.approvals,
        }
      : defaultMobileFeatures,
  };
}

export async function effectiveMobileConfiguration(
  context: AuthContext,
): Promise<MobileConfiguration | undefined> {
  if (context.customerId === null) return undefined;
  const rows = await db
    .select()
    .from(mobileConfigurationsTable)
    .where(eq(mobileConfigurationsTable.customerId, context.customerId));

  const propertyId = context.propertyIds.length === 1 ? context.propertyIds[0] : null;
  const storeId = context.storeIds.length === 1 ? context.storeIds[0] : null;
  const candidates = rows.filter((row) => {
    if (row.storeId !== null) return storeId !== null && row.storeId === storeId;
    if (row.propertyId !== null) {
      return propertyId !== null && row.propertyId === propertyId;
    }
    return true;
  });

  return candidates.sort((left, right) => {
    const leftSpecificity = left.storeId !== null ? 2 : left.propertyId !== null ? 1 : 0;
    const rightSpecificity = right.storeId !== null ? 2 : right.propertyId !== null ? 1 : 0;
    return (
      rightSpecificity - leftSpecificity ||
      right.configurationVersion - left.configurationVersion ||
      right.updatedAt.getTime() - left.updatedAt.getTime()
    );
  })[0];
}

export async function findMobileConfiguration(
  customerId: number,
  propertyId: number | null,
  storeId: number | null,
): Promise<MobileConfiguration | undefined> {
  const [configuration] = await db
    .select()
    .from(mobileConfigurationsTable)
    .where(
      and(
        eq(mobileConfigurationsTable.customerId, customerId),
        propertyId === null
          ? isNull(mobileConfigurationsTable.propertyId)
          : eq(mobileConfigurationsTable.propertyId, propertyId),
        storeId === null
          ? isNull(mobileConfigurationsTable.storeId)
          : eq(mobileConfigurationsTable.storeId, storeId),
      ),
    )
    .limit(1);
  return configuration;
}