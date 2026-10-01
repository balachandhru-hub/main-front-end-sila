const INVALID_FILENAME_CHARACTERS = /[\/\\:*?"<>|]/g;

export function sanitizeFilenamePart(value?: string | null): string {
  const cleaned = (value ?? '')
    .replace(INVALID_FILENAME_CHARACTERS, '')
    .replace(/[^a-zA-Z0-9\s_-]/g, '')
    .trim()
    .replace(/\s+/g, '');
  return cleaned || 'UNKNOWN';
}

export function normalizeInvoiceDate(value?: string | null): string {
  if (!value) return 'UNKNOWN';
  const match = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (match) {
    return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'UNKNOWN';
  return [
    parsed.getFullYear(),
    String(parsed.getMonth() + 1).padStart(2, '0'),
    String(parsed.getDate()).padStart(2, '0'),
  ].join('-');
}

export function generateInvoiceFilename(
  supplierName?: string | null,
  invoiceNumber?: string | null,
  invoiceDate?: string | null,
): string {
  return `${sanitizeFilenamePart(supplierName)}-${sanitizeFilenamePart(invoiceNumber)}-${normalizeInvoiceDate(invoiceDate)}.pdf`;
}