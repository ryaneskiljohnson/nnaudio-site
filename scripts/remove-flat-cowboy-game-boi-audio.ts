#!/usr/bin/env tsx
/** One-off: remove old flat Cowboy Harp and Game Boi objects from product-audio (now in product folders). */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const flatCowboy = Array.from({ length: 8 }, (_, i) =>
  `cowboy-harp-free-jaw-harp-plugin-free-cowboy-harp-demo-${String(i + 1).padStart(2, '0')}.mp3`);
const flatGameBoi = ['game-boi-retro-sounds-free-plugin-game-boi-demo-01-1.mp3', ...Array.from({ length: 20 }, (_, i) =>
  `game-boi-retro-sounds-free-plugin-game-boi-demo-${String(i + 1).padStart(2, '0')}.mp3`)];

async function main() {
  const toRemove = [...flatCowboy, ...flatGameBoi];
  const { data, error } = await supabase.storage.from('product-audio').remove(toRemove);
  if (error) console.error('Remove error:', error);
  else console.log('Removed', data?.length ?? toRemove.length, 'old flat files');
}
main().catch(console.error);
