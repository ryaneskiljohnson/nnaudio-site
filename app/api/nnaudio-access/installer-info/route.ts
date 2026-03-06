/**
 * @fileoverview Returns NNAudio Access installer file metadata (size, updated date) and version.
 * @module api/nnaudio-access/installer-info
 *
 * Uses service-role Supabase so storage list() returns size and updated_at reliably
 * (client anon list() often does not). Called by the dashboard downloads page.
 */

import { NextResponse } from "next/server";
import { createSupabaseServiceRole } from "@/utils/supabase/service";

const BUCKET = "builds";
const FOLDER = "nnaudio-access";
const WINDOWS_NAME = "NNAudioAccess_Installer.exe";
const MACOS_NAME = "NNAudioAccess_Installer.pkg";

export interface InstallerFileInfo {
  size: number | null;
  updatedAt: string | null;
}

export interface InstallerInfoResponse {
  version: string;
  windows: InstallerFileInfo;
  macos: InstallerFileInfo;
}

/**
 * @brief GET - Return installer metadata (version, file size and updated date for Windows and macOS).
 * @returns JSON InstallerInfoResponse
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServiceRole();

    let version = "1.0.0";
    const windows: InstallerFileInfo = { size: null, updatedAt: null };
    const macos: InstallerFileInfo = { size: null, updatedAt: null };

    // Version from manifest
    const { data: manifestBlob } = await supabase.storage
      .from(BUCKET)
      .download(`${FOLDER}/manifest.json`);
    if (manifestBlob) {
      try {
        const manifest = JSON.parse(await manifestBlob.text()) as {
          app_version?: string;
          version?: string;
        };
        version = manifest.app_version ?? manifest.version ?? version;
      } catch {
        // keep default version
      }
    }

    // List files with service role so we get metadata.size and updated_at
    const { data: files, error } = await supabase.storage
      .from(BUCKET)
      .list(FOLDER, {
        limit: 100,
        sortBy: { column: "name", order: "asc" },
      });

    if (!error && files?.length) {
      const windowsFile = files.find((f) => f.name === WINDOWS_NAME);
      const macosFile = files.find((f) => f.name === MACOS_NAME);

      const pickSize = (file: (typeof files)[0]): number | null => {
        if (!file) return null;
        const f = file as { size?: number; metadata?: { size?: number } };
        return f.metadata?.size ?? f.size ?? null;
      };
      const pickUpdatedAt = (file: (typeof files)[0]): string | null => {
        if (!file) return null;
        const f = file as { updated_at?: string };
        return f.updated_at ?? null;
      };

      if (windowsFile) {
        windows.size = pickSize(windowsFile);
        windows.updatedAt = pickUpdatedAt(windowsFile);
      }
      if (macosFile) {
        macos.size = pickSize(macosFile);
        macos.updatedAt = pickUpdatedAt(macosFile);
      }
    }

    // If list() did not return size/date (e.g. Storage API omits them), try HEAD from server
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
    const winUrl = `${baseUrl}/storage/v1/object/public/${BUCKET}/${FOLDER}/${encodeURIComponent(WINDOWS_NAME)}`;
    const macUrl = `${baseUrl}/storage/v1/object/public/${BUCKET}/${FOLDER}/${encodeURIComponent(MACOS_NAME)}`;
    if ((windows.size == null || windows.updatedAt == null) && baseUrl) {
      try {
        const winRes = await fetch(winUrl, { method: "HEAD" });
        if (winRes.ok) {
          const cl = winRes.headers.get("content-length");
          if (cl != null && windows.size == null) {
            const n = parseInt(cl, 10);
            if (!Number.isNaN(n)) windows.size = n;
          }
          const lm = winRes.headers.get("last-modified");
          if (lm != null && windows.updatedAt == null) windows.updatedAt = lm;
        }
      } catch {
        // ignore
      }
    }
    if ((macos.size == null || macos.updatedAt == null) && baseUrl) {
      try {
        const macRes = await fetch(macUrl, { method: "HEAD" });
        if (macRes.ok) {
          const cl = macRes.headers.get("content-length");
          if (cl != null && macos.size == null) {
            const n = parseInt(cl, 10);
            if (!Number.isNaN(n)) macos.size = n;
          }
          const lm = macRes.headers.get("last-modified");
          if (lm != null && macos.updatedAt == null) macos.updatedAt = lm;
        }
      } catch {
        // ignore
      }
    }

    return NextResponse.json({
      version,
      windows,
      macos,
    } satisfies InstallerInfoResponse);
  } catch (err) {
    console.error("[installer-info]", err);
    return NextResponse.json(
      { error: "Failed to load installer info" },
      { status: 500 }
    );
  }
}
