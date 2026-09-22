import {
  fetchBuyerContracts as fetchBuyerContractsApi,
  fetchBuyerContractById as fetchBuyerContractByIdApi,
} from '../../api/platformApi';
import type {
  BuyerContractDto,
  BuyerContractApprovalFlowDto,
  BuyerContractAttachmentDto,
} from '../../api/platformApi';

export type {
  BuyerContractDto as ContractRecord,
  BuyerContractApprovalFlowDto as ContractApprovalFlow,
  BuyerContractAttachmentDto as ContractAttachment,
};

interface ApiErrorDto {
  statusCode: number;
  message: string;
  description?: string;
}

const isErrorDto = (value: unknown): value is ApiErrorDto =>
  !!value && typeof value === 'object' && 'statusCode' in (value as Record<string, unknown>);

const toError = (result: ApiErrorDto, fallback: string): Error =>
  new Error(result.message || result.description || fallback);

/**
 * Paginated list of contracts the buyer has created (GET /api/v1/buyer/contract).
 */
export const fetchContracts = async (index = 0, limit = 10): Promise<BuyerContractDto[]> => {
  const result = await fetchBuyerContractsApi(index, limit);
  if (isErrorDto(result)) throw toError(result, 'Failed to load contracts.');
  return result;
};

/**
 * Full details for a single contract (GET /api/v1/buyer/contract/{contractId}).
 */
export const fetchContractById = async (contractId: string): Promise<BuyerContractDto> => {
  const result = await fetchBuyerContractByIdApi(contractId);
  if (isErrorDto(result)) throw toError(result, 'Failed to load the contract.');
  return result;
};

/** "1,234" for the contract's own amount, or "USD 1,234" for a currency-tagged approval-flow amount. */
export const formatContractAmount = (amount: number | null | undefined, currencyCode?: string): string => {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '—';
  const formatted = amount.toLocaleString('en-IN');
  return currencyCode ? `${currencyCode.toUpperCase()} ${formatted}` : formatted;
};

export const formatContractDate = (value: string | null | undefined, withTime = false): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return withTime
    ? date.toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};
