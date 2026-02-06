/**
 * @fileoverview Fixes remaining description issues for bundles and specific products
 * @module scripts/fix-remaining-descriptions
 * 
 * This script manually updates descriptions for products that couldn't be scraped
 * from nnaud.io because they don't have proper descriptions on the source site.
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * @brief Description updates for products
 */
const DESCRIPTION_UPDATES: Record<string, { short: string; full: string }> = {
  'midi-takeout-bundle': {
    short: 'A massive collection of 25 MIDI packs featuring thousands of loops, chord progressions, melodies, and drums across multiple genres.',
    full: 'The ultimate MIDI bundle for producers seeking instant inspiration. This comprehensive collection includes 25 premium MIDI packs spanning Hip Hop, Trap, R&B, and more. With thousands of MIDI loops, chord progressions, corresponding melodies, and drum patterns, you\'ll never run out of creative ideas. Each pack is carefully curated to provide professional-quality content that integrates seamlessly into any DAW. Perfect for producers of all levels who want to accelerate their workflow and create chart-ready tracks.'
  },
  
  'analog-plugin-bundle': {
    short: 'Two premium sampled instruments delivering warm, organic analog textures: Reiya and Natura.',
    full: 'Experience the warmth of analog sound with this carefully curated bundle. Featuring Reiya, a lush atmospheric instrument, and Natura, a collection of organic natural sounds, this bundle provides the perfect palette for creating emotive, textured productions. Both instruments were meticulously sampled to capture authentic analog character and provide instant musicality to your tracks.'
  },
  
  'atmosphere-bundle': {
    short: 'Create immersive soundscapes with three atmospheric instruments: Mesosphere, Tactures, and Reiya.',
    full: 'Perfect for composers and producers crafting cinematic, ambient, and atmospheric music. This bundle combines Mesosphere\'s ethereal textures, Tactures\' evolving soundscapes, and Reiya\'s lush pads to give you everything needed to create immersive sonic environments. Whether scoring film, producing ambient tracks, or adding depth to your productions, these instruments provide professional-quality atmospheric sounds.'
  },
  
  'drum-bass-bundle-2': {
    short: 'Complete drum and bass production toolkit with SubFlux bass engine, Noker percussion sampler, and two massive drum sample collections.',
    full: 'Everything you need for powerful drum and bass productions. This bundle includes SubFlux for earth-shaking basslines, Noker for unique percussion textures, and Ultimate Drums & Percs 1 & 2 with hundreds of professional drum samples. From deep subs to crisp percussion, this collection covers all your rhythmic needs for modern electronic music production.'
  },
  
  'drum-perc-bundle': {
    short: 'Essential percussion toolkit featuring Perc Gadget rhythm generator and two comprehensive drum sample libraries.',
    full: 'Build powerful rhythmic foundations with this focused percussion bundle. Perc Gadget offers innovative one-touch rhythm generation with cinematic precision, while Ultimate Drums & Percs 1 & 2 provide hundreds of professional drum and percussion samples. Perfect for producers who need instant access to high-quality rhythmic elements across any genre.'
  },
  
  'relaunch-plugin-bundle-2': {
    short: 'Our largest bundle featuring 33 premium plugins and instruments - the complete NNAudio collection at an incredible value.',
    full: 'The ultimate producer\'s toolkit containing virtually every NNAudio product. This massive collection includes the complete Tetrad Series, orchestral instruments like Obscura and Quoir, sampled instruments, effects processors, and utilities. From Crystal Ball\'s multi-effects magic to Rompl Workstation\'s morphing capabilities, this bundle provides everything needed for professional music production. Perfect for serious producers who want unlimited creative possibilities.'
  },
  
  '20-for-20-midi-bundle': {
    short: 'A curated selection of premium MIDI packs covering multiple genres, offering incredible value for producers.',
    full: 'Get instant access to a diverse collection of professional MIDI content at an unbeatable price. This bundle brings together carefully selected MIDI packs spanning Hip Hop, Trap, R&B, and more, providing thousands of loops, chord progressions, and melodies. Perfect for producers who want quality MIDI content without breaking the bank.'
  },
  
  'orchestral-plugin-bundle': {
    short: 'Complete orchestral production suite featuring Prodigious, Obscura, Quoir, and Reiya for cinematic compositions.',
    full: 'Create professional orchestral arrangements with this comprehensive bundle. Featuring Prodigious strings, Obscura\'s tortured orchestral textures, Quoir\'s haunting choir, and Reiya\'s atmospheric strings, you have everything needed for film scoring, trailer music, and cinematic productions. Each instrument was carefully sampled and designed to provide instant musicality and professional results.'
  },
  
  'guitar-bundle-xmas-2023': {
    short: 'Three premium sampled guitar instruments: Tetrad Guitars, Blaque, and Numb for authentic guitar tones.',
    full: 'Everything you need for realistic guitar productions. This bundle includes Tetrad Guitars with multiple guitar types, Blaque\'s dark atmospheric guitars, and Numb\'s emotive guitar textures. Whether you need acoustic strums, electric riffs, or ambient guitar soundscapes, these meticulously sampled instruments deliver authentic performance.'
  },
  
  'summer-kickoff-midi-bundle': {
    short: 'A massive collection of 25 MIDI packs perfect for summer productions, featuring thousands of loops across multiple genres.',
    full: 'Kickstart your summer productions with this extensive MIDI collection. Featuring 25 premium packs with thousands of MIDI loops, chord progressions, melodies, and drum patterns spanning Hip Hop, Trap, R&B, and more. This bundle provides endless creative possibilities for producers looking to create chart-ready summer hits with professional-quality MIDI content.'
  },
  
  'cthulhu-bundle-1-xmas-2023': {
    short: 'Nine Cthulhu-themed MIDI packs inspired by dark, atmospheric productions and trap artists.',
    full: 'Dive into the darker side of production with this collection of nine atmospheric MIDI packs. Inspired by artists like The Weeknd, Yonkers, and modern dark trap producers, these packs feature haunting chord progressions, eerie melodies, and moody drum patterns. Perfect for creating atmospheric, emotionally charged productions with a unique edge.'
  },
  
  'cthulhu-bundle-2-xmas-2023': {
    short: 'Eleven Cthulhu-themed MIDI packs including Primal and Reflection plugins for dark, atmospheric productions.',
    full: 'The complete Cthulhu collection featuring all nine MIDI packs plus Primal Cthulhu and Reflection Cthulhu plugins. This comprehensive bundle provides everything needed for dark, atmospheric, and emotionally charged productions. From haunting chord progressions to unique sound design tools, create music with depth and character inspired by modern dark trap and alternative Hip Hop.'
  },
  
  'orchestra-bundle-xmas-2023': {
    short: 'Complete orchestral toolkit featuring five premium instruments for professional cinematic productions.',
    full: 'Everything you need for orchestral music production. This bundle combines Prodigious strings, Obscura\'s unique orchestral textures, Quoir\'s choir, Reiya\'s atmospheric strings, and includes the Obscura + Royal Family special bundle. Perfect for film composers, trailer music producers, and anyone creating cinematic music requiring authentic orchestral sounds.'
  },
  
  'soundscapes-bundle-xmas-2023': {
    short: 'Three atmospheric instruments perfect for creating immersive soundscapes: Mesosphere, Tactures, and Reiya.',
    full: 'Craft professional ambient and atmospheric music with this focused bundle. Combining Mesosphere\'s ethereal textures, Tactures\' evolving soundscapes, and Reiya\'s lush atmospheric sounds, you have everything needed for cinematic productions, ambient music, and adding depth to any genre. Each instrument excels at creating immersive sonic environments.'
  },
  
  'summer-sample-pack-bundle': {
    short: 'Massive summer collection featuring 42 packs with MIDI, drums, samples, and Cthulhu packs for diverse productions.',
    full: 'The ultimate summer production bundle combining MIDI content, drum samples, and atmospheric packs. With 42 products including Ultimate Drums & Percs, Mutahad Sample Library, Bakers Dozen, Lofi Jamz, Cthulhu packs, and countless MIDI collections, this bundle covers every aspect of modern music production. Perfect for producers who want a complete arsenal of sounds for creating summer hits across multiple genres.'
  },
  
  'modern-song-constructions-bundle': {
    short: 'Three complete song construction kits providing professional arrangements, melodies, and production inspiration.',
    full: 'Jump-start your productions with three comprehensive song construction packs: The Code, Go To Work, and Ride Away. Each pack provides complete song arrangements with MIDI, loops, and samples showing professional production techniques. Perfect for producers learning modern production methods or seeking instant inspiration with ready-to-use professional content.'
  },
  
  'selection-box-bundle-xmas-2023': {
    short: 'Our most comprehensive bundle featuring 75 products - virtually the entire NNAudio catalog at maximum value.',
    full: 'The ultimate NNAudio experience containing 75 premium products spanning every category. This massive collection includes all Tetrad instruments, orchestral tools, sampled instruments, Cthulhu packs, MIDI libraries, drum samples, effects plugins, and utilities. From Rompl Workstation to Crystal Ball, from Obscura to all MIDI packs, this bundle represents the complete NNAudio ecosystem. Perfect for professional producers and serious hobbyists who want unlimited creative possibilities.'
  },
  
  'modern-workstation-bundle-xmas-2023': {
    short: 'Two powerful workstation instruments: Rompl Workstation and DigitalDreamscape for versatile sound design.',
    full: 'Experience next-level sound design with two innovative multi-sampler workstations. Rompl Workstation features unique morphing capabilities and extensive sound library, while DigitalDreamscape provides quad-layer blending for creating unique textures. Together, these instruments offer endless sonic possibilities for modern producers seeking distinctive sounds.'
  },
  
  'obscura-royal-family-bundle-black-friday': {
    short: 'Special bundle pairing Obscura\'s tortured orchestral sounds with Royal Family MIDI for dark cinematic productions.',
    full: 'Create hauntingly beautiful cinematic music with this special pairing. Obscura provides unique tortured orchestral textures perfect for horror, thriller, and emotional scoring, while Royal Family MIDI delivers complementary chord progressions and melodies. This combination excels at creating atmospheric, emotionally charged productions with a dark, cinematic edge.'
  },
  
  // Fix NNAudio Access HTML entities
  'nnaudio-access': {
    short: 'Manage and access all your NNAudio products in one place.',
    full: 'NNAudio Access is your centralized hub for managing all NNAudio products. Download, install, and update plugins with ease. Access your entire NNAudio library, manage licenses, and get automatic updates for all your instruments and effects. The streamlined interface makes it simple to organize your production tools and ensure you always have the latest versions. Essential for any producer using multiple NNAudio products.'
  },
  
  // Fix short descriptions for packs
  'midi-library-3': {
    short: 'Over 400 MIDI loops featuring 100 chord progressions, 100 melodies, and extensive drum patterns for modern Hip Hop and Trap production.',
    full: 'Want MIDI? No Problem! This pack is busting at the seams with over 400 MIDI Loops! Within you will find 100 Chord Progressions, 100 Corresponding Melodies, and 100+ Drum, Bass & Percussion Loops. Simply Drag & Drop any MIDI clip to instantly begin creating! All loops are sorted by key and labeled with BPM for easy searching. Five custom Drum Racks include 62 total Drum, Perc, and Bass samples with corresponding MIDI patterns. Perfect for creating Modern Trap, Hip Hop, Cloud Rap & more!'
  },
  
  'midi-library-4': {
    short: 'Over 300 MIDI loops with 100 chord progressions, 100 melodies, and drum patterns for instant creative inspiration.',
    full: 'Want MIDI? No Problem! This pack is busting at the seams with over 300 MIDI Loops! Within you will find 100 Chord Progressions, 100 Corresponding Melodies & 100+ Drum, Bass & Percussion Loops. Simply Drag & Drop any MIDI clip to instantly begin creating! It\'s never been easier to find the inspiration you\'ve been searching for to create your next HIT! Chord & Melody Loops are sorted by Key for easy searching. Five Drum Racks contain 62 total samples with corresponding MIDI loops. Inspired by Lil Baby, Gunna, Travis Scott, and more!'
  },
  
  'mutahad-sample-library': {
    short: 'Comprehensive sample library with 808s, drums, percussion, melodic samples, and FX for modern Hip Hop and Trap production.',
    full: 'Let\'s face it, achieving an original sound in today\'s Hip Hop & Trap market is a tough task. The Mutahad Sample Library solves this with a carefully curated collection of unique sounds. Featuring custom 808s, punchy drums, crisp percussion, melodic loops, one-shots, and creative FX, this library provides the building blocks for standout productions. Each sound was designed with modern production techniques in mind, ensuring they sit perfectly in contemporary mixes. Stop searching through thousands of generic samples and get instant access to professional-quality content.'
  },
  
  'all-guitar-bundle': {
    short: 'Complete guitar collection featuring all NNAudio sampled guitar instruments for authentic acoustic and electric tones.',
    full: 'Everything you need for guitar-based productions. This comprehensive bundle includes all NNAudio guitar instruments, providing authentic sampled acoustic and electric guitar tones. From delicate fingerpicking to powerful electric riffs, these meticulously recorded instruments deliver realistic performance and instant musicality. Perfect for producers who need professional guitar sounds without recording live instruments.'
  }
};

/**
 * @brief Updates a single product's descriptions
 */
async function updateProduct(slug: string, descriptions: { short: string; full: string }) {
  try {
    const { data, error } = await supabase
      .from('products')
      .update({
        short_description: descriptions.short,
        description: descriptions.full,
        updated_at: new Date().toISOString()
      })
      .eq('slug', slug)
      .select('name');
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      console.log(`✅ Updated: ${data[0].name}`);
      return true;
    } else {
      console.log(`⚠️  Not found: ${slug}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error updating ${slug}:`, error);
    return false;
  }
}

/**
 * @brief Main function
 */
async function main() {
  console.log('\n🔧 Fixing remaining description issues...\n');
  
  let updated = 0;
  let failed = 0;
  
  for (const [slug, descriptions] of Object.entries(DESCRIPTION_UPDATES)) {
    const success = await updateProduct(slug, descriptions);
    if (success) {
      updated++;
    } else {
      failed++;
    }
    
    // Small delay between updates
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`COMPLETE`);
  console.log(`${'='.repeat(60)}`);
  console.log(`✅ Updated: ${updated}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Total: ${Object.keys(DESCRIPTION_UPDATES).length}`);
  console.log(`${'='.repeat(60)}\n`);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
