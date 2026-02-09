import { SESClient, SendRawEmailCommand } from "@aws-sdk/client-ses";

interface SendBatchEmailParams {
  bcc: string[]; // BCC recipients (up to 50 total recipients per AWS SES limit)
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  replyTo?: string | string[];
  listUnsubscribe?: string;
}

// AWS Account Configuration
// CORRECT AWS ACCOUNT: 375240177147
// Region: us-east-1

interface SendEmailParams {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  replyTo?: string | string[];
  listUnsubscribe?: string;
}

/**
 * Sends an email using Amazon SES with proper headers for better deliverability
 * @param params Email parameters
 * @returns Promise with the result of the email sending operation
 */
export async function sendEmail({
  to,
  subject,
  text,
  html,
  from = process.env.SENDER_EMAIL
    ? `${process.env.SENDER_NAME || "NNAudio Support"} <${process.env.SENDER_EMAIL}>`
    : "NNAudio Support <support@nnaud.io>", // Default sender
  replyTo,
  listUnsubscribe,
}: SendEmailParams) {
  // Use us-east-1 as the default region (this needs to match your AWS CLI config)
  const region = process.env.AWS_REGION || "us-east-1";
  
  try {
    // Create SES client using environment variables instead of AWS CLI
    const sesClient = new SESClient({ 
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
      }
    });

    // Format recipient email addresses
    const toAddresses = Array.isArray(to) ? to : [to];
    
    // Format reply to addresses if provided
    const replyToAddresses = replyTo ? (Array.isArray(replyTo) ? replyTo : [replyTo]) : [from.match(/<(.+)>/)?.[1] || from];

    // Generate Message-ID for better deliverability
    const messageId = `<${Date.now()}-${Math.random().toString(36).substring(7)}@nnaud.io>`;
    const date = new Date().toUTCString();

    // Extract email address from "Name <email>" format
    const fromEmail = from.match(/<(.+)>/)?.[1] || from;
    const fromName = from.match(/^(.+?)\s*</)?.[1] || 'NNAudio Support';

    // Build email headers
    const headers: string[] = [
      `From: ${from}`,
      `To: ${toAddresses.join(', ')}`,
      `Subject: ${subject}`,
      `Date: ${date}`,
      `Message-ID: ${messageId}`,
      `MIME-Version: 1.0`,
      `X-Mailer: NNAudio Support System`,
      `X-Priority: 3`,
      `Reply-To: ${replyToAddresses.join(', ')}`,
    ];

    // Add List-Unsubscribe headers for better deliverability (Gmail requirement)
    if (listUnsubscribe) {
      headers.push(`List-Unsubscribe: <${listUnsubscribe}>`);
      headers.push(`List-Unsubscribe-Post: List-Unsubscribe=One-Click`);
    } else {
      // Default unsubscribe URL
      const defaultUnsubscribe = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://nnaud.io'}/dashboard/support`;
      headers.push(`List-Unsubscribe: <${defaultUnsubscribe}>`);
      headers.push(`List-Unsubscribe-Post: List-Unsubscribe=One-Click`);
    }

    // Build multipart message
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);

    // Build email body
    let body = '';

    // Add text part
    if (text) {
      body += `--${boundary}\r\n`;
      body += `Content-Type: text/plain; charset=UTF-8\r\n`;
      body += `Content-Transfer-Encoding: 7bit\r\n\r\n`;
      body += `${text}\r\n`;
    }

    // Add HTML part
    if (html) {
      body += `--${boundary}\r\n`;
      body += `Content-Type: text/html; charset=UTF-8\r\n`;
      body += `Content-Transfer-Encoding: 7bit\r\n\r\n`;
      body += `${html}\r\n`;
    }

    body += `--${boundary}--\r\n`;

    // Combine headers and body
    const rawMessage = headers.join('\r\n') + '\r\n\r\n' + body;

    console.log("📤 Attempting to send email via AWS SES...");
    console.log("📤 To:", toAddresses);
    console.log("📤 From:", from);
    console.log("📤 Subject:", subject);
    console.log("📤 Region:", region);
    console.log("📤 Has AWS credentials:", !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY));
    console.log("📤 AWS_ACCESS_KEY_ID present:", !!process.env.AWS_ACCESS_KEY_ID);
    console.log("📤 AWS_SECRET_ACCESS_KEY present:", !!process.env.AWS_SECRET_ACCESS_KEY);
    console.log("📤 AWS_REGION:", process.env.AWS_REGION || 'us-east-1 (default)');
    
    // Try with configuration set first
    let command = new SendRawEmailCommand({
      RawMessage: {
        Data: Buffer.from(rawMessage),
      },
      ConfigurationSetName: process.env.SES_CONFIGURATION_SET || 'nnaud-email-events',
    });

    try {
      const result = await sesClient.send(command);
      console.log("✅ Email sent successfully via AWS SES, MessageId:", result.MessageId);
      return { success: true, messageId: result.MessageId };
    } catch (configSetError: any) {
      const configSetErrorMessage = configSetError instanceof Error ? configSetError.message : String(configSetError);
      console.warn("⚠️ Failed with configuration set:", configSetErrorMessage);
      
      // If it's a configuration set error, retry without it
      if (configSetErrorMessage.includes('ConfigurationSetDoesNotExist') || 
          configSetErrorMessage.includes('configuration set') ||
          configSetErrorMessage.includes('InvalidParameterValue')) {
        console.warn("⚠️ Configuration set issue detected. Retrying without configuration set...");
        command = new SendRawEmailCommand({
          RawMessage: {
            Data: Buffer.from(rawMessage),
          },
        });
        
        try {
          const retryResult = await sesClient.send(command);
          console.log("✅ Email sent successfully (without config set), MessageId:", retryResult.MessageId);
          return { success: true, messageId: retryResult.MessageId };
        } catch (retryError) {
          console.error("❌ Retry without config set also failed:", retryError);
          // Re-throw to be caught by outer catch block
          throw retryError;
        }
      } else {
        // Not a configuration set error, re-throw to outer catch
        throw configSetError;
      }
    }
  } catch (error) {
    console.error("❌ Error sending email via AWS SES:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error sending email";
    
    // More specific error messaging
    if (errorMessage.includes('security token') || errorMessage.includes('InvalidClientTokenId')) {
      console.error("❌ Invalid AWS security token. Check AWS credentials in .env.local file.");
      console.error("❌ AWS Account should be: 375240177147");
    }
    else if (errorMessage.includes('Email address is not verified')) {
      console.error("❌ The email address is not verified. In SES sandbox mode, both sender and recipient emails must be verified.");
      console.error("❌ Verify the email with: aws ses verify-email-identity --email-address youremail@example.com");
    }
    else if (errorMessage.includes('AccessDenied')) {
      console.error("❌ AWS SES access denied. Check IAM permissions for the AWS credentials.");
    }
    
    return { 
      success: false, 
      error: errorMessage
    };
  }
}

/**
 * Sends a batch email using BCC to multiple recipients (up to 50 per email per AWS SES limit)
 * This is much more efficient than sending individual emails
 * @param params Batch email parameters
 * @returns Promise with the result of the email sending operation
 */
export async function sendBatchEmail({
  bcc,
  subject,
  text,
  html,
  from = process.env.SENDER_EMAIL
    ? `${process.env.SENDER_NAME || "NNAudio Support"} <${process.env.SENDER_EMAIL}>`
    : "NNAudio Support <support@nnaud.io>",
  replyTo,
  listUnsubscribe,
}: SendBatchEmailParams) {
  const region = process.env.AWS_REGION || "us-east-1";
  
  // AWS SES limit: max 50 recipients per email (To + CC + BCC combined)
  // We use 1 To (sender's own address) and up to 49 BCC recipients
  const MAX_BCC_PER_EMAIL = 49;
  
  if (bcc.length === 0) {
    return { success: false, error: "No BCC recipients provided" };
  }

  if (bcc.length > MAX_BCC_PER_EMAIL) {
    return { 
      success: false, 
      error: `Too many BCC recipients. Maximum ${MAX_BCC_PER_EMAIL} per email. Got ${bcc.length}` 
    };
  }

  try {
    const sesClient = new SESClient({ 
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
      }
    });

    // Format reply to addresses
    const replyToAddresses = replyTo ? (Array.isArray(replyTo) ? replyTo : [replyTo]) : [from.match(/<(.+)>/)?.[1] || from];

    // Extract email address from "Name <email>" format
    const fromEmail = from.match(/<(.+)>/)?.[1] || from;
    const fromName = from.match(/^(.+?)\s*</)?.[1] || 'NNAudio Support';

    // Use sender's email as the "To" address (required by SES), all actual recipients go in BCC
    const toAddress = fromEmail;

    // Generate Message-ID
    const messageId = `<${Date.now()}-${Math.random().toString(36).substring(7)}@nnaud.io>`;
    const date = new Date().toUTCString();

    // Build email headers with BCC
    const headers: string[] = [
      `From: ${from}`,
      `To: ${toAddress}`, // Required by SES, but recipients won't see this
      `Bcc: ${bcc.join(', ')}`, // All actual recipients in BCC for privacy
      `Subject: ${subject}`,
      `Date: ${date}`,
      `Message-ID: ${messageId}`,
      `MIME-Version: 1.0`,
      `X-Mailer: NNAudio Support System`,
      `X-Priority: 3`,
      `Reply-To: ${replyToAddresses.join(', ')}`,
    ];

    // Add List-Unsubscribe headers
    if (listUnsubscribe) {
      headers.push(`List-Unsubscribe: <${listUnsubscribe}>`);
      headers.push(`List-Unsubscribe-Post: List-Unsubscribe=One-Click`);
    } else {
      const defaultUnsubscribe = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://nnaud.io'}/dashboard/support`;
      headers.push(`List-Unsubscribe: <${defaultUnsubscribe}>`);
      headers.push(`List-Unsubscribe-Post: List-Unsubscribe=One-Click`);
    }

    // Build multipart message
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);

    // Build email body
    let body = '';

    if (text) {
      body += `--${boundary}\r\n`;
      body += `Content-Type: text/plain; charset=UTF-8\r\n`;
      body += `Content-Transfer-Encoding: 7bit\r\n\r\n`;
      body += `${text}\r\n`;
    }

    if (html) {
      body += `--${boundary}\r\n`;
      body += `Content-Type: text/html; charset=UTF-8\r\n`;
      body += `Content-Transfer-Encoding: 7bit\r\n\r\n`;
      body += `${html}\r\n`;
    }

    body += `--${boundary}--\r\n`;

    // Combine headers and body
    const rawMessage = headers.join('\r\n') + '\r\n\r\n' + body;

    console.log(`📤 Sending batch email via AWS SES to ${bcc.length} recipients (BCC)...`);

    // Try with configuration set first
    let command = new SendRawEmailCommand({
      RawMessage: {
        Data: Buffer.from(rawMessage),
      },
      Destinations: [toAddress, ...bcc], // SES requires all recipients (To + BCC) in Destinations
      ConfigurationSetName: process.env.SES_CONFIGURATION_SET || 'nnaud-email-events',
    });

    try {
      const result = await sesClient.send(command);
      console.log(`✅ Batch email sent successfully via AWS SES, MessageId: ${result.MessageId}, Recipients: ${bcc.length}`);
      return { success: true, messageId: result.MessageId, recipientCount: bcc.length };
    } catch (configSetError: any) {
      const configSetErrorMessage = configSetError instanceof Error ? configSetError.message : String(configSetError);
      console.warn("⚠️ Failed with configuration set:", configSetErrorMessage);
      
      if (configSetErrorMessage.includes('ConfigurationSetDoesNotExist') || 
          configSetErrorMessage.includes('configuration set') ||
          configSetErrorMessage.includes('InvalidParameterValue')) {
        console.warn("⚠️ Configuration set issue detected. Retrying without configuration set...");
        command = new SendRawEmailCommand({
          RawMessage: {
            Data: Buffer.from(rawMessage),
          },
          Destinations: [toAddress, ...bcc],
        });
        
        try {
          const retryResult = await sesClient.send(command);
          console.log(`✅ Batch email sent successfully (without config set), MessageId: ${retryResult.MessageId}, Recipients: ${bcc.length}`);
          return { success: true, messageId: retryResult.MessageId, recipientCount: bcc.length };
        } catch (retryError) {
          console.error("❌ Retry without config set also failed:", retryError);
          throw retryError;
        }
      } else {
        throw configSetError;
      }
    }
  } catch (error) {
    console.error("❌ Error sending batch email via AWS SES:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error sending batch email";
    return { 
      success: false, 
      error: errorMessage,
      recipientCount: bcc.length
    };
  }
} 