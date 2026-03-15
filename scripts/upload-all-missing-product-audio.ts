#!/usr/bin/env tsx
/**
 * @fileoverview Upload all missing product audio from WordPress backup to product-audio/{slug}/ and update DB.
 * @module scripts/upload-all-missing-product-audio
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BUCKET = 'product-audio';
const BACKUP_ROOT = '/Users/rjmacbookpro/Downloads/d227218b-873a-4766-94ed-5f02e04dd709_full_2026-03-15T22_14_00Z/wp-content';

type DemoEntry = { backupPath: string; name: string };
const PRODUCTS: Record<string, DemoEntry[]> = {
  'apache-free-midi': [{ backupPath: 'uploads/2023/06/Apache-MIDI-Demo.mp3', name: 'Apache MIDI Audio Demo' }],
  'freelay-free-delay-module-plugin': [{ backupPath: 'uploads/2023/06/Freelay-Audio-Demo-1.mp3', name: 'Freelay-Audio-Demo-1.mp3' }],
  'freeq-free-eq-module-plugin': [{ backupPath: 'uploads/2023/06/FreeQ-Audio-Demo.mp3', name: 'FreeQ-Audio-Demo.mp3' }],
  'freeverb-free-reverb-module-plugin': [{ backupPath: 'uploads/2023/06/Freeverb-Audio-Demo.mp3', name: 'Freeverb-Audio-Demo.mp3' }],
  'midi-mob-midi-bundle': [{ backupPath: 'uploads/2023/07/MIDI-Mob-Bundle-2000-MIDI-File-Loops.mp3', name: 'MIDI-Mob-Bundle-2000-MIDI-File-Loops.mp3' }],
  'midi-nerds-free-midi': [{ backupPath: 'uploads/2023/06/MIDI-Nerds-Demo-Beat.mp3', name: 'MIDI Nerds Audio Demo' }],
  'ooze-midi': [{ backupPath: 'uploads/2023/05/Ooze-Audio-Demo-New-Nation.mp3', name: 'Ooze MIDI Audio Demo' }],
  'primal-cthulhu': [
    { backupPath: 'uploads/2023/05/Primal-Cthulhu-Demo.mp3', name: 'Primal-Cthulhu-Demo.mp3' },
    { backupPath: 'uploads/2023/05/Modern-Cthulhu-Demo.mp3', name: 'Modern-Cthulhu-Demo.mp3' },
  ],
  'rabbit-hole-free-midi': [{ backupPath: 'uploads/2023/06/Rabbit-Hole-Demo.mp3', name: 'Rabbit Hole MIDI Audio Demo' }],
  'reflection-cthulhu': [
    { backupPath: 'uploads/2023/05/Reflection-Cthulhu-Demo-Audio-New-Nation.mp3', name: 'Reflection-Cthulhu-Demo-Audio-New-Nation.mp3' },
    { backupPath: 'uploads/2023/05/Yonkers-Cthulhu-Demo-Beat-New-Nation.mp3', name: 'Yonkers-Cthulhu-Demo-Beat-New-Nation.mp3' },
  ],
  'ride-away-modern-song-constructions': [{ backupPath: 'uploads/2024/02/Ride-Away-Modern-Song-Constructions-Demo.mp3', name: 'Ride Away Audio Demo' }],
  'royal-family-midi': [{ backupPath: 'uploads/2023/05/Royal-Family-Bundle-Demo.mp3', name: 'Royal Family MIDI Audio Demo' }],
  'so-far-gone-midi': [{ backupPath: 'uploads/2023/05/So-Far-Gone-MIDI-Collection-Audio-Demo.mp3', name: 'So Far Gone MIDI Audio Demo' }],
  'sterfreeo-free-stereo-module-plugin': [{ backupPath: 'uploads/2023/06/Sterfreeo-Audio-Demo-1.mp3', name: 'Sterfreeo-Audio-Demo-1.mp3' }],
  'strange-tingz-free-80s-plugin': [{ backupPath: 'uploads/2023/05/Strange-Tingz-Demo-Audio.mp3', name: 'Strange-Tingz-Demo-Audio.mp3' }],
  'sun-goes-down-midi': [{ backupPath: 'uploads/2023/05/Sun-Goes-Down-Demo-Audio.mp3', name: 'Sun Goes Down MIDI Audio Demo' }],
  'swiper-midi-free': [{ backupPath: 'uploads/2023/06/Swiper-MIDI-Demo.mp3', name: 'Swiper MIDI Audio Demo' }],
  'the-code-modern-song-constructions': [{ backupPath: 'uploads/2024/02/The-Code-Modern-Song-Constructions-Demo.mp3', name: 'The Code Audio Demo' }],
  'time-zones-midi': [{ backupPath: 'uploads/2023/05/Time-Zones-Demo-Audio.mp3', name: 'Time Zones MIDI Audio Demo' }],
  'trapsoul-midi': [{ backupPath: 'uploads/2023/05/TrapsoulMIDI_DemoAudio.mp3', name: 'Trapsoul MIDI Audio Demo' }],
  'ultimate-drums-percs-1': [{ backupPath: 'uploads/2023/05/Ultimate-Drums-Percs-Demo.mp3', name: 'Ultimate Drums & Percs 1 Audio Demo' }],
  'ultimate-drums-percs-2': [{ backupPath: 'uploads/2023/05/Ultimate-Drums-Percs-2-Demo.mp3', name: 'Ultimate Drums & Percs 2 Audio Demo' }],
  'ultimate-midi-collection-2': [
    { backupPath: 'uploads/2023/05/Ultimate-MIDI-Collection-2-Audio-Demo.mp3', name: 'Ultimate MIDI Collection 2 Audio Demo' },
    { backupPath: 'uploads/2023/05/Ultimate-Drums-Percs-Demo.mp3', name: 'Ultimate-Drums-Percs-Demo.mp3' },
  ],
  'umc6-midi': [
    { backupPath: 'uploads/2023/05/Element-Cthulhu-Demo-New-Nation.mp3', name: 'Element-Cthulhu-Demo-New-Nation.mp3' },
    { backupPath: 'uploads/2023/05/Flower-Cthulhu-Demo-Beat.mp3', name: 'Flower-Cthulhu-Demo-Beat.mp3' },
    { backupPath: 'uploads/2023/05/Life-Death-MIDI-Collection-Audio-Demo.mp3', name: 'Life-Death-MIDI-Collection-Audio-Demo.mp3' },
    { backupPath: 'uploads/2023/05/Ultimate-MIDI-Collection-6-Audio-Demo.mp3', name: 'Ultimate-MIDI-Collection-6-Audio-Demo.mp3' },
    { backupPath: 'uploads/2023/05/Yonkers-Cthulhu-Demo-Beat-New-Nation.mp3', name: 'Yonkers-Cthulhu-Demo-Beat-New-Nation.mp3' },
  ],
  'weaknd-cthulhu': [
    { backupPath: 'uploads/2023/05/Weaknd-Cthulhu-Demo-Audio-New-Nation.mp3', name: 'Weaknd Cthulhu Audio Demo' },
    { backupPath: 'uploads/2023/05/Reflection-Cthulhu-Demo-Audio-New-Nation.mp3', name: 'Reflection-Cthulhu-Demo-Audio-New-Nation.mp3' },
    { backupPath: 'uploads/2023/05/Modern-Cthulhu-Demo.mp3', name: 'Modern-Cthulhu-Demo.mp3' },
    { backupPath: 'uploads/2023/05/Modern-Cthulhu-2-Demo.mp3', name: 'Modern-Cthulhu-2-Demo.mp3' },
  ],
  'yonkers-cthulhu': [
    { backupPath: 'uploads/2023/05/Yonkers-Cthulhu-Demo-Beat-New-Nation.mp3', name: 'Yonkers Cthulhu Audio Demo' },
    { backupPath: 'uploads/2023/05/Weaknd-Cthulhu-Demo-Audio-New-Nation.mp3', name: 'Weaknd-Cthulhu-Demo-Audio-New-Nation.mp3' },
  ],
};

async function main() {
  console.log('Uploading missing product audio to product-audio/{slug}/...\n');
  let uploaded = 0;
  let failed = 0;

  for (const [slug, demos] of Object.entries(PRODUCTS)) {
    const audioSamples: Array<{ url: string; name: string }> = [];
    const folder = slug;

    for (const d of demos) {
      const fullPath = path.join(BACKUP_ROOT, d.backupPath);
      const fileName = path.basename(d.backupPath);
      const storagePath = `${folder}/${fileName}`;

      if (!fs.existsSync(fullPath)) {
        console.error(`  ❌ ${slug}: missing file ${fullPath}`);
        failed++;
        continue;
      }

      const buffer = fs.readFileSync(fullPath);
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, buffer, { contentType: 'audio/mpeg', upsert: true, cacheControl: '3600' });

      if (error) {
        console.error(`  ❌ ${slug}/${fileName}:`, error.message);
        failed++;
        continue;
      }

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
      audioSamples.push({ url: data.publicUrl, name: d.name });
      uploaded++;
      console.log(`  ✅ ${storagePath}`);
    }

    if (audioSamples.length === 0) continue;

    const { data: product, error: fetchErr } = await supabase
      .from('products')
      .select('id, name')
      .eq('slug', slug)
      .single();

    if (fetchErr || !product) {
      console.error(`  ❌ Product not found: ${slug}`);
      continue;
    }

    const { error: updateErr } = await supabase
      .from('products')
      .update({ audio_samples: audioSamples })
      .eq('id', product.id);

    if (updateErr) {
      console.error(`  ❌ Update ${slug}:`, updateErr.message);
    } else {
      console.log(`  📎 ${product.name} (${slug}) → ${audioSamples.length} track(s)\n`);
    }
  }

  console.log(`\nDone. Uploaded: ${uploaded}, failed: ${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
