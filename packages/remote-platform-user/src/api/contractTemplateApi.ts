import type { ErrorResponseDto } from '@vosox/shared-ui';
import { getContractTemplates } from '../../../remote-buyer/src/api/Buyerapi';
import type { ContractTemplateRecord } from '../components/ContractTemplate.types';
import { toPdfDataUrl } from '../components/contractTemplatePdf';

/**
 * Maps the backend's GET /api/v1/buyer/contract-template list into the UI's ContractTemplateRecord.
 * The backend only stores templateName, segmentId and the attachment PDF - it has no fields for
 * keyTerms/clauses/customSections/family (those only ever existed client-side to build the PDF), so
 * every API-sourced record comes back as sourceType "uploaded" with those arrays empty.
 */
export const fetchContractTemplates = async (
  index = 0,
  limit = 50
): Promise<ContractTemplateRecord[] | ErrorResponseDto> => {
  try {
    const items = await getContractTemplates(index, limit);
    return items.map((item) => {
      const attachment = item.attachment;
      const contentType = attachment?.contentType || 'application/pdf';
      return {
        id: item.contractTemplateId || item.id || `${item.templateName}-${Math.random()}`,
        templateName: item.templateName,
        segmentName: item.segmentName || (item.segmentId != null ? `Segment ${item.segmentId}` : ''),
        familyName: '',
        keyTerms: [],
        clauses: [],
        customSections: [],
        createdAt: new Date().toISOString(),
        sourceType: 'uploaded',
        fileName: attachment?.fileName,
        fileDataUrl: attachment?.fileBytes ? toPdfDataUrl(attachment.fileBytes, contentType) : undefined,
        attachmentId: attachment?.id,
      };
    });
  } catch (err: any) {
    return {
      statusCode: 500,
      message: err?.message || 'Failed to load contract templates',
      description: '',
    };
  }
};
