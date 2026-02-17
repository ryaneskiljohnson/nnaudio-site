import { ChatOpenAI } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { OpenAIEmbeddings } from "@langchain/openai";

// Cymasphere website content (this would normally be scraped/updated dynamically)
const CYMASPHERE_KNOWLEDGE_BASE = `
# Cymasphere Platform Information

## What is Cymasphere?
Cymasphere is a complete song creation suite available both as a standalone application and as a plugin (AU & VST3) for your DAW. It provides integrated tools for composing both harmony and melody, featuring intelligent chord voicing, melody pattern construction, and interactive visualization that makes music theory accessible and intuitive for all skill levels.

## Hero Section Marketing
- Main Title: "Generate Music With AI" / "Intelligent Creation"
- Subtitle: "Enter the next evolution of music creation, where theoretical foundations invisibly guide your workflow. Chords and melodies connect with purpose, empowering your unique musical vision."
- Call-to-Action: "Try It Now" / "Learn More"
- Dynamic Title Words: Music, Song, Chord, Pattern, Progression, Voicing, Harmony

## Key Features
- Song Builder with Multi-Track Management
- Intelligent Pattern Editor & Chord Adaptation
- Gestural Harmony Palette Interface
- Advanced Voice Leading & Chord Voicings
- Interactive Chord Progression Timeline
- Complete Voice and Range Control
- Standalone App & DAW Plugin Support
- Real-Time Chord Reharmonization Tools
- Comprehensive Arrangement View
- Custom Voicing Generation Engine
- Premium Support & All Future Updates

## Detailed Feature Descriptions

### Song Builder
The Song Builder is your central creative hub where all musical elements come together. You can arrange chord progressions, create melody patterns, and build complete song structures with multiple tracks. The system features:
- Professional Transport Controls with play, stop, record, loop functionality, BPM, meter, metronome and DAW sync
- Interactive Timeline with grid snapping, zoom controls, and countoff capabilities
- Multi-Track Management with per-track mute/solo, volume controls, and routing options
- Comprehensive Arrangement View providing a holistic perspective of all voicings and patterns
- Chord Progression Framework serving as the harmonic foundation for your compositions
- Informative Keyboard Display showing chord voicings and voice leading

### Harmony Palettes
The Interactive Harmony Palette provides a visual, gestural interface for exploring chord relationships. Features include:
- Customizable library organization with drag-and-drop chord collection management
- Direct drag-and-drop voicings from palette to your progression timeline
- Curated collection libraries with preselected scales and chord relationships
- One-click key transposition to instantly change the key of entire compositions
- Voicing parameter panel for quick chord characteristic adjustments
- Custom library creation to build your personal harmonic vocabulary

### Dynamic Pattern Editor
The Dynamic Pattern Editor enables you to create complex musical motifs that respond intelligently to changes in your chord progressions. Features include:
- Intelligent Adaptation to chord progression changes in real-time
- Advanced Piano Roll Interface with powerful editing tools
- Context-Aware Note Entry with scale, chord, and voicing intelligence to prevent harmonic clashes
- Dual Mode Operation with relative and absolute patterns for both contextual and fixed melodic content
- Melodic Essence Extraction that captures the intent of any melody for reuse in different harmonic contexts

### Voicing Generator
The Voicing Generator uses advanced algorithms to create rich, musically satisfying chord voicings that follow proper voice leading principles. It analyzes chord progressions to ensure smooth voice transitions between chords, with controls for voicing width, density, inversions, and harmonic extensions.

## How It Works

### CREATE Workflow
1. **Start with Chord Progressions**: Begin with pre-crafted templates or effortlessly build your own chord progressions by dragging voicings from the Harmony palette. The app automatically analyzes scales and modes, ensuring your music follows proper theory principles.
2. **Layer Multiple Tracks**: Create rich compositions with multiple tracks that intelligently work together. Add harmony, melodies, and rhythms—all synchronized and harmonically compatible with your chord progression.
3. **Customize with Precision**: Fine-tune your sound with detailed customization. Adjust inversions, voicing density, tension notes, and harmonic extensions to craft everything from simple triads to complex jazz harmonies.
4. **Intelligent Musicality**: Experience professional-level musicality with intelligent voice leading that ensures smooth chord transitions. Access composition tools previously available only to trained musicians, empowering you to create sophisticated harmonies with confidence.

### LEARN Workflow
1. **Ghost Track Learning**: Master chord progressions through interactive ghost tracks that guide your playing. Experiment with reharmonization in real-time, watching as the app adapts to your creative choices while maintaining musical coherence.
2. **Interactive Harmonic Analysis**: Explore comprehensive harmonic displays that reveal the theory behind your music. Visualize voicings, patterns, scales, and chords in real-time, gaining deep insights into the musical structure of your creations.
3. **Pattern-Based Learning**: Start with a simple pattern and watch it evolve as you explore different scales and chord qualities. The app's visual feedback helps you understand how each note contributes to the overall harmony.
4. **Refine Your Skills**: Improve your musical ear by experimenting with different chord substitutions and modal interchange. Develop a deeper understanding of chord qualities and progressions.

### INTEGRATE Workflow
1. **DAW Compatibility**: Use Cymasphere as a standalone application or as a VST/AU plugin within your DAW. Whether you're sketching ideas independently or integrating directly into your production, the app adapts to your preferred workflow.
2. **Multi-Track Control**: Manage multiple tracks simultaneously, each with its own independent voice settings and patterns. Create rich, layered arrangements by assigning different musical elements to separate tracks within your DAW.
3. **Voice Channel Matrix**: Precisely control where each voice is sent using the channel matrix. Route individual voices to specific MIDI channels in your DAW, giving you complete control over instrument assignment and voice distribution.
4. **Seamless Workflow**: Integrate Cymasphere into your production process as a powerful harmony and pattern generator. Use it to quickly sketch ideas, develop complex progressions, and create musical patterns that feed directly into your DAW's instruments.

## Pricing Plans
Cymasphere offers flexible pricing options:
- **Monthly billing**: $6.00/month - Pay month-to-month, cancel anytime (most flexible)
- **Yearly billing**: $59.00/year - Save 25% with yearly billing (best value)
- **Lifetime**: $149.00 one-time payment - Lifetime access (best value)

All plans include full access to all features. Pricing is simple and transparent.

## Free Trial Options
Cymasphere offers two free trial options:
- **7-day free trial** without requiring a credit card
- **14-day free trial** with a card on file (won't be charged until trial ends)
Both options give you full access to all premium features.

## Technical Requirements
- Available as standalone application
- Available as AU plugin (macOS)
- Available as VST3 plugin
- Compatible with major DAWs
- Works on desktop platforms (Windows and macOS)

## Installation
- **Windows**: Standalone in C:\\Program Files\\Cymasphere\\, Plugins in C:\\Program Files\\Common Files\\VST3\\
- **macOS**: Standalone in /Applications/, Plugins in /Library/Audio/Plug-Ins/
- Login with Cymasphere account credentials on first launch

## Support and Documentation
- Built-in help manager provides complete documentation (no separate PDF manual)
- All help is directly built into the in-app help manager
- Discord community: https://discord.gg/gXGqqYR47B
- Email support: support@cymasphere.com
- Premium support available
- 24/7 support availability

## Updates
- All customers have access to the most recent version at no additional cost
- Lifetime license holders receive all future updates as part of their one-time purchase
- Continuous improvements and new features for all users

## Music Theory Learning
- No music theory knowledge required to use Cymasphere
- Visual interfaces help understand musical relationships as you compose
- Makes complex theory concepts intuitive even for beginners
- Both a powerful creation tool and excellent learning resource
- Grows with you as you develop your skills

## Customer Testimonials
- **Sarah Chen (Composer)**: "Cymasphere revolutionized my composition process. The intelligent voice leading allows me to create complex harmonies I never could have achieved manually."
- **Dr. Michael Rodriguez (Music Teacher)**: "As a music teacher, I use Cymasphere to demonstrate complex theoretical concepts. My students finally understand how chord progressions work!"
- **Alex Thompson (Music Producer)**: "The gestural interface for harmony palettes is brilliant. I can explore chord relationships in a completely new and intuitive way."

## Company Mission
Cymasphere's mission is to make music theory accessible without requiring years of study or technical application to an instrument. We believe deep musical understanding should be within reach of all creators, not just classically trained musicians. Our tools are designed to remove traditional barriers to music creation while still offering creative freedom.

## Company Story
Founded in 2022 by a team of dedicated musicians, software engineers, and music theorists, Cymasphere began as an ambitious project to reimagine how musicians interact with harmony and composition. After years of frustration with existing music software that either lacked theoretical sophistication or were too complex for intuitive use, our founders set out to create a tool that would make music theory practical, visual, and genuinely useful in the creative process.

## Company Values
- **Musical Integrity**: We respect the principles of music theory while embracing innovation
- **Intuitive Design**: Our interfaces are visually clear and immediately understandable
- **Creative Freedom**: We provide guidance without limiting expression
- **Continuous Learning**: Our tools help users develop their musical understanding

## Target Users
- Music producers at any skill level
- Songwriters looking for composition tools
- Musicians wanting to understand music theory better
- Producers needing help with chord progressions and melodies
- Anyone wanting to bridge music theory knowledge with practical application
- Beginners who want to learn music theory through practice
- Advanced users who want sophisticated composition tools
- Music teachers and educators
- Composers and arrangers
- Anyone interested in intelligent music creation

## Musical Support and Encouragement
Cymasphere understands that music creation can be challenging and frustrating at times. Many musicians struggle with:
- Feeling like their music isn't good enough
- Getting stuck in creative ruts
- Not knowing where to start with composition
- Struggling with music theory concepts
- Comparing themselves to other musicians
- Feeling overwhelmed by technical aspects

Cymasphere is designed to help overcome these challenges by:
- Making music theory accessible and visual
- Providing intelligent guidance without judgment
- Offering tools that grow with your skill level
- Removing technical barriers to creativity
- Helping you understand why certain musical choices work
- Building confidence through understanding

## Common Musical Struggles and Solutions
**"My music sucks" / "I'm not good at music"**
- Every musician has felt this way - it's part of the creative process
- Cymasphere helps by making music theory visual and accessible
- Start with simple chord progressions and build from there
- The app guides you toward musically satisfying choices
- Focus on progress, not perfection

**"I don't know music theory"**
- Cymasphere requires no prior music theory knowledge
- Learn theory through practice, not memorization
- Visual interfaces help you understand relationships intuitively
- The app handles the complex theory behind the scenes

**"I'm stuck in a creative rut"**
- Try exploring different chord progressions with the Harmony Palette
- Use the Voicing Generator to discover new harmonic possibilities
- Experiment with different scales and modes
- Let the app suggest musically coherent alternatives

**"I can't finish songs"**
- Start with chord progressions as your foundation
- Use the Song Builder to organize your ideas
- Break composition into smaller, manageable steps
- Focus on one element at a time (harmony, then melody, then arrangement)
`;

class CymasphereRAG {
  private vectorStore: MemoryVectorStore | null = null;
  private llm: ChatOpenAI;
  private embeddings: OpenAIEmbeddings;

  constructor() {
    this.llm = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0.1,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
  }

  async initialize() {
    // Split the knowledge base into chunks
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const docs = await textSplitter.createDocuments([CYMASPHERE_KNOWLEDGE_BASE]);

    // Create vector store
    this.vectorStore = await MemoryVectorStore.fromDocuments(docs, this.embeddings);
  }

  async retrieveRelevantContext(query: string): Promise<string> {
    if (!this.vectorStore) {
      await this.initialize();
    }

    const results = await this.vectorStore!.similaritySearch(query, 3);
    return results.map((doc: Document) => doc.pageContent).join('\n\n');
  }

  /** Extract NEPQ state from conversation (implementation on prototype). */
  declare extractNEPQState: (
    conversationHistory: any[],
    query: string
  ) => { needs: string[]; pains: string[]; currentTools: string[]; experienceLevel: string; budget: string; decisionContext: string };

  async generateResponse(query: string, conversationHistory: any[] = []): Promise<string> {
    // Layer 1: Retrieve relevant information
    const context = await this.retrieveRelevantContext(query);

    // Extract NEPQ state from conversation
    const nepqState = this.extractNEPQState(conversationHistory, query);

    // Layer 2: Generate response with retrieved context
    const systemPrompt = `You are a sales assistant for Cymasphere who strictly follows NEPQ. You are also empathetic and supportive of musicians' creative struggles.

NEPQ SALES STRATEGY (optimize for a single next step):
- Need: Identify the user's specific creative goals and desired outcomes.
- Economic Buyer: Understand purchasing authority only if relevant later.
- Pain: Uncover the most pressing challenge blocking progress.
- Question: Ask ONE precise, high-impact question at a time to advance discovery.

CRITICAL RULES:
1) For questions about Cymasphere features/pricing/technical details: Use ONLY information from the context below. If the context doesn't have it, say "I don't know" and guide to site.
2) For emotional/musical struggles (like "my music sucks", "I'm stuck", "I don't know theory"): Be empathetic and encouraging. Use the musical support context to provide helpful, understanding responses.
3) Never invent technical details about Cymasphere features. Stay grounded in Cymasphere context for product information.
4) Prefer short, skimmable answers tied to the user's stated pains/needs.
5) Ask exactly ONE next question, tailored by what you already know.
6) Always connect the user's concern, challenge, or aspiration to how Cymasphere helps (producers, composers, songwriters, educators, students, performing musicians, beatmakers, theory learners). Never suggest Cymasphere can't help their musical vision—guide them to the right feature or workflow.
7) Never claim features that don't exist in the context.

KNOWN NEPQ STATE (from chat so far):
- Needs: ${nepqState.needs.join(', ') || 'unknown'}
- Pains: ${nepqState.pains.join(', ') || 'unknown'}
- Current tools: ${nepqState.currentTools.join(', ') || 'unknown'}
- Experience level: ${nepqState.experienceLevel || 'unknown'}
- Budget: ${nepqState.budget || 'unknown'}
- Decision context: ${nepqState.decisionContext || 'unknown'}

CONTEXT:
${context}

Instructions for this turn:
- Provide a concise, context-grounded answer if possible (no fluff).
- Then ask ONE tailored NEPQ question that best progresses the conversation, avoiding repeats.
- If the answer is not in context, say "I don't know" and point them to the site politely.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-8).map((msg: any) => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.text
      })),
      { role: 'user', content: query }
    ];

    const response = await this.llm.invoke(messages);
    return response.content as string;
  }

  async verifyResponse(response: string, context: string): Promise<boolean> {
    // Accept if response is clearly grounded OR is a valid NEPQ discovery step OR is empathetic
    const keyTerms = ['cymasphere', 'song creation', 'standalone', 'plugin', 'daw', 'chord', 'melody', 'harmony', 'pricing', 'trial', 'monthly', 'yearly', 'lifetime'];
    const lower = response.toLowerCase();
    const grounded = keyTerms.some(term => lower.includes(term));

    // Consider NEPQ discovery questions valid to avoid fallback loops
    const looksLikeDiscovery = response.trim().endsWith('?') || /what|which|how|when|who|why/i.test(response.split('\n')[0] || '');

    // Allow explicit honesty
    const honestUnknown = lower.includes("i don't know");

    // Allow empathetic responses for musical struggles
    const isEmpathetic = (
      lower.includes('totally get') ||
      lower.includes('every musician') ||
      lower.includes('so common') ||
      lower.includes('creative blocks') ||
      lower.includes('feeling stuck') ||
      lower.includes('don\'t need to know') ||
      lower.includes('behind the scenes') ||
      lower.includes('intuitively')
    );

    // Denylist: block phrases that imply unsupported claims or external product features
    const denylist = [
      'web-based platform',
      'browser-based daw',
      'mobile app only',
      'ios only',
      'android only',
      'ai generates full songs automatically without input',
      'no daw support',
    ];
    const hitsDenylist = denylist.some(term => lower.includes(term));

    // Also ensure it isn't trivially generic
    const tooShort = response.trim().length < 20;

    return (grounded || looksLikeDiscovery || honestUnknown || isEmpathetic) && !tooShort && !hitsDenylist;
  }
}

export const cymasphereRAG = new CymasphereRAG();

// --- Helpers ---
// Lightweight NEPQ state extractor
// This intentionally uses simple heuristics to avoid heavy parsing and keeps privacy intact.
// It scans recent conversation messages for common signals.
// Returned values are used to tailor the next single question.
// Types kept as any to avoid introducing build-time type friction.
(CymasphereRAG as any).prototype.extractNEPQState = function extractNEPQState(conversationHistory: any[] = [], latestUserMessage: string = '') {
  const recent = [...(conversationHistory || [])].slice(-10);
  const texts = recent.map(m => (m?.text || '')).concat(latestUserMessage || '');
  const joined = texts.join('\n').toLowerCase();

  const needs: string[] = [];
  const pains: string[] = [];
  const currentTools: string[] = [];
  let experienceLevel: string | null = null;
  let budget: string | null = null;
  let decisionContext: string | null = null;

  // Heuristic extraction
  if (/melod(y|ies)|lead|topline/.test(joined)) needs.push('melody creation');
  if (/chord|progression|voicing|harmony/.test(joined)) needs.push('chords & harmony');
  if (/arrang(e|ement)|structure/.test(joined)) needs.push('song structure');

  if (/struggl|hard|confus|stuck|block|problem|issue/.test(joined)) pains.push('creative friction');
  if (/theory|scale|mode|voic(e|ing)s? hard|don'?t know theory/.test(joined)) pains.push('music theory complexity');

  if (/ableton|fl studio|logic|reaper|bitwig|pro tools|studio one|cubase/.test(joined)) currentTools.push('DAW mentioned');

  if (/beginner|new to|just starting/.test(joined)) experienceLevel = 'beginner';
  else if (/intermediate|some experience/.test(joined)) experienceLevel = 'intermediate';
  else if (/advanced|expert|pro/.test(joined)) experienceLevel = 'advanced';

  if (/(budget|price range|too expensive|afford|cost)/.test(joined)) budget = 'budget sensitive';
  if (/(manager|boss|team|client|approval|procurement)/.test(joined)) decisionContext = 'multiple stakeholders';

  return {
    needs: Array.from(new Set(needs)),
    pains: Array.from(new Set(pains)),
    currentTools: Array.from(new Set(currentTools)),
    experienceLevel: experienceLevel || '',
    budget: budget || '',
    decisionContext: decisionContext || ''
  };
};
