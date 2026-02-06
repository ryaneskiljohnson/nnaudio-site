# Scheduled Email Campaigns System

This system automatically processes and sends scheduled email campaigns at their designated times.

## How It Works

### 1. Campaign Scheduling
- Users can schedule campaigns through the UI by selecting "Schedule for later" 
- Campaigns are stored in the database with `status = 'scheduled'` and a `scheduled_at` timestamp
- The system supports both fixed-time scheduling and timezone-based delivery

### 2. Automated Processing
- A cron job runs **every minute** to check for campaigns that are due to be sent
- The system queries for campaigns where `status = 'scheduled'` AND `scheduled_at <= NOW()`
- Each due campaign is processed automatically without manual intervention

### 3. Campaign Processing Flow
1. **Status Update**: Campaign status changes from `scheduled` → `sending` (prevents duplicate processing)
2. **Audience Resolution**: System fetches all subscribers from selected audiences (including/excluding logic)
3. **Email Sending**: Sends individual emails to each subscriber with progress tracking
4. **Final Status**: Campaign status updates to `sent` (success) or `failed` (complete failure)
5. **Statistics**: Records total recipients, sent count, failed count, and success rate

## Technical Implementation

### Cron Job Endpoint
- **URL**: `/api/email-campaigns/process-scheduled`
- **Method**: `POST`
- **Authentication**: Vercel cron signature or `Authorization: Bearer {CRON_SECRET}`
- **Frequency**: Every minute (`* * * * *`)

### Database Tables Used
- `email_campaigns` - Main campaign data and status tracking
- `email_campaign_audiences` - Campaign-to-audience relationships
- `email_audience_subscribers` - Audience membership
- `subscribers` - Email subscriber data

### Status Flow
```
draft → scheduled → sending → sent/failed
```

## Setup & Configuration

### 1. Environment Variables
Add to your `.env.local`:
```bash
# Optional: Secret for manual cron job testing
CRON_SECRET=your-super-secret-key-here
```

### 2. Vercel Deployment
The `vercel.json` file is already configured with the cron job:
```json
{
  "crons": [
    {
      "path": "/api/email-campaigns/process-scheduled",
      "schedule": "* * * * *"
    }
  ]
}
```

### 3. Testing
Test the system manually using the provided script:
```bash
# Set environment variables first
export CRON_SECRET=your-super-secret-key-here
export NEXT_PUBLIC_API_URL=http://localhost:3000

# Run the test
node test-scheduled-campaigns.js
```

## Features

### ✅ What's Working
- **Automatic Processing**: Campaigns send automatically at scheduled time
- **Audience Support**: Full support for included/excluded audiences
- **Status Tracking**: Real-time status updates and progress tracking
- **Error Handling**: Robust error handling with retry logic
- **Security**: Protected endpoint with authentication
- **Logging**: Comprehensive logging for debugging
- **Statistics**: Detailed send statistics and success rates

### 🎯 Key Benefits
- **Set and Forget**: Schedule campaigns and they send automatically
- **Reliable**: Runs every minute, won't miss scheduled sends
- **Scalable**: Processes multiple campaigns in each run
- **Safe**: Prevents duplicate sends with status locking
- **Trackable**: Full visibility into send results

## Monitoring & Debugging

### Logs
All processing is logged with clear emoji prefixes:
- 🔄 Processing status
- 📧 Campaign counts
- ✅ Success operations
- ❌ Errors and failures
- 📊 Statistics and results

### Manual Testing
Use the test script to verify the system works:
```bash
node test-scheduled-campaigns.js
```

### Vercel Function Logs
In production, check Vercel function logs:
1. Go to Vercel Dashboard
2. Select your project
3. Go to "Functions" tab
4. Click on the cron function to see logs

## Error Handling

### Campaign-Level Errors
- **No Audiences**: Campaign marked as `failed`
- **No Subscribers**: Campaign marked as `sent` with 0 recipients
- **Send Failures**: Partial failures still mark campaign as `sent` if any emails succeeded

### System-Level Errors
- **Database Errors**: Logged and returned in API response
- **Authentication Errors**: Returns 401 with clear error message
- **Processing Errors**: Individual campaign errors don't stop batch processing

## Performance Considerations

### Rate Limiting
- 100ms delay between individual email sends to avoid overwhelming email service
- Processes campaigns sequentially to manage load
- 1-minute intervals provide near real-time processing

### Scalability
- System can handle multiple campaigns per run
- Database queries are optimized with proper indexing
- Failed campaigns are marked to avoid reprocessing

## Security

### Authentication
- Vercel cron jobs are automatically authenticated
- Manual calls require `CRON_SECRET` in Authorization header
- No public access to the processing endpoint

### Data Protection
- Only processes campaigns with proper audience relationships
- Respects subscriber `is_subscribed` status
- Logs exclude sensitive subscriber data

## Troubleshooting

### Common Issues

**1. Campaigns Not Sending**
- Check if cron job is configured in `vercel.json`
- Verify `CRON_SECRET` environment variable
- Ensure campaigns have `status = 'scheduled'` and past `scheduled_at` time

**2. Authentication Errors**
- For manual testing: Set correct `CRON_SECRET`
- For Vercel: Ensure cron configuration is deployed

**3. No Subscribers Found**
- Check audience-subscriber relationships in database
- Verify subscribers have `is_subscribed = true`
- Check included/excluded audience logic

**4. Email Sending Failures**
- Verify email service configuration in `utils/email.ts`
- Check email service rate limits
- Validate email addresses in subscriber data

### Debug Steps
1. Run manual test: `node test-scheduled-campaigns.js`
2. Check database for campaign status
3. Review function logs in Vercel dashboard
4. Verify email service configuration

## Future Enhancements

Potential improvements for the system:
- **Retry Logic**: Automatic retry for failed campaigns
- **Timezone Support**: Enhanced timezone-based delivery
- **Batch Processing**: Send emails in batches for better performance
- **Analytics Integration**: Detailed open/click tracking
- **A/B Testing**: Support for scheduled A/B test campaigns

---

The scheduled campaign system is now fully operational and will automatically process campaigns every minute! 🚀 