# Turuturu Stars Community Based Organization

## 🌟 Overview

Turuturu Stars is a comprehensive web platform designed for Community Based Organizations (CBOs) to manage member contributions, welfare assistance, announcements, and community activities efficiently.

**Live Demo**: [turuturustars.co.ke](https://turuturustars.co.ke)

---

## ✨ Key Features

### Member Management
- **User Registration & Authentication** - Secure sign-up and login
- **Profile Management** - Manage personal information and preferences
- **Member Directory** - View and search community members
- **Role-Based Access** - Different dashboards for different roles

### Financial Management
- **Contribution Tracking** - Record and track member contributions
- **Membership Fees** - Automatic KES 200 annual billing
- **Welfare Fund Management** - Manage community welfare funds
- **Payment Integration** - M-Pesa payment processing
- **Financial Reports** - Treasurer dashboards and analytics

### Communication
- **Real-time Announcements** - Communicate with community members
- **Messaging System** - Direct member-to-member communication
- **Notifications** - Real-time push notifications
- **Chat System** - Community chat functionality

### Admin Features
- **Member Approvals** - Review and approve new members
- **Contribution Management** - Manage all contributions
- **Welfare Distribution** - Track welfare payments
- **Analytics Dashboard** - View community statistics
- **Role Management** - Assign roles to members

---

## 🏗️ Technology Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first CSS
- **shadcn/ui** - Component library
- **Radix UI** - Accessible component primitives

### Backend
- **Supabase** - PostgreSQL database
- **Supabase Auth** - User authentication
- **Supabase Realtime** - Real-time updates
- **Supabase Functions** - Serverless functions (Deno)

### External Services
- **M-Pesa API** - Mobile money payments
- **Cloudinary** - Image upload and management

### Development Tools
- **ESLint** - Code linting
- **TypeScript** - Type checking
- **React Query** - Server state management
- **React Hook Form** - Form management
- **Zod** - Schema validation

---

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ or Bun
- npm or bun package manager
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/turuturustars/turuturustars.git
cd turuturustars
```

2. **Install dependencies**
```bash
npm install
# or
bun install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

4. **Run development server**
```bash
npm run dev
```

The app will be available at `http://localhost:8080`

---

## 📁 Project Structure

```
turuturustars/
├── src/
│   ├── pages/                    # Page components
│   │   ├── Index.tsx            # Landing page
│   │   ├── Auth.tsx             # Login/Register
│   │   └── dashboard/           # Dashboard pages
│   ├── components/              # Reusable components
│   │   ├── ui/                 # Shadcn UI components
│   │   ├── Header.tsx          # Navigation header
│   │   ├── Footer.tsx          # Footer
│   │   └── StructuredData.tsx  # SEO structured data
│   ├── hooks/                   # Custom React hooks
│   │   ├── usePageMeta.ts      # SEO meta tags hook
│   │   ├── useAuth.ts          # Authentication
│   │   └── [other-hooks]
│   ├── lib/                     # Utility functions
│   │   ├── mpesa.ts            # M-Pesa integration
│   │   └── rolePermissions.ts  # Permission logic
│   ├── integrations/            # External integrations
│   │   └── supabase/
│   ├── layouts/                 # Layout components
│   └── main.tsx                # Entry point
├── public/
│   ├── robots.txt              # Search engine rules
│   ├── sitemap.xml             # XML sitemap
│   └── [assets]
├── supabase/
│   ├── migrations/             # Database migrations
│   └── functions/              # Serverless functions
├── index.html                  # HTML template
├── package.json                # Dependencies
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript config
└── tailwind.config.ts          # Tailwind configuration
```

---

## 📄 Pages & Routes

### Public Pages
- `/` - Landing page with organization info
- `/auth` - Login and registration

### Protected Pages (Require Authentication)
- `/dashboard` - User dashboard
- `/dashboard/profile` - User profile management
- `/dashboard/contributions` - Contribution tracking
- `/dashboard/welfare` - Welfare requests and assistance
- `/dashboard/announcements` - Organization announcements
- `/dashboard/members` - Member directory
- `/dashboard/approvals` - Pending member approvals
- `/dashboard/all-contributions` - View all contributions

### Role-Specific Dashboards
- `/dashboard/chairperson` - Chairperson overview
- `/dashboard/vice-chairman` - Vice chairman dashboard
- `/dashboard/secretary` - Secretary dashboard
- `/dashboard/treasurer` - Treasurer financial dashboard
- `/dashboard/organizing-secretary` - Event organization
- `/dashboard/patron` - Patron dashboard
- `/dashboard/admin` - Admin controls

---

## 🔐 Authentication & Roles

### Available Roles
1. **Member** - Regular community member
2. **Secretary** - Handles documentation and minutes
3. **Treasurer** - Manages finances and contributions
4. **Vice Chairman** - Assists chairperson
5. **Chairperson** - Organization leader
6. **Organizing Secretary** - Plans events and activities
7. **Patron** - Senior advisor/mentor
8. **Admin** - System administrator

### Security Features
- Supabase authentication with email verification
- Row-Level Security (RLS) policies on all tables
- Role-based access control (RBAC)
- Secure password requirements
- Session management with auto-refresh

---

## 🛠️ Development

### Available Scripts

```bash
# Development server
npm run dev

# Production build
npm run build

# Development build (with source maps)
npm run build:dev

# Preview production build
npm run preview

# Run linter
npm run lint
```

### Code Style
- ESLint configuration for consistent code
- TypeScript for type safety
- Prettier formatting (configured in ESLint)

### Best Practices
- Each page is independent with its own meta tags using `usePageMeta` hook
- Pages include structured data for SEO
- Lazy loading of route components
- Error boundaries for error handling
- Accessibility features with Radix UI

---

## 🎨 UI Components

The project uses **shadcn/ui** component library with customization:

- Buttons, Input fields, Cards
- Modal dialogs and dropdowns
- Forms with validation
- Tables with sorting/filtering
- Tabs and navigation
- Toast notifications
- Custom icons via Lucide

---

## 🔄 Real-time Features

The app leverages Supabase Realtime for:
- **Live Announcements** - Instant community updates
- **Real-time Chat** - Immediate messaging
- **Notification Subscriptions** - Push notifications
- **Data Synchronization** - Auto-updating data across tabs

---

## 📱 Responsive Design

The platform is fully responsive:
- Mobile-first approach
- Tailwind CSS breakpoints
- Touch-friendly interface
- Optimized for all screen sizes

---

## 🔍 SEO Optimization

### Meta Tags
- Dynamic page titles and descriptions
- Open Graph tags for social sharing
- Twitter Card support
- Canonical URLs

### Structured Data
- JSON-LD markup for schema.org
- Organization structured data
- Breadcrumb navigation

### Indexing
- XML Sitemap at `/sitemap.xml`
- Robots.txt with crawl rules
- Search engine friendly URLs
- Proper heading hierarchy (H1, H2, H3)

### Page Independence
- Each page manages its own meta tags
- Self-contained components
- No shared state pollution
- Independent routing and loading

---

## 🚀 Deployment

### Production Build
```bash
npm run build
```

Creates optimized files in `dist/` folder.

### Hosting Options
- **Vercel** (Recommended) - Automatic deployment from GitHub
- **Netlify** - GitHub integration with drag-and-drop
- **AWS S3 + CloudFront** - Manual deployment
- **Self-hosted** - VPS/Server deployment

### Environment Variables (Production)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_key
VITE_APP_URL=https://turuturustars.co.ke
```

---

## 📊 Performance Optimization

- **Code Splitting** - Lazy loading of routes
- **Image Optimization** - Cloudinary integration
- **Build Optimization** - Vite tree-shaking and minification
- **Caching** - Browser and CDN caching
- **Bundle Analysis** - Monitor bundle size
- **CSS Purging** - Tailwind removes unused styles

---

## 🐛 Troubleshooting

### Common Issues

**CORS Error**
```
Solution: Add domain to Supabase CORS settings
Settings → API → CORS Configuration
```

**Build Fails**
```bash
# Clear cache and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Page Not Loading**
1. Check browser console (F12) for errors
2. Verify Supabase URL and key
3. Check network tab for failed requests
4. Clear browser cache

---

## 📚 Documentation

- [Supabase Setup Guide](./SUPABASE_PRODUCTION_CONFIG.md)
- [Deployment Guide](./PRODUCTION_DEPLOYMENT_GUIDE.md)
- [Environment Variables](./ENVIRONMENT_VARIABLES_GUIDE.md)
- [API Documentation](./docs/)

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Guidelines
- Write clean, readable code
- Add comments for complex logic
- Test before submitting PR
- Follow existing code style
- Update documentation

---

## 📄 License

This project is licensed under the MIT License - see LICENSE file for details.

---

## 👥 Team

**Turuturu Stars CBO**
- Leadership and Development Team
- Community Members

---

## 📞 Support & Contact

- **Email**: support@turuturustars.co.ke
- **Website**: https://turuturustars.co.ke
- **Twitter**: [@TuruturuStars](https://twitter.com/TuruturuStars)

---

## 🙏 Acknowledgments

- Supabase for excellent backend services
- shadcn/ui for beautiful components
- Vite for fast development experience
- Community members for feedback and support

---

## 📊 Status

- ✅ Production Ready
- ✅ Mobile Optimized
- ✅ SEO Optimized
- ✅ Accessibility Compliant
- ✅ Real-time Features Active

---

**Made with ❤️ for the Turuturu Stars Community**

Last Updated: January 2026
