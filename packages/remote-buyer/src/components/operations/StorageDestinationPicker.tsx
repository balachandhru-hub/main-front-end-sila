import React, { useEffect, useState } from "react";
import { EmptyState, Loader, toastService } from "@vosox/shared-ui";
import {
  getMicrosoftConnection,
  getMicrosoftFolders,
  getMicrosoftLibraries,
  resolveMicrosoftSite,
  validateMicrosoftConnection,
  type MicrosoftConnectionState,
  type MicrosoftFolder,
  type MicrosoftLibrary,
  type MicrosoftSite,
} from "../../api/operationsApi";
import { errorMessage, formatDateTime, statusBadgeClass, statusLabel } from "./operationsFormat";
import "./Operations.css";

interface StorageDestinationPickerProps {
  connectionId: string;
  connectionName: string;
  onClose: () => void;
  /** Called after the destination passed the read/write check. */
  onValidated: () => void;
}

interface FolderChoice {
  id: string | null;
  path: string | null;
}

const ROOT: FolderChoice = { id: null, path: null };

/** Choose where a Microsoft connection stores documents: SharePoint site, document library and folder. */
const StorageDestinationPicker: React.FC<StorageDestinationPickerProps> = ({ connectionId, connectionName, onClose, onValidated }) => {
  const [state, setState] = useState<MicrosoftConnectionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"site" | "libraries" | "folders" | "validate" | null>(null);

  const [siteUrl, setSiteUrl] = useState("");
  const [site, setSite] = useState<MicrosoftSite | null>(null);
  const [libraries, setLibraries] = useState<MicrosoftLibrary[]>([]);
  const [driveId, setDriveId] = useState("");
  const [folder, setFolder] = useState<FolderChoice>(ROOT);
  const [folders, setFolders] = useState<MicrosoftFolder[]>([]);
  // Parents of the current folder, so the user can step back up.
  const [trail, setTrail] = useState<FolderChoice[]>([]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const loaded = await getMicrosoftConnection(connectionId);
      setState(loaded);
      setSiteUrl(loaded.siteWebUrl ?? "");
    } catch (err: unknown) {
      setError(errorMessage(err, "Could not load the Microsoft connection."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [connectionId]);

  const loadFolders = async (drive: string, choice: FolderChoice) => {
    setBusy("folders");
    try {
      setFolders(await getMicrosoftFolders(connectionId, drive, choice.path));
    } catch (err: unknown) {
      setFolders([]);
      toastService.error(errorMessage(err, "Could not load the folders."));
    } finally {
      setBusy(null);
    }
  };

  const handleFindSite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^https:\/\//i.test(siteUrl.trim())) {
      toastService.error("Enter the address of the SharePoint site, starting with https://.");
      return;
    }
    setBusy("site");
    try {
      const found = await resolveMicrosoftSite(connectionId, siteUrl.trim());
      setSite(found);
      setDriveId("");
      setFolder(ROOT);
      setFolders([]);
      setTrail([]);
      setBusy("libraries");
      setLibraries(await getMicrosoftLibraries(connectionId, found.id));
    } catch (err: unknown) {
      setSite(null);
      setLibraries([]);
      toastService.error(errorMessage(err, "The SharePoint site could not be found."));
    } finally {
      setBusy(null);
    }
  };

  const handleLibrary = async (nextDriveId: string) => {
    setDriveId(nextDriveId);
    setFolder(ROOT);
    setTrail([]);
    setFolders([]);
    if (nextDriveId) await loadFolders(nextDriveId, ROOT);
  };

  const openFolder = async (target: MicrosoftFolder) => {
    const choice: FolderChoice = { id: target.id, path: target.path };
    setTrail((current) => [...current, folder]);
    setFolder(choice);
    await loadFolders(driveId, choice);
  };

  const goUp = async () => {
    const parent = trail[trail.length - 1] ?? ROOT;
    setTrail((current) => current.slice(0, -1));
    setFolder(parent);
    await loadFolders(driveId, parent);
  };

  const handleValidate = async () => {
    if (!site || !driveId) {
      toastService.error("Find the site and choose a document library first.");
      return;
    }
    setBusy("validate");
    try {
      const result = await validateMicrosoftConnection(connectionId, {
        siteUrl: site.webUrl || siteUrl.trim(),
        driveId,
        driveName: libraries.find((library) => library.id === driveId)?.name ?? null,
        folderId: folder.id,
        folderPath: folder.path,
      });
      setState(result);
      if (result.status === "CONNECTED") {
        toastService.success("The destination passed the read and write check.");
        onValidated();
      } else {
        toastService.warning(result.message || `The connection is now ${statusLabel(result.status).toLowerCase()}.`);
      }
    } catch (err: unknown) {
      toastService.error(errorMessage(err, "The destination could not be validated."));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="sila-card">
      <div className="sila-card-header">
        <h2 className="sila-card-title">Destination of {connectionName}</h2>
        {state && <span className={statusBadgeClass(state.status)}>{statusLabel(state.status)}</span>}
      </div>
      {loading ? (
        <Loader size={20} message="Loading connection..." />
      ) : error || !state ? (
        <EmptyState
          variant="error"
          title="Couldn't load the Microsoft connection"
          description={error ?? "The connection was not returned."}
          action={<button type="button" className="sila-btn sila-btn--secondary" onClick={load}>Try again</button>}
        />
      ) : (
        <div className="sila-card-body ops-stack">
          <dl className="sila-meta-grid">
            <div className="sila-meta-item"><dt className="sila-meta-label">Current site</dt><dd className="sila-meta-value ops-break">{state.siteDisplayName || state.siteWebUrl || "Not chosen"}</dd></div>
            <div className="sila-meta-item"><dt className="sila-meta-label">Current library</dt><dd className="sila-meta-value">{state.driveName || "Not chosen"}</dd></div>
            <div className="sila-meta-item"><dt className="sila-meta-label">Current folder</dt><dd className="sila-meta-value ops-break">{state.folderPath || (state.driveName ? "Library root" : "Not chosen")}</dd></div>
            <div className="sila-meta-item"><dt className="sila-meta-label">Validated</dt><dd className="sila-meta-value">{formatDateTime(state.validatedAt)}</dd></div>
          </dl>
          {state.message && <span className="sila-help">{state.message}</span>}

          <form className="sila-field" onSubmit={handleFindSite}>
            <label className="sila-label" htmlFor="storage-site-url">1. SharePoint site address</label>
            <div className="ops-inline">
              <input id="storage-site-url" className="sila-input" placeholder="https://contoso.sharepoint.com/sites/finance" value={siteUrl} onChange={(event) => setSiteUrl(event.target.value)} />
              <button type="submit" className="sila-btn sila-btn--secondary" disabled={busy !== null}>
                {busy === "site" || busy === "libraries" ? "Looking up..." : "Find site"}
              </button>
            </div>
            {site && <span className="sila-help">Found: {site.displayName}</span>}
          </form>

          {site && (
            <div className="sila-field">
              <label className="sila-label" htmlFor="storage-library">2. Document library</label>
              <select id="storage-library" className="sila-select" value={driveId} onChange={(event) => handleLibrary(event.target.value)} disabled={busy !== null}>
                <option value="">Select a library</option>
                {libraries.map((library) => <option key={library.id} value={library.id}>{library.name}</option>)}
              </select>
              {libraries.length === 0 && <span className="sila-help">This site has no document library the connection can see.</span>}
            </div>
          )}

          {site && driveId && (
            <div className="sila-field">
              <span className="sila-label">3. Folder</span>
              <div className="ops-inline">
                <span className="sila-cell-strong ops-break">{folder.path || "Library root"}</span>
                {trail.length > 0 && (
                  <button type="button" className="sila-btn sila-btn--ghost sila-btn--sm" onClick={goUp} disabled={busy !== null}>Up one level</button>
                )}
              </div>
              {busy === "folders" ? (
                <Loader size={20} message="Loading folders..." />
              ) : folders.length === 0 ? (
                <span className="sila-help">No sub-folders here. Documents are stored in the folder shown above.</span>
              ) : (
                <ul className="ops-list">
                  {folders.map((item) => (
                    <li key={item.id} className="ops-list-row">
                      <span className="ops-break">{item.name}</span>
                      <button type="button" className="sila-btn sila-btn--secondary sila-btn--sm" onClick={() => openFolder(item)} disabled={busy !== null}>Open</button>
                    </li>
                  ))}
                </ul>
              )}
              <span className="sila-help">Open a folder to choose it. The folder shown above is the one that will be used.</span>
            </div>
          )}
        </div>
      )}
      <div className="sila-card-footer">
        <button type="button" className="sila-btn sila-btn--secondary" onClick={onClose} disabled={busy === "validate"}>Close</button>
        <button type="button" className="sila-btn sila-btn--primary" onClick={handleValidate} disabled={busy !== null || !site || !driveId}>
          {busy === "validate" ? "Checking..." : "Save and run read/write check"}
        </button>
      </div>
    </section>
  );
};

export default StorageDestinationPicker;
