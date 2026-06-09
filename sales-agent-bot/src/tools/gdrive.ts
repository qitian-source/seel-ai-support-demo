import { google, drive_v3 } from "googleapis";
import { readFileSync } from "node:fs";

const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];

function loadCredentials(): Record<string, any> | null {
  const inline = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (inline) {
    try {
      return JSON.parse(inline);
    } catch {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON.");
    }
  }
  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (path) {
    return JSON.parse(readFileSync(path, "utf8"));
  }
  return null;
}

let _drive: drive_v3.Drive | null | undefined;

function getDrive(): drive_v3.Drive | null {
  if (_drive !== undefined) return _drive;
  const creds = loadCredentials();
  if (!creds) {
    _drive = null;
    return null;
  }
  const subject = process.env.GOOGLE_IMPERSONATE_SUBJECT?.trim() || undefined;
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: SCOPES,
    subject, // domain-wide delegation (optional)
  });
  _drive = google.drive({ version: "v3", auth });
  return _drive;
}

export const gdriveEnabled = () => getDrive() !== null;

/** Full-text search across Drive files the credentials can see. */
export async function gdriveSearch(query: string, pageSize = 8) {
  const drive = getDrive();
  if (!drive) return { error: "Google Drive is not configured." };
  const escaped = query.replace(/'/g, "\\'");
  const res = await drive.files.list({
    q: `fullText contains '${escaped}' and trashed = false`,
    pageSize,
    orderBy: "modifiedTime desc",
    fields: "files(id,name,mimeType,modifiedTime,webViewLink)",
    corpora: "allDrives",
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  });
  const results = (res.data.files ?? []).map((f) => ({
    id: f.id,
    title: f.name,
    mimeType: f.mimeType,
    url: f.webViewLink,
    modified: f.modifiedTime,
  }));
  return { results };
}

const EXPORT_AS: Record<string, string> = {
  "application/vnd.google-apps.document": "text/plain",
  "application/vnd.google-apps.spreadsheet": "text/csv",
  "application/vnd.google-apps.presentation": "text/plain",
};

/** Fetch a Drive file's text content by id. */
export async function gdriveFetch(fileId: string, maxChars = 12000) {
  const drive = getDrive();
  if (!drive) return { error: "Google Drive is not configured." };

  const meta = await drive.files.get({
    fileId,
    fields: "id,name,mimeType,webViewLink",
    supportsAllDrives: true,
  });
  const mime = meta.data.mimeType ?? "";
  const title = meta.data.name ?? "Untitled";
  const url = meta.data.webViewLink ?? `https://drive.google.com/file/d/${fileId}`;

  let content = "";
  try {
    if (EXPORT_AS[mime]) {
      const res = await drive.files.export(
        { fileId, mimeType: EXPORT_AS[mime] },
        { responseType: "text" },
      );
      content = String(res.data);
    } else if (mime.startsWith("text/") || mime === "application/json") {
      const res = await drive.files.get(
        { fileId, alt: "media", supportsAllDrives: true },
        { responseType: "text" },
      );
      content = String(res.data);
    } else {
      content = `(Unsupported file type "${mime}" for text extraction. Open it directly: ${url})`;
    }
  } catch (e: any) {
    return { error: `Failed to read Drive file: ${e?.message ?? e}` };
  }

  if (content.length > maxChars) content = content.slice(0, maxChars) + "\n…(truncated)";
  return { id: fileId, title, url, mimeType: mime, content };
}
