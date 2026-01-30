/**
 * @fileoverview API route to run PNG/JPEG → WebP conversion and update refs (admin only).
 * @module api/admin/site-management/convert-to-webp
 *
 * POST /api/admin/site-management/convert-to-webp
 * Body: { dryRun?: boolean; refsOnly?: boolean }
 * Returns: { success, result?: ConvertToWebPResult, dbRefs?: UpdateDbImageRefsResult, error?: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createSupabaseServiceRole } from "@/utils/supabase/service";
import { checkAdmin } from "@/app/actions/user-management";
import { runConvertToWebP } from "@/utils/site-management/convert-to-webp";
import { convertStorageToWebP } from "@/utils/site-management/convert-storage-to-webp";
import { updateDbImageRefs } from "@/utils/site-management/update-db-image-refs";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await checkAdmin(supabase))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: {
      dryRun?: boolean;
      refsOnly?: boolean;
      revertDb?: boolean;
      convertStorage?: boolean;
    } = {};
    try {
      body = await request.json();
    } catch {
      // optional body
    }

    const dryRun = body.dryRun ?? false;
    const adminClient = await createSupabaseServiceRole();

    let result = null;
    let dbRefs = null;
    let storageResult = null;

    if (body.revertDb) {
      // Revert DB: .webp -> .png so links point at files that exist in storage.
      dbRefs = await updateDbImageRefs(adminClient, { dryRun, revert: true });
      dbRefs = {
        productsUpdated: dbRefs.productsUpdated,
        bundlesUpdated: dbRefs.bundlesUpdated,
        errors: dbRefs.errors,
        reverted: true,
      };
    } else if (body.convertStorage) {
      // Strategic swap: fetch storage images via authenticated endpoint, convert to WebP, upload, then update DB.
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      storageResult = await convertStorageToWebP(adminClient, {
        dryRun,
        ...(supabaseUrl && serviceRoleKey ? { supabaseUrl, serviceRoleKey } : {}),
      });
    } else {
      // Local public/ + code refs only (no DB).
      result = await runConvertToWebP({
        dryRun,
        refsOnly: body.refsOnly ?? false,
      });
    }

    return NextResponse.json({
      success: true,
      result,
      dbRefs,
      storageResult,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[site-management/convert-to-webp]", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
