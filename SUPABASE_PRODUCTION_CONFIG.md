# Supabase Production Configuration Guide

## Getting Started with Supabase for turuturustars.co.ke

### 1. Verify Your Supabase Project

Your project configuration is in `supabase/config.toml`:

```bash
# View current config
cat supabase/config.toml
```

Key settings you may need to adjust for production:
- `project_id`: Your unique Supabase project ID
- API URL and keys must be accessible from turuturustars.co.ke

### 2. Apply Database Migrations to Production

Your project has migrations for:
- ✅ Membership fees system
- ✅ Welfare transactions
- ✅ Messages and notifications
- ✅ Announcements
- ✅ Chat system

To deploy migrations to production:

```bash
# Option 1: Using Supabase CLI
supabase db push

# Option 2: Manually in Supabase Dashboard
# Go to SQL Editor and run each migration file
```

### 3. Configure CORS for Your Domain

The app needs CORS access to Supabase API:

**In Supabase Dashboard:**
1. Go to **Settings** → **API**
2. Scroll to **CORS Configuration**
3. Add your domain:
   ```
   https://turuturustars.co.ke
   https://www.turuturustars.co.ke
   ```

### 4. Deploy Supabase Functions

Your M-Pesa payment functions are in `supabase/functions/`:

```bash
# Deploy all functions
supabase functions deploy

# Or deploy specific function
supabase functions deploy mobile-money-handler
```

**Set Function Environment Variables:**
1. Go to Supabase Dashboard
2. **Settings** → **Functions**
3. Add these environment variables:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   MPESA_CONSUMER_KEY=your_mpesa_key
   MPESA_CONSUMER_SECRET=your_mpesa_secret
   MPESA_PASSKEY=your_mpesa_passkey
   MPESA_BUSINESS_SHORT_CODE=your_shortcode
   ```

### 5. Configure Authentication

**Email/Password Auth:**
- Already enabled by default
- Confirm email required by default

**Optional: Social Auth (Google, GitHub, etc.):**
1. Go to **Authentication** → **Providers**
2. Enable desired provider
3. Add OAuth credentials from provider's console

### 6. Verify Database Backups

Supabase provides automatic backups. Check settings:
1. **Settings** → **Backups**
2. Ensure automatic backups are enabled
3. Note: Free tier has 7-day retention, Pro tier has 30-day

### 7. Set Up Row Level Security (RLS)

RLS policies protect your data. Verify they're enabled:

```bash
# Check RLS policies
supabase db list-tables
```

Key tables with RLS:
- `profiles` - Users can only see their own data
- `membership_fees` - Treasurer/members have specific access
- `welfare_transactions` - Members can see their transactions
- `messages` - Users can only see their messages
- `announcements` - Read-only for most, write for admins

### 8. Environment Variables for Production

Add to your Supabase project environment:

```bash
# In supabase/.env.production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_public_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 9. Database Capacity Planning

Monitor your database usage:
1. Go to **Settings** → **Database**
2. Check storage used
3. Monitor connections

**Free tier limits:**
- 500MB database
- 1GB bandwidth
- 2 concurrent connections

**Pro tier (recommended for production):**
- 8GB database
- 50GB bandwidth
- Unlimited concurrent connections

### 10. Enable Real-Time Features

The app uses real-time subscriptions for:
- Chat messages
- Announcements
- Notifications
- Membership fee updates

**Verify Real-Time is enabled:**
1. **Settings** → **Realtime**
2. Ensure it's **ON**
3. All tables listed should be available

### 11. Security Checklist

- [ ] CORS configured for turuturustars.co.ke
- [ ] RLS policies enabled on all tables
- [ ] Service role key stored securely (not in code)
- [ ] Anon key is safe to use (it's public)
- [ ] Functions environment variables set
- [ ] Database backups enabled
- [ ] SSL certificate valid (handled by Supabase)
- [ ] Email authentication working

### 12. Monitoring and Logging

**Monitor Supabase in Dashboard:**
1. **Logs** tab shows recent API calls and errors
2. **Database** tab shows query performance
3. **Realtime** tab shows connection health

**For advanced monitoring, consider:**
- Datadog integration
- Sentry for error tracking
- Supabase Studio analytics

### 13. Troubleshooting Common Issues

**CORS Errors:**
```
Access to XMLHttpRequest blocked by CORS policy
```
→ Add domain to CORS settings (see step 3)

**Authentication Fails:**
```
Unauthorized: Not allowed to access resource
```
→ Verify RLS policies and user permissions

**Functions Return Errors:**
```
500 Internal Server Error
```
→ Check function logs in Functions section
→ Verify environment variables are set

**Real-Time Not Working:**
```
Connection timeout or no updates
```
→ Enable Real-Time (see step 10)
→ Check network in browser DevTools
→ Verify table is in Real-Time publication list

### 14. Scaling for Production

As usage grows:

**Week 1-4 (Launch):**
- Monitor database size and connections
- Free tier likely sufficient initially

**Month 2+ (Growing Users):**
- Upgrade to Pro tier
- Enable Point-in-Time Recovery (PITR)
- Set up database connection pooling

**Month 6+ (Mature Product):**
- Consider dedicated compute
- Custom domain configuration
- Advanced analytics with Datadog

### 15. Production Support

**Helpful Resources:**
- Supabase Docs: https://supabase.com/docs
- Supabase Status: https://status.supabase.com
- Community Discord: https://discord.supabase.com

**For paid support:**
- Email support included with Pro tier
- Priority support available with Enterprise tier

---

**Next Steps:**
1. Apply migrations to production Supabase
2. Deploy functions with correct environment variables
3. Test authentication and payment flows
4. Monitor initial traffic and performance
5. Plan scaling as users grow
