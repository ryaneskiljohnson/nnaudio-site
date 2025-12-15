import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/utils/email";

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { name, email, subject, message, userId = null } = body;

    // Validate required fields
    if (!email || !subject || !message) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Create email content
    const emailSubject = subject;
    
    // Plain text email
    const textContent = `
Name: ${name || "Not provided"}
Email: ${email}
${userId ? `User ID: ${userId}` : ""}

Message:
${message}
    `;

    // HTML email
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Contact Form Submission - Cymasphere</title>
    <!--[if mso]>
    <style type="text/css">
        table {border-collapse:collapse;border-spacing:0;margin:0;}
        div, td {padding:0;}
        div {margin:0 !important;}
    </style>
    <noscript>
    <xml>
        <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
    </xml>
    </noscript>
    <![endif]-->
    <style type="text/css">
        /* Reset styles */
        body, html {
            margin: 0;
            padding: 0;
            font-family: 'Arial', sans-serif;
            background-color: #f7f7f7;
            color: #333333;
            line-height: 1.6;
        }
        
        /* Container styling */
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #121212;
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid rgba(108, 99, 255, 0.3);
        }
        
        /* Header styling */
        .header {
            background: linear-gradient(135deg, #1a1a1a 0%, #121212 100%);
            padding: 30px 20px;
            text-align: center;
            border-bottom: 1px solid rgba(108, 99, 255, 0.2);
        }
        
        .logo {
            width: 180px;
            margin: 0 auto;
            display: block;
        }
        
        .logo-container {
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto;
        }
        
        /* Content styling */
        .content {
            padding: 30px;
            color: #ffffff;
            background-color: #121212;
        }
        
        .title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
            text-align: center;
            color: #ffffff;
        }
        
        .title span {
            background: linear-gradient(90deg, #6c63ff, #4ecdc4);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .message {
            margin-bottom: 20px;
            font-size: 16px;
            color: #b3b3b3;
        }
        
        .field {
            margin-bottom: 15px;
            padding-bottom: 15px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .field:last-child {
            border-bottom: none;
        }
        
        .label {
            font-weight: bold;
            color: #6c63ff;
            display: block;
            margin-bottom: 5px;
        }
        
        .message-box {
            margin-top: 25px;
            padding: 15px;
            background-color: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            border-left: 3px solid #6c63ff;
        }
        
        .timestamp {
            color: #666666;
            font-size: 12px;
            margin-top: 25px;
            text-align: right;
        }
        
        /* Footer styling */
        .footer {
            padding: 15px;
            text-align: center;
            font-size: 12px;
            background-color: #0a0a0a;
            color: #666666;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .footer a {
            color: #6c63ff;
            text-decoration: none;
        }
        
        .footer a:hover {
            text-decoration: underline;
        }
        
        .footer-link {
            margin-bottom: 10px;
        }
        
        .copyright {
            margin: 0;
            color: #666666;
        }
        
        .divider {
            height: 3px;
            background: linear-gradient(90deg, #6c63ff, #4ecdc4);
            width: 100%;
            margin: 0;
            padding: 0;
        }
        
        /* Email client compatibility */
        .ExternalClass {
            width: 100%;
        }
        
        .ExternalClass,
        .ExternalClass p,
        .ExternalClass span,
        .ExternalClass font,
        .ExternalClass td,
        .ExternalClass div {
            line-height: 100%;
        }
        
        /* Responsive styles */
        @media only screen and (max-width: 600px) {
            .email-container {
                width: 100%;
                border-radius: 0;
            }
            
            .content {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="max-width: 600px; margin: 0 auto;">
        <tr>
            <td>
                <div class="email-container">
                    <div class="divider" style="height: 3px; background: linear-gradient(90deg, #6c63ff, #4ecdc4); width: 100%; margin: 0; padding: 0;"></div>
                    <div class="header" style="background: #1a1a1a; padding: 30px 20px; text-align: center; border-bottom: 1px solid rgba(108, 99, 255, 0.2);">
                        <div class="logo-container" style="display: flex; align-items: center; justify-content: center; margin: 0 auto;">
                            <img src="https://jibirpbauzqhdiwjlrmf.supabase.co/storage/v1/object/public/logos//cymasphere-logo.png" alt="Cymasphere Logo" class="logo" width="180" height="auto" style="width: 180px; max-width: 100%; height: auto; border: 0; display: block; margin: 0 auto;">
                        </div>
                    </div>
                    
                    <div class="content" style="padding: 30px; color: #ffffff; background-color: #121212;">
                        <h1 class="title" style="font-size: 24px; font-weight: bold; margin-bottom: 20px; text-align: center; color: #ffffff;">New <span style="color: #6c63ff;">Contact Form</span> Submission</h1>
                        
                        <p class="message" style="margin-bottom: 20px; font-size: 16px; color: #b3b3b3;">You've received a new message through the Cymasphere contact form.</p>
                        
                        <div class="field" style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                            <span class="label" style="font-weight: bold; color: #6c63ff; display: block; margin-bottom: 5px;">Name</span>
                            <span style="color: #ffffff;">${name || "Not provided"}</span>
                        </div>
                        
                        <div class="field" style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                            <span class="label" style="font-weight: bold; color: #6c63ff; display: block; margin-bottom: 5px;">Email</span>
                            <a href="mailto:${email}" style="color: #6c63ff; text-decoration: none;">${email}</a>
                        </div>
                        
                        ${userId ? `<div class="field" style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                            <span class="label" style="font-weight: bold; color: #6c63ff; display: block; margin-bottom: 5px;">User ID</span>
                            <span style="color: #ffffff;">${userId}</span>
                        </div>` : ""}
                        
                        <div class="field" style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                            <span class="label" style="font-weight: bold; color: #6c63ff; display: block; margin-bottom: 5px;">Subject</span>
                            <span style="color: #ffffff;">${subject}</span>
                        </div>
                        
                        <div class="message-box" style="margin-top: 25px; padding: 15px; background-color: rgba(255, 255, 255, 0.05); border-radius: 8px; border-left: 3px solid #6c63ff;">
                            <span class="label" style="font-weight: bold; color: #6c63ff; display: block; margin-bottom: 5px;">Message</span>
                            <div style="color: #b3b3b3; margin-top: 10px;">
                                ${message.replace(/\n/g, "<br>")}
                            </div>
                        </div>
                        
                        <div class="timestamp" style="color: #666666; font-size: 12px; margin-top: 25px; text-align: right;">
                            Submitted on ${new Date().toLocaleString('en-US', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </div>
                    </div>
                    
                    <div class="footer" style="padding: 15px; text-align: center; font-size: 12px; background-color: #0a0a0a; color: #666666; border-top: 1px solid rgba(255, 255, 255, 0.05);">
                        <div class="footer-link" style="margin-bottom: 10px;">
                            <a href="https://cymasphere.com" style="color: #6c63ff; text-decoration: none;">Cymasphere</a> by <a href="https://nnaud.io" style="color: #6c63ff; text-decoration: none;">NNAudio</a>
                        </div>
                        
                        <p class="copyright" style="margin: 0; color: #666666;">© ${new Date().getFullYear()} NNAud.io. All rights reserved.</p>
                        <p style="margin-top: 10px; font-size: 11px; color: #666666;">You can reply directly to this email to respond to the user.</p>
                    </div>
                </div>
            </td>
        </tr>
    </table>
</body>
</html>
    `;

    // Send email using AWS SES
    const result = await sendEmail({
      to: "support@cymasphere.com",
      subject: emailSubject,
      text: textContent,
      html: htmlContent,
      replyTo: email, // Set reply-to so responses go to the user
    });

    if (!result.success) {
      console.error("Failed to send email:", result.error);
      
      // Return error with the actual error message
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || "Failed to send email",
          details: "Check server logs for more information about AWS credentials"
        },
        { status: 500 }
      );
    }

    // Return success response
    return NextResponse.json({ 
      success: true,
      messageId: result.messageId 
    });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
} 