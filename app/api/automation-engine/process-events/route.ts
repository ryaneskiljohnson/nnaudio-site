import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAuthorizedCronRequest } from '@/utils/auth/require-cron';

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

interface AutomationEvent {
  id: string;
  event_type: string;
  event_data: any;
  subscriber_id: string;
  user_id?: string;
  campaign_id?: string;
  occurred_at: string;
}

interface Automation {
  id: string;
  name: string;
  trigger_type: string;
  trigger_conditions: any;
  workflow_definition: any;
  status: string;
  enrollment_limit_per_user: number;
  total_enrollments: number;
  active_enrollments: number;
}

export async function POST(request: NextRequest) {
  console.log('🤖 Automation Engine: Processing events...');
  
  try {
    // Authorized only via a constant-time match of `Authorization: Bearer ${CRON_SECRET}`.
    if (!isAuthorizedCronRequest(request)) {
      console.log('❌ Unauthorized automation engine request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get unprocessed events
    const { data: events, error: eventsError } = await supabase
      .from('automation_events')
      .select('*')
      .eq('processed', false)
      .order('occurred_at', { ascending: true })
      .limit(100);
    
    if (eventsError) {
      console.error('❌ Error fetching events:', eventsError);
      return NextResponse.json({ 
        error: 'Failed to fetch events',
        details: eventsError.message 
      }, { status: 500 });
    }
    
    if (!events || events.length === 0) {
      console.log('✅ No unprocessed events found');
      return NextResponse.json({ 
        message: 'No events to process',
        processed: 0
      });
    }
    
    console.log(`📧 Found ${events.length} unprocessed events`);
    
    let processedCount = 0;
    const results = [];
    
    // Process each event
    for (const event of events) {
      try {
        console.log(`🔄 Processing event: ${event.event_type} for subscriber ${event.subscriber_id}`);
        
        const result = await processAutomationEvent(event);
        results.push(result);
        
        if (result.success) {
          processedCount++;
          
          // Mark event as processed
          await supabase
            .from('automation_events')
            .update({ 
              processed: true,
              processed_at: new Date().toISOString(),
              triggered_automations: result.triggered_automations || []
            })
            .eq('id', event.id);
          
          console.log(`✅ Event processed successfully: ${event.event_type}`);
        } else {
          console.error(`❌ Failed to process event: ${event.event_type}`, result.error);
        }
        
      } catch (error) {
        console.error(`❌ Exception processing event ${event.id}:`, error);
        results.push({
          event_id: event.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    console.log(`🎉 Processed ${processedCount}/${events.length} events successfully`);
    
    return NextResponse.json({
      message: `Processed ${processedCount} events`,
      processed: processedCount,
      total: events.length,
      results: results
    });
    
  } catch (error) {
    console.error('❌ Fatal error in automation engine:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function processAutomationEvent(event: AutomationEvent) {
  console.log(`🔍 Looking for automations triggered by: ${event.event_type}`);
  
  try {
    // Find automations that match this event type
    const { data: automations, error: automationsError } = await supabase
      .from('email_automations')
      .select('*')
      .eq('trigger_type', event.event_type)
      .eq('status', 'active');
    
    if (automationsError) {
      throw new Error(`Failed to fetch automations: ${automationsError.message}`);
    }
    
    if (!automations || automations.length === 0) {
      console.log(`📭 No active automations found for trigger: ${event.event_type}`);
      return {
        event_id: event.id,
        success: true,
        triggered_automations: [],
        message: 'No matching automations'
      };
    }
    
    console.log(`🎯 Found ${automations.length} potential automations for ${event.event_type}`);
    
    const triggeredAutomations = [];
    
    // Check each automation for trigger conditions
    for (const automation of automations) {
      try {
        console.log(`🔬 Evaluating automation: ${automation.name}`);
        
        // Check if subscriber meets trigger conditions
        const conditionsMet = await evaluateTriggerConditions(
          automation.trigger_conditions,
          event.subscriber_id,
          event.event_data
        );
        
        if (!conditionsMet) {
          console.log(`❌ Trigger conditions not met for: ${automation.name}`);
          continue;
        }
        
        // Check enrollment limits
        const canEnroll = await checkEnrollmentLimits(automation, event.subscriber_id);
        if (!canEnroll) {
          console.log(`⚠️ Enrollment limit reached for: ${automation.name}`);
          continue;
        }
        
        // Enroll subscriber in automation
        const enrollmentResult = await enrollSubscriberInAutomation(
          automation,
          event.subscriber_id,
          event.event_data
        );
        
        if (enrollmentResult.success) {
          triggeredAutomations.push({
            automation_id: automation.id,
            automation_name: automation.name,
            enrollment_id: enrollmentResult.enrollment_id
          });
          console.log(`✅ Successfully enrolled subscriber in: ${automation.name}`);
        } else {
          console.error(`❌ Failed to enroll in automation: ${automation.name}`, enrollmentResult.error);
        }
        
      } catch (automationError) {
        console.error(`❌ Error processing automation ${automation.id}:`, automationError);
      }
    }
    
    return {
      event_id: event.id,
      success: true,
      triggered_automations: triggeredAutomations,
      message: `Triggered ${triggeredAutomations.length} automations`
    };
    
  } catch (error) {
    return {
      event_id: event.id,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function evaluateTriggerConditions(
  conditions: any,
  subscriberId: string,
  eventData: any
): Promise<boolean> {
  // If no conditions specified, trigger is always met
  if (!conditions || Object.keys(conditions).length === 0) {
    return true;
  }
  
  // Check if condition rules exist
  if (!conditions.rules || !Array.isArray(conditions.rules)) {
    return true;
  }
  
  const matchType = conditions.match_type || 'all';
  
  // Get subscriber data for evaluation
  const { data: subscriber, error } = await supabase
    .from('subscribers')
    .select(`
      *,
      profiles:user_id (
        subscription,
        subscription_expiration,
        trial_expiration
      )
    `)
    .eq('id', subscriberId)
    .single();
  
  if (error || !subscriber) {
    console.log(`⚠️ Could not fetch subscriber ${subscriberId} for condition evaluation`);
    return false;
  }
  
  let allConditionsMet = true;
  let anyConditionMet = false;
  
  for (const rule of conditions.rules) {
    let conditionMet = false;
    
    try {
      switch (rule.field) {
        case 'subscription':
          const subscription = subscriber.profiles?.subscription || 'none';
          conditionMet = evaluateFieldCondition(subscription, rule.operator, rule.value);
          break;
          
        case 'status':
          conditionMet = evaluateFieldCondition(subscriber.status, rule.operator, rule.value);
          break;
          
        case 'tags':
          if (rule.operator === 'contains') {
            conditionMet = !!(subscriber.tags && subscriber.tags.includes(rule.value));
          } else if (rule.operator === 'not_contains') {
            conditionMet = !!((!subscriber.tags) || (!subscriber.tags.includes(rule.value)));
          }
          break;
          
        case 'source':
          conditionMet = evaluateFieldCondition(subscriber.source, rule.operator, rule.value);
          break;
          
        default:
          conditionMet = false;
      }
      
    } catch (conditionError) {
      console.error('Error evaluating condition:', conditionError);
      conditionMet = false;
    }
    
    if (matchType === 'any' && conditionMet) {
      anyConditionMet = true;
    } else if (matchType === 'all' && !conditionMet) {
      allConditionsMet = false;
      break;
    }
  }
  
  return matchType === 'any' ? anyConditionMet : allConditionsMet;
}

function evaluateFieldCondition(fieldValue: any, operator: string, targetValue: any): boolean {
  const field = String(fieldValue || '').toLowerCase();
  const target = String(targetValue || '').toLowerCase();
  
  switch (operator) {
    case 'equals':
      return field === target;
    case 'not_equals':
      return field !== target;
    case 'contains':
      return field.includes(target);
    case 'not_contains':
      return !field.includes(target);
    case 'starts_with':
      return field.startsWith(target);
    case 'ends_with':
      return field.endsWith(target);
    case 'is_empty':
      return !field || field === '';
    case 'is_not_empty':
      return Boolean(field && field !== '');
    default:
      return false;
  }
}

async function checkEnrollmentLimits(automation: Automation, subscriberId: string): Promise<boolean> {
  if (automation.enrollment_limit_per_user <= 0) {
    return true;
  }
  
  const { data: existingEnrollments, error } = await supabase
    .from('email_automation_enrollments')
    .select('id')
    .eq('automation_id', automation.id)
    .eq('subscriber_id', subscriberId);
  
  if (error) {
    console.error('Error checking enrollment limits:', error);
    return false;
  }
  
  const currentEnrollments = existingEnrollments?.length || 0;
  return currentEnrollments < automation.enrollment_limit_per_user;
}

async function enrollSubscriberInAutomation(
  automation: Automation,
  subscriberId: string,
  eventData: any
) {
  try {
    // Create enrollment record
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('email_automation_enrollments')
      .insert({
        automation_id: automation.id,
        subscriber_id: subscriberId,
        enrollment_data: eventData,
        next_action_at: new Date().toISOString()
      })
      .select('id')
      .single();
    
    if (enrollmentError) {
      return {
        success: false,
        error: `Failed to create enrollment: ${enrollmentError.message}`
      };
    }
    
    // Update automation stats
    await supabase
      .from('email_automations')
      .update({
        total_enrollments: automation.total_enrollments + 1,
        active_enrollments: automation.active_enrollments + 1
      })
      .eq('id', automation.id);
    
    // Schedule initial automation step
    const { data: job, error: jobError } = await supabase
      .from('automation_jobs')
      .insert({
        job_type: 'step_execution',
        payload: {
          step_index: 0,
          enrollment_id: enrollment.id,
          automation_id: automation.id,
          subscriber_id: subscriberId
        },
        scheduled_for: new Date().toISOString(),
        priority: 'high',
        automation_id: automation.id,
        enrollment_id: enrollment.id
      })
      .select('id')
      .single();
    
    if (jobError) {
      console.error('Failed to schedule initial job:', jobError);
    } else {
      console.log(`📅 Scheduled initial step for enrollment ${enrollment.id}`);
    }
    
    return {
      success: true,
      enrollment_id: enrollment.id,
      job_id: job?.id
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown enrollment error'
    };
  }
}

/** Vercel Cron invokes scheduled routes via GET. */
export async function GET(request: NextRequest) {
  return POST(request);
} 