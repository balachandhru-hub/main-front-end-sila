import type { ChatThreadDto } from "../../dto/chatDto";

export interface ChatSupplier {
  supplierId: string;
  supplierName: string;
  thread: ChatThreadDto | null;
  /** True when this row is an external (unregistered) supplier, keyed by externalSupplierId instead of supplierId. */
  isExternal: boolean;
}

export interface PendingAttachment {
  localId: string;
  file: File;
}

export interface ObservedParticipant {
  userId: string;
  name: string;
}
