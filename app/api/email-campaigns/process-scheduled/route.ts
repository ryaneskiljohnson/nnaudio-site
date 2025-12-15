import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail, sendBatchEmail } from "@/utils/email";
import { injectEmailTracking, createSendRecord } from "@/utils/email-tracking";
import { personalizeContent } from "@/utils/email-campaigns/email-generation";

// Feature flag: Enable parallel batch sending (sends multiple personalized emails concurrently)
// Set ENABLE_BATCH_EMAIL_SENDING=true to enable (much faster for large campaigns)
// Uses parallel sending: sends multiple personalized emails at once instead of one-by-one
const ENABLE_BATCH_SENDING = process.env.ENABLE_BATCH_EMAIL_SENDING === 'true';
const PARALLEL_BATCH_SIZE = parseInt(process.env.EMAIL_PARALLEL_BATCH_SIZE || '50'); // Emails to send concurrently
const DELAY_BETWEEN_BATCHES_MS = parseInt(process.env.EMAIL_BATCH_DELAY_MS || '200'); // Delay between batches to avoid rate limits

// Check if content contains personalization variables
function hasPersonalizationVariables(content: string): boolean {
  const personalizationPatterns = [
    /\{\{firstName\}\}/,
    /\{\{lastName\}\}/,
    /\{\{fullName\}\}/,
    /\{\{email\}\}/,
    /\{\{subscription\}\}/,
    /\{\{lifetimePurchase\}\}/,
    /\{\{companyName\}\}/,
    /\{\{unsubscribeUrl\}\}/,
    /\{\{currentDate\}\}/,
  ];
  
  return personalizationPatterns.some(pattern => pattern.test(content));
}

// Store the last execution time in memory
let lastCronExecution: string | null = null;

// Helper function to generate proper HTML template for scheduled campaigns
function generateProperEmailTemplate(
  contentHtml: string,
  subject: string
): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f7f7;">
    <!-- Outer table for background color -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f7f7f7;">
        <tr>
            <td align="center" style="padding: 20px 0;">
                <!-- Inner table for content width constraint -->
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; min-width: 320px; margin: 0 auto;">
                    <tr>
                        <td style="background-color: #ffffff; padding: 0 24px;">
        .header {
            background: linear-gradient(135deg, #1a1a1a 0%, #121212 100%);
            padding: 20px;
            text-align: center;
        }
        .logo {
            color: #ffffff;
            font-size: 1.5rem;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        .logo .cyma {
            background: linear-gradient(90deg, #6c63ff, #4ecdc4);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .content {
            padding: 30px;
        }
        .content div {
            font-size: 1rem;
            color: #555;
            line-height: 1.6;
            margin-bottom: 1rem;
        }
        .content h1 {
            font-size: 2.5rem;
            color: #333;
            margin-bottom: 1rem;
            text-align: center;
            background: linear-gradient(135deg, #333, #666);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            font-weight: 800;
        }
        .content a {
            display: inline-block;
            padding: 12px 24px;
            background: linear-gradient(90deg, #6c63ff, #4ecdc4);
            color: white;
            text-decoration: none;
            border-radius: 25px;
            font-weight: 600;
            transition: all 0.3s ease;
        }
        .footer {
            padding: 20px;
            text-align: center;
            font-size: 12px;
            background-color: #f8f9fa;
            color: #666666;
            border-top: 1px solid #e9ecef;
        }
        .footer a {
            color: #6c63ff;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">
                <span class="cyma">CYMA</span><span>SPHERE</span>
            </div>
        </div>
        
        <div class="content">
            ${contentHtml}
                            
                            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; text-align: center; font-size: 12px; color: #666666;">
                                <p>You're receiving this email because you're subscribed to Cymasphere updates.</p>
                                <p><a href="https://cymasphere.com/unsubscribe" style="color: #ffffff; text-decoration: none;">Unsubscribe</a> | <a href="https://cymasphere.com" style="color: #ffffff; text-decoration: none;">Visit our website</a></p>
                                <p>© ${new Date().getFullYear()} NNAud.io. All rights reserved.</p>
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

// This endpoint will be called by a cron job every minute
export async function POST(request: NextRequest) {
  const executionTime = new Date().toISOString();
  console.log(`🔄 Processing scheduled campaigns at ${executionTime}...`);

  // Store the execution time
  lastCronExecution = executionTime;

  try {
    // Verify the request is authorized (Vercel cron, AWS cron, or manual with secret)
    const authHeader = request.headers.get("authorization");
    const vercelSecret = request.headers.get("x-vercel-cron-signature");
    const cronSecret = process.env.CRON_SECRET || "your-secret-key";

    // Allow Vercel cron jobs, AWS cron jobs with API key, or manual calls with API key
    const isVercelCron = !!vercelSecret;
    const isApiKeyCron = authHeader === `Bearer ${cronSecret}`;
    const isAuthorized = isVercelCron || isApiKeyCron;

    if (!isAuthorized) {
      console.log(
        "❌ Unauthorized cron job request - missing vercel cron signature or API key"
      );
      console.log(
        "❌ Expected Authorization header:",
        `Bearer ${cronSecret.slice(0, 8)}...`
      );
      console.log("❌ Received Authorization header:", authHeader || "none");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(
      "✅ Authorized request:",
      isVercelCron ? "Vercel Cron" : "API Key Cron"
    );

    // Use admin client for cron jobs (bypasses RLS and doesn't need user authentication)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("❌ Missing Supabase configuration");
      return NextResponse.json(
        {
          error: "Server configuration error - missing Supabase credentials",
        },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log("🔧 Using Supabase admin client for cron job");

    // Find campaigns that are scheduled and due to be sent
    const now = new Date().toISOString();
    console.log(`🔍 Looking for campaigns scheduled before: ${now}`);
    const { data: scheduledCampaigns, error: fetchError } = await supabase
      .from("email_campaigns")
      .select(
        `
        *,
        email_campaign_audiences(
          audience_id,
          is_excluded
        )
      `
      )
      .eq("status", "scheduled")
      .lte("scheduled_at", now)
      .order("scheduled_at", { ascending: true });

    if (fetchError) {
      console.error("❌ Error fetching scheduled campaigns:", fetchError);
      return NextResponse.json(
        {
          error: "Failed to fetch scheduled campaigns",
          details: fetchError.message,
        },
        { status: 500 }
      );
    }

    if (!scheduledCampaigns || scheduledCampaigns.length === 0) {
      console.log("✅ No scheduled campaigns due for sending");

      // Show recently processed campaigns for debugging
      const { data: recentCampaigns } = await supabase
        .from("email_campaigns")
        .select(
          "id, name, status, sent_at, total_recipients, emails_sent, updated_at"
        )
        .in("status", ["sent", "failed", "sending"])
        .order("updated_at", { ascending: false })
        .limit(5);

      return NextResponse.json({
        message: "No scheduled campaigns to process",
        processed: 0,
        recentlyProcessed:
          recentCampaigns?.map((c) => ({
            id: c.id,
            name: c.name,
            status: c.status,
            sent_at: c.sent_at,
            total_recipients: c.total_recipients,
            emails_sent: c.emails_sent,
            last_updated: c.updated_at,
          })) || [],
      });
    }

    console.log(
      `📧 Found ${scheduledCampaigns.length} scheduled campaigns to process`
    );

    const results = [];

    // Process each scheduled campaign
    for (const campaign of scheduledCampaigns) {
      console.log(`🚀 Processing campaign: ${campaign.name} (${campaign.id})`);

      try {
        // Update status to 'sending' to prevent duplicate processing
        const { error: updateError } = await supabase
          .from("email_campaigns")
          .update({
            status: "sending",
            updated_at: new Date().toISOString(),
          })
          .eq("id", campaign.id);

        if (updateError) {
          console.error(
            `❌ Failed to update campaign ${campaign.id} status:`,
            updateError
          );
          results.push({
            campaignId: campaign.id,
            name: campaign.name,
            status: "failed",
            error: "Failed to update status",
          });
          continue;
        }

        // Extract audience data
        const audienceIds =
          campaign.email_campaign_audiences
            ?.filter((rel: any) => !rel.is_excluded)
            .map((rel: any) => rel.audience_id) || [];

        const excludedAudienceIds =
          campaign.email_campaign_audiences
            ?.filter((rel: any) => rel.is_excluded)
            .map((rel: any) => rel.audience_id) || [];

        console.log(
          `📊 Campaign audiences - Included: ${audienceIds.length}, Excluded: ${excludedAudienceIds.length}`
        );

        if (audienceIds.length === 0) {
          console.log(
            `⚠️ Campaign ${campaign.name} has no target audiences, skipping`
          );

          // Update to failed status
          await supabase
            .from("email_campaigns")
            .update({
              status: "failed",
              updated_at: new Date().toISOString(),
            })
            .eq("id", campaign.id);

          results.push({
            campaignId: campaign.id,
            name: campaign.name,
            status: "failed",
            error: "No target audiences",
          });
          continue;
        }

        // Get subscribers for the audiences
        const subscribersResult = await getSubscribersForAudiences(
          audienceIds,
          excludedAudienceIds
        );

        if (subscribersResult.length === 0) {
          console.log(
            `⚠️ Campaign ${campaign.name} has no target subscribers, skipping`
          );

          // Update to completed status (no one to send to)
          await supabase
            .from("email_campaigns")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
              total_recipients: 0,
              emails_sent: 0,
              updated_at: new Date().toISOString(),
            })
            .eq("id", campaign.id);

          results.push({
            campaignId: campaign.id,
            name: campaign.name,
            status: "sent",
            totalRecipients: 0,
            sent: 0,
            failed: 0,
          });
          continue;
        }

        console.log(`📬 Sending to ${subscribersResult.length} subscribers`);

        // Debug AWS environment variables
        console.log("🔧 AWS Environment Check:");
        console.log(
          "  AWS_ACCESS_KEY_ID:",
          process.env.AWS_ACCESS_KEY_ID
            ? `${process.env.AWS_ACCESS_KEY_ID.slice(0, 8)}...`
            : "NOT_SET"
        );
        console.log(
          "  AWS_SECRET_ACCESS_KEY:",
          process.env.AWS_SECRET_ACCESS_KEY
            ? `${process.env.AWS_SECRET_ACCESS_KEY.slice(0, 8)}...`
            : "NOT_SET"
        );
        console.log("  AWS_REGION:", process.env.AWS_REGION || "NOT_SET");

        // Send emails - Use parallel batch sending if enabled (sends multiple personalized emails concurrently)
        let sentCount = 0;
        let failedCount = 0;
        const sendResults = [];

        // Check if email content has personalization variables
        const htmlContent = campaign.html_content || '';
        const subjectContent = campaign.subject || '';
        const textContent = campaign.text_content || '';
        const hasPersonalization = hasPersonalizationVariables(htmlContent) || 
                                   hasPersonalizationVariables(subjectContent) || 
                                   hasPersonalizationVariables(textContent);

        if (ENABLE_BATCH_SENDING) {
          // PARALLEL BATCH SENDING: Send multiple personalized emails concurrently
          console.log(`🚀 Using PARALLEL batch sending mode (${PARALLEL_BATCH_SIZE} emails sent concurrently)`);
          console.log(`   Personalization: ${hasPersonalization ? 'ENABLED (each email personalized)' : 'DISABLED (same content for all)'}`);
          
          // Split subscribers into parallel batches
          const batches: typeof subscribersResult[][] = [];
          for (let i = 0; i < subscribersResult.length; i += PARALLEL_BATCH_SIZE) {
            batches.push(subscribersResult.slice(i, i + PARALLEL_BATCH_SIZE));
          }

          console.log(`📦 Split ${subscribersResult.length} subscribers into ${batches.length} parallel batches`);

          // Process each batch (sending all emails in batch concurrently)
          for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];
            console.log(`📤 Processing parallel batch ${batchIndex + 1}/${batches.length} (${batch.length} emails to send concurrently)...`);

            // Send all emails in this batch in parallel
            const batchPromises = batch.map(async (subscriber) => {
              try {
                // Create send record for tracking
                const sendId = await createSendRecord(
                  campaign.id,
                  subscriber.id,
                  subscriber.email,
                  supabase
                );

                // Generate proper HTML template
                let htmlContentForSubscriber = generateProperEmailTemplate(
                  campaign.html_content ||
                    `<h1>${campaign.subject || "Newsletter"}</h1><p>Content coming soon...</p>`,
                  campaign.subject || "Newsletter"
                );

                // Add tracking
                if (sendId) {
                  htmlContentForSubscriber = injectEmailTracking(
                    htmlContentForSubscriber,
                    campaign.id,
                    subscriber.id,
                    sendId
                  );
                }

                // Personalize content if variables are present
                let personalizedHtml = htmlContentForSubscriber;
                let personalizedText = campaign.text_content || campaign.subject || "Newsletter";
                let personalizedSubject = campaign.subject || "Newsletter";
                
                if (hasPersonalization) {
                  personalizedHtml = personalizeContent(htmlContentForSubscriber, subscriber);
                  personalizedText = personalizeContent(personalizedText, subscriber);
                  personalizedSubject = personalizeContent(personalizedSubject, subscriber);
                }

                // Send email
                const emailResult = await sendEmail({
                  to: subscriber.email,
                  subject: personalizedSubject,
                  html: personalizedHtml,
                  text: personalizedText,
                  from: `${campaign.sender_name || "Cymasphere"} <${
                    campaign.sender_email || "support@cymasphere.com"
                  }>`,
                  replyTo: campaign.reply_to_email || undefined,
                });

                if (emailResult.success) {
                  // Update send record with message_id
                  if (sendId && emailResult.messageId) {
                    await supabase
                      .from("email_sends")
                      .update({
                        status: "sent",
                        message_id: emailResult.messageId,
                      })
                      .eq("id", sendId);
                  }
                  return { success: true, email: subscriber.email, sendId, error: null };
                } else {
                  return { success: false, email: subscriber.email, sendId, error: emailResult.error };
                }
              } catch (emailError) {
                return { 
                  success: false, 
                  email: subscriber.email, 
                  sendId: null, 
                  error: emailError instanceof Error ? emailError.message : String(emailError) 
                };
              }
            });

            // Wait for all emails in this batch to complete (parallel execution)
            const batchResults = await Promise.all(batchPromises);

            // Process results
            for (const result of batchResults) {
              if (result.success) {
                sentCount++;
                sendResults.push({
                  email: result.email,
                  success: true,
                  sendId: result.sendId,
                });
              } else {
                failedCount++;
                sendResults.push({
                  email: result.email,
                  success: false,
                  error: result.error,
                  sendId: result.sendId,
                });
              }
            }

            console.log(`✅ Parallel batch ${batchIndex + 1} completed: ${batchResults.filter(r => r.success).length}/${batch.length} sent successfully`);

            // Small delay between batches to avoid overwhelming AWS SES
            if (batchIndex < batches.length - 1) {
              await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
            }
          }
        } else {
          // Individual sending mode (original behavior - sequential, one at a time)
          console.log(`📧 Using SEQUENTIAL sending mode (one email per recipient, one at a time)`);
          
          for (const subscriber of subscribersResult) {
          try {
            // Create send record for tracking
            const sendId = await createSendRecord(
              campaign.id,
              subscriber.id,
              subscriber.email,
              supabase
            );

            // Generate proper HTML template (instead of using raw html_content)
            let htmlContent = generateProperEmailTemplate(
              campaign.html_content ||
                `<h1>${
                  campaign.subject || "Newsletter"
                }</h1><p>Content coming soon...</p>`,
              campaign.subject || "Newsletter"
            );

            if (sendId) {
              htmlContent = injectEmailTracking(
                htmlContent,
                campaign.id,
                subscriber.id,
                sendId
              );
              console.log(
                `📊 Added tracking to email for ${subscriber.email} (sendId: ${sendId})`
              );
            } else {
              console.log(
                `⚠️ No tracking added for ${subscriber.email} (send record creation failed)`
              );
            }

            // Personalize content if variables are present
            let personalizedHtml = htmlContent;
            let personalizedText = campaign.text_content || campaign.subject || "Newsletter";
            let personalizedSubject = campaign.subject || "Newsletter";
            
            if (hasPersonalization) {
              personalizedHtml = personalizeContent(htmlContent, subscriber);
              personalizedText = personalizeContent(personalizedText, subscriber);
              personalizedSubject = personalizeContent(personalizedSubject, subscriber);
            }

            const emailResult = await sendEmail({
              to: subscriber.email,
              subject: personalizedSubject,
              html: personalizedHtml,
              text: personalizedText,
              from: `${campaign.sender_name || "Cymasphere"} <${
                campaign.sender_email || "support@cymasphere.com"
              }>`,
              replyTo: campaign.reply_to_email || undefined,
            });

            if (emailResult.success) {
              sentCount++;
              console.log(`✅ Sent to ${subscriber.email} with tracking`);

              // Update send record with message_id if we have one
              if (sendId && emailResult.messageId) {
                await supabase
                  .from("email_sends")
                  .update({
                    status: "sent",
                    message_id: emailResult.messageId,
                  })
                  .eq("id", sendId);
              }
            } else {
              failedCount++;
              console.log(
                `❌ Failed to send to ${subscriber.email}:`,
                emailResult.error
              );
            }

            sendResults.push({
              email: subscriber.email,
              success: emailResult.success,
              error: emailResult.error,
              sendId: sendId,
            });

            // Small delay to avoid overwhelming the email service
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (emailError) {
            failedCount++;
            console.error(
              `❌ Exception sending to ${subscriber.email}:`,
              emailError
            );
            sendResults.push({
              email: subscriber.email,
              success: false,
              error:
                emailError instanceof Error
                  ? emailError.message
                  : "Unknown error",
              sendId: null,
            });
          }
        }
        } // Close the else block

        // Update campaign with final status
        const finalStatus =
          failedCount === subscribersResult.length ? "failed" : "sent";
        const successRate =
          subscribersResult.length > 0
            ? Math.round((sentCount / subscribersResult.length) * 100)
            : 0;

        const { error: finalUpdateError } = await supabase
          .from("email_campaigns")
          .update({
            status: finalStatus,
            sent_at: new Date().toISOString(),
            total_recipients: subscribersResult.length,
            emails_sent: sentCount,
            emails_delivered: sentCount, // Assume delivered = sent for now
            emails_bounced: failedCount,
            updated_at: new Date().toISOString(),
          })
          .eq("id", campaign.id);

        if (finalUpdateError) {
          console.error(
            `❌ Failed to update final campaign status:`,
            finalUpdateError
          );
        }

        console.log(
          `✅ Campaign ${campaign.name} completed - ${sentCount}/${subscribersResult.length} sent (${successRate}% success rate)`
        );

        results.push({
          campaignId: campaign.id,
          name: campaign.name,
          status: finalStatus,
          totalRecipients: subscribersResult.length,
          sent: sentCount,
          failed: failedCount,
          successRate: successRate,
        });
      } catch (campaignError) {
        console.error(
          `❌ Error processing campaign ${campaign.id}:`,
          campaignError
        );

        // Update campaign to failed status
        await supabase
          .from("email_campaigns")
          .update({
            status: "failed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", campaign.id);

        results.push({
          campaignId: campaign.id,
          name: campaign.name,
          status: "failed",
          error:
            campaignError instanceof Error
              ? campaignError.message
              : "Unknown error",
        });
      }
    }

    console.log(
      `🎉 Processed ${scheduledCampaigns.length} scheduled campaigns`
    );

    return NextResponse.json({
      message: `Successfully processed ${scheduledCampaigns.length} scheduled campaigns`,
      processed: scheduledCampaigns.length,
      results: results,
    });
  } catch (error) {
    console.error("❌ Fatal error in scheduled campaign processing:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Helper function to get subscribers for audiences (reused from send route)
async function getSubscribersForAudiences(
  audienceIds: string[],
  excludedAudienceIds: string[] = []
) {
  // Use admin client (same as main function)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log("🔍 Fetching subscribers for audiences:", {
    audienceIds,
    excludedAudienceIds,
  });

  try {
    // Get all unique subscribers from included audiences
    let includedSubscribers: any[] = [];
    const subscriberMap = new Map();

    if (audienceIds.length > 0) {
      // Process each audience individually to handle static vs dynamic
      for (const audienceId of audienceIds) {
        // Get audience to check if it's static or dynamic
        const { data: audience } = await supabase
          .from("email_audiences")
          .select("id, name, filters")
          .eq("id", audienceId)
          .single();

        if (!audience) {
          console.error(`❌ Audience ${audienceId} not found`);
          continue;
        }

        const filters = (audience.filters as any) || {};
        const isStatic = filters.audience_type === "static";

        if (isStatic) {
          // For static audiences, get subscribers from junction table
          const { data: audienceSubscribers, error: audienceError } = await supabase
            .from("email_audience_subscribers")
            .select(
              `
              subscriber_id,
              subscribers (
                id,
                email,
                status,
                user_id
              )
            `
            )
            .eq("audience_id", audienceId);

          if (audienceError) {
            console.error(`❌ Error fetching static audience subscribers:`, audienceError);
            continue;
          }

          audienceSubscribers?.forEach((rel: any) => {
            if (rel.subscribers && 
                rel.subscribers.status === "active" && 
                rel.subscribers.status !== "INACTIVE" && 
                rel.subscribers.status !== "unsubscribed") {
              subscriberMap.set(rel.subscribers.id, rel.subscribers);
            }
          });
        } else {
          // For dynamic audiences, query subscribers based on filters
          console.log(`📋 Processing dynamic audience: ${audience.name}`);
          
          try {
            const rules = filters.rules || [];
            let statusValue: string | null = null;
            let subscriptionValue: string | null = null;

            for (const rule of rules) {
              if (rule.field === 'status') {
                statusValue = rule.value;
              } else if (rule.field === 'subscription') {
                subscriptionValue = rule.value;
              }
            }

            const effectiveStatus = statusValue || 'active';

            let subscribersQuery = supabase
              .from('subscribers')
              .select('id, email, status, user_id')
              .eq('status', effectiveStatus);

            if (subscriptionValue) {
              const { data: profilesData } = await supabase
                .from('profiles')
                .select('id')
                .eq('subscription', subscriptionValue);

              const profileIds = (profilesData || []).map((p: any) => p.id);
              if (profileIds.length === 0) {
                console.log(`⚠️ No profiles found with subscription: ${subscriptionValue}`);
                continue;
              }
              subscribersQuery = subscribersQuery.in('user_id', profileIds);
            }

            const { data: dynamicSubscribers, error: dynamicError } = await subscribersQuery;

            if (dynamicError) {
              console.error(`❌ Error querying dynamic subscribers:`, dynamicError);
              continue;
            }

            dynamicSubscribers?.forEach((sub: any) => {
              if (sub.status === "active" && 
                  sub.status !== "INACTIVE" && 
                  sub.status !== "unsubscribed") {
                subscriberMap.set(sub.id, sub);
              }
            });

            console.log(`✅ Dynamic audience "${audience.name}" returned ${dynamicSubscribers?.length || 0} subscribers`);
          } catch (error) {
            console.error(`❌ Error processing dynamic audience:`, error);
            continue;
          }
        }
      }

      includedSubscribers = Array.from(subscriberMap.values());
    }

    // Get excluded subscribers if any
    let excludedSubscriberIds: string[] = [];
    const excludedSubscriberSet = new Set<string>();

    if (excludedAudienceIds.length > 0) {
      // Process each excluded audience individually
      for (const excludedAudienceId of excludedAudienceIds) {
        const { data: excludedAudience } = await supabase
          .from("email_audiences")
          .select("id, name, filters")
          .eq("id", excludedAudienceId)
          .single();

        if (!excludedAudience) {
          console.error(`❌ Excluded audience ${excludedAudienceId} not found`);
          continue;
        }

        const excludedFilters = (excludedAudience.filters as any) || {};
        const isStatic = excludedFilters.audience_type === "static";

        if (isStatic) {
          const { data: excludedAudienceSubscribers, error: excludedError } =
            await supabase
              .from("email_audience_subscribers")
              .select("subscriber_id")
              .eq("audience_id", excludedAudienceId);

          if (excludedError) {
            console.error(
              `❌ Error fetching excluded static audience subscribers:`,
              excludedError
            );
            continue;
          }

          excludedAudienceSubscribers?.forEach((rel: any) => {
            excludedSubscriberSet.add(rel.subscriber_id);
          });
        } else {
          // For dynamic excluded audiences, query subscribers based on filters
          console.log(`📋 Processing dynamic excluded audience: ${excludedAudience.name}`);
          
          try {
            const rules = excludedFilters.rules || [];
            let statusValue: string | null = null;
            let subscriptionValue: string | null = null;

            for (const rule of rules) {
              if (rule.field === 'status') {
                statusValue = rule.value;
              } else if (rule.field === 'subscription') {
                subscriptionValue = rule.value;
              }
            }

            const effectiveStatus = statusValue || 'active';

            let subscribersQuery = supabase
              .from('subscribers')
              .select('id')
              .eq('status', effectiveStatus);

            if (subscriptionValue) {
              const { data: profilesData } = await supabase
                .from('profiles')
                .select('id')
                .eq('subscription', subscriptionValue);

              const profileIds = (profilesData || []).map((p: any) => p.id);
              if (profileIds.length > 0) {
                subscribersQuery = subscribersQuery.in('user_id', profileIds);
              }
            }

            const { data: dynamicSubscribers, error: dynamicError } = await subscribersQuery;

            if (dynamicError) {
              console.error(`❌ Error querying dynamic excluded subscribers:`, dynamicError);
              continue;
            }

            dynamicSubscribers?.forEach((sub: any) => {
              excludedSubscriberSet.add(sub.id);
            });

            console.log(`✅ Dynamic excluded audience "${excludedAudience.name}" returned ${dynamicSubscribers?.length || 0} subscribers`);
          } catch (error) {
            console.error(`❌ Error processing dynamic excluded audience:`, error);
            continue;
          }
        }
      }

      excludedSubscriberIds = Array.from(excludedSubscriberSet);
    }

    // Filter out excluded subscribers
    const finalSubscribers = includedSubscribers.filter(
      (subscriber: any) => !excludedSubscriberIds.includes(subscriber.id)
    );

    console.log(`📊 Subscriber calculation:`, {
      includedCount: includedSubscribers.length,
      excludedCount: excludedSubscriberIds.length,
      finalCount: finalSubscribers.length,
    });
    
    // Log unsubscribe filtering summary
    const activeSubscribers = finalSubscribers.filter(s => s?.status === 'active');
    const inactiveSubscribers = finalSubscribers.filter(s => s?.status === 'INACTIVE' || s?.status === 'unsubscribed');
    console.log(`🚫 Unsubscribe filtering summary:`, {
      total: finalSubscribers.length,
      active: activeSubscribers.length,
      inactive: inactiveSubscribers.length,
      inactiveEmails: inactiveSubscribers.map(s => s?.email)
    });

    return finalSubscribers;
  } catch (error) {
    console.error("❌ Error in getSubscribersForAudiences:", error);
    throw error;
  }
}

// Allow GET requests for testing purposes and showing status
export async function GET() {
  const now = new Date().toISOString();

  // Calculate time since last execution
  let timeSinceLastExecution = null;
  if (lastCronExecution) {
    const lastTime = new Date(lastCronExecution);
    const currentTime = new Date();
    const diffMs = currentTime.getTime() - lastTime.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    timeSinceLastExecution = diffMinutes;
  }

  return NextResponse.json({
    message: "Scheduled campaign processor status",
    currentTime: now,
    lastExecutionTime: lastCronExecution,
    timeSinceLastExecution: timeSinceLastExecution
      ? `${timeSinceLastExecution} minutes ago`
      : "Never executed",
    cronSchedule: "Every minute",
    nextExpectedExecution: lastCronExecution
      ? new Date(
          new Date(lastCronExecution).getTime() + 1 * 60 * 1000
        ).toISOString()
      : "Unknown",
  });
}
