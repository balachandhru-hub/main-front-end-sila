import type { InvitedUserDto } from "../../dto/rfqDto";
import type { ChatThreadDto } from "../../dto/chatDto";

export interface ChatSupplier {
  supplierId: string;
  supplierName: string;
  users: InvitedUserDto[];
  thread: ChatThreadDto | null;
}

export interface PendingAttachment {
  localId: string;
  file: File;
}
