# Vercel Environment Variables Setup

## Add S3 Credentials to Vercel

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**

2. Add these three variables:

   **Variable Name:** `SUPABASE_S3_ACCESS_KEY_ID`  
   **Value:** `c87d6bc5ed7ce0ecea1b4a7ae20bf82d`  
   **Environment:** Production, Preview, Development (select all)

   **Variable Name:** `SUPABASE_S3_SECRET_ACCESS_KEY`  
   **Value:** `704c2d65f7fab4732a32befc5e0662f59b2996517db277b2706c3baaf57f7e9e`  
   **Environment:** Production, Preview, Development (select all)

   **Variable Name:** `SUPABASE_S3_REGION`  
   **Value:** `us-west-2`  
   **Environment:** Production, Preview, Development (select all)

3. Click **Save** for each variable

4. **Redeploy** your application for the changes to take effect

## Verification

After adding the variables, you can verify they're set by checking the Vercel deployment logs or using them in your application code.

