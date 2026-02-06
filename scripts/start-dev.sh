#!/bin/bash

# Kill any existing Next.js processes
echo "🔧 Stopping existing dev server..."
pkill -f "next dev" 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Wait for processes to stop
sleep 2

# Export environment variables from .env.local
echo "🔧 Loading environment variables..."
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v "^#" | xargs)
    echo "✅ Environment variables loaded from .env.local"
else
    echo "❌ .env.local not found"
    exit 1
fi

# Verify critical environment variables are set
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "❌ NEXT_PUBLIC_SUPABASE_URL is not set"
    exit 1
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo "❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is not set"
    exit 1
fi

echo "✅ NEXT_PUBLIC_SUPABASE_URL: $NEXT_PUBLIC_SUPABASE_URL"
echo "✅ NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY:0:50}..."

# Start the development server
echo "🚀 Starting development server..."
npm run dev 