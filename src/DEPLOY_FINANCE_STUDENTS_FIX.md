# Deploy Finance Students Endpoint Fix

## The Issue
You're getting `TypeError: Failed to fetch` because the backend changes to fix the duplicate `/students` endpoint haven't been deployed yet.

## What Was Fixed
- Removed duplicate `/students` endpoint at line ~10212
- The correct endpoint at line ~13122 with Finance Admin permissions is now the only one

## Deploy Now

Run this command in your terminal:

```bash
npx supabase functions deploy server
```

## Expected Output
You should see:
```
Deploying function server...
Function deployed successfully!
```

## After Deployment
1. Refresh your browser page
2. Go to Finance Dashboard → Payment Entry tab
3. The students dropdown should now load successfully

## Verify It's Working
Check the browser console - you should see logs like:
```
[PaymentForm] Fetching students...
[PaymentForm] Response status: 200
[PaymentForm] Loaded students count: X
```

Instead of:
```
[PaymentForm] Error fetching students: TypeError: Failed to fetch
```

## If Still Not Working

1. **Check Supabase is running:**
   ```bash
   npx supabase status
   ```

2. **Check the deployment:**
   ```bash
   npx supabase functions list
   ```
   You should see `server` in the list.

3. **Check backend logs:**
   - Open Supabase Dashboard
   - Go to Edge Functions
   - Click on `server` function
   - Check the logs for any errors

---

**Quick Fix:** Just run `npx supabase functions deploy server` and you're done! ✅
