# 🐔 Cooped Backend Setup Guide

## Step 1: Create Database Schema in Supabase

1. Go to your Supabase dashboard: https://iwiwnximqjtnmmmtgmoh.supabase.co
2. Click **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy the entire contents of `supabase-schema.sql` (in project root)
5. Paste into the SQL editor
6. Click **Run**

✅ All tables, indexes, and Row Level Security policies will be created automatically.

---

## Step 2: Enable Google OAuth (Optional but Recommended)

1. In Supabase dashboard, go to **Authentication** → **Providers**
2. Click **Google**
3. Enter your Google OAuth credentials:
   - Client ID
   - Client Secret
   (Get these from Google Cloud Console if you don't have them)
4. Click **Save**

For MVP, you can skip this and use Email/Password or Guest Mode instead.

---

## Step 3: Install Supabase Package in Extension

The extension needs the Supabase JS client. Add to `package.json`:

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0",
    "uuid": "^9.0.0"
  }
}
```

Then run:
```bash
npm install
```

---

## Step 4: Test the Connection

Once installed, you can test by opening your extension popup and checking the browser console:

```js
import { getCurrentUser } from './src/logic/supabaseClient.js'

const user = await getCurrentUser()
console.log('Current user:', user)
```

Should print `null` if no one is logged in, or the user object if someone is.

---

## Database Schema Overview

### Tables Created:
- **users** - Core user data (XP, level, eggs, streaks, coop)
- **coops** - Team/group data
- **xp_events** - Audit log of all XP changes
- **stim_events** - Track blocked site visits
- **challenge_sessions** - Track mini-game results

### Row Level Security (RLS):
- Users can ONLY see/modify their own data
- Coop leaders can manage their coops
- Service role (backend) can do anything
- Anon key (extension/app) is restricted by RLS

### Views Created:
- **user_stats** - Dashboard stats for a user
- **coop_leaderboard** - Rankings within a coop

---

## Files Created

### `/src/logic/supabaseClient.js`
Core Supabase connection and session management.

**Key functions:**
- `getCurrentUser()` - Get logged-in user
- `getSession()` - Get current auth session
- `signOut()` - Logout
- `onAuthStateChange()` - Listen for auth changes

### `/src/logic/authManager.js`
User authentication: signup, login, guest mode.

**Key functions:**
- `signUpWithEmail(email, password)` - Email signup
- `signInWithEmail(email, password)` - Email login
- `signInWithGoogle()` - Google OAuth
- `createGuestUser()` - Anonymous user
- `getUserProfile(userId)` - Fetch user data from DB
- `createUserProfile(userId, authProvider)` - Create user after auth

---

## Next Steps

Once the schema is created and packages are installed:

1. **STEP 2:** Implement XP engine (`xpEngine.js`)
2. **STEP 3:** Implement skip/hearts system (`skipSystem.js`)
3. **STEP 4:** Implement coop system (`coopManager.js`)
4. **STEP 5:** Build auth UI (login/signup screens)
5. And so on...

---

## Troubleshooting

### "Anon key not valid"
- Make sure you copied the Anon Key correctly from Settings → API
- Check that Supabase URL and key match your project

### "Cannot find module '@supabase/supabase-js'"
- Run `npm install @supabase/supabase-js uuid`

### "RLS policy denies access"
- This is expected if you're not authenticated
- Log in first, then queries will work

### Tables not showing up
- Refresh the Supabase dashboard
- Check SQL Editor → Run history to see if query succeeded

---

## Security Notes

✅ **Safe to share:**
- Supabase URL
- Anon Key
- Project ID

❌ **Never share:**
- Service Role Key
- Database password
- Auth secrets

The Anon Key is protected by Row Level Security (RLS), so even if someone has it, they can only access their own data.

---

## Production Checklist

When ready to launch:

- [ ] Enable email confirmation (Auth → Providers → Email)
- [ ] Set up SMTP for emails (Auth → Smtp → Configure)
- [ ] Enable 2FA (Auth → Providers → Verify)
- [ ] Review and test all RLS policies
- [ ] Set up database backups
- [ ] Configure rate limiting on functions
- [ ] Monitor for unusual activity

---

For questions, check Supabase docs: https://supabase.com/docs
