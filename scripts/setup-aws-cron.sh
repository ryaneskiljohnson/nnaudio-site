#!/bin/bash

# AWS Lightsail Cron Setup Script
# This script sets up the scheduled campaigns cron job on your AWS Lightsail server

echo "🚀 Setting up scheduled campaigns cron job for AWS Lightsail..."

# Configuration
DOMAIN=${1:-"https://cymasphere.com"}  # Pass domain as first argument or use default
SCRIPT_PATH="/home/ubuntu/cymasphere/scripts/trigger-scheduled-campaigns.sh"

echo "📋 Configuration:"
echo "   Domain: $DOMAIN"
echo "   Script Path: $SCRIPT_PATH"
echo ""

# Step 1: Update the script with the correct domain
echo "📝 Updating trigger script with domain: $DOMAIN"
sed -i "s|DOMAIN=\".*\"|DOMAIN=\"$DOMAIN\"|g" scripts/trigger-scheduled-campaigns.sh

# Step 2: Create instructions for server setup
cat > aws-lightsail-setup-instructions.txt << EOF
==============================================
AWS LIGHTSAIL CRON SETUP INSTRUCTIONS
==============================================

Run these commands on your AWS Lightsail server:

1. SSH into your Lightsail server:
   ssh ubuntu@your-lightsail-ip

2. Navigate to your app directory:
   cd ~/cymasphere

3. Make sure the scripts directory exists and copy the trigger script:
   mkdir -p scripts
   chmod +x scripts/trigger-scheduled-campaigns.sh

4. Test the script manually:
   ./scripts/trigger-scheduled-campaigns.sh

5. Set up the cron job:
   crontab -e

6. Add this line to run every minute:
   * * * * * /home/ubuntu/cymasphere/scripts/trigger-scheduled-campaigns.sh

7. Verify cron job is installed:
   crontab -l

8. Monitor the logs:
   tail -f /tmp/scheduled-campaigns.log
   tail -f /tmp/scheduled-campaigns-error.log

==============================================
TROUBLESHOOTING
==============================================

If you see errors:

1. Check that curl is installed:
   which curl

2. Test the endpoint manually:
   curl -X POST "$DOMAIN/api/email-campaigns/process-scheduled" \\
        -H "Authorization: Bearer YOUR_CRON_SECRET"

3. Check cron service is running:
   sudo systemctl status cron

4. Check cron logs:
   sudo tail -f /var/log/syslog | grep CRON

==============================================
EOF

echo "✅ Setup script updated!"
echo "📄 Instructions written to: aws-lightsail-setup-instructions.txt"
echo ""
echo "🔄 Next steps:"
echo "1. Deploy your updated code to AWS Lightsail"
echo "2. Follow the instructions in aws-lightsail-setup-instructions.txt"
echo "3. Your scheduled campaigns will run automatically every minute!"
echo ""
echo "📊 Current AWS Account: 375240177147 (us-east-1)"
echo "🎯 Endpoint: $DOMAIN/api/email-campaigns/process-scheduled" 