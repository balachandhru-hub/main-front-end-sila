export interface ChatAttachmentInputDto {
  fileBytes: string;
  fileName: string;
  contentType: string;
}

export interface ChatAttachmentDto {
  id: string;
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
}

export interface SendBuyerMessagePayload {
  rfqId: string;
  supplierId?: string;
  externalSupplierId?: string;
  body: string;
  attachments: ChatAttachmentInputDto[];
}

export interface ChatMessageDto {
  id: string;
  threadId: string;
  senderUserId: string;
  senderName: string;
  senderOrganizationType: string;
  body: string;
  attachments: ChatAttachmentDto[];
  dateCreated: string;
  isReadByBuyer: boolean;
  isReadBySupplier: boolean;
}

export interface ChatThreadDto {
  threadId: string;
  rfqId: string;
  rfqNumber: string;
  buyerId: string;
  supplierId: string;
  externalSupplierId?: string;
  counterpartyName: string;
  lastMessageBody: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface MarkThreadReadResponseDto {
  statusCode: number;
  message: string;
  description: string;
  id: string;
}

export interface ChatAttachmentDownloadDto {
  fileName: string;
  contentType: string;
  fileBytes: string;
}
