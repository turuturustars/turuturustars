#!/bin/bash

# Authentication Setup Helper Script
# This script helps you configure the authentication system

set -e

echo "🔐 Turuturu Stars - Authentication Setup Helper"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}→ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if .env.local exists
if [ -f ".env.local" ]; then
    print_warning ".env.local already exists"
    read -p "Do you want to reconfigure it? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping configuration..."
        exit 0
    fi
fi

echo ""
print_step "Starting Authentication Setup"
echo ""

# Get Supabase credentials
echo -e "${YELLOW}Step 1: Supabase Configuration${NC}"
echo "Go to: https://supabase.com/dashboard"
echo "Copy your project URL and Anon Key"
echo ""

read -p "Enter your Supabase URL: " SUPABASE_URL
read -p "Enter your Supabase Anon Key: " SUPABASE_KEY

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
    print_error "Supabase credentials are required!"
    exit 1
fi

print_success "Supabase credentials entered"
echo ""

# Choose email provider
echo -e "${YELLOW}Step 2: Email Provider Selection${NC}"
echo "Choose your email provider:"
echo "1) Brevo (Recommended - Free tier available)"
echo "2) SendGrid"
echo "3) Mailgun"
echo "4) Skip for now (use Supabase default)"
echo ""

read -p "Enter your choice (1-4): " PROVIDER_CHOICE

case $PROVIDER_CHOICE in
    1)
        echo ""
        print_step "Brevo Configuration"
        echo "Go to: https://www.brevo.com/"
        echo "1. Sign up (if you don't have account)"
        echo "2. Go to Settings → SMTP & API"
        echo "3. Copy SMTP Host, Username, Password"
        echo ""
        read -p "Enter Brevo SMTP Host (default: smtp-relay.brevo.com): " BREVO_HOST
        BREVO_HOST=${BREVO_HOST:-"smtp-relay.brevo.com"}
        read -p "Enter Brevo SMTP Username (email): " BREVO_USER
        read -s -p "Enter Brevo SMTP Password: " BREVO_PASS
        echo ""
        
        if [ -z "$BREVO_USER" ] || [ -z "$BREVO_PASS" ]; then
            print_error "Brevo credentials are required!"
            exit 1
        fi
        
        PROVIDER="brevo"
        print_success "Brevo credentials entered"
        ;;
    2)
        echo ""
        print_step "SendGrid Configuration"
        echo "Go to: https://sendgrid.com/"
        echo "1. Sign up (if you don't have account)"
        echo "2. Go to Settings → API Keys"
        echo "3. Create and copy API Key"
        echo ""
        read -s -p "Enter SendGrid API Key: " SENDGRID_KEY
        echo ""
        
        if [ -z "$SENDGRID_KEY" ]; then
            print_error "SendGrid API Key is required!"
            exit 1
        fi
        
        PROVIDER="sendgrid"
        print_success "SendGrid API Key entered"
        ;;
    3)
        echo ""
        print_step "Mailgun Configuration"
        echo "Go to: https://www.mailgun.com/"
        echo "1. Sign up (if you don't have account)"
        echo "2. Get SMTP credentials"
        echo ""
        read -p "Enter Mailgun SMTP Host: " MAILGUN_HOST
        read -p "Enter Mailgun SMTP Username: " MAILGUN_USER
        read -s -p "Enter Mailgun SMTP Password: " MAILGUN_PASS
        echo ""
        
        if [ -z "$MAILGUN_HOST" ] || [ -z "$MAILGUN_USER" ] || [ -z "$MAILGUN_PASS" ]; then
            print_error "Mailgun credentials are required!"
            exit 1
        fi
        
        PROVIDER="mailgun"
        print_success "Mailgun credentials entered"
        ;;
    *)
        PROVIDER="supabase"
        print_warning "No email provider configured. Using Supabase default (limited to development)"
        ;;
esac

echo ""

# Email configuration
echo -e "${YELLOW}Step 3: Email Settings${NC}"
read -p "Enter from email address (default: noreply@yourdomain.com): " EMAIL_FROM
EMAIL_FROM=${EMAIL_FROM:-"noreply@yourdomain.com"}

read -p "Enter reply-to email (default: support@yourdomain.com): " EMAIL_REPLY
EMAIL_REPLY=${EMAIL_REPLY:-"support@yourdomain.com"}

print_success "Email settings entered"
echo ""

# Create .env.local
echo -e "${YELLOW}Step 4: Creating .env.local${NC}"

cat > .env.local << EOF
# Supabase Configuration
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$SUPABASE_KEY

# Email Provider Configuration
EOF

if [ "$PROVIDER" = "brevo" ]; then
    cat >> .env.local << EOF
VITE_BREVO_SMTP_HOST=$BREVO_HOST
VITE_BREVO_SMTP_USER=$BREVO_USER
VITE_BREVO_SMTP_PASSWORD=$BREVO_PASS
EOF
elif [ "$PROVIDER" = "sendgrid" ]; then
    cat >> .env.local << EOF
VITE_SENDGRID_API_KEY=$SENDGRID_KEY
EOF
elif [ "$PROVIDER" = "mailgun" ]; then
    cat >> .env.local << EOF
VITE_MAILGUN_SMTP_HOST=$MAILGUN_HOST
VITE_MAILGUN_SMTP_USER=$MAILGUN_USER
VITE_MAILGUN_SMTP_PASSWORD=$MAILGUN_PASS
EOF
fi

cat >> .env.local << EOF

# Email Settings
VITE_EMAIL_FROM=$EMAIL_FROM
VITE_EMAIL_REPLY_TO=$EMAIL_REPLY

# Feature Flags
VITE_ENABLE_OAUTH_GOOGLE=true
VITE_REQUIRE_EMAIL_VERIFICATION=true
VITE_ENABLE_PROFILE_IMAGE_UPLOAD=true
EOF

print_success ".env.local file created"
echo ""

# Next steps
echo -e "${GREEN}=================================================="
echo "✓ Configuration Complete!"
echo "==================================================${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Configure Supabase:"
echo "   - Go to https://supabase.com/dashboard"
echo "   - Select your project"
echo "   - Go to Authentication → Providers"
echo "   - Find Email and toggle 'Confirm email' ON"
echo ""
echo "2. Create Storage Bucket:"
echo "   - Go to Storage in Supabase"
echo "   - Click 'Create a new bucket'"
echo "   - Name: 'profile-images'"
echo "   - Toggle 'Public bucket' ON"
echo ""
echo "3. Restart your dev server:"
echo "   - Stop: Ctrl+C"
echo "   - Start: npm run dev"
echo ""
echo "4. Test the flow:"
echo "   - Go to http://localhost:5173/auth"
echo "   - Create an account"
echo "   - Check email for confirmation link"
echo "   - Complete your profile"
echo ""
echo -e "${BLUE}For detailed information, see: AUTHENTICATION_QUICKSTART.md${NC}"
echo ""
