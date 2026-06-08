import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from "firebase/auth";
import { app, auth } from "./firebaseClient.js";

const provider = new GoogleAuthProvider();
// Add Google Drive access scope
provider.addScope("https://www.googleapis.com/auth/drive.file");

let isSigningIn = false;
let cachedAccessToken: string | null = null;

/**
 * Initialize Auth State Listener
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Sign In with Google popup flow
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Failed to get access token from Google Auth");
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error("Sign in error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Retrieve current cached Access Token
 */
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

/**
 * Sign out and flush cached token
 */
export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

/**
 * Save current state backup to Google Drive
 */
export const saveBackupToDrive = async (jsonData: any, notes: string): Promise<any> => {
  const token = await getAccessToken();
  if (!token) throw new Error("Unauthorized: No access token available");

  const boundary = "radiology_drive_backup_boundary";
  const delimiter = `\r\n--${boundary}\r\n`;
  const close_delim = `\r\n--${boundary}--`;

  const metadata = {
    name: `radiology_backup_${Date.now()}.json`,
    mimeType: "application/json",
    description: notes || "نسخة احتياطية من مصلحة الأشعة"
  };

  const multipartRequestBody =
    delimiter +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata) +
    delimiter +
    "Content-Type: application/json\r\n\r\n" +
    JSON.stringify(jsonData, null, 2) +
    close_delim;

  const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`
    },
    body: multipartRequestBody
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to upload to Google Drive: ${errText}`);
  }

  return await res.json();
};

/**
 * List backups from Google Drive
 */
export interface DriveBackup {
  id: string;
  name: string;
  createdTime: string;
  size?: string;
  description?: string;
}

export const listBackupsFromDrive = async (): Promise<DriveBackup[]> => {
  const token = await getAccessToken();
  if (!token) return [];

  const query = encodeURIComponent("name contains 'radiology_backup' and mimeType = 'application/json' and trashed = false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,createdTime,size,description)&orderBy=createdTime%20desc`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    console.error("GDrive file list failed:", await res.text());
    return [];
  }

  const data = await res.json();
  return data.files || [];
};

/**
 * Delete a specific backup file from Google Drive
 */
export const deleteBackupFromDrive = async (fileId: string): Promise<boolean> => {
  const token = await getAccessToken();
  if (!token) throw new Error("Unauthorized");

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const errStr = await res.text();
    throw new Error(`Failed to delete Google Drive file: ${errStr}`);
  }

  return true;
};

/**
 * Retrieve/Restore a backup file's state content from Google Drive
 */
export const downloadBackupFromDrive = async (fileId: string): Promise<any> => {
  const token = await getAccessToken();
  if (!token) throw new Error("Unauthorized");

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const errStr = await res.text();
    throw new Error(`Failed to download backup data from Google Drive: ${errStr}`);
  }

  return await res.json();
};
