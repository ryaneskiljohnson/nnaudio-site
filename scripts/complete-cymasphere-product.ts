/**
 * @fileoverview Script to complete all Cymasphere product fields
 * @module scripts/complete-cymasphere-product
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

async function completeCymasphereProduct() {
  console.log("🔧 Completing Cymasphere product fields...\n");

  // Find Cymasphere product
  const { data: product, error: findError } = await supabase
    .from("products")
    .select("id, name, slug")
    .eq("slug", "cymasphere")
    .single();

  if (findError || !product) {
    console.error("❌ Error finding Cymasphere product:", findError);
    return;
  }

  console.log(`✅ Found product: ${product.name} (${product.id})\n`);

  // Complete product data
  const productData = {
    tagline: "Intelligent Music Creation",
    short_description: "Enter the next evolution of music creation, where theoretical foundations invisibly guide your workflow. Chords and melodies connect with purpose, empowering your unique musical vision.",
    description: `Cymasphere is an interactive music compositional tool for producers, composers, performing musicians, educators, and students. It represents the next evolution of music creation, where theoretical foundations invisibly guide your workflow.

## What is Cymasphere?

Cymasphere is a comprehensive music composition platform that combines advanced music theory with intuitive interface design. Unlike traditional DAWs or music software, Cymasphere focuses on harmonic intelligence, providing tools that understand music theory and help you create musically coherent compositions.

## Core Philosophy

The foundation of Cymasphere is built on the principle that music theory should enhance creativity, not hinder it. Every feature is designed to work harmoniously with your musical intuition, providing intelligent suggestions and automatic adaptations that respect musical principles.

## Key Capabilities

### Intelligent Harmony Creation
Cymasphere understands harmony at a deep level. With support for 30+ scale types, advanced voice leading algorithms, and intelligent chord voicing generation, the software ensures that every note you create works musically with your progression.

### Multi-Track Composition
Create rich compositions with multiple tracks that intelligently work together. Each track can be a voicing track, pattern track, or groove track, and all tracks automatically synchronize and adapt to your chord progression.

### AI-Powered Generation
Two powerful AI systems help you create:
- **Pattern Generator**: Creates melodic patterns with 5 motion styles, complexity levels, and density controls
- **Groove Generator**: Generates drum patterns with comprehensive style library and customizable feel

### Advanced Sequencer
A sophisticated sequencer with 7 pattern types, tuplet support, swing control, timing deviation, and sustain control. Create complex rhythmic patterns that adapt to your harmony.

### Professional Notation
Built-in LilyPond integration converts your compositions to professional music notation with automatic key signature detection, staff types, and high-quality SVG rendering.

### Complete DAW Integration
Use Cymasphere as a standalone application or as a VST3/AU plugin in your favorite DAW. Full MIDI output with CC mapping, transport synchronization, and seamless workflow integration.

## Who is Cymasphere For?

- **Producers**: Create harmonic foundations quickly with intelligent chord progressions
- **Composers**: Explore complex harmonic relationships with advanced music theory tools
- **Performing Musicians**: Generate backing tracks and arrangements in real-time
- **Educators**: Teach music theory through interactive, hands-on composition
- **Students**: Learn music theory by creating music with intelligent guidance

## Technical Excellence

Cymasphere features a comprehensive system architecture with:
- Advanced voice leading algorithms (5 modes)
- Low Interval Limits (LIL) for dissonance prevention
- Common tone sustain system
- Smart chord avoidance
- Context-aware note selection
- 12x16 MIDI routing matrix
- 100+ MIDI control mappings
- Automatic backup and recovery system
- Theme customization with multiple color options

## Workflow Integration

Cymasphere works seamlessly with your existing workflow:
- Standalone application for focused composition
- VST3/AU plugin for DAW integration
- MIDI output to any instrument or sampler
- Export to professional notation
- Comprehensive undo/redo with automatic backups

## Continuous Innovation

Cymasphere is actively developed with regular updates that add new features, improve existing functionality, and expand the musical possibilities. All updates are included with your purchase.

Experience music creation where theory and creativity unite, where every chord connects with purpose, and where your unique musical vision comes to life.`,
    logo_url: "/images/cymasphere-logo.png",
    background_image_url: "/images/cymasphere-features/Song View.png",
    gallery_images: [
      "/images/cymasphere-features/Song View.png",
      "/images/cymasphere-features/Palette View.png",
      "/images/cymasphere-features/Voicing View.png",
      "/images/cymasphere-features/Pattern View.png",
      "/images/cymasphere-features/Sequencer Window.png",
      "/images/cymasphere-features/Chord:Scale Window.png",
      "/images/cymasphere-features/Groove View.png",
      "/images/cymasphere-features/Voice Channel Matrix.png",
    ],
    specifications: {
      "Format Type": "VST3 | AU | Standalone",
      "Download Size": "Installer: ~150MB",
      "Delivery Format": "WIN: EXE | MAC: PKG",
      "Operating System": "Windows 10+ | macOS 10.14+",
      "DAW Compatibility": "Works with all DAWs except Pro Tools",
      "System Requirements": "4GB RAM | 2GB Disk Space",
      "MIDI Support": "Full MIDI output with 16 channels",
      "Audio Support": "Internal audio engine with metronome",
      "Music Theory": "30+ scale types, advanced voice leading",
      "AI Features": "Pattern generation, groove generation",
      "Notation": "LilyPond integration for professional notation",
      "Theme System": "Multiple color themes with customization",
      "Backup System": "Automatic backup and recovery",
      "Update System": "Automatic updates included",
    },
    requirements: {
      mac: "macOS 10.14 (Mojave) or later",
      windows: "Windows 10 or later",
      ram: "4GB RAM minimum, 8GB recommended",
      disk_space: "2GB free disk space",
      format: "VST3 | AU | Standalone Application",
      daw: "Compatible with all major DAWs (except Pro Tools)",
      processor: "Intel or Apple Silicon processor",
      audio: "Audio interface recommended for best performance",
      midi: "MIDI controller optional but recommended",
    },
    meta_title: "Cymasphere - Intelligent Music Creation Software | NNAudio",
    meta_description: "Cymasphere is an interactive music compositional tool that combines advanced music theory with intuitive design. Create harmonic foundations, generate AI-powered patterns, and compose with intelligent guidance. For producers, composers, musicians, educators, and students.",
    meta_keywords: "cymasphere, music composition, music theory, chord progression, harmony, voicing, pattern generator, groove generator, sequencer, music software, DAW plugin, VST3, AU, music education, music production, intelligent music creation, voice leading, chord voicing, music notation, lilypond",
    downloads: [
      {
        path: "cymasphere/installer",
        name: "Cymasphere Installer",
        type: "plugin",
        version: "Latest",
        file_size: null,
      },
    ],
    updated_at: new Date().toISOString(),
  };

  // Update product
  const { error: updateError } = await supabase
    .from("products")
    .update(productData)
    .eq("id", product.id);

  if (updateError) {
    console.error("❌ Error updating product:", updateError);
    return;
  }

  console.log("✅ Successfully completed Cymasphere product fields!\n");
  console.log("Fields updated:");
  console.log("  ✓ Tagline");
  console.log("  ✓ Short Description");
  console.log("  ✓ Full Description");
  console.log("  ✓ Logo URL");
  console.log("  ✓ Background Image URL");
  console.log("  ✓ Gallery Images (8 images)");
  console.log("  ✓ Specifications (16 items)");
  console.log("  ✓ Requirements (9 items)");
  console.log("  ✓ Meta Title");
  console.log("  ✓ Meta Description");
  console.log("  ✓ Meta Keywords");
  console.log("  ✓ Downloads");
}

completeCymasphereProduct().catch((error) => {
  console.error("❌ Unexpected error:", error);
  process.exit(1);
});
