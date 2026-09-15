import type { ChatThreadDto } from "../../dto/chatDto";

export interface ChatSupplier {
  supplierId: string;
  supplierName: string;
  thread: ChatThreadDto | null;
}

export interface PendingAttachment {
  localId: string;
  file: File;
}

export interface ObservedParticipant {
  userId: string;
  name: string;
}
