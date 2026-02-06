/**
 * Script to check a specific user's data
 * Usage: node check-user.js <email>
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stripeKey = process.env.STRIPE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

if (!stripeKey) {
  console.error('❌ Missing Stripe credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const stripe = new Stripe(stripeKey);

const email = process.argv[2] || 'colemanhamilton@gmail.com';

async function checkUser() {
  console.log(`\n🔍 Checking user: ${email}\n`);
  console.log('='.repeat(80));

  // 1. Find user in profiles table
  console.log('\n📋 1. PROFILE INFORMATION');
  console.log('-'.repeat(80));
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single();

  if (profileError || !profile) {
    console.log('❌ User not found in profiles table');
    console.log('Error:', profileError?.message);
    return;
  }

  console.log('✅ User found:');
  console.log(`   ID: ${profile.id}`);
  console.log(`   Email: ${profile.email}`);
  console.log(`   Name: ${profile.first_name || ''} ${profile.last_name || ''}`);
  console.log(`   Subscription: ${profile.subscription || 'none'}`);
  console.log(`   Subscription Expiration: ${profile.subscription_expiration || 'N/A'}`);
  console.log(`   Subscription Source: ${profile.subscription_source || 'N/A'}`);
  console.log(`   Trial Expiration: ${profile.trial_expiration || 'N/A'}`);
  console.log(`   Customer ID: ${profile.customer_id || 'N/A'}`);
  console.log(`   Created: ${profile.created_at || 'N/A'}`);
  console.log(`   Updated: ${profile.updated_at || 'N/A'}`);

  // 2. Check NFR status
  console.log('\n📋 2. NFR (NOT FOR RESALE) STATUS');
  console.log('-'.repeat(80));
  const { data: nfr, error: nfrError } = await supabase
    .from('user_management')
    .select('*')
    .ilike('user_email', email)
    .maybeSingle();

  if (nfrError || !nfr) {
    console.log('❌ No NFR license found');
  } else {
    console.log('✅ NFR License found:');
    console.log(`   Pro: ${nfr.pro}`);
    console.log(`   Notes: ${nfr.notes || 'N/A'}`);
  }

  // 3. Check Stripe data if customer ID exists
  if (profile.customer_id) {
    console.log('\n📋 3. STRIPE CUSTOMER DATA');
    console.log('-'.repeat(80));
    
    try {
      const customer = await stripe.customers.retrieve(profile.customer_id);
      console.log('✅ Stripe Customer:');
      console.log(`   ID: ${customer.id}`);
      console.log(`   Email: ${customer.email || 'N/A'}`);
      console.log(`   Created: ${new Date(customer.created * 1000).toISOString()}`);
      console.log(`   Default Payment Method: ${customer.invoice_settings?.default_payment_method || 'N/A'}`);

      // Check subscriptions
      const subscriptions = await stripe.subscriptions.list({
        customer: profile.customer_id,
        limit: 100,
      });
      console.log(`\n   Subscriptions (${subscriptions.data.length}):`);
      subscriptions.data.forEach((sub, idx) => {
        console.log(`   ${idx + 1}. ${sub.id}`);
        console.log(`      Status: ${sub.status}`);
        console.log(`      Plan: ${sub.items.data[0]?.price?.nickname || 'N/A'}`);
        console.log(`      Current Period End: ${new Date(sub.current_period_end * 1000).toISOString()}`);
        console.log(`      Canceled: ${sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : 'No'}`);
      });

      // Check payment methods
      const paymentMethods = await stripe.paymentMethods.list({
        customer: profile.customer_id,
        limit: 100,
      });
      console.log(`\n   Payment Methods (${paymentMethods.data.length}):`);
      paymentMethods.data.forEach((pm, idx) => {
        console.log(`   ${idx + 1}. ${pm.id} - ${pm.type} (${pm.card?.brand || 'N/A'} ****${pm.card?.last4 || 'N/A'})`);
      });

      // Check charges
      const charges = await stripe.charges.list({
        customer: profile.customer_id,
        limit: 100,
      });
      console.log(`\n   Charges (${charges.data.length}):`);
      const seenChargeIds = new Set();
      let totalSpent = 0;
      charges.data.forEach((charge, idx) => {
        if (seenChargeIds.has(charge.id)) return;
        seenChargeIds.add(charge.id);
        if (charge.paid && !charge.refunded) {
          const netAmount = charge.amount - (charge.amount_refunded || 0);
          totalSpent += netAmount;
        }
        console.log(`   ${idx + 1}. ${charge.id}`);
        console.log(`      Amount: $${(charge.amount / 100).toFixed(2)}`);
        console.log(`      Status: ${charge.status}`);
        console.log(`      Paid: ${charge.paid}`);
        console.log(`      Refunded: ${charge.refunded}`);
        console.log(`      Created: ${new Date(charge.created * 1000).toISOString()}`);
      });
      console.log(`\n   Total Spent: $${(totalSpent / 100).toFixed(2)}`);

    } catch (stripeError) {
      console.log('❌ Error fetching Stripe data:', stripeError.message);
    }
  } else {
    console.log('\n📋 3. STRIPE CUSTOMER DATA');
    console.log('-'.repeat(80));
    console.log('❌ No Stripe customer ID found');
  }

  // 4. Check iOS subscriptions
  console.log('\n📋 4. iOS SUBSCRIPTIONS');
  console.log('-'.repeat(80));
  const { data: iosSubs, error: iosError } = await supabase
    .from('ios_subscriptions')
    .select('*')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false });

  if (iosError || !iosSubs || iosSubs.length === 0) {
    console.log('❌ No iOS subscriptions found');
  } else {
    console.log(`✅ iOS Subscriptions (${iosSubs.length}):`);
    iosSubs.forEach((sub, idx) => {
      console.log(`   ${idx + 1}. ${sub.subscription_type}`);
      console.log(`      Transaction ID: ${sub.transaction_id}`);
      console.log(`      Active: ${sub.is_active}`);
      console.log(`      Expires: ${sub.expires_date || 'N/A'}`);
      console.log(`      Status: ${sub.validation_status}`);
    });
  }

  // 5. Check support tickets
  console.log('\n📋 5. SUPPORT TICKETS');
  console.log('-'.repeat(80));
  const { data: tickets, error: ticketsError } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false });

  if (ticketsError || !tickets || tickets.length === 0) {
    console.log('❌ No support tickets found');
  } else {
    console.log(`✅ Support Tickets (${tickets.length}):`);
    tickets.forEach((ticket, idx) => {
      console.log(`   ${idx + 1}. #${ticket.ticket_number} - ${ticket.subject}`);
      console.log(`      Status: ${ticket.status}`);
      console.log(`      Priority: ${ticket.priority}`);
      console.log(`      Created: ${ticket.created_at}`);
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Check complete!\n');
}

checkUser().catch(console.error);

