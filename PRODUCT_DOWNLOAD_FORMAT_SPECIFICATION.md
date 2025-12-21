# Product Download Format Specification

## Overview

This document specifies the required file formats and packaging structure for product downloads in the NNAudio system. Products can have multiple download types, each with specific packaging requirements.

## Download Types

The system supports the following download types:

1. **`plugin`** - Plugin files (VST3, AU, etc.)
2. **`samples`** - Sample library files
3. **`docs`** - Documentation (PDF files)
4. **`midi`** - MIDI pack files
5. **`loops`** - Loop files
6. **`kit`** - Construction kit files

## 1. Plugin Downloads (`type: "plugin"`)

### Structure

Plugin downloads must be packaged as ZIP files with the following structure:

```
{product-slug}/
├── patch_notes.txt          # Version history and changelog
├── MAC/
│   ├── {ProductName}.component/     # AU format (macOS)
│   │   └── Contents/
│   │       ├── Info.plist
│   │       ├── MacOS/
│   │       │   └── {ProductName}    # Executable binary
│   │       ├── Resources/
│   │       └── _CodeSignature/
│   └── {ProductName}.vst3/          # VST3 format (macOS)
│       └── Contents/
│           ├── Info.plist
│           ├── MacOS/
│           │   └── {ProductName}    # Executable binary
│           ├── Resources/
│           └── _CodeSignature/
└── WINDOWS/
    └── {ProductName}.vst3/          # VST3 format (Windows)
        └── Contents/
            ├── Info.plist
            ├── MacOS/               # Note: May contain binaries
            └── Resources/
```

### Key Files

- **`patch_notes.txt`**: Required at root level
  - Format: Plain text with version history
  - Example:
    ```
    Patch Notes
    —————————— 
    
    Version: 1.2.4
    
    Made some changes
    
    ——————————
    
    Version: 1.2.3
    
    Added some stuff
    ```

- **Plugin Bundles**:
  - **macOS AU**: `{ProductName}.component` bundle
  - **macOS VST3**: `{ProductName}.vst3` bundle
  - **Windows VST3**: `{ProductName}.vst3` bundle

- **Info.plist**: Contains plugin metadata
  - `CFBundleDisplayName`: Product display name
  - `CFBundleIdentifier`: Bundle identifier (e.g., `com.NNAudio.{product-slug}`)
  - `CFBundleShortVersionString`: Version number
  - `NSHumanReadableCopyright`: Copyright information

### File Naming Convention

- ZIP file: `plugin_{product-slug}.zip`
- Root folder: `{product-slug}/` (matches product slug)
- Plugin bundles: `{ProductName}.component` or `{ProductName}.vst3`

### Platform Support

- **MAC/**: Contains macOS plugins (AU and/or VST3)
- **WINDOWS/**: Contains Windows plugins (VST3)

## 2. Sample Downloads (`type: "samples"`)

### Structure

Sample downloads are packaged as ZIP files containing `.ch1` files (HISE sample format):

```
{product-slug}/
├── {PresetName1}.ch1
├── {PresetName2}.ch1
├── {PresetName3}.ch1
└── ...
```

### File Format

- **File Extension**: `.ch1` (HISE sample format)
- **File Type**: Binary data files
- **Naming Convention**: Descriptive preset names (e.g., `SYN Trippy Lead.ch1`, `BAS Heavy Hitter.ch1`)

### Categories Observed

Samples are organized by instrument category prefixes:
- `SYN` - Synthesizer presets
- `BAS` - Bass presets
- `WND` - Wind instrument presets
- `VOC` - Vocal presets
- `BEL` - Bell presets
- `PLK` - Plucked instrument presets
- `STR` - String presets
- `KEY` - Keyboard presets

### File Naming Convention

- ZIP file: `samples_{product-slug}.zip`
- Root folder: `{product-slug}/` (matches product slug)

## 3. Documentation Downloads (`type: "docs"`)

### Structure

Documentation is provided as PDF files:

```
{product-slug}.pdf
```

### File Format

- **File Extension**: `.pdf`
- **File Type**: PDF document
- **Content**: Product documentation, user manual, or guide

### File Naming Convention

- PDF file: `docs_{product-slug}.pdf` or `{product-slug}.pdf`

## 4. MIDI Pack Downloads (`type: "midi"`)

### Structure

MIDI packs may include:
- MIDI files (`.mid` or `.midi`)
- Optional link files for Windows installation paths

### Example Structure

```
LinkWindows                    # Optional: Windows installation path reference
{midi-file-1}.mid
{midi-file-2}.mid
...
```

### File Format

- **LinkWindows**: Plain text file containing Windows installation path
  - Example: `G:\02 HISE\HISE Builds\NNAudio\Digital Dreamscape\Samples`
- **MIDI Files**: Standard MIDI files

### File Naming Convention

- ZIP file: `midi_{product-slug}.zip`

## 5. Loops Downloads (`type: "loops"`)

### Structure

Loops are typically audio files packaged in a ZIP:

```
{product-slug}/
├── {loop-file-1}.wav
├── {loop-file-2}.wav
└── ...
```

### File Format

- Audio files (WAV, AIFF, etc.)
- Organized by BPM, key, or category

### File Naming Convention

- ZIP file: `loops_{product-slug}.zip`

## 6. Construction Kit Downloads (`type: "kit"`)

### Structure

Construction kits contain multiple audio files organized by category:

```
{product-slug}/
├── Drums/
│   ├── {drum-file-1}.wav
│   └── ...
├── Bass/
│   ├── {bass-file-1}.wav
│   └── ...
└── ...
```

### File Format

- Audio files organized by instrument category
- May include MIDI files, samples, and stems

### File Naming Convention

- ZIP file: `kit_{product-slug}.zip`

## Storage Path Structure

Files are stored in Supabase Storage bucket `product-downloads` with the following path structure:

```
product-downloads/
  products/
    {product-slug}/
      {version}/
        plugin_{product-slug}.zip
        samples_{product-slug}.zip
        docs_{product-slug}.pdf
        midi_{product-slug}.zip
        loops_{product-slug}.zip
        kit_{product-slug}.zip
```

## Database Format

Each download is stored in the `products.downloads` JSONB array:

```json
[
  {
    "path": "products/gameboi/v1.2.4/plugin_gameboi.zip",
    "name": "GameBoi Plugin",
    "type": "plugin",
    "version": "1.2.4",
    "file_size": 113144378
  },
  {
    "path": "products/gameboi/v1.2.4/samples_gameboi.zip",
    "name": "GameBoi Samples",
    "type": "samples",
    "version": "1.2.4",
    "file_size": 56578416
  },
  {
    "path": "products/gameboi/v1.2.4/docs_gameboi.pdf",
    "name": "GameBoi Documentation",
    "type": "docs",
    "version": "1.2.4",
    "file_size": 1234567
  }
]
```

## File Size Limits

- **Maximum file size**: 10GB per file
- **Bucket**: `product-downloads` (private bucket)
- **Allowed file types**: ZIP, audio files, PDF, MIDI

## Best Practices

1. **Versioning**: Include version in both the storage path and patch notes
2. **Naming**: Use consistent naming conventions matching product slug
3. **Organization**: Keep platform-specific files in separate folders (MAC/, WINDOWS/)
4. **Metadata**: Include patch_notes.txt for plugins with version history
5. **Cleanup**: Remove `__MACOSX` and `.DS_Store` files before packaging
6. **Compression**: Use standard ZIP compression for optimal download speeds

## Installation Paths

### macOS Plugin Installation

- **AU Components**: `~/Library/Audio/Plug-Ins/Components/`
- **VST3**: `~/Library/Audio/Plug-Ins/VST3/`

### Windows Plugin Installation

- **VST3**: `C:\Program Files\Common Files\VST3\`

### Sample Installation

- Platform-specific paths may be referenced in `LinkWindows` files for MIDI packs
- Samples typically installed to user-defined sample library location

## API Response Format

The `/api/nnaudio-access/product` endpoint returns downloads with signed URLs:

```json
{
  "id": "product-uuid",
  "name": "GameBoi",
  "downloads": [
    {
      "file": "https://...signed-url...",
      "name": "GameBoi Plugin",
      "type": "plugin",
      "version": "1.2.4",
      "file_size": 113144378
    }
  ]
}
```

Signed URLs expire after 1 hour for security.

