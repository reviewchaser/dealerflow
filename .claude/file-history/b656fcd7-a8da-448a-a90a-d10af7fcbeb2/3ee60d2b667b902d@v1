# DealerFlow Deployment Checklist

## Pre-Deployment

### 1. Environment Variables (Required)

Set these in your hosting platform (Vercel, Railway, etc.):

```bash
# Database
MONGODB_URI=mongodb+srv://...

# Authentication
NEXTAUTH_URL=https://your-production-domain.com
NEXTAUTH_SECRET=<generate-32-char-random-string>
GOOGLE_ID=<from-google-cloud-console>
GOOGLE_SECRET=<from-google-cloud-console>
```

### 2. Environment Variables (Optional)

```bash
# Email (choose one - or leave unconfigured for dev mode)
# Option A: Mailgun
MAILGUN_API_KEY=<your-api-key>
MAILGUN_DOMAIN=mg.yourdomain.com
EMAIL_FROM=noreply@yourdomain.com

# Option B: SMTP
SMTP_HOST=smtp.provider.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-password
EMAIL_FROM=your-email

# External APIs
DVLA_API_KEY=<for-vehicle-lookup>
OPENAI_API_KEY=<for-ai-features>

# File Storage (S3)
S3_ACCESS_KEY=<aws-access-key>
S3_SECRET_KEY=<aws-secret-key>
S3_BUCKET=<bucket-name>
S3_REGION=eu-west-2
```

### 3. Database Setup

1. Create a MongoDB Atlas cluster (or use existing)
2. Create database user with read/write access
3. Whitelist your deployment IP (or use 0.0.0.0/0 for serverless)
4. Copy connection string to `MONGODB_URI`

### 4. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable "Google+ API" and "Google Identity"
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `https://your-domain.com/api/auth/callback/google`
5. Copy Client ID and Secret to env vars

---

## First Run Setup

### Admin/Owner Account Setup

1. Deploy the application
2. Navigate to `/admin-setup` (only works if no dealers exist)
3. Create the first dealer and owner account:
   - Enter dealer name
   - Sign in with Google (this becomes the owner)
4. Complete onboarding at `/onboarding`:
   - Upload logo
   - Configure business details
   - Default forms and task templates are auto-created

### Verify Installation

After setup, verify these features work:

- [ ] Login with Google works
- [ ] Dashboard loads with stats
- [ ] Forms are seeded (PDI, Test Drive, Warranty, etc.)
- [ ] Calendar loads with default categories
- [ ] Settings > Team shows owner account

---

## Post-Deployment Checklist

### Email Configuration

If email is not configured, the system will:
- Log invite links to console (dev mode)
- Show "Email invites disabled" banner in Settings > Team

To enable email invites:
1. Configure Mailgun or SMTP environment variables
2. Restart the application
3. Banner should disappear from Team settings

### Feature Verification

- [ ] **Stock & Prep Board**: Add a vehicle, move through columns
- [ ] **Forms**: Fill out a PDI form, verify submission appears
- [ ] **Appraisals**: Submit a customer PX appraisal via public link
- [ ] **Calendar**: Create an event, verify it shows on calendar
- [ ] **Warranty Board**: Create a case, set booking date (should create calendar event)
- [ ] **Team**: Invite a team member (verify email or console log)
- [ ] **Job Sheet Sharing**: Generate share link, verify public page loads

---

## Troubleshooting

### Common Issues

**"Dealer not found" errors**
- Ensure `/admin-setup` was completed
- Check MongoDB connection string

**OAuth redirect mismatch**
- Verify `NEXTAUTH_URL` matches your domain exactly
- Update Google OAuth redirect URIs

**Email not sending**
- Check Mailgun/SMTP credentials
- Verify EMAIL_FROM matches verified domain
- Check Settings > Team for email status banner

**Forms not appearing**
- Run seed endpoint: `GET /api/seed-forms`
- Check browser console for errors

### Support

For issues, check:
1. Browser console for client errors
2. Server logs for API errors
3. MongoDB Atlas for database issues

---

## Security Notes

- Never commit `.env` files
- Use strong `NEXTAUTH_SECRET` (generate with `openssl rand -base64 32`)
- Enable MongoDB network access restrictions in production
- Set up proper CORS if using custom domains
