// externalSupplierDto.ts
//
// Types for the External Supplier Bid page (/external-supplier/bid/:rfqId/:sessionToken).
// Kept in their own file rather than folded into supplierDto.ts because the external
// GET/PUT contract genuinely differs from the internal one (richer per-item quotation
// fields, invitedUsers, no email/OTP token).

import type {
  RFQDetailDocument,
  RFQDetailItem,
  RFQQuestion,
  RFQSupplierQuotation,
} from './supplierDto';

export interface InvitedUserDto {
  rfqId: string;
  supplierId: string;
  organizationId: string;
  userId: string;
  name: string;
  email: string;
  userName: string;
}

export interface ExternalSupplierQuotationItem {
  quotedPrice: number;
  supplierRFQItemId?: string | null;
  itemQuotationId?: string | null;
  buyerRFQItemId?: string | null;
  deliveryCharge?: number | null;
  deliveryType?: string | null;
  discount?: number | null;
  discountType?: string | null;
  tax?: number | null;
  taxType?: string | null;
  quotedAmount?: number;
  subTotal?: number;
  lineNumber?: number;
}

export interface ExternalRFQDetailResponse {
  title: string;
  description: string;
  deliveryLocation: string;
  startDate: string;
  endDate: string;
  addLotOption: boolean;
  technicalSpecificationDocuments: RFQDetailDocument[];
  termsConditionDocuments: RFQDetailDocument[];
  items: RFQDetailItem[];
  supplierQuotation: RFQSupplierQuotation[];
  supplierQuotationItems: ExternalSupplierQuotationItem[];
  questions: RFQQuestion[];
  invitedUsers: InvitedUserDto[];
  status?: string;
}

export interface ExternalQuotationItemPayload {
  supplierRFQItemId?: string | null;
  buyerRFQItemId: string;
  quotedPrice: number;
  deliveryCharge?: number;
  deliveryType?: string;
  discount?: number;
  discountType?: string;
  tax?: number;
  taxType?: string;
}

export interface ExternalSubmitQuotationPayload {
  supplierQuotationId?: string | null;
  supplierRFQId?: string | null;
  totalPrice: number;
  deliveryCharge: number;
  deliveryType: string;
  discount: number;
  discountType: string;
  tax: number;
  taxType: string;
  // The session token is sent via the X-Session-Token request header (confirmed with
  // backend), never in the body. This field is still required by the backend contract,
  // but must always be an explicit JSON null for the external (no-OTP) flow.
  temporaryVerificationToken: null;
  items?: ExternalQuotationItemPayload[];
}

export interface ExternalSubmitQuotationResponse {
  statusCode: number;
  message: string;
  description: string;
  id: string;
}
