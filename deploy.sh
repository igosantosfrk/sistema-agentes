#!/bin/bash
set -e

echo "🚀 Iniciando deploy..."

# Atualizar .env
echo "VITE_SUPABASE_URL=$SUPABASE_URL" > .env
echo "VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY" >> .env

# Build
npm run build

echo "✅ Build completo. Pronto para Vercel!"
