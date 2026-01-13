/**
 * @fileoverview Script to update Cymasphere product with comprehensive features
 * @module scripts/update-cymasphere-features
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables
dotenv.config({ path: resolve(__dirname, "../.env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Feature mapping based on image filenames and feature catalog
const features = [
  {
    title: "Song Builder with Multi-Track Management",
    description: "Combine tracks, progressions, and harmony palettes in one intuitive workspace for seamless composition. Create rich compositions with multiple tracks that intelligently work together. Add harmony, melodies, and rhythms—all synchronized and harmonically compatible with your chord progression.",
    image_url: "/images/cymasphere-features/Song View.png",
  },
  {
    title: "Harmony Palettes",
    description: "Shape melodies and chords through an intuitive gestural interface for fluid musical expression. Each palette contains cymatic voicing buttons that control chord voicings in your progression. Visual feedback shows playing status, and drag-and-drop support makes voicing management effortless.",
    image_url: "/images/cymasphere-features/Palette View.png",
  },
  {
    title: "Advanced Voicing System",
    description: "Complete control over chord voicings with voice count (1-12 voices), spacing control, voice leading modes, octave control, sustain, strum, smart chord selection, and inversion control. Advanced voice leading algorithms ensure smooth voice movement between chords with five different modes: BestChoice, SimilarUp, SimilarDown, ObliqueUp, and ObliqueDown.",
    image_url: "/images/cymasphere-features/Voicing View.png",
  },
  {
    title: "Intelligent Pattern Editor",
    description: "Create intelligent musical patterns that adapt to chord changes in real time. Pattern editor supports multiple note types, function modes (absolute/relative), velocity control, note range selection, and region-based generation. Patterns automatically adapt to your chord progression for seamless musical flow.",
    image_url: "/images/cymasphere-features/Pattern View.png",
  },
  {
    title: "AI Pattern Generator",
    description: "AI-powered pattern generation with 5 motion styles (Scalular, Intervallic, Mixed, Random, Melodic), 5 complexity levels, 5 density levels, and multiple rhythm styles. Generate patterns within specific song regions with customizable note types, values, velocity control, and pitch ranges.",
    image_url: "/images/cymasphere-features/Pattern Generator.png",
  },
  {
    title: "Groove System",
    description: "Comprehensive drum pattern system with multi-lane support for kick, snare, hi-hat, and percussion. Each groove lane supports individual velocity control, subdivision settings, solo capability, and MIDI channel assignment. Create complex rhythmic patterns that sync perfectly with your chord progressions.",
    image_url: "/images/cymasphere-features/Groove View.png",
  },
  {
    title: "AI Groove Generator",
    description: "AI-powered drum groove generation with comprehensive style library. Select from multiple groove styles, choose drum kit elements, and control complexity, density, feel, swing, and humanization. Generate grooves within specific song regions with adjustable phrase and groove lengths.",
    image_url: "/images/cymasphere-features/Groove Generator.png",
  },
  {
    title: "Advanced Sequencer",
    description: "Powerful sequencer with 7 pattern types (Ascending, Descending, Ascending & Descending, Descending & Ascending, Chaos, Ordered Chaos, Shuffle), note value selection (1/1 to 1/64), tuplet support (Triplet, Quintuplet, Sextuplet, Septuplet, Nonuplet, Undecuplet), swing control with presets, timing deviation, and sustain control.",
    image_url: "/images/cymasphere-features/Sequencer Window.png",
  },
  {
    title: "Chord & Scale Editor",
    description: "Comprehensive chord and scale editing with support for 30+ scale types including major modes, harmonic minor modes, melodic minor modes, harmonic major modes, symmetrical scales, and more. Edit chord roots, qualities, extensions, and view real-time chord/scale information with multiple display formats.",
    image_url: "/images/cymasphere-features/Chord:Scale Window.png",
  },
  {
    title: "Voice Channel Matrix",
    description: "Advanced MIDI routing matrix with 12 voices to 16 MIDI channels routing. Interactive button matrix for precise voice-to-channel assignment. Quick diagonal and row routing toggles, scrollable interface for large matrix display, and real-time routing updates for seamless DAW integration.",
    image_url: "/images/cymasphere-features/Voice Channel Matrix.png",
  },
  {
    title: "Voicing Track View",
    description: "Track-specific voicing controls with complete voice and range control. Each track can have independent voicing settings including voice count, spacing, voice leading, octave, sustain, strum, smart chord, and inversion. Tracks can follow other tracks or operate independently for maximum flexibility.",
    image_url: "/images/cymasphere-features/Voicing Track View.png",
  },
  {
    title: "Multiple Track Types",
    description: "Support for various track types including Voicing tracks, Pattern tracks, Groove tracks, and more. Each track type has specialized controls and behaviors optimized for its purpose. Tracks can be soloed, muted, and organized in the song timeline for complex arrangements.",
    image_url: "/images/cymasphere-features/Track Types.png",
  },
  {
    title: "Settings Manager",
    description: "Comprehensive settings management including audio device configuration, MIDI mapping (100+ mappings), theme preferences, window management, backup settings, and system preferences. All settings are automatically saved and restored across sessions.",
    image_url: "/images/cymasphere-features/Settings Manager Window.png",
  },
  {
    title: "Color Themes",
    description: "Visual theme customization system with multiple color theme options. Theme-aware cymatic button coloring, white/black text color options, real-time theme preview, and theme persistence. Choose from multiple pre-configured themes or customize your own for a personalized experience.",
    image_url: "/images/cymasphere-features/Color Themes Window.png",
  },
  {
    title: "Interactive Chord Progression Timeline",
    description: "Visual timeline for viewing and navigating through your song's chord progression. Bar/beat display with grid lines, chord markers showing progression structure, click to position playhead, drag to scrub through song, zoom controls, and time signature awareness.",
    image_url: "/images/cymasphere-features/Song View.png",
  },
  {
    title: "Real-Time Chord Reharmonization",
    description: "Intelligent chord reharmonization tool that suggests alternative chord progressions while maintaining harmonic coherence. Works in real-time as you compose, providing musical alternatives that respect voice leading principles and scale relationships.",
    image_url: "/images/cymasphere-features/Palette View.png",
  },
  {
    title: "Custom Voicing Generation Engine",
    description: "Advanced voicing generation engine with multiple voice leading algorithms, low interval limits (LIL) for dissonance prevention, common tone sustain, smart chord avoidance, and context-aware note selection. Generates musically intelligent voicings that adapt to your progression.",
    image_url: "/images/cymasphere-features/Voicing View.png",
  },
  {
    title: "Comprehensive Arrangement View",
    description: "Complete song arrangement view with multi-track timeline, track management, pattern visualization, groove integration, and comprehensive arrangement tools. See your entire composition at a glance with synchronized playback and editing capabilities.",
    image_url: "/images/cymasphere-features/Song View.png",
  },
  {
    title: "Standalone App & DAW Plugin Support",
    description: "Use Cymasphere as a standalone application or as a VST3/AU plugin in your favorite DAW. Full MIDI output with CC mapping for DAW integration, transport synchronization, and seamless workflow integration. Works with all major DAWs except Pro Tools.",
    image_url: "/images/cymasphere-features/Settings Manager Window.png",
  },
];

async function updateCymasphereFeatures() {
  console.log("🔧 Updating Cymasphere product features...\n");

  // Find Cymasphere product
  const { data: product, error: findError } = await supabase
    .from("products")
    .select("id, name")
    .eq("slug", "cymasphere")
    .single();

  if (findError || !product) {
    console.error("❌ Error finding Cymasphere product:", findError);
    return;
  }

  console.log(`✅ Found product: ${product.name} (${product.id})\n`);

  // Update product with features
  const { error: updateError } = await supabase
    .from("products")
    .update({
      features: features,
      updated_at: new Date().toISOString(),
    })
    .eq("id", product.id);

  if (updateError) {
    console.error("❌ Error updating product:", updateError);
    return;
  }

  console.log(`✅ Successfully updated Cymasphere with ${features.length} features!\n`);
  console.log("Features added:");
  features.forEach((feature, index) => {
    console.log(`  ${index + 1}. ${feature.title}`);
  });
}

updateCymasphereFeatures().catch((error) => {
  console.error("❌ Unexpected error:", error);
  process.exit(1);
});
