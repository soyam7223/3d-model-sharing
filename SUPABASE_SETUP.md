# 🚀 Supabase Setup Guide for 3Dsharespace

## **Step 1: Set Up Your Supabase Project**

1. **Go to [supabase.com](https://supabase.com)** and sign in
2. **Create a new project**:
   - Click "New Project"
   - Choose your organization
   - Enter project name: `3dsharespace` (or your preferred name)
   - Set a database password (save this!)
   - Choose a region close to your users
   - Click "Create new project"

## **Step 2: Get Your Project Credentials**

1. **Go to Settings → API** in your Supabase dashboard
2. **Copy these values** (you already have them):
   ```
   Project URL: https://xxziychdaarykpquzqhi.supabase.co
   anon/public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

## **Step 3: Create the Database Schema**

1. **Go to SQL Editor** in your Supabase dashboard
2. **Copy the entire content** from `database/schema.sql`
3. **Paste it into the SQL Editor**
4. **Click "Run"** to execute the schema

This will create:
- ✅ All necessary tables (profiles, models, comments, likes, etc.)
- ✅ Indexes for performance
- ✅ Row Level Security (RLS) policies
- ✅ Triggers for automatic count updates
- ✅ Sample data for testing

## **Step 4: Configure Authentication**

1. **Go to Authentication → Settings** in Supabase
2. **Enable Email Auth** (should be enabled by default)
3. **Optional: Enable OAuth providers** (Google, GitHub, etc.)
4. **Set your site URL** to `http://localhost:3000` for development

## **Step 5: Test the Integration**

1. **Start your backend**: `npm run dev:backend` (in backend folder)
2. **Start your frontend**: `npm run dev:frontend` (in frontend folder)
3. **Visit** `http://localhost:3000`
4. **Check the browser console** for any Supabase connection errors

## **Step 6: Create Your First User**

1. **Go to Authentication → Users** in Supabase
2. **Click "Add User"**
3. **Enter email and password**
4. **Go to SQL Editor** and run:
   ```sql
   INSERT INTO public.profiles (id, username, display_name, role)
   VALUES (
     'YOUR_USER_ID_HERE', -- Copy from the users table
     'your_username',
     'Your Display Name',
     'CREATOR'
   );
   ```

## **Step 7: Test Database Operations**

The frontend should now:
- ✅ Connect to Supabase successfully
- ✅ Load real data from the database (instead of mock data)
- ✅ Handle authentication properly
- ✅ Store user sessions

## **🔧 Troubleshooting**

### **Common Issues:**

1. **"Missing Supabase environment variables"**
   - Check that `.env.local` exists in your `frontend/` folder
   - Restart your frontend dev server

2. **"Invalid API key"**
   - Verify your anon key in `.env.local`
   - Make sure there are no extra spaces or characters

3. **"Table doesn't exist"**
   - Run the schema.sql file in Supabase SQL Editor
   - Check that all tables were created successfully

4. **CORS errors**
   - Add `http://localhost:3000` to your Supabase project settings
   - Go to Settings → API → Additional Settings

### **Database Connection Test:**

Run this in Supabase SQL Editor to test:
```sql
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

You should see: `profiles`, `models`, `comments`, `likes`, `follows`, etc.

## **🎯 Next Steps After Setup**

1. **Test user registration/login**
2. **Upload a test 3D model**
3. **Test the like/comment system**
4. **Implement file storage (Supabase Storage)**
5. **Add 3D model viewer (Three.js)**

## **📚 Useful Supabase Resources**

- [Supabase Docs](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Functions](https://supabase.com/docs/guides/database/functions)
- [Storage Setup](https://supabase.com/docs/guides/storage)

---

**Need Help?** Check the browser console for error messages and refer to the troubleshooting section above.
