# Quick Deployment Checklist

## Before Deployment

- [ ] All code committed and pushed to main branch
- [ ] Run `npm run build` locally and verify it succeeds
- [ ] Run `npm run preview` and test the built app works
- [ ] No console errors in the preview
- [ ] All features tested locally
- [ ] Environment variables documented

## Domain Preparation

- [ ] Registered turuturustars.co.ke
- [ ] Access to domain registrar account
- [ ] Domain registrar supports nameserver changes

## Hosting Platform Setup

### Choose Platform
- [ ] Vercel (Recommended - easiest)
- [ ] Netlify (Alternative - good features)
- [ ] AWS S3 + CloudFront
- [ ] Self-hosted VPS

### Platform-Specific Steps

**If Using Vercel:**
- [ ] Create Vercel account
- [ ] Connect GitHub repository
- [ ] Set environment variables in Vercel
- [ ] Trigger initial deployment
- [ ] Get Vercel nameservers

**If Using Netlify:**
- [ ] Create Netlify account
- [ ] Connect GitHub repository
- [ ] Set build command: `npm run build`
- [ ] Set publish directory: `dist`
- [ ] Set environment variables
- [ ] Trigger initial deployment
- [ ] Get Netlify nameservers

**If Self-Hosted:**
- [ ] Server/VPS ready (Ubuntu 20.04+ recommended)
- [ ] Node.js 16+ installed
- [ ] Nginx or Apache installed
- [ ] SSH access verified
- [ ] SSL certificate ready (or use Let's Encrypt)

## DNS Configuration

- [ ] Get correct nameservers from hosting platform
- [ ] Log in to domain registrar
- [ ] Update nameservers
- [ ] Wait for DNS propagation (15 min - 48 hours)
- [ ] Verify with `nslookup turuturustars.co.ke`

## Supabase Configuration

- [ ] Supabase project created and running
- [ ] Migrations applied to Supabase
- [ ] API credentials obtained
- [ ] CORS origin added: https://turuturustars.co.ke
- [ ] M-Pesa functions deployed (if using payments)

## Environment Variables

- [ ] VITE_SUPABASE_URL set in hosting platform
- [ ] VITE_SUPABASE_PUBLISHABLE_KEY set
- [ ] VITE_APP_URL set to https://turuturustars.co.ke
- [ ] Variables are NOT in .env files committed to Git

## Post-Deployment Verification

- [ ] Domain https://turuturustars.co.ke loads
- [ ] SSL certificate is valid (green lock icon)
- [ ] App loads without console errors
- [ ] Login works
- [ ] Database connection works
- [ ] Payment system loads (if enabled)
- [ ] Membership fee system works
- [ ] Mobile responsive (tested on phone)
- [ ] Performance acceptable (< 3s initial load)

## Testing Checklist

### Core Functionality
- [ ] Users can register
- [ ] Users can log in
- [ ] Users can view dashboard
- [ ] Users can see their membership fee status
- [ ] Payment buttons are clickable
- [ ] Forms validate properly

### Payment System
- [ ] Payment modal opens
- [ ] M-Pesa payment initiated
- [ ] Payment confirmation received
- [ ] Membership status updates after payment

### Admin Features (if applicable)
- [ ] Treasurer can view fee collection stats
- [ ] Organizer can create announcements
- [ ] Chat works in real-time
- [ ] Notifications come through

### Browser Compatibility
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

### Performance
- [ ] First paint < 2 seconds
- [ ] Interactive < 3 seconds
- [ ] No memory leaks on long usage
- [ ] Images optimized

## Monitoring & Rollback

- [ ] Set up error tracking (Sentry optional)
- [ ] Monitor analytics
- [ ] Review error logs daily first week
- [ ] Keep rollback plan ready
- [ ] Document any issues encountered

## Post-Launch

- [ ] Announce site is live
- [ ] Share domain with members
- [ ] Monitor user feedback
- [ ] Fix any critical bugs immediately
- [ ] Plan Phase 2 features

---

**Deployment Date**: _______________

**Deployed By**: _______________

**Platform Used**: _______________

**Status**: 
- [ ] In Progress
- [ ] Completed Successfully
- [ ] Issues Found (document below)

**Notes**:
