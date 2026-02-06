#!/bin/bash
# Nginx and Let's Encrypt setup script for proxying to port 3000

# Exit on any error
set -e

# Check if script is run as root
if [ "$(id -u)" -ne 0 ]; then
   echo "This script must be run as root" 
   exit 1
fi

# Get domain name
if [ -z "$1" ]; then
  read -p "Enter your domain name: " DOMAIN
else
  DOMAIN=$1
fi

# Get email for Let's Encrypt
if [ -z "$2" ]; then
  read -p "Enter your email for Let's Encrypt notifications: " EMAIL
else
  EMAIL=$2
fi

echo "Setting up Nginx proxy for $DOMAIN pointing to localhost:3000"

# Update and install required packages
echo "Updating system and installing Nginx..."
apt update
apt install -y nginx

# Create Nginx configuration
echo "Creating Nginx site configuration..."
cat > /etc/nginx/sites-available/emp << EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable the site
echo "Enabling site configuration..."
ln -sf /etc/nginx/sites-available/emp /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# Configure firewall
echo "============================================="
echo "Firewall Configuration Required:"
echo "For AWS Lightsail: Configure the firewall in the Networking tab of your instance"
echo "For UFW: Run the following command to allow Nginx traffic:"
echo "  sudo ufw allow 'Nginx Full'"
echo "============================================="

# Install and configure Let's Encrypt
echo "Setting up Let's Encrypt with Certbot..."
apt install -y certbot python3-certbot-nginx

echo "Obtaining SSL certificate..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect

# Test certificate renewal
echo "Testing certificate renewal..."
certbot renew --dry-run

echo "============================================="
echo "Setup completed successfully!"
echo "Your site should now be accessible at https://$DOMAIN"
echo "Let's Encrypt will automatically renew your certificates"
echo "============================================="