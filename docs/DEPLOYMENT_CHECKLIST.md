# DealerFlow Deployment Checklist

This checklist covers everything you need to deploy DealerFlow to production on Vercel.

## Required Environment Variables (Minimum)

These must be set in your Vercel project settings (Settings > Environment Variables):

### Core (Required)

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/dealerflow` |
| `NEXTAUTH_SECRET` | Random string for JWT encryption (min 32 chars) | Generate with: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Your production URL | `https://dealerflow.yourdomain.com` |

### DVLA API (Recommended)

| Variable | Description |
|----------|-------------|
| `DVLA_API_KEY` | DVLA Vehicle Enquiry Service API key |

Without this key, VRM lookups will return demo data. Get your key from:
https://developer-portal.driver-vehicle-licensing.api.gov.uk/

## Optional Environment Variables

### Email (for team invites)

| Variable | Description |
|----------|-------------|
| `MAILGUN_API_KEY` | Mailgun API key |
| `MAILGUN_DOMAIN` | Mailgun sending domain |

**OR** for SMTP:

| Variable | Description |
|----------|-------------|
| `SMTP_HOST` | SMTP server host |
| `SMTP_PORT` | SMTP port (default: 587) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `SMTP_FROM` | From email address |

Without email configured:
- Team invites will be disabled
- A warning banner will appear on the Team Settings page
- In development, invite links are logged to console

### Google OAuth (optional)

| Variable | Description |
|----------|-------------|
| `GOOGLE_ID` | Google OAuth client ID |
| `GOOGLE_SECRET` | Google OAuth client secret |

Without these, the "Sign in with Google" button won't appear.

### Stripe (optional, for future billing)

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |

Stripe is not required for MVP. Without it, billing features won't be available.

### AI Features (optional)

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Claude API key for AI hints |

Without this, AI-powered appraisal hints will fall back to generic advice.

## Pre-Deployment Steps

1. **MongoDB Setup**
   - Create a MongoDB Atlas cluster or use your own MongoDB server
   - Create a database user with read/write access
   - Whitelist Vercel's IP ranges (or use 0.0.0.0/0 for simplicity)
   - Get your connection string

2. **Generate NEXTAUTH_SECRET**
   ```bash
   openssl rand -base64 32
   ```
   Or use any random string generator (32+ characters)

3. **Configure Custom Domain (Vercel)**
   - Add your domain in Vercel project settings
   - Update DNS records as instructed
   - Set `NEXTAUTH_URL` to your production URL

## Vercel Deployment

### Via CLI
```bash
npm install -g vercel
vercel login
vercel --prod
```

### Via GitHub
1. Connect your GitHub repo to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy from main branch

## Post-Deployment Verification

- [ ] Visit production URL - should see marketing landing page
- [ ] Click "Sign In" - should see login page (no dev-mode banner)
- [ ] Click "Get Started" - should see registration page
- [ ] Register a new account
- [ ] Complete dealer creation (onboarding/create-dealer)
- [ ] Complete onboarding wizard
- [ ] Access dashboard
- [ ] Test VRM lookup (enter a registration number)
- [ ] Test form submissions
- [ ] If email configured: test team invites

## Troubleshooting

### "Development Mode" banner appearing in production
- Ensure `NODE_ENV=production` (Vercel sets this automatically)

### VRM Lookup returns demo data
- Set `DVLA_API_KEY` in environment variables

### Team invites not working
- Set `MAILGUN_API_KEY` and `MAILGUN_DOMAIN`, OR
- Set SMTP variables (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`)

### "Sign in with Google" not showing
- Set `GOOGLE_ID` and `GOOGLE_SECRET`

### Database connection errors
- Verify `MONGODB_URI` is correct
- Check IP whitelist in MongoDB Atlas
- Ensure database user has correct permissions

## Security Notes

1. **Never commit `.env.local` to git** - it's in `.gitignore` by default
2. **Use environment-specific secrets** - different values for dev/staging/prod
3. **Rotate secrets periodically** - especially `NEXTAUTH_SECRET`
4. **Use MongoDB Atlas's built-in security features** - encryption at rest, network isolation

## Support

For deployment issues:
- Check Vercel deployment logs
- Review MongoDB Atlas logs
- Open an issue at https://github.com/your-repo/dealerflow/issues
