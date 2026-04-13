import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPublicSiteUrlForEmail } from '@/utils/public-site-url';

// Initialize Supabase with service role for automation processing
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

interface AutomationJob {
  job_id: string;
  job_type: string;
  automation_id: string;
  enrollment_id?: string;
  payload: {
    subscriber_id?: string;
    step_index?: number;
    step_config?: any;
    [key: string]: any;
  };
}

export async function POST(request: NextRequest) {
  console.log('🚀 Automation job processor started');
  
  try {
    // Verify request authorization (for cron jobs)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'automation-engine-secret';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.log('❌ Unauthorized automation job processor request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Process pending jobs in batches
    const batchSize = 10;
    let processedJobs = 0;
    let hasMoreJobs = true;
    
    while (hasMoreJobs && processedJobs < 100) { // Limit to 100 jobs per run
      // Get next batch of pending jobs
      const { data: jobs, error: jobsError } = await supabase
        .rpc('get_next_automation_job')
        .limit(batchSize);
      
      if (jobsError) {
        throw new Error(`Failed to fetch jobs: ${jobsError.message}`);
      }
      
      if (!jobs || jobs.length === 0) {
        hasMoreJobs = false;
        break;
      }
      
      console.log(`📋 Processing ${jobs.length} jobs`);
      
      // Process each job
      for (const job of jobs) {
        try {
          await processAutomationJob(job);
          processedJobs++;
        } catch (jobError) {
          console.error(`❌ Error processing job ${job.id}:`, jobError);
          
          // Mark job as failed
          await supabase.rpc('complete_automation_job', {
            p_job_id: job.id,
            p_status: 'failed',
            p_error_message: jobError instanceof Error ? jobError.message : 'Unknown error'
          });
        }
      }
      
      // If we got fewer jobs than requested, we're done
      if (jobs.length < batchSize) {
        hasMoreJobs = false;
      }
    }
    
    console.log(`✅ Processed ${processedJobs} automation jobs`);
    
    return NextResponse.json({
      success: true,
      processed_jobs: processedJobs,
      message: `Processed ${processedJobs} automation jobs`
    });
    
  } catch (error) {
    console.error('❌ Automation job processor error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function processAutomationJob(job: AutomationJob) {
  console.log(`🔄 Processing job: ${job.job_id} (type: ${job.job_type})`);
  
  switch (job.job_type) {
    case 'step_execution':
      await executeAutomationStep(job);
      break;
    case 'email_send':
      await processEmailSend(job);
      break;
    default:
      throw new Error(`Unknown job type: ${job.job_type}`);
  }
}

async function executeAutomationStep(job: AutomationJob) {
  if (!job.enrollment_id || !job.payload.step_config) {
    throw new Error('Missing enrollment_id or step_config for step execution');
  }
  
  const stepType = job.payload.step_config.type;
  console.log(`🎯 Executing step: ${stepType}`);
  
  let stepResult: any = { success: false };
  
  try {
    switch (stepType) {
      case 'email':
        stepResult = await executeEmailStep(job);
        break;
      case 'delay':
        stepResult = await executeDelayStep(job);
        break;
      case 'audience_add':
        stepResult = await executeAudienceAddStep(job);
        break;
      case 'audience_remove':
        stepResult = await executeAudienceRemoveStep(job);
        break;
      case 'tag_add':
        stepResult = await executeTagAddStep(job);
        break;
      case 'tag_remove':
        stepResult = await executeTagRemoveStep(job);
        break;
      case 'condition':
        stepResult = await executeConditionStep(job);
        break;
      default:
        throw new Error(`Unknown step type: ${stepType}`);
    }
    
    // Log step execution
    await supabase
      .from('automation_step_executions')
      .insert({
        enrollment_id: job.enrollment_id,
        automation_id: job.automation_id,
        subscriber_id: job.payload.subscriber_id,
        step_index: job.payload.step_index || 0,
        step_id: job.payload.step_config.id || crypto.randomUUID(),
        step_type: stepType,
        step_config: job.payload.step_config,
        status: stepResult.success ? 'completed' : 'failed',
        completed_at: new Date().toISOString(),
        execution_result: stepResult,
        error_message: stepResult.error || null
      });
    
    if (stepResult.success) {
      // Schedule next step if there is one
      await scheduleNextStep(job);
    }
    
    // Mark job as completed
    await supabase.rpc('complete_automation_job', {
      p_job_id: job.job_id,
      p_status: stepResult.success ? 'completed' : 'failed',
      p_result: stepResult,
      p_error_message: stepResult.error || null
    });
    
  } catch (error) {
    console.error(`❌ Step execution error:`, error);
    
    // Log failed step execution
    await supabase
      .from('automation_step_executions')
      .insert({
        enrollment_id: job.enrollment_id,
        automation_id: job.automation_id,
        subscriber_id: job.payload.subscriber_id,
        step_index: job.payload.step_index || 0,
        step_id: job.payload.step_config.id || crypto.randomUUID(),
        step_type: stepType,
        step_config: job.payload.step_config,
        status: 'failed',
        completed_at: new Date().toISOString(),
        execution_result: { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });
    
    throw error;
  }
}

async function executeEmailStep(job: AutomationJob): Promise<any> {
  // Get subscriber details
  const { data: subscriber, error: subscriberError } = await supabase
    .from('subscribers')
    .select('*')
    .eq('id', job.payload.subscriber_id)
    .single();
  
  if (subscriberError || !subscriber) {
    throw new Error(`Failed to get subscriber: ${subscriberError?.message}`);
  }
  
  const stepConfig = job.payload.step_config;
  
  // Get template if specified
  let emailContent = {
    subject: stepConfig.subject || 'Automated Email',
    html_content: stepConfig.html_content || '',
    text_content: stepConfig.text_content || ''
  };
  
  if (stepConfig.template_id) {
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', stepConfig.template_id)
      .single();
    
    if (template && !templateError) {
      emailContent = {
        subject: stepConfig.subject || template.subject,
        html_content: template.html_content || '',
        text_content: template.text_content || ''
      };
      
      // Update template last used and increment usage count
      await supabase
        .from('email_templates')
        .update({ 
          last_used_at: new Date().toISOString(),
          usage_count: (template.usage_count || 0) + 1
        })
        .eq('id', template.id);
    }
  }
  
  // Personalize content
  const personalizedContent = personalizeEmailContent(emailContent, subscriber);
  
  // Send email via existing email sending service
  const emailResult = await sendAutomationEmail(
    subscriber,
    personalizedContent,
    job.automation_id
  );
  
  if (emailResult.success) {
    // Increment emails sent counter
    await supabase.rpc('increment_enrollment_emails_sent', {
      enrollment_id: job.enrollment_id
    });
  }
  
  return emailResult;
}

async function executeDelayStep(job: AutomationJob): Promise<any> {
  const stepConfig = job.payload.step_config;
  const delayAmount = stepConfig.delay_amount || 1;
  const delayUnit = stepConfig.delay_unit || 'hours'; // minutes, hours, days
  
  let delayMs = 0;
  switch (delayUnit) {
    case 'minutes':
      delayMs = delayAmount * 60 * 1000;
      break;
    case 'hours':
      delayMs = delayAmount * 60 * 60 * 1000;
      break;
    case 'days':
      delayMs = delayAmount * 24 * 60 * 60 * 1000;
      break;
    default:
      throw new Error(`Invalid delay unit: ${delayUnit}`);
  }
  
  const nextActionTime = new Date(Date.now() + delayMs).toISOString();
  
  // Update enrollment next action time
  await supabase
    .from('email_automation_enrollments')
    .update({ next_action_at: nextActionTime })
    .eq('id', job.enrollment_id);
  
  return {
    success: true,
    delay_amount: delayAmount,
    delay_unit: delayUnit,
    next_action_at: nextActionTime
  };
}

async function executeAudienceAddStep(job: AutomationJob): Promise<any> {
  const stepConfig = job.payload.step_config;
  const audienceId = stepConfig.audience_id;
  
  if (!audienceId || !job.payload.subscriber_id) {
    throw new Error('Missing audience_id or subscriber_id for audience add step');
  }
  
  // Use the database function to add subscriber to audience
  const { data: result, error } = await supabase
    .rpc('add_subscriber_to_audience', {
      p_subscriber_id: job.payload.subscriber_id,
      p_audience_id: audienceId
    });
  
  if (error) {
    throw new Error(`Failed to add subscriber to audience: ${error.message}`);
  }
  
  return {
    success: true,
    action: 'audience_add',
    audience_id: audienceId,
    subscriber_id: job.payload.subscriber_id
  };
}

async function executeAudienceRemoveStep(job: AutomationJob): Promise<any> {
  const stepConfig = job.payload.step_config;
  const audienceId = stepConfig.audience_id;
  
  if (!audienceId || !job.payload.subscriber_id) {
    throw new Error('Missing audience_id or subscriber_id for audience remove step');
  }
  
  // Use the database function to remove subscriber from audience
  const { data: result, error } = await supabase
    .rpc('remove_subscriber_from_audience', {
      p_subscriber_id: job.payload.subscriber_id,
      p_audience_id: audienceId
    });
  
  if (error) {
    throw new Error(`Failed to remove subscriber from audience: ${error.message}`);
  }
  
  return {
    success: true,
    action: 'audience_remove',
    audience_id: audienceId,
    subscriber_id: job.payload.subscriber_id
  };
}

async function executeTagAddStep(job: AutomationJob): Promise<any> {
  const stepConfig = job.payload.step_config;
  const tagName = stepConfig.tag_name;
  
  if (!tagName || !job.payload.subscriber_id) {
    throw new Error('Missing tag_name or subscriber_id for tag add step');
  }
  
  // Add tag to subscriber - first check if tag doesn't already exist
  const { data: currentSubscriber } = await supabase
    .from('subscribers')
    .select('tags')
    .eq('id', job.payload.subscriber_id)
    .single();
  
  if (currentSubscriber && !currentSubscriber.tags?.includes(tagName)) {
    const newTags = [...(currentSubscriber.tags || []), tagName];
    const { error } = await supabase
      .from('subscribers')
      .update({
        tags: newTags,
        updated_at: new Date().toISOString()
      })
      .eq('id', job.payload.subscriber_id);
    
    if (error) {
      throw new Error(`Failed to add tag: ${error.message}`);
    }
  }
  
  return {
    success: true,
    action: 'tag_add',
    tag_name: tagName,
    subscriber_id: job.payload.subscriber_id
  };
}

async function executeTagRemoveStep(job: AutomationJob): Promise<any> {
  const stepConfig = job.payload.step_config;
  const tagName = stepConfig.tag_name;
  
  if (!tagName || !job.payload.subscriber_id) {
    throw new Error('Missing tag_name or subscriber_id for tag remove step');
  }
  
  // Remove tag from subscriber
  const { data: currentSubscriber } = await supabase
    .from('subscribers')
    .select('tags')
    .eq('id', job.payload.subscriber_id)
    .single();
  
  if (currentSubscriber && currentSubscriber.tags?.includes(tagName)) {
    const newTags = currentSubscriber.tags.filter((tag: string) => tag !== tagName);
    const { error } = await supabase
      .from('subscribers')
      .update({
        tags: newTags,
        updated_at: new Date().toISOString()
      })
      .eq('id', job.payload.subscriber_id);
    
    if (error) {
      throw new Error(`Failed to remove tag: ${error.message}`);
    }
  }
  
  return {
    success: true,
    action: 'tag_remove',
    tag_name: tagName,
    subscriber_id: job.payload.subscriber_id
  };
}

async function executeConditionStep(job: AutomationJob): Promise<any> {
  const stepConfig = job.payload.step_config;
  const conditions = stepConfig.conditions;
  
  if (!conditions || !job.payload.subscriber_id) {
    throw new Error('Missing conditions or subscriber_id for condition step');
  }
  
  // Evaluate conditions using the database function
  const { data: conditionMet, error } = await supabase
    .rpc('evaluate_automation_conditions', {
      p_conditions: conditions,
      p_subscriber_id: job.payload.subscriber_id,
      p_event_data: job.payload.step_config.event_data || {}
    });
  
  if (error) {
    throw new Error(`Failed to evaluate conditions: ${error.message}`);
  }
  
  return {
    success: true,
    action: 'condition_evaluation',
    condition_met: conditionMet,
    conditions: conditions
  };
}

async function scheduleNextStep(job: AutomationJob) {
  if (!job.enrollment_id || job.payload.step_index === undefined) {
    return;
  }
  
  // Get automation workflow to find next step
  const { data: automation, error: automationError } = await supabase
    .from('email_automations')
    .select('workflow_definition')
    .eq('id', job.automation_id)
    .single();
  
  if (automationError || !automation) {
    console.error('Failed to get automation workflow:', automationError);
    return;
  }
  
  const workflow = automation.workflow_definition as any;
  const steps = workflow.steps || [];
  const nextStepIndex = job.payload.step_index + 1;
  
  if (nextStepIndex < steps.length) {
    const nextStep = steps[nextStepIndex];
    
    // Schedule next step
    await supabase.rpc('schedule_automation_job', {
      p_job_type: 'step_execution',
      p_automation_id: job.automation_id,
      p_enrollment_id: job.enrollment_id,
      p_step_index: nextStepIndex,
      p_step_config: nextStep,
      p_subscriber_id: job.payload.subscriber_id,
      p_scheduled_for: new Date().toISOString(),
      p_priority: 5
    });
  } else {
    // Mark enrollment as completed
    await supabase
      .from('email_automation_enrollments')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', job.enrollment_id);
  }
}

async function processEmailSend(job: AutomationJob) {
  // This would integrate with the existing email sending infrastructure
  // For now, we'll just mark it as completed
  console.log('📧 Processing email send job:', job.job_id);
  
  await supabase.rpc('complete_automation_job', {
    p_job_id: job.job_id,
    p_status: 'completed',
    p_result: { success: true, message: 'Email send processed' }
  });
}

function personalizeEmailContent(content: any, subscriber: any): any {
  const metadata = subscriber.metadata || {};
  
  // Replace common variables
  const replacements = {
    '{{firstName}}': metadata.first_name || subscriber.first_name || 'there',
    '{{lastName}}': metadata.last_name || subscriber.last_name || '',
    '{{email}}': subscriber.email || '',
    '{{fullName}}': [metadata.first_name || subscriber.first_name, metadata.last_name || subscriber.last_name].filter(Boolean).join(' ') || 'there',
    '{{subscription}}': metadata.subscription || 'none',
    '{{lifetimePurchase}}': metadata.lifetime_purchase || metadata.lifetimePurchase || 'false',
    '{{companyName}}': metadata.company_name || metadata.companyName || '',
    '{{unsubscribeUrl}}': `${getPublicSiteUrlForEmail()}/unsubscribe?email=${encodeURIComponent(subscriber.email)}`,
    '{{currentDate}}': new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  };
  
  const personalizedContent = { ...content };
  
  // Replace variables in subject and content
  Object.keys(replacements).forEach(variable => {
    const value = replacements[variable as keyof typeof replacements];
    personalizedContent.subject = personalizedContent.subject.replace(new RegExp(variable, 'g'), value);
    personalizedContent.html_content = personalizedContent.html_content.replace(new RegExp(variable, 'g'), value);
    personalizedContent.text_content = personalizedContent.text_content.replace(new RegExp(variable, 'g'), value);
  });
  
  return personalizedContent;
}

async function sendAutomationEmail(subscriber: any, content: any, automationId: string): Promise<any> {
  try {
    const status = String(subscriber?.status || "").toLowerCase();
    if (status !== "active") {
      const suppressReason = `Suppressed: subscriber status is ${subscriber?.status || "unknown"}`;
      console.log(
        `🚫 Skipping automation email to ${subscriber?.email}: ${suppressReason}`
      );
      return {
        success: false,
        error: suppressReason,
        suppressed: true,
        recipient: subscriber?.email || null,
        subject: content?.subject || null,
      };
    }

    // Import the email utility
    const { sendEmail } = await import('../../../../utils/email');
    
    // Override email for testing - send to ryan@cymasphere.com instead of subscriber
    const testEmailOverride = process.env.AUTOMATION_TEST_EMAIL_OVERRIDE || 'ryan@nnaud.io';
    const recipientEmail = process.env.NODE_ENV === 'production' ? subscriber.email : testEmailOverride;
    
    console.log(`📧 Sending automation email to: ${recipientEmail} ${recipientEmail !== subscriber.email ? `(overridden from ${subscriber.email})` : ''}`);
    
    // Create email_sends record for tracking
    const { data: emailSend, error: emailSendError } = await supabase
      .from('email_sends')
      .insert({
        subscriber_id: subscriber.id,
        email: recipientEmail,
        status: 'pending',
        automation_id: automationId,
        message_id: null, // Will be updated when SendGrid returns message ID
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (emailSendError) {
      console.error('❌ Failed to create email_sends record:', emailSendError);
      throw new Error(`Failed to create email send record: ${emailSendError.message}`);
    }

    // Personalize content with subscriber data
    const personalizedContent = personalizeEmailContent(content, subscriber);
    
    // Add automation context to email
    const emailSubject = `[Automation] ${personalizedContent.subject}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 10px; border-radius: 5px; margin-bottom: 20px; font-size: 12px; color: #6c757d;">
          📧 This email was sent by an automation workflow
          ${recipientEmail !== subscriber.email ? `<br>Original recipient: ${subscriber.email}` : ''}
        </div>
        ${personalizedContent.html_content}
      </div>
    `;

    // Send email via SendGrid
    const emailResult = await sendEmail({
      to: recipientEmail,
      subject: emailSubject,
      html: emailHtml,
      text: personalizedContent.text_content,
      from: 'NNAudio Support <support@nnaud.io>',
      replyTo: 'support@nnaud.io'
    });

    if (emailResult.success) {
      // Update email_sends record with success
      await supabase
        .from('email_sends')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          message_id: emailResult.messageId
        })
        .eq('id', emailSend.id);

      console.log(`✅ Automation email sent successfully to ${recipientEmail}`);
      console.log(`   Message ID: ${emailResult.messageId}`);
      console.log(`   Subject: ${emailSubject}`);

      return {
        success: true,
        message: 'Email sent successfully',
        recipient: recipientEmail,
        originalRecipient: subscriber.email,
        subject: emailSubject,
        messageId: emailResult.messageId,
        sendRecordId: emailSend.id
      };
    } else {
      // Update email_sends record with failure
      await supabase
        .from('email_sends')
        .update({
          status: 'failed',
          bounce_reason: emailResult.error || 'Unknown error'
        })
        .eq('id', emailSend.id);

      console.error(`❌ Failed to send automation email: ${emailResult.error}`);
      
      return {
        success: false,
        error: emailResult.error || 'Failed to send email',
        recipient: recipientEmail,
        originalRecipient: subscriber.email,
        subject: emailSubject
      };
    }
  } catch (error) {
    console.error('❌ Error in sendAutomationEmail:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error sending automation email',
      recipient: subscriber.email,
      subject: content.subject
    };
  }
} 