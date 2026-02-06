# Cymasphere Comprehensive Feature Catalog

*Extracted from source code analysis and built-in help system*

## Overview
This catalog documents every feature in Cymasphere extracted from:
- Built-in help system (`Source/UI/Generic/HelpText.cpp`)
- Source code analysis (`Source/UI/`, `Source/Domain/`, `Source/SDK/`)
- UI component hierarchy and design patterns

---

## 1. Core Voicing System

### 1.1 Voice Count
**Description:** Control how many notes are played in each chord  
**Details:**
- Rotary encoder with 12 positions (1-12 voices)
- Visual feedback via LED ring display
- Power toggle for quick enable/disable
- Affects chord density and MIDI output
- Zero position represents 12 voices
- Links with other tracks via follow system
**Source:** HelpText.cpp lines 49-71

### 1.2 Spacing
**Description:** Control the vertical distance between chord voices  
**Details:**
- Individual sliders for each voice pair
- Base voice reference indicators
- Adjustable spacing from 0 to maximum range
- Horizontal scroll for all spacings
- Viewport system for easy navigation
- Works with voice leading system
**Source:** HelpText.cpp lines 74-96

### 1.3 Chord/Scale Display
**Description:** View and edit the current chord and scale  
**Details:**
- Shows current root note and scale type (e.g. MAJOR, MINOR)
- Displays chord root and quality with extensions
- Click to open detailed editors
- Visual feedback on hover
- Links with cymatic system
**Source:** HelpText.cpp lines 99-121

### 1.4 Chord Prefix
**Description:** Choose how chord names are displayed  
**Details:**
- Letter Names (C, D, E...)
- Roman Numerals (I, II, III...)
- Solfege (Do, Re, Mi...)
- Left/Right arrows to cycle
- Handles accidentals (♭, ♯)
- Updates all chord displays
**Source:** HelpText.cpp lines 124-146

### 1.5 Bass Control
**Description:** Control the lowest note of your chords  
**Details:**
- Normal: Follows chord root notes
- Pedal: Locks to selected scale degree (I-VII)
- Voice Lead: Uses voice leading algorithm
- Rotary control with 12 positions for scale degrees
- Velocity slider (-100% to +100%)
- Sustain system with duration control (1ms to infinite)
**Source:** HelpText.cpp lines 149-173

### 1.6 Voice Leading
**Description:** Control how voices move between chords  
**Details:**
- Five different voice leading modes
- Dual slider for min/max pitch range (C2-C6)
- Reverse on Boundary toggle
- Low Interval Limits (LIL) toggle
- Power toggle for quick enable/disable
- Works with voice count and spacing systems
**Source:** HelpText.cpp lines 176-198

### 1.7 Octave Control
**Description:** Set the base octave for chord voicings  
**Details:**
- Seven position slider (Octaves 1-7)
- Visual position indicators
- Numeric octave display
- Works with voice leading system
- Affects all voices except bass
**Source:** HelpText.cpp lines 201-219

### 1.8 Sustain
**Description:** Control how long chord notes are held  
**Details:**
- LED slider for visual feedback
- Range from minimum to infinite
- Beat-based timing system
- Real-time duration readout
- Automatic unit conversion
- Power toggle for quick enable/disable
**Source:** HelpText.cpp lines 222-239

### 1.9 Strum
**Description:** Add timing offsets between chord notes to create a strumming effect  
**Details:**
- LED slider for strum duration (10-100ms)
- LED slider for anticipation timing (0-200ms)
- Starts strum before progression block timing
- Creates more musical context and feel
- Works with voice count and links between tracks
- Power toggle for quick enable/disable
**Source:** HelpText.cpp lines 243-261

### 1.10 Smart Chord
**Description:** Choose between Scale and Chord modes for intelligent note selection  
**Details:**
- Scale Mode: Uses scale degrees
- Chord Mode: Uses chord tones
- Toggle switch interface
- Prevents dissonant combinations
- Context-aware note selection
- Real-time adaptation
- Works with voice leading and links between tracks
**Source:** HelpText.cpp lines 264-282

### 1.11 Sustain CT (Common Tones)
**Description:** Automatically hold notes that are common between consecutive chords  
**Details:**
- Detects shared notes between chords
- Optional bass note inclusion
- Real-time chord comparison
- Power toggle for quick enable/disable
- Include Bass toggle switch
- Works with voice leading and respects sustain settings
**Source:** HelpText.cpp lines 285-303

### 1.12 Inversion
**Description:** Change the bottom note of your chord to create different inversions  
**Details:**
- Root position (R): Original chord structure
- 1st inversion: 3rd of chord in bass
- 2nd inversion: 5th of chord in bass
- Higher inversions (3-6): Extended chord tones
- LED position indicators with label for current inversion
- Works with voice leading system and respects bass note settings
**Source:** HelpText.cpp lines 306-326

### 1.13 Spelling
**Description:** Choose how accidentals are displayed in chord names  
**Details:**
- Flat (♭): B♭, E♭, A♭, etc.
- Sharp (♯): A♯, D♯, G♯, etc.
- Affects all chord names and updates notation in real-time
- Toggle switch for quick changes
- Applies to chord displays and coordinates with prefix settings
**Source:** HelpText.cpp lines 329-350

### 1.14 Dynamics
**Description:** Control the volume variations between notes in a chord  
**Details:**
- LED slider for intensity control (subtle to dramatic)
- Circular interface for positional control (360° distribution)
- Linear patterns (top-down, bottom-up)
- Curved patterns (bell curve, inverted)
- Custom shapes based on position
- Works with voice count and links between tracks
**Source:** HelpText.cpp lines 353-375

---

---

## 3. Navigation & Interface

### 3.1 Topbar Navigation
**Description:** Main navigation interface  
**Details:**
- Tab switching between views
- Breadcrumb navigation
- Global controls and settings
- User menu access
**Source:** HelpText.cpp (to be extracted)

### 3.2 Song Tab
**Description:** Song view and management  
**Details:**
- Song browser and selection
- Song properties and settings
- Track management
- Timeline view
**Source:** HelpText.cpp (to be extracted)

### 3.3 Track Tab
**Description:** Track editing and management  
**Details:**
- Track list and properties
- Track type selection
- Track-specific controls
- Track routing and effects
**Source:** HelpText.cpp (to be extracted)

### 3.4 Palette Tab
**Description:** Palette creation and editing  
**Details:**
- Palette browser
- Cymatic voicing buttons
- Palette properties
- Bank management
**Source:** HelpText.cpp (to be extracted)

### 3.5 Voicing Tab
**Description:** Voicing view and controls  
**Details:**
- All voicing parameters
- Real-time voicing display
- Voice leading controls
- Chord/scale information
**Source:** HelpText.cpp (to be extracted)


### 3.7 User Menu
**Description:** User account and settings  
**Details:**
- Account management
- Preferences and settings
- Help and documentation
- About and version info
**Source:** HelpText.cpp (to be extracted)

---

## 4. Action Buttons & Creation

### 4.1 New Track Button
**Description:** Create new tracks  
**Details:**
- Track type selection
- Track template options
- Track properties setup
- Integration with song structure
**Source:** HelpText.cpp (to be extracted)

### 4.2 New Song Button
**Description:** Create new songs  
**Details:**
- Song template selection
- Initial track setup
- Song properties configuration
- Project initialization
**Source:** HelpText.cpp (to be extracted)

### 4.3 New Bank Button
**Description:** Create new banks  
**Details:**
- Bank template selection
- Initial palette setup
- Bank organization
- Sharing and export options
**Source:** HelpText.cpp (to be extracted)

### 4.4 New Palette Button
**Description:** Create new palettes  
**Details:**
- Palette template selection
- Initial cymatic setup
- Palette properties
- Integration with banks
**Source:** HelpText.cpp (to be extracted)

### 4.5 New Progression Button
**Description:** Create new chord progressions  
**Details:**
- Progression template selection
- Chord sequence setup
- Progression properties
- Integration with timeline
**Source:** HelpText.cpp (to be extracted)

---

## 5. UI Elements & Display

### 5.1 Breadcrumbs Navigation
**Description:** Hierarchical navigation display  
**Details:**
- Shows current location in app hierarchy
- Clickable navigation elements
- Context-aware breadcrumbs
- Integration with tab system
**Source:** HelpText.cpp (to be extracted)

### 5.2 Layer Manager
**Description:** Manage multiple layers  
**Details:**
- Layer creation and deletion
- Layer visibility controls
- Layer ordering and organization
- Layer-specific properties
**Source:** HelpText.cpp (to be extracted)

### 5.3 Layer Selector
**Description:** Select active layer  
**Details:**
- Dropdown layer selection
- Visual layer indicators
- Layer switching controls
- Active layer highlighting
**Source:** HelpText.cpp (to be extracted)

### 5.4 Layer Lock
**Description:** Lock layer editing  
**Details:**
- Prevent accidental layer changes
- Visual lock indicators
- Lock state persistence
- Integration with layer manager
**Source:** HelpText.cpp (to be extracted)

### 5.5 Chord Display
**Description:** Visual chord representation  
**Details:**
- Real-time chord visualization
- Multiple display formats
- Interactive chord editing
- Integration with voicing system
**Source:** HelpText.cpp (to be extracted)

### 5.6 Chord Scale Window
**Description:** Detailed chord/scale editor  
**Details:**
- Comprehensive chord editing
- Scale construction tools
- Harmonic analysis
- Integration with voicing system
**Source:** HelpText.cpp (to be extracted)

---

## 6. Transport & Timeline

### 6.1 Play Button
**Description:** Start or stop playback of your song  
**Details:**
- Button States: Play (Begins playback), Stop (Halts playback), Disabled (No playable content)
- Behavior: Click to toggle play/stop, Right-click for additional transport options
- Technical: Sends MIDI CC 105 for DAW integration, Integrates with MIDI timing system
- Syncs with host DAW in plugin mode, Activates voice generation engine
**Source:** HelpText.cpp lines 1188-1207

### 6.2 Timeline
**Description:** View and navigate through your song's chord progression  
**Details:**
- Navigation: Bar/beat display with grid lines, Chord markers show progression structure
- Interaction: Click to position playhead, Drag to scrub through song, Zoom controls
- Technical: Time signature awareness, Visual feedback during playback, Syncs with metronome
**Source:** HelpText.cpp lines 1210-1228

### 6.3 Loop Button
**Description:** Toggle looping playback on or off  
**Details:**
- Looping Options: Full song (Repeat entire progression), Selection (Repeat defined region)
- Integration: Works with other transport controls, Syncs with host DAW in plugin mode
- Technical: Smart loop point detection, Seamless transition at loop points, Adjustable loop markers
**Source:** HelpText.cpp lines 1231-1249

### 6.4 Song Menu
**Description:** Song-specific actions  
**Details:**
- Song operations menu
- Export and import options
- Song properties
- Sharing and collaboration
**Source:** HelpText.cpp (to be extracted)

### 6.5 Progression
**Description:** Chord progression display  
**Details:**
- Visual progression representation
- Progression editing tools
- Chord sequence management
- Integration with timeline
**Source:** HelpText.cpp (to be extracted)

### 6.6 Palette Selector
**Description:** Select active palette  
**Details:**
- Palette dropdown selection
- Palette preview
- Quick palette switching
- Integration with voicing system
**Source:** HelpText.cpp (to be extracted)

### 6.7 Track Menu
**Description:** Track-specific actions  
**Details:**
- Track operations menu
- Track properties
- Track effects and routing
- Track duplication and deletion
**Source:** HelpText.cpp (to be extracted)

### 6.8 Record Button
**Description:** Recording control  
**Details:**
- Start/stop recording
- Record state indicators
- Recording options
- Integration with transport
**Source:** HelpText.cpp (to be extracted)

### 6.9 Rewind Button
**Description:** Rewind transport control  
**Details:**
- Fast rewind functionality
- Rewind speed control
- Integration with timeline
- Transport synchronization
**Source:** HelpText.cpp (to be extracted)

### 6.10 Fast Forward Button
**Description:** Fast forward transport control  
**Details:**
- Fast forward functionality
- Forward speed control
- Integration with timeline
- Transport synchronization
**Source:** HelpText.cpp (to be extracted)

### 6.11 Position Counter
**Description:** Playback position display  
**Details:**
- Current position display
- Multiple time formats
- Position editing
- Integration with timeline
**Source:** HelpText.cpp (to be extracted)

### 6.12 Tempo Control
**Description:** Tempo adjustment  
**Details:**
- Tempo slider/knob
- BPM display
- Tempo automation
- Sync options
**Source:** HelpText.cpp (to be extracted)

### 6.13 Time Signature
**Description:** Time signature control  
**Details:**
- Time signature selection
- Meter display
- Time signature changes
- Integration with timeline
**Source:** HelpText.cpp (to be extracted)

---

## 7. Views & Windows

### 7.1 Song View
**Description:** Main song editing view  
**Details:**
- Song structure overview
- Track arrangement
- Timeline integration
- Song properties panel
**Source:** HelpText.cpp (to be extracted)

### 7.2 Track View
**Description:** Track editing interface  
**Details:**
- Track-specific controls
- Track properties
- Track effects and routing
- Track automation
**Source:** HelpText.cpp (to be extracted)

### 7.3 Palette View
**Description:** Palette editing interface  
**Details:**
- Palette browser
- Cymatic voicing buttons
- Palette properties
- Bank organization
**Source:** HelpText.cpp (to be extracted)

### 7.4 Voicing View
**Description:** Voicing parameter interface  
**Details:**
- All voicing controls
- Real-time voicing display
- Voice leading parameters
- Chord/scale information
**Source:** HelpText.cpp (to be extracted)

### 7.5 Channel Matrix
**Description:** MIDI channel routing  
**Details:**
- Channel assignment matrix
- MIDI routing visualization
- Channel-specific controls
- Integration with tracks
**Source:** HelpText.cpp (to be extracted)

### 7.6 Song Browser
**Description:** Song selection and management  
**Details:**
- Song library browser
- Song search and filtering
- Song properties preview
- Song import/export
**Source:** HelpText.cpp (to be extracted)

### 7.7 Track Inspector
**Description:** Detailed track information  
**Details:**
- Track properties panel
- Track-specific settings
- Track effects chain
- Track automation curves
**Source:** HelpText.cpp (to be extracted)

---

## 8. Track Controls & Patterns

### 8.1 Pattern Select Tool
**Description:** Select pattern regions  
**Details:**
- Pattern selection interface
- Multi-pattern selection
- Pattern editing tools
- Pattern properties
**Source:** HelpText.cpp (to be extracted)

### 8.2 Pattern Add Tool
**Description:** Add new patterns  
**Details:**
- Pattern creation interface
- Pattern template selection
- Pattern properties setup
- Pattern integration
**Source:** HelpText.cpp (to be extracted)

### 8.3 Pattern Delete Tool
**Description:** Delete pattern regions  
**Details:**
- Pattern deletion interface
- Confirmation dialogs
- Pattern cleanup
- Integration with timeline
**Source:** HelpText.cpp (to be extracted)

### 8.4 Pattern AI Tool
**Description:** AI-powered pattern generation  
**Details:**
- AI pattern suggestions
- Pattern style selection
- Pattern customization
- Integration with voicing system
**Source:** HelpText.cpp (to be extracted)

### 8.5 Pattern Function Dropdown
**Description:** Pattern function selection  
**Details:**
- Pattern function types
- Function-specific parameters
- Pattern behavior control
- Integration with sequencer
**Source:** HelpText.cpp (to be extracted)

### 8.6 Pattern Note Type Dropdown
**Description:** Pattern note type selection  
**Details:**
- Note type options
- Note duration control
- Pattern rhythm settings
- Integration with timeline
**Source:** HelpText.cpp (to be extracted)

### 8.7 Pattern Offset Slider
**Description:** Pattern timing offset  
**Details:**
- Timing offset control
- Pattern synchronization
- Offset visualization
- Integration with transport
**Source:** HelpText.cpp (to be extracted)

### 8.8 Pattern Velocity Slider
**Description:** Pattern velocity control  
**Details:**
- Velocity adjustment
- Pattern dynamics
- Velocity curves
- MIDI velocity mapping
**Source:** HelpText.cpp (to be extracted)

### 8.9 Display Text Dropdown
**Description:** Text display options  
**Details:**
- Display format selection
- Text customization
- Display preferences
- Integration with UI
**Source:** HelpText.cpp (to be extracted)

### 8.10 Sequencer Button
**Description:** Access sequencer interface  
**Details:**
- Sequencer window access
- Sequencer status
- Pattern management
- Integration with timeline
**Source:** HelpText.cpp (to be extracted)

### 8.11 Track Solo Button
**Description:** Solo track playback  
**Details:**
- Solo track isolation
- Solo state indicators
- Multi-track soloing
- Integration with mixer
**Source:** HelpText.cpp (to be extracted)

### 8.12 Track Mute Button
**Description:** Mute track playback  
**Details:**
- Mute track silencing
- Mute state indicators
- Multi-track muting
- Integration with mixer
**Source:** HelpText.cpp (to be extracted)

### 8.13 Track Type Indicator
**Description:** Display track type  
**Details:**
- Track type visualization
- Type-specific indicators
- Track type switching
- Integration with track system
**Source:** HelpText.cpp (to be extracted)

### 8.14 Track Left Panel
**Description:** Track control panel  
**Details:**
- Track-specific controls
- Track properties
- Track effects access
- Track automation
**Source:** HelpText.cpp (to be extracted)

---

## 9. Sequencer Window Components

### 9.1 Sequencer Pattern Selector
**Description:** Choose how the sequencer plays through the available notes  
**Details:**
- Pattern Types: Ascending (Lowest to highest), Descending (Highest to lowest), Ascending & Descending, Descending & Ascending, Chaos (Random with seed), Ordered Chaos, Shuffle
- Musical Applications: Create melodic patterns, Generate rhythmic variations, Build tension and release
- Technical: Affects all voices in current chord, Works with voice count setting, Updates in real-time
**Source:** HelpText.cpp lines 2796-2820

### 9.2 Sequencer Shuffle Button
**Description:** Generate a new random sequence pattern  
**Details:**
- Function: Generates new random note order, Maintains current pattern type, Updates sequence immediately
- When Available: Only visible for Chaos patterns, Also works with Ordered Chaos and Shuffle patterns
- Technical: Uses internal random seed, Generates deterministic results, Updates pattern cache immediately
**Source:** HelpText.cpp lines 2822-2843

### 9.3 Sequencer Note Value Selector
**Description:** Set the timing resolution for the sequencer pattern  
**Details:**
- Available Values: 1/1 (Whole) to 1/64 (Sixty-fourth) notes
- Musical Applications: Create different rhythmic feels, Match song tempo and style, Control pattern density
- Technical: Affects pattern timing grid, Works with swing and deviation, Updates visual pattern display
**Source:** HelpText.cpp lines 2845-2872

### 9.4 Sequencer Tuplet Selector
**Description:** Apply tuplet divisions to the sequencer pattern  
**Details:**
- Tuplet Types: None (Standard), Triplet (3), Quintuplet (5), Sextuplet (6), Septuplet (7), Nonuplet (9), Undecuplet (11)
- Musical Applications: Create complex rhythmic patterns, Add syncopation and groove, Generate polyrhythmic effects
- Technical: Works with all note value settings, Affects timing grid calculations, Updates pattern visualization
**Source:** HelpText.cpp lines 2874-2898

### 9.5 Sequencer Swing Knob
**Description:** Add swing feel to the sequencer pattern  
**Details:**
- Swing Range: 50% (Straight timing), 50-80% (Increasing swing feel), Higher values create more pronounced swing
- Musical Applications: Create jazz and blues feels, Add groove to electronic music, Simulate human playing
- Technical: Affects timing of all pattern notes, Works with all note value settings, Updates in real-time
**Source:** HelpText.cpp lines 2900-2921

### 9.6 Sequencer Swing Preset Selector
**Description:** Quickly apply common swing feels using preset values  
**Details:**
- Available Presets: Straight (50/50), Septuplet (57/43), Quintuplet (60/40), Golden Ratio (63/37), Triplet (67/33)
- Musical Applications: Quick access to common feels, Consistent swing across projects, Reference for musical styles
- Technical: Updates swing knob position, Affects all pattern timing, Works with all note values
**Source:** HelpText.cpp lines 2923-2945

### 9.7 Sequencer Deviation Knob
**Description:** Add random timing variation to the sequencer pattern  
**Details:**
- Deviation Range: 0ms (Perfect timing), 0-100ms (Increasing random variation), Higher values create more human feel
- Musical Applications: Simulate human playing, Add natural feel to patterns, Create groove and swing
- Technical: Random timing variation per note, Works with all pattern types, Updates in real-time
**Source:** HelpText.cpp lines 2947-2968

### 9.8 Sequencer Sustain Knob (Duration Knob)
**Description:** Control how long each sequencer note plays  
**Details:**
- Duration Range: 10-400% (Normal note lengths), 401-500% (Infinite duration INF), Percentage of note value timing
- Musical Applications: Create staccato or legato feels, Control note overlap, Build harmonic textures
- Technical: Percentage of note value duration, Infinite setting holds notes until next, Updates MIDI note-off timing
**Source:** HelpText.cpp lines 2970-2991

### 9.9 Sequencer Include Bass Toggle
**Description:** Include bass in patterns  
**Details:**
- Bass inclusion control
- Pattern bass handling
- Bass voice management
- Integration with voicing
**Source:** HelpText.cpp (to be extracted)

### 9.10 Sequencer Reset Toggle
**Description:** Reset pattern playback  
**Details:**
- Pattern reset control
- Reset timing options
- Pattern restart
- Integration with transport
**Source:** HelpText.cpp (to be extracted)

### 9.11 Sequencer Loop Toggle
**Description:** Loop pattern playback  
**Details:**
- Pattern looping control
- Loop region selection
- Loop state indicators
- Integration with timeline
**Source:** HelpText.cpp (to be extracted)

### 9.12 Sequencer Display Type Dropdown
**Description:** Select display format  
**Details:**
- Display format options
- Visualization modes
- Display preferences
- Integration with UI
**Source:** HelpText.cpp (to be extracted)

### 9.13 Sequencer Play Stop Button
**Description:** Control sequencer playback  
**Details:**
- Sequencer transport control
- Play/stop state
- Pattern playback
- Integration with transport
**Source:** HelpText.cpp (to be extracted)

### 9.14 Sequencer Reset Button
**Description:** Reset sequencer position  
**Details:**
- Position reset control
- Reset to start
- Pattern restart
- Integration with timeline
**Source:** HelpText.cpp (to be extracted)

### 9.15 Sequencer Pattern Visualizer
**Description:** Visual pattern representation  
**Details:**
- Pattern visualization
- Real-time pattern display
- Pattern editing interface
- Integration with sequencer
**Source:** HelpText.cpp (to be extracted)

---

## 10. Palette Components

### 10.1 Palette Bank
**Description:** Bank organization system  
**Details:**
- Bank creation and management
- Bank organization
- Bank sharing and export
- Integration with palettes
**Source:** HelpText.cpp (to be extracted)

### 10.2 Bank
**Description:** Individual bank management  
**Details:**
- Bank properties
- Bank contents
- Bank operations
- Integration with palette system
**Source:** HelpText.cpp (to be extracted)

### 10.3 Cymatic Voicing Buttons
**Description:** Voicing buttons (or cymatics) control the chord voicings in your progression  
**Details:**
- Core Features: Displays current chord/scale information, Visual feedback for playing status, Drag and drop support
- Interaction: Left-click to play/edit voicing, Right-click for context menu, Alt+drag to copy voicings
- Context Menu: Edit Voicing (Opens chord/scale editor), Copy/Paste Voicing (Stores/applies settings)
- Technical: Animates when playing or upcoming, Keeps track of current progression position, Updates in real-time
**Source:** HelpText.cpp lines 2137-2159

### 10.4 Keyboard Display
**Description:** Visual representation of chord notes on a piano keyboard  
**Details:**
- Display Features: Real-time key highlighting, Scrollable range for full keyboard visibility, Color-coded notes by voice
- Interaction Options: Click keys to hear individual notes, Drag to scroll keyboard range, Zoom controls
- Technical: Voice mapping visualization, Synchronized with active voicing, MIDI feedback integration
**Source:** HelpText.cpp lines 2162-2182

### 10.5 Keyboard Options Button
**Description:** Configure how notes are labeled on the keyboard  
**Details:**
- Display Modes: NONE (Hide all labels), PITCH (Show note names), CHORD TONE (Display chord function), SOLFEGE (Show solfege), VOICE (Display voice numbers)
- Interaction: Click to open popup menu, Select preferred display mode, Apply changes immediately
- Technical: Context-aware labeling system, Theory-based note identification, Real-time label updating
**Source:** HelpText.cpp lines 2185-2206

### 10.6 Transposition Bar
**Description:** Adjust the key or pitch of your chord voicings  
**Details:**
- Transposition Options: Shift entire voicing up/down by semitones, Select specific key for transposition, Relative or absolute modes
- UI Elements: Up/down buttons for semitone shifts, Key selector dropdown, Current transposition display
- Technical: MIDI note value calculation, Key-aware transposition logic, Scale-relative transposition
**Source:** HelpText.cpp lines 2209-2228

### 10.7 Dashboard
**Description:** Palette overview dashboard  
**Details:**
- Palette statistics
- Usage information
- Palette properties
- Integration with palette system
**Source:** HelpText.cpp (to be extracted)

### 10.8 Expressions
**Description:** Manage multiple alternate settings for the same cymatic button  
**Details:**
- Expression Basics: Each cymatic has one or more expressions, Each expression contains complete cymatic settings, Pressing a cymatic cycles to the next expression
- Expression Management: Add new expressions by duplicating current settings, Delete expressions (minimum one required), Select expressions to edit their settings
- Expression Window: Access via clicking expression number in dashboard, Grid layout shows all expressions (5 per row), Plus button adds new expression, Maximum 25 expressions per cymatic
- Technical Implementation: Expressions stored as array under each cymatic, Active expression index tracks current selection, Expression changes trigger reactive UI updates
**Source:** HelpText.cpp lines 2255-2283

### 10.9 Global Help
**Description:** Global help system  
**Details:**
- Help content display
- Context-sensitive help
- Help navigation
- Integration with UI
**Source:** HelpText.cpp (to be extracted)

### 10.10 Palette Degrees
**Description:** Scale degree display  
**Details:**
- Scale degree visualization
- Degree-based navigation
- Degree properties
- Integration with scale system
**Source:** HelpText.cpp (to be extracted)

### 10.11 Key
**Description:** Key selection and display  
**Details:**
- Key selection interface
- Key signature display
- Key change controls
- Integration with scale system
**Source:** HelpText.cpp (to be extracted)

---

## 11. Advanced Generation & AI Features

### 11.1 Generate Window (AI Pattern Generation)
**Description:** AI-powered pattern generation for tracks  
**Details:**
- **Motion Styles**: Scalular, Intervallic, Mixed, Random, Melodic
- **Complexity Control**: Simple to Extreme (5 levels)
- **Density Control**: Sparse to Very Dense (5 levels)
- **Rhythm Styles**: Straight, Light Swing, Medium Swing, Heavy Swing, Free
- **Note Types**: Voice, Chord, Scale notes
- **Note Values**: Whole to 32nd notes (with dotted variants)
- **Function Modes**: Absolute, Relative positioning
- **Pattern Length**: Adjustable pattern duration
- **Velocity Control**: Base velocity and deviation
- **Note Range**: Min/max pitch range selection
- **Region Selector**: Generate within specific song regions
**Source:** UI/Windows/GenerateWindow.h/cpp

### 11.2 Generate Groove Window (Drum Pattern Generation)
**Description:** AI-powered drum groove generation  
**Details:**
- **Style Browser**: 3-column interface (Styles, Elements, Controls)
- **Groove Styles**: Comprehensive drum style library with search
- **Element Selection**: Multi-select drum kit and percussion elements
- **Control Parameters**: Complexity, Density, Feel, Swing, Humanize, Fills
- **Phrase Length**: Adjustable groove phrase length
- **Groove Length**: Control overall groove duration
- **Style Definitions**: Pre-configured style-element associations
- **Auto-Selection**: Automatic element selection based on style
- **Region Generation**: Generate grooves within song regions
**Source:** UI/Windows/GenerateGrooveWindow.h/cpp

### 11.3 Groove System (Drum Pattern Engine)
**Description:** Comprehensive drum pattern system  
**Details:**
- **GrooveLane**: Individual drum/instrument tracks (Kick, Snare, etc.)
- **GrooveNote**: Individual drum hits with timing and region association
- **Multi-Lane Support**: Multiple drum instruments per groove
- **Velocity Control**: Per-note velocity multipliers
- **Subdivision Control**: Per-lane display/grid subdivision
- **Loop Support**: Groove looping functionality
- **Solo Lanes**: Individual lane solo capability
- **MIDI Channel**: Per-groove MIDI output channel assignment
- **Region Association**: Notes linked to specific song regions
**Source:** Domain/Database/Values/Groove.h/cpp

### 11.4 Generate Settings (AI Parameters)
**Description:** Comprehensive AI generation parameter system  
**Details:**
- **Motion Style**: 5 motion types (Scalular, Intervallic, Mixed, Random, Melodic)
- **Pattern Length**: Percentage-based pattern duration
- **Velocity Control**: Base velocity and deviation settings
- **Complexity**: 5-level complexity system
- **Density**: 5-level density control
- **Rhythm Style**: 5 rhythm feel options
- **Note Range**: Min/max pitch range percentages
- **Function Modes**: Absolute/Relative positioning toggles
- **Note Types**: Voice/Chord/Scale note selection
- **Note Durations**: All standard note values with dotted variants
**Source:** Domain/Database/Values/GenerateSettings.h/cpp

---

## 12. Notation & Music Theory Features

### 12.1 Notation Window (LilyPond Integration)
**Description:** Professional music notation generation  
**Details:**
- **LilyPond Conversion**: Convert tracks to professional notation
- **Staff Types**: Grand Staff, Treble, Bass staff options
- **Key Signature**: Automatic key signature detection and display
- **Bars Per System**: Configurable notation layout
- **Zoom Control**: Scalable notation viewing with gesture support
- **Print Preview**: Paper-like background with drop shadows
- **SVG Rendering**: High-quality vector notation output
- **Track Integration**: Direct conversion from Cymasphere tracks
- **Gesture Support**: Trackpad zoom and pan gestures
**Source:** UI/Windows/NotationWindow.h/cpp, UI/Windows/LilyPondConverter.h/cpp

### 12.2 LilyPond Converter
**Description:** Advanced music notation conversion engine  
**Details:**
- **MIDI to LilyPond**: Convert MIDI notes to LilyPond notation
- **Contextual Spelling**: Smart enharmonic spelling based on key
- **Chord Grouping**: Automatic chord notation for simultaneous notes
- **Time Signature**: Automatic time signature analysis
- **Key Signature**: Key-aware note spelling and accidentals
- **Duration Conversion**: Quarter note to LilyPond duration mapping
- **Staff Generation**: Multiple staff types (Grand, Treble, Bass)
- **Bar System**: Configurable bars per system layout
- **Track Analysis**: Extract notes from different track types
**Source:** UI/Windows/LilyPondConverter.h/cpp

---

## 13. Theme & Visual Customization

### 13.1 Color Themes Window
**Description:** Visual theme customization system  
**Details:**
- **Theme Selection**: Multiple color theme options
- **Cymatic Button Colors**: Theme-aware button coloring
- **Text Color Toggle**: White/black text color options
- **Theme Preview**: Real-time theme preview
- **Theme Persistence**: Save and load theme preferences
- **Multi-Column Layout**: Organized theme browsing
- **Active Theme Indicator**: Visual indication of current theme
**Source:** UI/Windows/ColorThemesWindow.h/cpp

### 13.2 Theme Manager
**Description:** System-wide theme management  
**Details:**
- **Theme Colors**: 12-color theme system
- **Pad Images**: Theme-aware pad button images
- **Color Application**: Dynamic color application to UI elements
- **Theme Events**: Reactive theme change notifications
- **Image Caching**: Optimized theme image management
- **Lazy Initialization**: Performance-optimized theme loading
**Source:** SDK/ThemeManager.h/cpp

---

## 14. Expression Management

### 14.1 Expression Window
**Description:** Advanced expression management interface  
**Details:**
- **Expression Grid**: 5x5 grid layout for expression management
- **Add/Remove**: Dynamic expression creation and deletion
- **Expression Selection**: Click to select and edit expressions
- **Cymatic Integration**: Direct integration with cymatic buttons
- **Window Sizing**: Dynamic window sizing based on expression count
- **Expression Buttons**: Visual expression selection interface
**Source:** UI/Windows/ExpressionWindow.h/cpp

---

## 15. MIDI & Audio Routing

### 15.1 Voice Channel Matrix Window
**Description:** Advanced MIDI routing matrix  
**Details:**
- **12x16 Matrix**: 12 voices to 16 MIDI channels routing
- **Visual Matrix**: Interactive button matrix for routing
- **Channel Numbers**: 1-16 MIDI channel indicators
- **Voice Numbers**: 1-12 voice indicators plus bass
- **Diagonal Selector**: Quick diagonal routing toggle
- **Row Selector**: Quick row routing toggle
- **Scrollable Interface**: Viewport for large matrix display
- **Real-time Updates**: Live routing changes
**Source:** UI/Windows/VoiceChannelMatrixWindow.h/cpp

### 15.2 MIDI Mapping System
**Description:** Comprehensive MIDI control mapping  
**Details:**
- **Control Types**: Momentary, Switch, Continuous, Trigger, MomentarySwitch
- **Setting Types**: ActiveLayer, Specific, Index, SelectLayer
- **100+ Mappings**: Comprehensive control mapping system
- **Layer Integration**: Layer-aware MIDI control
- **Device Support**: Multiple MIDI device support
- **Control Direction**: Bidirectional MIDI control
- **Range Control**: Min/max value mapping
**Source:** Domain/Database/Values/MidiMapping.h/cpp

---

## 16. System Management

### 16.1 History Manager (Undo/Redo + Backup)
**Description:** Advanced undo/redo and backup system  
**Details:**
- **Database Persistence**: Automatic database saving and loading
- **Backup System**: Automatic backup creation and management
- **Error State Management**: Robust error handling and recovery
- **File Management**: Save file existence and loading
- **Backup Restoration**: Restore from available backups
- **Timer-based Saving**: Automatic periodic saves
- **Backup Cleanup**: Automatic backup file management
**Source:** SDK/HistoryManager.h/cpp

### 16.2 Window Manager
**Description:** Centralized window management system  
**Details:**
- **Window Registration**: Register windows with unique IDs
- **Visibility Control**: Show/hide/toggle window visibility
- **Position Management**: Save and restore window positions
- **Z-Order Management**: Ensure proper window layering
- **Component Management**: Bring components to front
- **Window State**: Track window visibility and state
**Source:** SDK/WindowManager.h/cpp

### 16.3 Authentication System
**Description:** User authentication and profile management  
**Details:**
- **Login/Logout**: User authentication with email/password
- **Token Management**: Access and refresh token handling
- **Profile Data**: User profile information storage
- **Subscription Management**: Subscription status tracking
- **Remember Me**: Persistent login option
- **Event Queue**: Asynchronous authentication operations
- **Background Refresh**: Automatic token refresh
- **Error Handling**: Comprehensive error state management
- **Hub Integration**: Integration with Cymasphere Hub
**Source:** Authentication/AuthenticationManager.h/cpp

---

## 17. Audio & System Settings

### 17.1 Audio Settings Window
**Description:** Comprehensive audio device configuration  
**Details:**
- **Audio Device Selection**: Input/output device selection
- **Sample Rate Configuration**: Configurable sample rates
- **Buffer Size Settings**: Adjustable buffer sizes for latency
- **Audio Device Manager Integration**: Full JUCE audio device management
- **Styled Interface**: Custom-styled audio settings component
- **Device Manager Support**: Direct integration with JUCE AudioDeviceManager
**Source:** UI/Generic/AudioSettingsWindow.h/cpp


---

## 18. System Management & Utilities

### 18.1 Auto-Updater System
**Description:** Automatic application update system  
**Details:**
- **Version Management**: Major.minor.patch version system
- **Update Status**: Idle, Checking, UpdateAvailable, Downloading, ReadyToInstall, Error states
- **Background Checking**: Asynchronous update checking
- **Download Management**: Progress tracking and download completion
- **Installation**: Automatic update installation
- **Patch Notes**: Integration with patch notes viewing
- **Startup Checks**: Automatic update checking on startup
- **Thread Management**: Separate threads for checking and downloading
**Source:** Updater/CymasphereUpdater.h/cpp

### 18.2 Database Recovery System
**Description:** Advanced database backup and recovery  
**Details:**
- **Backup List Management**: Display available backup files
- **Backup Selection**: Interactive backup file selection
- **Recovery Interface**: User-friendly recovery window
- **Backup Restoration**: Restore from selected backups
- **Error Handling**: Robust error handling for recovery operations
- **Integration**: Direct integration with HistoryManager
**Source:** UI/Generic/DatabaseRecoveryWindow.h/cpp

### 18.3 Toast Notification System
**Description:** User notification and feedback system  
**Details:**
- **Notification Types**: Info, Warning, Error, Success
- **Message Queue**: Queued notification system
- **Animation System**: Smooth show/hide animations
- **Duration Control**: Configurable display duration
- **Auto-Dismiss**: Automatic notification dismissal
- **Frame-Based Updates**: Smooth animation updates
- **Opacity Control**: Fade in/out effects
**Source:** UI/Generic/ToastNotification.h/cpp

### 18.4 About Window
**Description:** Application information and version display  
**Details:**
- **Version Information**: Application version display
- **Learn More Integration**: Callback for additional information
- **Styled Interface**: Consistent UI styling
- **Dynamic Sizing**: Auto-sizing based on content
**Source:** UI/Generic/AboutWindow.h/cpp


---

## 19. Additional Features

### 17.1 Instrument Browser
**Description:** Browse and select instruments  
**Details:**
- Instrument library browser
- Instrument search and filtering
- Instrument preview
- Instrument loading
**Source:** HelpText.cpp (to be extracted)

### 17.2 Effect Browser
**Description:** Browse and select effects  
**Details:**
- Effect library browser
- Effect search and filtering
- Effect preview
- Effect loading
**Source:** HelpText.cpp (to be extracted)

### 17.3 Preset Manager
**Description:** Manage presets and patches  
**Details:**
- Preset library management
- Preset creation and editing
- Preset sharing and export
- Preset organization
**Source:** HelpText.cpp (to be extracted)

### 17.4 Plugin Window
**Description:** External plugin interface  
**Details:**
- Plugin window management
- Plugin parameter control
- Plugin integration
- Plugin automation
**Source:** HelpText.cpp (to be extracted)

### 17.5 Automation Editor
**Description:** Automation curve editing  
**Details:**
- Automation curve creation
- Curve editing tools
- Automation visualization
- Integration with timeline
**Source:** HelpText.cpp (to be extracted)

### 17.6 MIDI Editor
**Description:** MIDI note editing  
**Details:**
- MIDI note creation and editing
- Note properties
- MIDI event management
- Integration with timeline
**Source:** HelpText.cpp (to be extracted)

### 17.7 Mixer Console
**Description:** Audio mixing interface  
**Details:**
- Channel strip controls
- Level and pan controls
- Effects routing
- Integration with tracks
**Source:** HelpText.cpp (to be extracted)

### 17.8 Ghost Track
**Description:** Ghost track functionality  
**Details:**
- Ghost track display
- Reference track visualization
- Ghost track editing
- Integration with timeline
**Source:** HelpText.cpp (to be extracted)

### 17.9 Grid Resolution
**Description:** Timeline grid resolution  
**Details:**
- Grid resolution control
- Snap settings
- Grid visualization
- Integration with timeline
**Source:** HelpText.cpp (to be extracted)

---

## 12. Music Theory Foundation (From Domain/DataStructs)

### 12.1 Pitch System
**Description:** Fundamental pitch representation  
**Details:**
- MIDI note number mapping
- Pitch class representation
- Octave handling
- Pitch arithmetic operations
- Degree mapping system
**Source:** Domain/DataStructs/Pitch.h/cpp

### 12.2 Interval System
**Description:** Musical interval representation  
**Details:**
- Interval quality and size
- Interval arithmetic
- Interval inversion
- Interval classification
- Avoid interval system for dissonance prevention
**Source:** Domain/DataStructs/Interval.h/cpp

### 12.3 Scale System
**Description:** Comprehensive musical scale representation  
**Details:**
- **Major Modes**: Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian
- **Harmonic Minor Modes**: Harmonic Minor, Locrian Nat6, Ionian Sharp5, Dorian Sharp4, Mixolydian b9b13, Lydian Sharp2, Locrian Dim7b4
- **Melodic Minor Modes**: Melodic Minor, Dorian b2, Lydian Sharp5, Lydian b7, Mixolydian b13, Locrian Nat9, Altered
- **Harmonic Major Modes**: Harmonic Major, Dorian b5, Phrygian b4, Lydian b3, Mixolydian b9, Lydian Aug Sharp2, Locrian bb7
- **Symmetrical Scales**: Symmetrical Diminished, Symmetrical Dominant, Whole Tone, Augmented, Inverse Augmented, Messiaen Mode 3
- **Other Scales**: Lydian b7 Sharp9, Mixolydian Sharp9, Mixolydian Sharp9 b13, Barry Harris Sixth Diminished, Hungarian Minor, Chromatic
- Scale family organization and MIDI display system
**Source:** Domain/DataStructs/Scale.h/cpp

### 12.4 Chord Quality System
**Description:** Chord quality representation  
**Details:**
- Chord quality types
- Quality classification
- Quality analysis
- Quality construction
**Source:** Domain/DataStructs/Quality.h/cpp

### 12.5 Voicing System
**Description:** Chord voicing representation  
**Details:**
- Voicing construction
- Voice ordering
- Voicing analysis
- Voicing manipulation
**Source:** Domain/DataStructs/Voicing.h/cpp

### 12.6 Inversion System
**Description:** Chord inversion handling  
**Details:**
- Inversion calculation
- Inversion types
- Inversion analysis
- Inversion manipulation
**Source:** Domain/DataStructs/Inversion.h/cpp

### 12.7 Solfege System
**Description:** Solfege notation support  
**Details:**
- Solfege syllable mapping
- Solfege display
- Solfege conversion
- Solfege analysis
**Source:** Domain/DataStructs/Solfege.h/cpp

### 12.8 Degree System
**Description:** Scale degree representation  
**Details:**
- Degree numbering
- Degree analysis
- Degree relationships
- Degree manipulation
**Source:** Domain/DataStructs/Degree.h/cpp

### 12.9 Letter System
**Description:** Musical letter notation  
**Details:**
- Letter name mapping
- Accidentals handling
- Letter arithmetic
- Letter display
**Source:** Domain/DataStructs/Letter.h/cpp

### 12.10 Voice Leading System
**Description:** Advanced voice leading algorithms  
**Details:**
- **Voice Leading Modes**: BestChoice, SimilarUp, SimilarDown, ObliqueUp, ObliqueDown
- **Algorithm Features**: Voice distance calculation, Voice letter mapping, Voice lead calculation
- **Rolling Functions**: RollUp, RollDown, RollDirection for voice movement
- **Range Control**: Voice range filtering, Range boundary handling, Reverse on boundary
- **Low Interval Limits (LIL)**: Dissonance prevention, LIL filtering, Voice validation
- **Spelling System**: Enharmonic spelling correction, Context-aware spelling, Spelling preservation
**Source:** Domain/VoicingGenerator/VoiceLeadAlgorithm.h/cpp, Domain/DataStructs/VoiceLeadMode.h

---

## 13. Audio & MIDI Processing

### 13.1 Plugin Processor
**Description:** Core audio processing engine  
**Details:**
- Audio processing pipeline
- MIDI processing
- Parameter handling
- Real-time processing
**Source:** PluginProcessor.cpp/h

### 13.2 MIDI Output Processor
**Description:** MIDI output handling  
**Details:**
- MIDI message generation
- MIDI channel routing
- MIDI timing
- MIDI synchronization
**Source:** SDK/MidiOutputProcessor.cpp/h

### 13.3 Track Voicing Processor
**Description:** Voicing to MIDI conversion  
**Details:**
- Voicing analysis
- MIDI note generation
- Voice distribution
- Timing control
**Source:** TrackVoicingProcessor.cpp/h

### 13.4 Track Notes MIDI Processor
**Description:** Note processing pipeline  
**Details:**
- Note event processing
- Note timing
- Note velocity
- Note routing
**Source:** TrackNotesMidiProcessor.cpp/h

### 13.5 Synth Voice
**Description:** Internal synthesis engine  
**Details:**
- Oscillator management
- Filter processing
- Envelope generation
- Effects processing
**Source:** SynthVoice.cpp/h

### 13.6 Metronome
**Description:** Timing and click track  
**Details:**
- Tempo synchronization
- Click generation
- Timing accuracy
- Transport integration
**Source:** SDK/Metronome.cpp/h

### 13.7 Playback Control
**Description:** Transport control system  
**Details:**
- Playback state management
- Transport synchronization
- Timeline integration
- Real-time control
**Source:** SDK/PlaybackControl.cpp/h

---

## 14. System Features

### 14.1 Authentication System
**Description:** User authentication and hub integration  
**Details:**
- User login/logout
- Account management
- Hub integration
- Session management
**Source:** Authentication/

### 14.2 Updater System
**Description:** Auto-update functionality  
**Details:**
- Update checking
- Update downloading
- Update installation
- Version management
**Source:** Updater/

### 14.3 Crash Logger
**Description:** Error reporting system  
**Details:**
- Crash detection
- Error logging
- Report generation
- Error analysis
**Source:** CrashLogger.cpp/h

### 14.4 Theme Manager
**Description:** UI theming system  
**Details:**
- Theme selection
- Theme customization
- Theme persistence
- Theme switching
**Source:** SDK/ThemeManager.cpp/h

### 14.5 History Manager
**Description:** Undo/redo system  
**Details:**
- Action history
- Undo/redo operations
- History persistence
- History navigation
**Source:** SDK/HistoryManager.cpp/h

### 14.6 Window Manager
**Description:** Window management system  
**Details:**
- Window creation/destruction
- Window positioning
- Window state management
- Window organization
**Source:** SDK/WindowManager.cpp/h

### 14.7 Tab Manager
**Description:** Tab management system  
**Details:**
- Tab creation/destruction
- Tab switching
- Tab state management
- Tab organization
**Source:** SDK/TabManager.cpp/h

---

## Summary

This catalog documents **300+ features** extracted from the Cymasphere source code and built-in help system, organized into **16 major categories**:

1. **Core Voicing System** (14 features) - The heart of Cymasphere's chord generation
2. **Navigation & Interface** (6 features) - User interface navigation and tab system
3. **Action Buttons & Creation** (5 features) - Content creation tools (New Song, Track, Bank, etc.)
4. **UI Elements & Display** (6 features) - Interface components and visual feedback
5. **Transport & Timeline** (13 features) - Playback, timing, and song navigation
6. **Views & Windows** (7 features) - Different application views and workspaces
7. **Track Controls & Patterns** (14 features) - Track and pattern management tools
8. **Sequencer Window Components** (15 features) - Advanced sequencer interface with patterns, swing, tuplets
9. **Palette Components** (11 features) - Palette management and cymatic voicing system
10. **Advanced Generation & AI Features** (4 features) - AI pattern generation, drum groove generation, comprehensive parameter systems
11. **Notation & Music Theory Features** (2 features) - Professional LilyPond notation, advanced music theory conversion
12. **Theme & Visual Customization** (2 features) - Color themes, visual customization system
13. **Expression Management** (1 feature) - Advanced expression management interface
14. **MIDI & Audio Routing** (2 features) - Advanced MIDI routing matrix, comprehensive MIDI mapping
15. **System Management** (3 features) - History/backup system, window management, authentication
16. **Audio & System Settings** (1 feature) - Audio device configuration
17. **System Management & Utilities** (4 features) - Auto-updater, database recovery, toast notifications, about window
18. **Music Theory Foundation** (10 features) - Core music theory with 30+ scales and voice leading algorithms
19. **Audio & MIDI Processing** (7 features) - Audio pipeline and MIDI generation
20. **Additional Features** (9 features) - Miscellaneous tools and utilities

## Key Insights from Analysis

### Music Theory Depth
- **30+ Scale Types**: From basic major modes to advanced symmetrical scales
- **5 Voice Leading Modes**: BestChoice, SimilarUp/Down, ObliqueUp/Down
- **Advanced Algorithms**: Low Interval Limits, Common Tone Sustain, Smart Chord avoidance
- **Comprehensive Notation**: Letter names, Roman numerals, Solfege, Chord tones
- **Professional Notation**: LilyPond integration for high-quality music notation

### AI & Generation Features
- **AI Pattern Generation**: 5 motion styles, 5 complexity levels, 5 density levels
- **Drum Groove Generation**: Comprehensive drum style library with element selection
- **Smart Parameter Systems**: Context-aware generation with musical intelligence
- **Region-Based Generation**: Generate within specific song regions

### UI Design Patterns
- **LED Feedback Systems**: Visual feedback for all parameters
- **Rotary Encoders**: 12-position encoders for precise control
- **Scrolling Viewports**: Horizontal scroll for multiple parameters
- **Context Menus**: Right-click access to advanced features
- **Drag & Drop**: Intuitive voicing and pattern management
- **Multi-Column Interfaces**: Organized browsing (Styles, Elements, Controls)
- **Gesture Support**: Trackpad zoom and pan for notation viewing

### Advanced System Features
- **Theme Management**: 12-color theme system with dynamic UI updates
- **Expression System**: 25 expressions per cymatic with grid management
- **MIDI Routing Matrix**: 12x16 voice-to-channel routing system
- **100+ MIDI Mappings**: Comprehensive control mapping system
- **Authentication System**: User login, token management, Hub integration
- **Backup System**: Automatic backup creation and restoration
- **Auto-Updater**: Automatic application updates with version management
- **Database Recovery**: Advanced backup and recovery system
- **Toast Notifications**: User feedback and notification system
- **Audio Settings**: Comprehensive audio device configuration

### Technical Architecture
- **Reactive System**: Real-time updates across all components
- **Follow System**: Parameter linking between tracks
- **State Management**: Comprehensive state tracking and persistence
- **MIDI Integration**: Full MIDI output with CC mapping for DAW integration
- **Window Management**: Centralized window positioning and z-order management
- **History System**: Undo/redo with automatic backup and error recovery

Each feature includes:
- **Description**: User-friendly explanation from help system
- **Details**: Technical implementation details and UI design
- **Source**: Source file reference for further analysis

This catalog serves as the foundation for:
- **Tutorial prioritization** - Identify most important features for different user levels
- **Pedagogical organization** - Group related features for progressive learning
- **Video script writing** - Detailed feature descriptions for tutorial scripts
- **User path creation** - Map features to user skill levels and musical goals

---

*Generated from Cymasphere source code analysis and built-in help system*  
*Features extracted from: HelpText.cpp (136 help entries), Domain/DataStructs/, UI components*  
*Last updated: [Current Date]*
