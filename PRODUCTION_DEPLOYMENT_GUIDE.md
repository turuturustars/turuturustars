# Production Deployment Guide for turuturustars.co.ke

## Overview
This guide covers deploying Turuturustars to your custom domain turuturustars.co.ke. The application is built with Vite (React + TypeScript) and uses Supabase as the backend.

## Prerequisites
- Node.js 16+ installed
- npm or bun package manager
- Supabase project initialized (see your existing supabase/config.toml)
- Domain registration for turuturustars.co.ke
- Hosting platform account (Vercel, Netlify, or your preferred provider)

## Build Instructions

### Development Build
```bash
npm run build:dev
```
Creates an optimized build with development source maps for debugging.

### Production Build
```bash
npm run build
```
Optimizes the build for production (minification, tree-shaking, code splitting).

The built files will be in the `dist/` directory, ready for deployment.

### Local Production Preview
```bash
npm run preview
```
Previews the production build locally at http://localhost:4173

## Environment Variables

### Required Variables
You MUST set these in your hosting platform's environment settings:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
VITE_APP_URL=https://turuturustars.co.ke
```

### How to Get Supabase Credentials
1. Go to your Supabase project dashboard
2. Navigate to **Settings > API**
3. Copy the values:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **Anon/Public key** → `VITE_SUPABASE_PUBLISHABLE_KEY`

**NEVER commit actual credentials to Git. Use .env.production locally but add to .gitignore**

## Deployment Options

### Option 1: Vercel (Recommended - Easiest)

**Advantages:**
- Zero-config deployment
- Automatic HTTPS with free SSL
- Automatic rebuilds on GitHub commits
- Built-in edge network for fast global delivery
- Free tier available

**Steps:**
1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project" → Connect GitHub repository
4. Select your project
5. Click "Environment Variables" and add:
   ```
   VITE_SUPABASE_URL
   VITE_SUPABASE_PUBLISHABLE_KEY
   VITE_APP_URL=https://turuturustars.co.ke
   ```
6. Click "Deploy"
7. After deployment, configure domain:
   - In Vercel dashboard: Settings → Domains
   - Add `turuturustars.co.ke`
   - Update your domain registrar's nameservers to Vercel's:
     ```
     ns1.vercel-dns.com
     ns2.vercel-dns.com
     ```

### Option 2: Netlify

**Advantages:**
- Simple Git integration
- Automatic HTTPS
- Instant rollbacks
- Free tier available
- Great form handling (for future features)

**Steps:**
1. Push code to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Click "New site from Git" → Connect GitHub
4. Select repository
5. Build command: `npm run build`
6. Publish directory: `dist`
7. Click "Advanced" → "New variable" and add:
   ```
   VITE_SUPABASE_URL
   VITE_SUPABASE_PUBLISHABLE_KEY
   VITE_APP_URL=https://turuturustars.co.ke
   ```
8. Deploy
9. Add domain in Netlify: Settings → Domain management
10. Update nameservers at registrar (Netlify will provide)

### Option 3: AWS S3 + CloudFront

**Advantages:**
- Cost-effective
- Highly scalable
- Good CDN coverage

**Steps:**
1. Create S3 bucket named `turuturustars.co.ke`
2. Enable static website hosting
3. Run: `npm run build`
4. Sync dist folder: `aws s3 sync dist/ s3://turuturustars.co.ke/`
5. Create CloudFront distribution pointing to S3
6. Update Route 53 for domain
7. Request ACM certificate for HTTPS

### Option 4: Self-Hosted (VPS/Dedicated Server)

**Using Nginx:**

1. Build the app: `npm run build`
2. Upload `dist/` folder to server
3. Create Nginx config:

```nginx
server {
    listen 80;
    server_name turuturustars.co.ke www.turuturustars.co.ke;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name turuturustars.co.ke www.turuturustars.co.ke;
    
    ssl_certificate /etc/letsencrypt/live/turuturustars.co.ke/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/turuturustars.co.ke/privkey.pem;
    
    root /var/www/turuturustars/dist;
    index index.html;
    
    # SPA routing - all requests go to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

4. Install SSL (free Let's Encrypt):
```bash
sudo certbot certonly --webroot -w /var/www/turuturustars/dist -d turuturustars.co.ke -d www.turuturustars.co.ke
```

5. Restart Nginx:
```bash
sudo systemctl restart nginx
```

## DNS Configuration

### After Deployment

**For Vercel:**
Update your domain registrar with Vercel nameservers:
- ns1.vercel-dns.com
- ns2.vercel-dns.com

**For Netlify:**
Update with Netlify nameservers (provided in dashboard)

**For Self-Hosted:**
Create A record pointing to your server IP:
```
turuturustars.co.ke  A  YOUR.SERVER.IP.ADDRESS
www.turuturustars.co.ke  CNAME  turuturustars.co.ke
```

## CORS Configuration

Your Supabase API is already configured for CORS. If you encounter CORS errors:

1. Go to Supabase Dashboard
2. Settings → API
3. Add to allowed origins:
   ```
   https://turuturustars.co.ke
   https://www.turuturustars.co.ke
   ```

## Post-Deployment Checklist

- [ ] Verify domain loads on https://turuturustars.co.ke
- [ ] Test all authentication flows
- [ ] Verify payment system works (M-Pesa)
- [ ] Test membership fee system
- [ ] Verify database connections work
- [ ] Check browser console for errors
- [ ] Test on mobile devices
- [ ] Verify SSL certificate is valid
- [ ] Set up SSL auto-renewal
- [ ] Configure monitoring/alerts
- [ ] Test email notifications (if applicable)

## Monitoring & Maintenance

### Set Up Monitoring
- **Vercel**: Built-in analytics and monitoring
- **Netlify**: Built-in analytics
- **Self-hosted**: Consider Uptime Robot (free tier)

### Enable Error Tracking
Add to your development environment for production error tracking:
```bash
npm install --save-dev @sentry/react
```

### Regular Updates
- Monthly: Check for dependency updates
- Quarterly: Review access logs and performance
- Annually: Security audit

## Troubleshooting

### Build Fails
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

### App Not Loading
1. Check browser console for errors
2. Verify environment variables are set
3. Check network tab for failed requests
4. Verify Supabase URL is correct

### CORS Errors
1. Verify domain added to Supabase allowed origins
2. Check environment variable VITE_APP_URL is correct
3. Ensure API requests use full URLs

### SSL Issues
1. Verify certificate is valid and not expired
2. Restart web server
3. Clear browser cache
4. Try different browser to rule out cache issues

## Support & Resources

- **Vite Docs**: https://vitejs.dev/guide/
- **React Docs**: https://react.dev/
- **Supabase Docs**: https://supabase.com/docs
- **Vercel Deployment**: https://vercel.com/docs/frameworks/vite
- **Netlify Deployment**: https://docs.netlify.com/
- **Let's Encrypt (SSL)**: https://letsencrypt.org/

---

**Last Updated**: January 2025
**Status**: Ready for Production Deployment
