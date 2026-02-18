import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * GET /api/email-campaigns/campaigns/[id]
 * Get a single email campaign (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Get campaign
    const { data: campaign, error: campaignError } = await supabase
      .from("email_campaigns")
      .select("*")
      .eq("id", id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Get audience relationships
    const { data: audienceRelations } = await supabase
      .from("email_campaign_audiences")
      .select("audience_id, is_excluded")
      .eq("campaign_id", id);

    const audienceIds: string[] = [];
    const excludedAudienceIds: string[] = [];

    if (audienceRelations) {
      for (const relation of audienceRelations) {
        if (relation.audience_id) {
          if (relation.is_excluded) {
            excludedAudienceIds.push(relation.audience_id);
          } else {
            audienceIds.push(relation.audience_id);
          }
        }
      }
    }

    // Transform the data for frontend consumption
    const transformedCampaign = {
      ...campaign,
      senderName: campaign.sender_name,
      senderEmail: campaign.sender_email,
      replyToEmail: campaign.reply_to_email,
      preheader: campaign.preheader,
      description: (campaign as { description?: string | null }).description ?? undefined,
      htmlContent: campaign.html_content,
      textContent: campaign.text_content,
      audienceIds,
      excludedAudienceIds,
    };

    return NextResponse.json({
      success: true,
      campaign: transformedCampaign,
    });
  } catch (error) {
    console.error("Error in GET /api/email-campaigns/campaigns/[id]:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/email-campaigns/campaigns/[id]
 * Update an email campaign (admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const body = await request.json();

    const {
      name,
      subject,
      senderName,
      senderEmail,
      replyToEmail,
      preheader,
      description,
      htmlContent,
      textContent,
      audienceIds,
      excludedAudienceIds,
      status,
      scheduled_at,
    } = body;

    // Validate required fields
    if (!name || !subject) {
      return NextResponse.json(
        { success: false, error: "Name and subject are required" },
        { status: 400 }
      );
    }

    // Update campaign
    const updateData: any = {
      name,
      subject,
      updated_at: new Date().toISOString(),
    };

    if (senderName !== undefined) updateData.sender_name = senderName;
    if (senderEmail !== undefined) updateData.sender_email = senderEmail;
    if (replyToEmail !== undefined) updateData.reply_to_email = replyToEmail;
    if (preheader !== undefined) updateData.preheader = preheader;
    if (description !== undefined) updateData.description = description;
    if (htmlContent !== undefined) updateData.html_content = htmlContent;
    if (textContent !== undefined) updateData.text_content = textContent;
    if (status !== undefined) updateData.status = status;
    if (scheduled_at !== undefined) updateData.scheduled_at = scheduled_at;

    const { data: campaign, error: campaignError } = await supabase
      .from("email_campaigns")
      .update(updateData)
      .eq("id", id)
      .select("id, name, subject, status")
      .single();

    if (campaignError) {
      console.error("Error updating campaign:", campaignError);
      return NextResponse.json(
        { success: false, error: campaignError.message || "Failed to update campaign" },
        { status: 500 }
      );
    }

    // Update audience relations if provided
    if (audienceIds !== undefined || excludedAudienceIds !== undefined) {
      // Delete existing relations
      await supabase
        .from("email_campaign_audiences")
        .delete()
        .eq("campaign_id", id);

      // Create new relations
      const relations = [
        ...((audienceIds || []) as string[]).map((audienceId: string) => ({
          campaign_id: id,
          audience_id: audienceId,
          is_excluded: false,
        })),
        ...((excludedAudienceIds || []) as string[]).map((audienceId: string) => ({
          campaign_id: id,
          audience_id: audienceId,
          is_excluded: true,
        })),
      ];

      if (relations.length > 0) {
        const { error: relationsError } = await supabase
          .from("email_campaign_audiences")
          .insert(relations);

        if (relationsError) {
          console.error("Error updating audience relations:", relationsError);
          // Don't fail the whole request, just log the error
        }
      }
    }

    return NextResponse.json({
      success: true,
      campaign,
    });
  } catch (error) {
    console.error("Error in PUT /api/email-campaigns/campaigns/[id]:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/email-campaigns/campaigns/[id]
 * Delete an email campaign (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Delete campaign (cascade will handle related records)
    const { error } = await supabase
      .from("email_campaigns")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting campaign:", error);
      return NextResponse.json(
        { success: false, error: error.message || "Failed to delete campaign" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Campaign deleted successfully",
    });
  } catch (error) {
    console.error("Error in DELETE /api/email-campaigns/campaigns/[id]:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

