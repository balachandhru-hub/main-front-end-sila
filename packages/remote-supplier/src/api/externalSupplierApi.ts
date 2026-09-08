// externalSupplierApi.ts
//
// API wrapper for the External Supplier Bid page. Hits the two endpoints backend has
// provided for this flow:
//   GET /api/v1/supplier/external-rfq/{rfqId}
//   PUT /api/v1/supplier/external-rfq/{rfqId}/quotation
//
// Confirmed with backend: the session token from the URL is sent as the
// `X-Session-Token` request header on BOTH calls — never as a query param and
// never inside the request body.

import externalSupplierInstance from './externalSupplierInstance';
import type {
  ExternalRFQDetailResponse,
  ExternalSubmitQuotationPayload,
  ExternalSubmitQuotationResponse,
} from '../dto/externalSupplierDto';
import type { ErrorResponseDto } from '@vosox/shared-ui';

const wrapError = (error: any, fallbackMessage: string): ErrorResponseDto => {
  if (error.response && error.response.data) {
    const errData = error.response.data;
    return {
      statusCode: errData.statusCode || errData.status_code || error.response.status || 500,
      message: errData.message || fallbackMessage,
      description: errData.description || 'No details provided',
    };
  }
  return {
    statusCode: 500,
    message: 'Unexpected Error',
    description: 'Something went wrong. Please try again later.',
  };
};

const sessionTokenHeader = (sessionToken: string) => ({
  headers: { 'X-Session-Token': sessionToken },
});

export const fetchExternalRfqDetails = async (
  rfqId: string,
  sessionToken: string
): Promise<ExternalRFQDetailResponse | ErrorResponseDto> => {
  try {
    const response = await externalSupplierInstance.get(
      `/api/v1/supplier/external-rfq/${rfqId}`,
      sessionTokenHeader(sessionToken)
    );
    return response.data;
  } catch (error: any) {
    return wrapError(error, 'Failed to load RFQ details');
  }
};

export const submitExternalQuotation = async (
  rfqId: string,
  sessionToken: string,
  payload: ExternalSubmitQuotationPayload
): Promise<ExternalSubmitQuotationResponse | ErrorResponseDto> => {
  try {
    const response = await externalSupplierInstance.put(
      `/api/v1/supplier/external-rfq/${rfqId}/quotation`,
      payload,
      sessionTokenHeader(sessionToken)
    );
    return response.data;
  } catch (error: any) {
    return wrapError(error, 'Failed to submit quotation');
  }
};
