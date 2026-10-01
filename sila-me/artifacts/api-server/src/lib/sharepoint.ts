import { ReplitConnectors } from "@replit/connectors-sdk";

const connectors = new ReplitConnectors();

export class SharePointError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 502) {
    super(message);
    this.name = "SharePointError";
    this.code = code;
    this.status = status;
  }
}

type GraphResponse = {
  ok: boolean;
  status: number;
  json(): Promise<any>;
};

function graphPath(path: string): string {
  return path.startsWith("/v1.0/") ? path : `/v1.0${path.startsWith("/") ? path : `/${path}`}`;
}

async function graphJson(path: string, init?: Record<string, unknown>): Promise<any> {
  const response = (await connectors.proxy("sharepoint", graphPath(path), init)) as GraphResponse;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const graphMessage = body?.error?.message;
    throw new SharePointError(
      response.status === 403 ? "SHAREPOINT_ACCESS_DENIED" : "SHAREPOINT_REQUEST_FAILED",
      graphMessage || `SharePoint request failed with status ${response.status}.`,
      response.status,
    );
  }
  return body;
}

function encodedSitePath(siteUrl: string): string {
  const parsed = new URL(siteUrl);
  return `${parsed.hostname}:${parsed.pathname.replace(/\/+$/, "")}`;
}

function normalizedFolderPath(folderPath: string): string {
  return folderPath
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export type SharePointUploadResult = {
  siteId: string;
  driveId: string;
  itemId: string;
  path: string;
  webUrl: string | null;
};

export async function verifySharePointFolder(
  siteUrl: string,
  folderPath: string,
): Promise<{ siteId: string; driveId: string; path: string }> {
  const site = await graphJson(`/sites/${encodedSitePath(siteUrl)}`);
  const siteId = site?.id;
  if (!siteId) {
    throw new SharePointError("SHAREPOINT_SITE_NOT_AVAILABLE", "The configured SharePoint site could not be resolved.", 502);
  }

  const drives = await graphJson(`/sites/${encodeURIComponent(siteId)}/drives?$select=id,name,driveType`);
  const drive = (drives?.value ?? []).find(
    (candidate: { name?: string; driveType?: string }) =>
      candidate.name === "Documents" || candidate.driveType === "documentLibrary",
  );
  if (!drive?.id) {
    throw new SharePointError(
      "SHAREPOINT_LIBRARY_NOT_AVAILABLE",
      "No writable SharePoint document library was found for the configured site.",
      502,
    );
  }

  const path = normalizedFolderPath(folderPath);
  if (!path) {
    throw new SharePointError("SHAREPOINT_FOLDER_NOT_AVAILABLE", "The configured SharePoint folder path is empty.", 422);
  }

  const folder = await graphJson(
    `/drives/${encodeURIComponent(drive.id)}/root:/${path}?$select=id,name,folder`,
  ).catch((error: unknown) => {
    if (error instanceof SharePointError && error.status === 404) {
      throw new SharePointError(
        "SHAREPOINT_FOLDER_NOT_AVAILABLE",
        "The configured SharePoint folder does not exist or is not accessible.",
        422,
      );
    }
    throw error;
  });
  if (!folder?.folder) {
    throw new SharePointError(
      "SHAREPOINT_FOLDER_NOT_AVAILABLE",
      "The configured SharePoint path is not a folder.",
      422,
    );
  }

  return { siteId, driveId: drive.id, path };
}

export async function uploadToSharePoint(
  siteUrl: string,
  folderPath: string,
  fileName: string,
  contentType: string,
  body: Buffer,
): Promise<SharePointUploadResult> {
  const verified = await verifySharePointFolder(siteUrl, folderPath);
  const path = `${verified.path}/${encodeURIComponent(fileName)}`;
  const response = (await connectors.proxy(
    "sharepoint",
    graphPath(`/drives/${encodeURIComponent(verified.driveId)}/root:/${path}:/content`),
    {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
      },
      body,
    },
  )) as GraphResponse;
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new SharePointError(
      "SHAREPOINT_UPLOAD_FAILED",
      result?.error?.message || `SharePoint upload failed with status ${response.status}.`,
      response.status,
    );
  }

  return {
    siteId: verified.siteId,
    driveId: verified.driveId,
    itemId: result?.id,
    path: result?.parentReference?.path
      ? `${result.parentReference.path}/${result.name}`
      : `${folderPath.replace(/\/+$/, "")}/${fileName}`,
    webUrl: result?.webUrl ?? null,
  };
}