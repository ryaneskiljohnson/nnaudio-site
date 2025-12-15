/**
 * Welcome email template for new subscriptions and lifetime purchases
 */

export interface WelcomeEmailData {
  customerName?: string;
  customerEmail: string;
  purchaseType: 'subscription' | 'lifetime' | 'elite';
  subscriptionType?: 'monthly' | 'annual';
  planName: string;
  isTrial?: boolean;
  trialEndDate?: string; // ISO date string
  trialDays?: number;
}

/**
 * Generate welcome email HTML
 */
export function generateWelcomeEmailHtml(data: WelcomeEmailData): string {
  const { customerName, customerEmail, purchaseType, subscriptionType, planName } = data;
  const firstName = customerName?.split(' ')[0] || 'there';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cymasphere.com';
  const logoUrl = 'https://cymasphere.com/images/cm-logo.png';
  
  // Format plan name for display
  let planDisplayName = '';
  if (purchaseType === 'elite') {
    planDisplayName = 'Elite Access';
  } else if (purchaseType === 'lifetime') {
    planDisplayName = 'Lifetime License';
  } else if (subscriptionType === 'monthly') {
    planDisplayName = 'Monthly Subscription';
  } else if (subscriptionType === 'annual') {
    planDisplayName = 'Annual Subscription';
  } else {
    planDisplayName = planName;
  }

  // Format trial end date if provided
  let trialEndDateFormatted = '';
  if (data.isTrial && data.trialEndDate) {
    const trialDate = new Date(data.trialEndDate);
    trialEndDateFormatted = trialDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Use the same logo URL as contact form
  const logoUrlSupabase = 'https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/logos//cymasphere-logo.png';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Cymasphere</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f7f7; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f7f7f7; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a1a1a 0%, #121212 100%); padding: 30px 24px; text-align: center;">
              <img src="${logoUrlSupabase}" alt="Cymasphere" style="max-width: 220px; height: auto; display: block; margin: 0 auto;" />
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 30px 24px;">
              <h1 style="font-size: 1.5rem; color: #333; margin: 0 0 20px 0; font-weight: 600;">
                Welcome to Cymasphere, ${firstName}!
              </h1>
              
              <p style="color: #666; line-height: 1.6; margin: 0 0 20px 0;">
                Thank you for joining Cymasphere! We're thrilled to have you as part of our community of musicians, composers, and creators.
              </p>
              
              <div style="margin: 30px 0; padding: 20px; background-color: #f9f9f9; border-radius: 8px; border-left: 4px solid ${purchaseType === 'elite' ? '#9b59b6' : '#6c63ff'};">
                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: ${purchaseType === 'elite' ? '#9b59b6' : '#6c63ff'}; text-transform: uppercase; letter-spacing: 0.5px;">
                  ${data.isTrial ? 'Your Free Trial' : purchaseType === 'elite' ? 'Your Elite Access' : 'Your Purchase'}
                </p>
                <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #333;">
                  ${planDisplayName}
                </p>
                ${purchaseType === 'elite' ? `
                  <p style="margin: 8px 0 0 0; font-size: 14px; color: #9b59b6; font-weight: 500;">
                    ✨ You've been granted Elite Access! Enjoy lifetime premium features.
                  </p>
                ` : data.isTrial ? `
                  <p style="margin: 8px 0 0 0; font-size: 14px; color: #4eccd4; font-weight: 500;">
                    🎉 You're starting a free trial! No charges will be made until ${trialEndDateFormatted}.
                  </p>
                ` : ''}
              </div>
              
              ${data.isTrial ? `
                <div style="background-color: #f0f9ff; border: 1px solid #4eccd4; padding: 16px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #4eccd4;">
                    ⏰ Trial Information
                  </p>
                  <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #666;">
                    Your ${data.trialDays || 'free'} day trial gives you full access to all premium features. You won't be charged until ${trialEndDateFormatted}. You can cancel anytime during your trial with no charges.
                  </p>
                </div>
              ` : ''}
              
              <p style="color: #666; line-height: 1.6; margin: 20px 0;">
                You now have full access to all premium features of Cymasphere. Whether you're composing, learning music theory, or exploring new harmonic possibilities, we're here to support your creative journey.
              </p>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${siteUrl}/getting-started" style="display: inline-block; padding: 14px 32px; background: linear-gradient(90deg, #6c63ff, #4ecdc4); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 1rem;">
                  Get Started
                </a>
              </div>
              
              <p style="color: #666; line-height: 1.6; margin: 30px 0 0 0; font-size: 0.9em;">
                If you have any questions or need assistance, our support team is here to help. Simply reply to this email or visit our support center.
              </p>
              
              <p style="color: #666; line-height: 1.6; margin: 20px 0 0 0; font-size: 0.9em;">
                Happy creating!<br>
                <strong style="color: #333;">The Cymasphere Team</strong>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 24px; background-color: #f8f9fa; border-top: 1px solid #e9ecef; text-align: center; font-size: 0.85em; color: #666;">
              <p style="margin: 0 0 10px 0;">
                © ${new Date().getFullYear()} NNAud.io. All rights reserved.
              </p>
              <p style="margin: 0;">
                <a href="${siteUrl}/support" style="color: #6c63ff; text-decoration: none;">Support</a> | 
                <a href="${siteUrl}/terms-of-service" style="color: #6c63ff; text-decoration: none;">Terms</a> | 
                <a href="${siteUrl}/privacy-policy" style="color: #6c63ff; text-decoration: none;">Privacy</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generate welcome email plain text version
 */
export function generateWelcomeEmailText(data: WelcomeEmailData): string {
  const { customerName, purchaseType, subscriptionType, planName, isTrial, trialEndDate, trialDays } = data;
  const firstName = customerName?.split(' ')[0] || 'there';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cymasphere.com';
  
  let planDisplayName = '';
  if (purchaseType === 'elite') {
    planDisplayName = 'Elite Access';
  } else if (purchaseType === 'lifetime') {
    planDisplayName = 'Lifetime License';
  } else if (subscriptionType === 'monthly') {
    planDisplayName = 'Monthly Subscription';
  } else if (subscriptionType === 'annual') {
    planDisplayName = 'Annual Subscription';
  } else {
    planDisplayName = planName;
  }

  let trialEndDateFormatted = '';
  if (isTrial && trialEndDate) {
    const trialDate = new Date(trialEndDate);
    trialEndDateFormatted = trialDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  return `
Welcome to Cymasphere, ${firstName}!

Thank you for joining Cymasphere! We're thrilled to have you as part of our community of musicians, composers, and creators.

${isTrial ? 'Your Free Trial' : purchaseType === 'elite' ? 'Your Elite Access' : 'Your Purchase'}: ${planDisplayName}
${purchaseType === 'elite' ? `
✨ You've been granted Elite Access! Enjoy lifetime premium features.
` : isTrial ? `
🎉 You're starting a free trial! No charges will be made until ${trialEndDateFormatted}.

⏰ Trial Information:
Your ${trialDays || 'free'} day trial gives you full access to all premium features. You won't be charged until ${trialEndDateFormatted}. You can cancel anytime during your trial with no charges.
` : ''}

You now have full access to all premium features of Cymasphere. Whether you're composing, learning music theory, or exploring new harmonic possibilities, we're here to support your creative journey.

Get started: ${siteUrl}/getting-started

If you have any questions or need assistance, our support team is here to help. Simply reply to this email or visit our support center.

Happy creating!
The Cymasphere Team

© ${new Date().getFullYear()} NNAud.io. All rights reserved.
${siteUrl}/support | ${siteUrl}/terms-of-service | ${siteUrl}/privacy-policy
  `.trim();
}

