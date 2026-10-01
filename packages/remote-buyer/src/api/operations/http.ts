import axios from "axios";
import axiosInstance from "../axiosInstance";

/** Every receiving/operations route lives under this prefix behind the gateway. */
export const OPERATIONS_BASE = "/api/v1/operations";

interface ApiErrorBody {
  message?: string;
  description?: string;
}

const messageFromBody = (body: unknown): string | null => {
  if (!body || typeof body !== "object") return null;
  const data = body as ApiErrorBody;
  return data.description || data.message || null;
};

/** User-facing message from an API failure. */
export const readError = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    return messageFromBody(error.response?.data) || fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

/** Same as readError, for requests whose response type is a Blob (the error body arrives as a Blob too). */
export const readBlobError = async (error: unknown, fallback: string): Promise<string> => {
  if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
    try {
      const parsed: unknown = JSON.parse(await error.response.data.text());
      return messageFromBody(parsed) || fallback;
    } catch {
      return fallback;
    }
  }
  return readError(error, fallback);
};

/** Drops empty values so optional filters are simply left out of the query string. */
export const cleanParams = (
  params: Record<string, string | number | boolean | null | undefined>,
): Record<string, string | number | boolean> => {
  const result: Record<string, string | number | boolean> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;
    result[key] = value;
  });
  return result;
};

const fileNameFromDisposition = (header: unknown): string | null => {
  if (typeof header !== "string") return null;
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header);
  return match ? decodeURIComponent(match[1]) : null;
};

/** Hands a Blob to the browser as a file download. */
export const saveBlob = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const fetchBlob = async (
  url: string,
  params: Record<string, string | number | boolean>,
  fallback: string,
): Promise<{ blob: Blob; fileName: string | null }> => {
  try {
    const response = await axiosInstance.get<Blob>(url, { params, responseType: "blob" });
    return { blob: response.data, fileName: fileNameFromDisposition(response.headers["content-disposition"]) };
  } catch (error: unknown) {
    throw new Error(await readBlobError(error, fallback));
  }
};

export const postForBlob = async (
  url: string,
  body: unknown,
  fallback: string,
): Promise<{ blob: Blob; fileName: string | null }> => {
  try {
    const response = await axiosInstance.post<Blob>(url, body, { responseType: "blob" });
    return { blob: response.data, fileName: fileNameFromDisposition(response.headers["content-disposition"]) };
  } catch (error: unknown) {
    throw new Error(await readBlobError(error, fallback));
  }
};
