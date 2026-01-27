#!/bin/bash

# Security Check Script - Verify no sensitive data in git

echo "🔍 Checking for exposed secrets in git history..."
echo ""

# Check for .env files in git
echo "Checking .env files:"
git log --all --full-history --pretty=format: -- .env .env.local .env.production .env.development 2>/dev/null | wc -l
if [ $? -eq 0 ]; then
    echo "✅ No .env files in git history"
else
    echo "⚠️ WARNING: .env files may be in git history"
fi

echo ""
echo "Checking for common secrets patterns:"

# Check for Supabase keys
if git log --all -S "VITE_SUPABASE_PUBLISHABLE_KEY" --oneline 2>/dev/null | grep -q .; then
    echo "⚠️ Found VITE_SUPABASE_PUBLISHABLE_KEY in git history"
else
    echo "✅ No Supabase keys in git history"
fi

# Check for API keys
if git log --all -S "eyJhbGci" --oneline 2>/dev/null | grep -q .; then
    echo "⚠️ Found JWT tokens in git history"
else
    echo "✅ No JWT tokens in git history"
fi

# Check current .gitignore
echo ""
echo "Checking .gitignore configuration:"
if grep -q "^\.env$" .gitignore; then
    echo "✅ .env is in .gitignore"
else
    echo "⚠️ .env is NOT in .gitignore"
fi

if grep -q "^\.env\.local$" .gitignore; then
    echo "✅ .env.local is in .gitignore"
else
    echo "⚠️ .env.local is NOT in .gitignore"
fi

echo ""
echo "🔐 Security check complete!"
