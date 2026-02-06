# Scheduled Campaign System Testing Guide

This guide provides comprehensive testing procedures for the scheduled campaign system to ensure it's working correctly.

## 🚀 Quick Tests

### 1. Basic System Test
```bash
# Test the system with environment variables loaded
node test-scheduler-with-env.js
```

**Expected Results:**
- ✅ All 4 tests should pass
- ✅ Success Rate: 100%
- ✅ AWS configuration should show valid credentials
- ✅ Process scheduled should return "No scheduled campaigns to process"

### 2. Debug Diagnostics
```bash
# Run comprehensive diagnostics
node debug-scheduled-campaigns.js
```

**Expected Results:**
- ✅ All environment variables present
- ✅ All database tables accessible
- ✅ API endpoints responding correctly
- ✅ Health Score: 100%

## 🔧 Manual Testing Procedures

### 1. Test Scheduler Status
```bash
curl "http://localhost:3000/api/scheduler"
```

**Expected Response:**
```json
{
  "message": "Scheduler status",
  "isEnabled": true,
  "isRunning": true,
  "environment": "development",
  "schedulerCron": "* * * * *"
}
```

### 2. Test Process Scheduled Endpoint
```bash
curl -X POST "http://localhost:3000/api/email-campaigns/process-scheduled" \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "message": "No scheduled campaigns to process",
  "processed": 0,
  "recentlyProcessed": [...]
}
```

### 3. Test AWS Configuration
```bash
curl "http://localhost:3000/api/check-aws-env" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Expected Response:**
```json
{
  "message": "AWS Environment Variables Check",
  "environment": {
    "AWS_ACCESS_KEY_ID": "AKIAVOXQ...",
    "AWS_SECRET_ACCESS_KEY": "AyWeGZ65...",
    "AWS_REGION": "us-east-1",
    "CRON_SECRET": "SET"
  }
}
```

## 📊 Comprehensive Testing

### 1. Full Test Suite
```bash
# Run the comprehensive test suite (creates test data)
node test-scheduled-campaigns.js
```

**What it tests:**
- Environment variables
- Database schema
- API endpoints
- Authentication
- Campaign scheduling
- Email sending
- Status tracking

### 2. Production Testing
```bash
# Test against production environment
NEXT_PUBLIC_SITE_URL=https://cymasphere.com node test-scheduler-with-env.js
```

## 🎯 Testing Scenarios

### Scenario 1: No Scheduled Campaigns
**Expected Behavior:**
- Process scheduled returns "No scheduled campaigns to process"
- No emails sent
- Status remains unchanged

### Scenario 2: Campaign Due for Sending
**Steps:**
1. Create a test campaign scheduled for 1 minute ago
2. Run process scheduled
3. Check campaign status changes to "sent"
4. Verify emails were sent

### Scenario 3: Campaign with No Recipients
**Steps:**
1. Create campaign with empty audience
2. Run process scheduled
3. Check campaign status changes to "sent" with 0 recipients

### Scenario 4: Failed Campaign
**Steps:**
1. Create campaign with invalid configuration
2. Run process scheduled
3. Check campaign status changes to "failed"

## 🔍 Troubleshooting

### Common Issues and Solutions

#### Issue 1: "Unauthorized" Errors
**Cause:** Missing or incorrect CRON_SECRET
**Solution:**
```bash
# Check environment variable
echo $CRON_SECRET

# Update .env.local
CRON_SECRET=your-secret-key
```

#### Issue 2: "Database connection failed"
**Cause:** Supabase credentials missing
**Solution:**
```bash
# Check environment variables
echo $SUPABASE_SERVICE_ROLE_KEY
echo $NEXT_PUBLIC_SUPABASE_URL

# Update .env.local with correct values
```

#### Issue 3: "AWS credentials not found"
**Cause:** AWS environment variables missing
**Solution:**
```bash
# Check AWS credentials
echo $AWS_ACCESS_KEY_ID
echo $AWS_SECRET_ACCESS_KEY
echo $AWS_REGION

# Update .env.local with AWS credentials
```

#### Issue 4: "Scheduler not running"
**Cause:** Scheduler not started or disabled
**Solution:**
```bash
# Check scheduler status
curl "http://localhost:3000/api/scheduler"

# Enable scheduler in development
export ENABLE_SCHEDULER=true
```

### Debug Commands

#### Check Environment Variables
```bash
node -e "
const { config } = require('dotenv');
config({ path: '.env.local' });
console.log('CRON_SECRET:', process.env.CRON_SECRET ? 'SET' : 'NOT_SET');
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT_SET');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT_SET');
"
```

#### Check Database Connection
```bash
node -e "
const { createClient } = require('@supabase/supabase-js');
const { config } = require('dotenv');
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

supabase.from('email_campaigns').select('count').then(result => {
  console.log('Database connection:', result.error ? 'FAILED' : 'OK');
  if (result.error) console.log('Error:', result.error.message);
});
"
```

## 📈 Monitoring

### Key Metrics to Monitor

1. **Scheduler Health**
   - Is scheduler running?
   - Last execution time
   - Execution frequency

2. **Campaign Processing**
   - Number of campaigns processed
   - Success/failure rates
   - Processing time

3. **Email Delivery**
   - Emails sent successfully
   - Bounce rates
   - Delivery delays

### Log Monitoring

```bash
# Check application logs for scheduler activity
tail -f /var/log/cymasphere/scheduler.log

# Check for errors
grep "ERROR\|FAILED" /var/log/cymasphere/scheduler.log
```

## 🚀 Deployment Checklist

Before deploying to production, ensure:

- [ ] All tests pass locally
- [ ] Environment variables are set correctly
- [ ] AWS SES is configured and verified
- [ ] Database tables exist and are accessible
- [ ] Scheduler is enabled in production
- [ ] Monitoring is set up
- [ ] Error handling is working
- [ ] Rate limiting is configured

## 📞 Support

If you encounter issues:

1. Run the debug diagnostics: `node debug-scheduled-campaigns.js`
2. Check the logs for specific error messages
3. Verify environment variables are set correctly
4. Test with the quick test suite: `node test-scheduler-with-env.js`
5. Contact the development team with specific error details

---

**Last Updated:** January 27, 2025
**Status:** ✅ All tests passing
**Version:** 1.0.0





