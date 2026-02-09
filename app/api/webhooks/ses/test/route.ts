import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get('event') || 'delivery';
    const messageId = searchParams.get('messageId') || 'test-message-id';

    // Simulate different SES events
    let testEvent;
    
    switch (eventType) {
      case 'delivery':
        testEvent = {
          eventType: 'delivery',
          mail: {
            messageId: messageId,
            timestamp: new Date().toISOString(),
            source: 'support@nnaud.io',
            destination: ['test@example.com']
          },
          delivery: {
            timestamp: new Date().toISOString(),
            processingTimeMillis: 1500,
            recipients: ['test@example.com'],
            smtpResponse: '250 2.0.0 OK'
          }
        };
        break;
        
      case 'bounce':
        testEvent = {
          eventType: 'bounce',
          mail: {
            messageId: messageId,
            timestamp: new Date().toISOString(),
            source: 'support@nnaud.io',
            destination: ['test@example.com']
          },
          bounce: {
            timestamp: new Date().toISOString(),
            bounceType: 'Permanent',
            bounceSubType: 'General',
            bouncedRecipients: [{
              emailAddress: 'test@example.com',
              action: 'failed',
              status: '5.1.1',
              diagnosticCode: 'smtp; 550 5.1.1 User unknown'
            }]
          }
        };
        break;
        
      case 'complaint':
        testEvent = {
          eventType: 'complaint',
          mail: {
            messageId: messageId,
            timestamp: new Date().toISOString(),
            source: 'support@nnaud.io',
            destination: ['test@example.com']
          },
          complaint: {
            timestamp: new Date().toISOString(),
            complainedRecipients: [{
              emailAddress: 'test@example.com'
            }],
            complaintFeedbackType: 'abuse'
          }
        };
        break;
        
      default:
        return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
    }

    // Send the test event to our webhook
    const webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/webhooks/ses`;
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Amazon Simple Notification Service Agent'
      },
      body: JSON.stringify({
        Type: 'Notification',
        Message: JSON.stringify(testEvent)
      })
    });

    const result = await response.text();

    return NextResponse.json({
      message: 'Test webhook sent',
      eventType,
      messageId,
      webhookResponse: {
        status: response.status,
        body: result
      }
    });

  } catch (error) {
    console.error('Error sending test webhook:', error);
    return NextResponse.json({ error: 'Failed to send test webhook' }, { status: 500 });
  }
} 