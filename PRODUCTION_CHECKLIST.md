# 🚀 Production Deployment Checklist

## ✅ Pre-Deployment Checklist

### 1. Environment Variables in Vercel

Go to **Vercel Dashboard → Your Project → Settings → Environment Variables**

Add these variables for **Production** environment:

```env
# Database
DATABASE_URL=your_neon_database_url

# Clerk Authentication (use PRODUCTION keys, not test keys)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...

# Token Security (IMPORTANT: Use the same key as local)
TOKEN_SECRET_KEY=b3adf99621041ad11441637b47dfc161bf6a086ec34dbf3085e177cc942de175

# Resend Email
RESEND_API_KEY=re_your_api_key

# App URL (NO trailing slash!)
NEXT_PUBLIC_APP_URL=https://osdealsbooking.vercel.app

# Email Sender (optional - will auto-detect if not set)
EMAIL_FROM=jose.paez@ofertasimple.com
```

### 2. Resend Domain Verification ⚠️ CRITICAL

**You MUST verify your domain in Resend for production emails to work:**

1. Go to https://resend.com/domains
2. Click **"Add Domain"**
3. Enter: `ofertasimple.com`
4. Add the DNS records Resend provides to your domain:
   - Usually a TXT record for domain verification
   - Optional: MX records if you want to receive emails
5. Wait for verification (can take 5 minutes to several hours)
6. ✅ Once verified, production emails will work

**Without verification:** All emails will fail in production.

### 3. Optional Environment Variables

```env
# OpenAI (if you're using PDF parsing)
OPENAI_API_KEY=sk-...

# Email Reply-To (optional)
EMAIL_REPLY_TO=jose.paez@ofertasimple.com
```

---

## 📋 Deployment Steps

### Step 1: Commit and Push Code
```bash
git add .
git commit -m "Production ready - email approval system"
git push origin main
```

### Step 2: Verify Vercel Auto-Deploy
- Vercel will automatically deploy when you push to GitHub
- Check Vercel dashboard for deployment status
- Or manually deploy: `vercel --prod`

### Step 3: Test in Production
1. ✅ Visit https://osdealsbooking.vercel.app
2. ✅ Sign in with Clerk
3. ✅ Create a booking request
4. ✅ Check email arrives (from jose.paez@ofertasimple.com)
5. ✅ Click "Aprobar" button in email
6. ✅ Verify redirect to success page
7. ✅ Check booking request status changed in dashboard

---

## 🔍 Common Issues & Fixes

### Issue: "Domain not verified" error from Resend
**Fix:** Complete domain verification in Resend dashboard (Step 2 above)

### Issue: Approval links redirect to localhost
**Fix:** Ensure `NEXT_PUBLIC_APP_URL=https://osdealsbooking.vercel.app` (no trailing slash) is set in Vercel

### Issue: "Invalid token" error when clicking approval
**Fix:** 
- Ensure `TOKEN_SECRET_KEY` is exactly the same in Vercel as in your `.env` locally
- Create a NEW booking request after setting the variable (old tokens won't work)

### Issue: Build fails in Vercel
**Fix:** 
- Check all environment variables are set correctly
- Check Vercel build logs for specific errors
- Ensure `DATABASE_URL` includes `?sslmode=require`

### Issue: Can't sign in
**Fix:**
- Use Clerk production keys (`pk_live_` and `sk_live_`)
- Ensure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are set in Vercel

---

## ✅ Post-Deployment Verification

- [ ] Site loads at https://osdealsbooking.vercel.app
- [ ] Can sign in with Clerk
- [ ] Can view events calendar
- [ ] Can create booking request
- [ ] Email is received (check spam folder)
- [ ] Approval link in email works
- [ ] Status updates correctly in dashboard
- [ ] Admin users can book/reject events
- [ ] Timezone displays correctly (Panama time)

---

## 🔐 Security Notes

1. **Never commit `.env` file to Git** ✅ (already in `.gitignore`)
2. **Use production Clerk keys** (not test keys)
3. **Keep `TOKEN_SECRET_KEY` secure** (don't share or log it)
4. **Use strong `TOKEN_SECRET_KEY`** (the one provided is good)

---

## 📞 Support

If issues persist:
1. Check Vercel deployment logs
2. Check Vercel function logs (for API routes)
3. Check browser console for client-side errors
4. Verify all environment variables are set correctly
5. Ensure Resend domain is verified

