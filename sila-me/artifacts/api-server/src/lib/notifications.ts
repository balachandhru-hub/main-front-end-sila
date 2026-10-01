import { notificationDeliveriesTable, db } from "@workspace/db";
import { recordAuditEvent } from "./audit";

export type UserNotificationType =
  | "WELCOME_CREDENTIALS"
  | "RESET_CREDENTIALS"
  | "PASSWORD_CHANGED";

type NotificationInput = {
  type: UserNotificationType;
  recipient: string;
  targetUserId: number;
  actorUserId?: number;
  displayName: string;
  temporaryPassword?: string;
};

/**
 * Email delivery is deliberately isolated from user administration. The current
 * development workspace has no outbound email provider, so a delivery record is
 * written without retaining the temporary password and the caller receives an
 * explicit NOT_CONFIGURED status.
 */
export async function notifyUser(input: NotificationInput): Promise<{
  status: "SENT" | "NOT_CONFIGURED" | "FAILED";
  deliveryId: number;
}> {
  const [delivery] = await db
    .insert(notificationDeliveriesTable)
    .values({
      channel: "EMAIL",
      notificationType: input.type,
      recipient: input.recipient,
      targetUserId: input.targetUserId,
      status: "NOT_CONFIGURED",
      provider: "NOT_CONFIGURED",
      failureReason: "No outbound email provider is configured.",
      attemptCount: 1,
    })
    .returning();

  await recordAuditEvent("USER_NOTIFICATION_FAILED", {
    actorUserId: input.actorUserId,
    targetUserId: input.targetUserId,
    metadata: {
      notificationType: input.type,
      recipient: input.recipient,
      status: "NOT_CONFIGURED",
      provider: "NOT_CONFIGURED",
    },
  });

  return { status: "NOT_CONFIGURED", deliveryId: delivery.id };
}