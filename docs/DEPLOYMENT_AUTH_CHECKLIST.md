# DealerFlow Deployment Auth Checklist

This document lists all environment variables required for authentication to work properly in production.

## Required Environment Variables

These must be set for the application to function:

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/dealerflow` |
| `NEXTAUTH_URL` | Full URL of your deployed app | `https://dealerflow.vercel.app` |
| `NEXTAUTH_SECRET` | Random 32+ character secret for JWT signing | `your-random-32-character-secret-here` |

### Generating NEXTAUTH_SECRET

```bash
# Using openssl
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Optional - Google OAuth

Required for "Sign in with Google" functionality:

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `GOOGLE_ID` | Google OAuth Client ID | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `GOOGLE_SECRET` | Google OAuth Client Secret | Same as above |

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new OAuth 2.0 Client ID
3. Set Authorized redirect URIs:
   - `https://your-domain.com/api/auth/callback/google`
4. Copy Client ID and Client Secret to env vars

**Important:** The redirect URI must match your `NEXTAUTH_URL` exactly.

## Optional - Email (Mailgun)

Required for team invites and password reset emails:

| Variable | Description | Example |
|----------|-------------|---------|
| `MAILGUN_API_KEY` | Mailgun API key | `key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `MAILGUN_DOMAIN` | Your Mailgun sending domain | `mg.yourdomain.com` |
| `MAILGUN_FROM` | Default "From" address | `DealerFlow <noreply@mg.yourdomain.com>` |

### Mailgun Setup

1. Sign up at [Mailgun](https://www.mailgun.com/)
2. Add and verify your sending domain
3. Get your API key from the dashboard
4. Set environment variables

**Note:** If Mailgun is not configured:
- Team invites will show the invite URL in server logs
- Password reset will not work (use admin recovery endpoint instead)
- Development mode logs emails to console

## Optional - Email (SMTP Alternative)

If you prefer SMTP over Mailgun:

| Variable | Description | Example |
|----------|-------------|---------|
| `SMTP_HOST` | SMTP server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port (default: 587) | `587` |
| `SMTP_USER` | SMTP username | `your-email@gmail.com` |
| `SMTP_PASS` | SMTP password/app password | `your-app-password` |
| `SMTP_SECURE` | Use TLS (default: false) | `true` |
| `SMTP_FROM` | Default "From" address | `DealerFlow <noreply@yourdomain.com>` |

## Development Only

**Never set these in production!**

| Variable | Description |
|----------|-------------|
| `ENABLE_DEV_LOGIN` | Allow login with password `test123` for any email |
| `NEXT_PUBLIC_ENABLE_DEV_LOGIN` | Show dev login banner on signin page |
| `ENABLE_ADMIN_RECOVERY` | Enable `/api/dev/set-password` endpoint |

### Using Admin Recovery (One-time Use)

If you need to recover an account that has no password:

1. Set `ENABLE_ADMIN_RECOVERY=true` in Vercel env vars
2. Redeploy
3. Make API call:
   ```bash
   curl -X POST https://your-domain.com/api/dev/set-password \
     -H "Content-Type: application/json" \
     -d '{"email": "user@example.com", "newPassword": "NewPassword123"}'
   ```
4. Remove `ENABLE_ADMIN_RECOVERY` from env vars
5. Redeploy

## Vercel Deployment Notes

- Environment variable changes require a **redeploy** to take effect
- Use Vercel's encrypted environment variables for secrets
- Set different values for Production, Preview, and Development environments
- Check "Function Logs" in Vercel dashboard for auth debugging

## Troubleshooting

### "Invalid email or password"

1. Check server logs for specific failure reason:
   - `user not found` - email doesn't exist
   - `passwordHash missing` - user exists but has no password (OAuth user?)
   - `bcrypt mismatch` - wrong password
   - `user is disabled` - account has been disabled

2. Verify email is lowercase (we normalize, but check DB directly)

3. For passwordless accounts, either:
   - Use Google OAuth to sign in
   - Use admin recovery endpoint to set a password

### "Signup failed: server returned HTML"

1. Check if `MONGODB_URI` is set correctly
2. Check if database is accessible from Vercel's IPs
3. Check Vercel Function Logs for errors

### Google OAuth errors

1. Verify `NEXTAUTH_URL` matches your deployed domain exactly
2. Check Google Console redirect URIs include your callback URL
3. Ensure client ID and secret are correct

### Emails not sending

1. Check if Mailgun env vars are set
2. Verify Mailgun domain is verified
3. Check Mailgun logs in their dashboard
4. In dev mode, emails are logged to console instead

## Quick Start

Minimum env vars for auth to work:

```env
MONGODB_URI=mongodb+srv://...
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-32-char-secret-here
```

Add these for full functionality:

```env
# Google OAuth
GOOGLE_ID=your-google-client-id
GOOGLE_SECRET=your-google-client-secret

# Email
MAILGUN_API_KEY=key-xxxxx
MAILGUN_DOMAIN=mg.yourdomain.com
MAILGUN_FROM=DealerFlow <noreply@mg.yourdomain.com>
```
