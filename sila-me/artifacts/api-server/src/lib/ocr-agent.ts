import { and, eq } from "drizzle-orm";
import { db, integrationConnectionsTable } from "@workspace/db";

export const OCR_AGENT_PROVIDER = "GEMINI_OCR_AGENT";

export type ConfiguredOcrAgent = {
  connectionId: number;
  customerId: number;
  name: string;
  model: string;
  provider: string;
};

export async function getConfiguredOcrAgent(customerId: number): Promise<ConfiguredOcrAgent | null> {
  const [connection] = await db
    .select()
    .from(integrationConnectionsTable)
    .where(
      and(
        eq(integrationConnectionsTable.customerId, customerId),
        eq(integrationConnectionsTable.provider, OCR_AGENT_PROVIDER),
        eq(integrationConnectionsTable.status, "Active"),
      ),
    )
    .limit(1);
  if (!connection) return null;
  const model =
    typeof connection.metadata?.model === "string"
      ? connection.metadata.model
      : "gemini-3-flash-preview";
  return {
    connectionId: connection.id,
    customerId,
    name: connection.name,
    model,
    provider: connection.provider,
  };
}