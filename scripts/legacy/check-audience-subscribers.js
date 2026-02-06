// Check what subscribers are in audience f9bf12b7-1803-45ee-9e3b-de33f8391d7d
// This will help debug why the send API isn't finding ryan@cymasphere.com

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAudienceSubscribers() {
  const audienceId = 'f9bf12b7-1803-45ee-9e3b-de33f8391d7d';
  
  try {
    console.log('🔍 Checking audience:', audienceId);
    
    // Get audience details
    const { data: audience, error: audienceError } = await supabase
      .from('email_audiences')
      .select('*')
      .eq('id', audienceId)
      .single();
    
    if (audienceError) {
      console.error('❌ Error getting audience:', audienceError);
      return;
    }
    
    if (!audience) {
      console.log('❌ Audience not found');
      return;
    }
    
    console.log('✅ Audience found:');
    console.log(`   Name: ${audience.name}`);
    console.log(`   Description: ${audience.description}`);
    console.log(`   Subscriber Count: ${audience.subscriber_count}`);
    console.log(`   Filters:`, JSON.stringify(audience.filters, null, 2));
    
    const filters = audience.filters || {};
    const isStatic = filters.audience_type === 'static';
    
    console.log(`   Type: ${isStatic ? 'STATIC' : 'DYNAMIC'}`);
    
    if (isStatic) {
      console.log('\\n📋 Static audience - checking junction table...');
      
      // Get subscribers from junction table
      const { data: relations, error: relationsError } = await supabase
        .from('email_audience_subscribers')
        .select(`
          subscriber_id,
          subscribers (
            id,
            email,
            status,
            created_at,
            metadata
          )
        `)
        .eq('audience_id', audienceId);
      
      if (relationsError) {
        console.error('❌ Error getting subscriber relations:', relationsError);
        return;
      }
      
      console.log(`📊 Found ${relations?.length || 0} subscriber relations`);
      
      if (!relations || relations.length === 0) {
        console.log('❌ No subscribers found in this audience');
        
        // Check if ryan@cymasphere.com exists at all
        const { data: ryanSub } = await supabase
          .from('subscribers')
          .select('id, email, status')
          .eq('email', 'ryan@cymasphere.com')
          .single();
        
        if (ryanSub) {
          console.log('\\n✅ ryan@cymasphere.com exists as a subscriber:');
          console.log(`   ID: ${ryanSub.id}`);
          console.log(`   Status: ${ryanSub.status}`);
          console.log('\\n💡 Solution: Add ryan@cymasphere.com to this audience');
        } else {
          console.log('\\n❌ ryan@cymasphere.com not found in subscribers table');
          console.log('💡 Solution: Create ryan@cymasphere.com as a subscriber first');
        }
        
        return;
      }
      
      console.log('\\n📧 Subscribers in this audience:');
      relations.forEach((rel, index) => {
        const sub = rel.subscribers;
        if (sub) {
          console.log(`   ${index + 1}. ${sub.email} (${sub.status}) - ID: ${sub.id}`);
        }
      });
      
      // Check if ryan@cymasphere.com is in the list
      const ryanInAudience = relations.find(rel => 
        rel.subscribers && rel.subscribers.email === 'ryan@cymasphere.com'
      );
      
      if (ryanInAudience) {
        console.log('\\n✅ ryan@cymasphere.com is in this audience!');
        console.log('❓ The send API should work... check server logs for more details');
      } else {
        console.log('\\n❌ ryan@cymasphere.com is NOT in this audience');
        console.log('💡 Solution: Add ryan@cymasphere.com to this audience or change campaign target');
      }
      
    } else {
      console.log('\\n📋 Dynamic audience - checking filters...');
      console.log('Filters:', JSON.stringify(filters, null, 2));
      
      // For dynamic audiences, check if ryan@cymasphere.com would match
      const { data: ryanSub } = await supabase
        .from('subscribers')
        .select('*')
        .eq('email', 'ryan@cymasphere.com')
        .single();
      
      if (ryanSub) {
        console.log('\\n✅ ryan@cymasphere.com found:');
        console.log('   Subscriber data:', JSON.stringify(ryanSub, null, 2));
        console.log('\\n❓ Would need to evaluate if this subscriber matches the dynamic filters');
      } else {
        console.log('\\n❌ ryan@cymasphere.com not found in subscribers table');
      }
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

console.log('🔍 Audience Subscriber Checker');
console.log('==============================\\n');

checkAudienceSubscribers(); 