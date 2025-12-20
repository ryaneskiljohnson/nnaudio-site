import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!SUPABASE_ACCESS_TOKEN) {
  console.error('❌ Missing SUPABASE_ACCESS_TOKEN in .env.local');
  console.error('   Get your access token from: https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

if (!PROJECT_REF) {
  console.error('❌ Could not extract project ref from NEXT_PUBLIC_SUPABASE_URL');
  process.exit(1);
}

// Read template files
function readTemplate(filePath: string): string {
  const fullPath = path.join(process.cwd(), 'supabase', 'templates', filePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Template file not found: ${fullPath}`);
  }
  return fs.readFileSync(fullPath, 'utf-8');
}

// Update email templates via Management API
async function updateEmailTemplates() {
  console.log('📧 Updating Supabase email templates with NNAudio branding...\n');

  try {
    // Read all templates
    const confirmationTemplate = readTemplate('nnaudio-confirmation.html');
    const magicLinkTemplate = readTemplate('nnaudio-magic-link.html');
    const resetPasswordTemplate = readTemplate('nnaudio-reset-password.html');
    const inviteTemplate = readTemplate('nnaudio-invite.html');
    const emailChangeTemplate = readTemplate('nnaudio-email-change.html');

    // Prepare the update payload
    const updatePayload = {
      mailer_subjects_confirmation: 'Verify Your NNAudio Email',
      mailer_templates_confirmation_content: confirmationTemplate,
      mailer_subjects_magic_link: 'Your NNAudio Magic Link',
      mailer_templates_magic_link_content: magicLinkTemplate,
      mailer_subjects_recovery: 'Reset Your NNAudio Password',
      mailer_templates_recovery_content: resetPasswordTemplate,
      mailer_subjects_invite: "You've Been Invited to NNAudio",
      mailer_templates_invite_content: inviteTemplate,
      mailer_subjects_email_change: 'Confirm Your NNAudio Email Change',
      mailer_templates_email_change_content: emailChangeTemplate,
    };

    console.log(`📤 Updating templates for project: ${PROJECT_REF}...`);

    // Make API request to update templates
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to update email templates:');
      console.error(`   Status: ${response.status} ${response.statusText}`);
      console.error(`   Error: ${errorText}`);
      process.exit(1);
    }

    const result = await response.json();
    console.log('✅ Successfully updated all email templates!');
    console.log('\n📋 Updated templates:');
    console.log('   ✓ Confirmation (Signup)');
    console.log('   ✓ Magic Link');
    console.log('   ✓ Password Reset');
    console.log('   ✓ Invite');
    console.log('   ✓ Email Change');
    console.log('\n🎨 All templates now feature NNAudio branding!');

  } catch (error: any) {
    console.error('❌ Error updating email templates:', error.message);
    process.exit(1);
  }
}

updateEmailTemplates()
  .then(() => {
    console.log('\n✅ Complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

