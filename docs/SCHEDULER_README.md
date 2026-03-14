# Internal Email Campaign Scheduler

This system uses **built-in Node.js scheduling** within your Next.js app instead of external cron jobs. This is much simpler and more reliable!

## ✅ Benefits of Internal Scheduling

- **✅ No external dependencies** - No need to set up server cron jobs
- **✅ Works everywhere** - AWS, Vercel, Docker, localhost, etc.
- **✅ Easy to manage** - Control via API endpoints  
- **✅ Built-in monitoring** - Status checking and logging
- **✅ Automatic startup** - Starts with your app
- **✅ Environment-based** - Auto-enables in production

## 🚀 How It Works

### Automatic Operation:
1. **Production**: Scheduler starts automatically when app loads
2. **Development**: Disabled by default (set `ENABLE_SCHEDULER=true` to test)
3. **Scheduling**: Runs every minute to check for due campaigns
4. **Processing**: Calls your existing `/api/email-campaigns/process-scheduled` endpoint

### Architecture:
```
Next.js App Start
      ↓
utils/scheduler.ts loads
      ↓ 
Checks environment (production = auto-enable)
      ↓
If enabled: starts node-cron task
      ↓
Every minute: calls process-scheduled API
      ↓
Scheduled campaigns sent automatically
```

## 📋 Configuration

### Environment Variables:
```bash
# Enable scheduler in development (optional)
ENABLE_SCHEDULER=true

# Custom cron schedule (optional, default: every minute)
SCHEDULER_CRON="* * * * *"

# Your existing cron secret (required)
CRON_SECRET=your-secret-key
```

### Default Behavior:
- **Production**: `NODE_ENV=production` → Auto-enabled
- **Development**: Disabled unless `ENABLE_SCHEDULER=true`
- **Schedule**: Every minute (`* * * * *`)
- **Endpoint**: Uses `NEXT_PUBLIC_SITE_URL` or localhost

## 🎛️ Manual Control

### Check Status:
```bash
curl "https://yourdomain.com/api/scheduler"
```

### Manual Trigger (for testing):
```bash
curl -X POST "https://yourdomain.com/api/scheduler" \
     -H "Content-Type: application/json" \
     -d '{"action":"trigger"}'
```

### Start/Stop Scheduler:
```bash
# Start
curl -X POST "https://yourdomain.com/api/scheduler" \
     -H "Content-Type: application/json" \
     -d '{"action":"start"}'

# Stop  
curl -X POST "https://yourdomain.com/api/scheduler" \
     -H "Content-Type: application/json" \
     -d '{"action":"stop"}'
```

## 📊 Status Response Example:
```json
{
  "success": true,
  "scheduler": {
    "isEnabled": true,
    "isRunning": true,
    "config": {
      "enabled": true,
      "cronExpression": "* * * * *",
      "endpoint": "https://yourdomain.com/api/email-campaigns/process-scheduled",
      "cronSecret": "cron_568299..."
    },
    "lastCheck": "2025-06-30T18:56:37.804Z"
  }
}
```

## 🔧 AWS Deployment

### No Additional Setup Required! 🎉
- Just deploy your code normally
- Scheduler starts automatically in production
- No SSH, no cron jobs, no server configuration needed

### Monitoring in Production:
```bash
# Check if scheduler is running
curl "https://nnaud.io/api/scheduler"

# View logs (in your AWS CloudWatch/application logs)
# Look for: "📅 Email Campaign Scheduler initialized"
```

## 🆚 Comparison: External Cron vs Internal Scheduler

| Feature | External Cron | Internal Scheduler |
|---------|---------------|-------------------|
| Setup Complexity | High (SSH, crontab) | None (automatic) |
| Works on All Platforms | No (server-specific) | Yes |
| Monitoring | Server logs | API endpoints |
| Control | SSH required | API calls |
| Reliability | Server dependent | App dependent |
| Maintenance | Manual | Automatic |

## 🚨 Migration from External Cron

If you previously set up server-side cron jobs:

1. **Remove server cron:**
   ```bash
   ssh ubuntu@your-server
   crontab -e
   # Delete the scheduled campaigns line
   ```

2. **Deploy updated code** (internal scheduler will take over)

3. **Verify it's working:**
   ```bash
   curl "https://yourdomain.com/api/scheduler"
   ```

## 🔍 Troubleshooting

### Scheduler Not Running:
```bash
# Check status
curl "https://yourdomain.com/api/scheduler"

# Expected response for production:
# "isEnabled": true, "isRunning": true
```

### Manual Testing:
```bash
# Force trigger a check
curl -X POST "https://yourdomain.com/api/scheduler" \
     -d '{"action":"trigger"}'

# Check for scheduled campaigns directly  
curl -X POST "https://yourdomain.com/api/email-campaigns/process-scheduled" \
     -H "Authorization: Bearer your-cron-secret"
```

### Logs to Monitor:
- `📅 Email Campaign Scheduler initialized`
- `🚀 Starting email campaign scheduler`
- `✅ Scheduler: Processed X campaigns`
- `✅ Scheduler: No campaigns due`

## ✨ Summary

**Before**: Complex server cron setup, platform-specific, hard to manage
**Now**: Zero-config internal scheduling, works everywhere, API controlled

Your scheduled email campaigns now work automatically with **no external dependencies**! 🎉 