# Production Deployment Quick Reference Card

## One-Page Deployment Guide for turuturustars.co.ke

### 🚀 Super Quick Start (Choose One)

#### Option A: Vercel (Easiest - Recommended)
```bash
1. Go to vercel.com
2. Connect GitHub repository
3. Add Environment Variables:
   VITE_SUPABASE_URL=https://xxx.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your_key
   VITE_APP_URL=https://turuturustars.co.ke
4. Click Deploy
5. Add domain in Vercel Dashboard
6. Update nameservers at registrar
```
**Time**: ~10 minutes  
**Cost**: FREE tier available

#### Option B: Netlify (Similar to Vercel)
```bash
1. Go to netlify.com
2. Connect GitHub repository
3. Build command: npm run build
4. Publish directory: dist
5. Add Environment Variables (same as above)
6. Deploy
7. Add domain in Netlify
8. Update nameservers at registrar
```
**Time**: ~10 minutes  
**Cost**: FREE tier available

#### Option C: Self-Hosted VPS
```bash
1. Get VPS (Digital Ocean, Linode, AWS EC2)
2. npm run build
3. Upload dist/ to server
4. Install Nginx
5. Configure Nginx for SPA
6. Set up SSL (Let's Encrypt)
7. Point DNS to server IP
```
**Time**: ~45 minutes  
**Cost**: $5-20/month

### 📋 Pre-Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] `npm run build` succeeds locally
- [ ] Supabase project created
- [ ] API credentials obtained
- [ ] Domain registered (turuturustars.co.ke)
- [ ] Domain registrar account ready

### 🔑 Required Environment Variables

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
VITE_APP_URL=https://turuturustars.co.ke
```

**How to Get:**
1. Log in to app.supabase.com
2. Settings → API
3. Copy Project URL and Anon Key

### 🌐 DNS Setup

After deployment, you'll get nameservers from Vercel/Netlify:

1. Log in to domain registrar
2. Find "Nameservers" or "DNS Settings"
3. Replace with provider's nameservers
4. Wait 15 min - 48 hours for propagation

**Check if live:**
```bash
nslookup turuturustars.co.ke
# Should show your deployment IP
```

### ✅ Post-Deployment Verification

```bash
1. Visit https://turuturustars.co.ke
2. Check SSL (green lock icon)
3. Test login
4. Test membership fee system
5. Test payment buttons
6. Open DevTools (F12) - no red errors
7. Test on mobile phone
```

### 🔧 Common Commands

```bash
# Build for production
npm run build

# Test production build locally
npm run preview

# Check what will deploy
cat dist/index.html | head -20
```

### 📊 Current Status

| Component | Status |
|-----------|--------|
| Build Config | ✅ Ready |
| Code | ✅ Committed |
| Supabase | ⏳ Needs credentials |
| Domain | ⏳ Awaiting registrar |
| Hosting | ⏳ Choose platform |
| SSL | ✅ Auto (Vercel/Netlify) |

### 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| CORS Error | Add domain to Supabase CORS settings |
| Build Fails | Run `npm install` again, check Node version |
| Can't Login | Check VITE_SUPABASE_URL is correct |
| DNS Not Working | Wait 24 hours, flush DNS cache |
| SSL Issues | Verify domain points to hosting provider |

### 📚 Detailed Guides

- **Full Guide**: `PRODUCTION_DEPLOYMENT_GUIDE.md`
- **Supabase Setup**: `SUPABASE_PRODUCTION_CONFIG.md`  
- **Environment Vars**: `ENVIRONMENT_VARIABLES_GUIDE.md`
- **Checklist**: `DEPLOYMENT_CHECKLIST.md`

### 🎯 Next 5 Minutes

1. Choose hosting (Vercel recommended)
2. Get Supabase credentials
3. Create account on hosting platform
4. Connect your GitHub repo
5. Click Deploy!

### 📞 Need Help?

1. **Build errors**: Run `npm run build` locally to debug
2. **Deployment errors**: Check environment variables
3. **After deployment errors**: Check browser console (F12)
4. **Supabase errors**: Check CORS settings and migrations

### 💡 Pro Tips

- Vercel redeploys on every GitHub push (free previews)
- Test locally with `npm run preview` before deploying
- Monitor logs after deployment to catch issues early
- Set up Sentry later for error tracking
- Enable Supabase backups for data safety

---

**Ready?** Start with **Option A (Vercel)** - it's the easiest! ⚡

**Questions?** See the detailed guides in the repo root folder.
