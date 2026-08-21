import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { checkAdmin } from "@/app/actions/user-management";
import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Cymasphere knowledge base for context (same as chat assistant)
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
- **Lifetime**: $199.00 one-time payment - Lifetime access (best value)

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
- **Windows**: Standalone in C:\\
- **macOS**: Standalone in /Applications/, Plugins in /Library/Audio/Plug-Ins/
- Login with Cymasphere account credentials on first launch

## Support and Documentation
- Built-in help manager provides complete documentation (no separate PDF manual)
- All help is directly built into the in-app help manager
- Discord community: https://discord.gg/gXGqqYR47B
- Email support: support@nnaud.io
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

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  if (!(await checkAdmin(supabase))) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await request.json();
  const { prompt, ticketId, allTickets } = body;

  if (!prompt || typeof prompt !== 'string') {
    return NextResponse.json(
      { error: "Prompt is required" },
      { status: 400 }
    );
  }

  try {
    if (!openai) {
      // If OpenAI is not configured, use fallback
      console.log('[AI Response] OpenAI client not initialized - API key missing');
      const fallbackResponse = generateFallbackResponse(prompt, '');
      return NextResponse.json({
        success: true,
        response: fallbackResponse,
        isFallback: true,
        error: "OpenAI API key not configured - using template response"
      });
    }
    
    console.log('[AI Response] OpenAI client initialized, proceeding with API call');

    // Get the current ticket details if ticketId is provided
    let currentTicketContext = '';
    if (ticketId) {
      const { data: ticket, error: ticketError } = await supabase
        .from("support_tickets")
        .select(`
          *,
          support_messages (
            id,
            content,
            is_admin,
            created_at,
            user_id
          )
        `)
        .eq("id", ticketId)
        .single();

      if (!ticketError && ticket) {
        // Get user email from profile
        let customerEmail = 'N/A';
        if (ticket.user_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", ticket.user_id)
            .single();
          customerEmail = profile?.email || 'N/A';
        }

        const messages = (ticket.support_messages || []).sort((a: any, b: any) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        // Format conversation history with clear structure and message numbers
        const conversationHistory = messages.map((msg: any, index: number) => {
          const timestamp = new Date(msg.created_at).toLocaleString();
          const role = msg.is_admin ? 'Support Agent (You)' : 'Customer';
          const messageNum = index + 1;
          return `Message ${messageNum} [${timestamp}] - ${role}:\n${msg.content}`;
        }).join('\n\n---\n\n');

        currentTicketContext = `
## CURRENT SUPPORT TICKET - FULL CONVERSATION THREAD

**Ticket Information:**
- Ticket #${ticket.ticket_number}: ${ticket.subject}
- Status: ${ticket.status}
- Customer Email: ${customerEmail}
- Created: ${new Date(ticket.created_at).toLocaleString()}
- Last Updated: ${ticket.updated_at ? new Date(ticket.updated_at).toLocaleString() : 'N/A'}

**Original Issue Description:**
${ticket.description || 'N/A'}

**COMPLETE CONVERSATION THREAD** (in chronological order, ${messages.length} total messages):
${conversationHistory || 'No messages yet - this is a new ticket.'}

---
**END OF CONVERSATION THREAD**

**IMPORTANT**: Read the entire conversation above carefully. The customer's questions, concerns, and any issues they've mentioned are in the messages above. Your response should directly address what the customer has said in this conversation.
`;
      }
    }

    // Format all tickets as context (for pattern recognition and similar issues)
    let allTicketsContext = '';
    if (allTickets && Array.isArray(allTickets) && allTickets.length > 0) {
      // Sort by most recent first, limit to 100 most recent tickets
      const sortedTickets = [...allTickets]
        .sort((a: any, b: any) => {
          const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
          const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
          return dateB - dateA;
        })
        .slice(0, 100);

      allTicketsContext = `
## All Support Tickets Context (for reference and pattern recognition)

This section contains information about other support tickets to help you:
- Recognize similar issues or patterns
- Reference how similar problems were resolved
- Understand common customer concerns
- Maintain consistency in responses

**Recent Tickets** (${sortedTickets.length} tickets shown):
${sortedTickets.map((ticket: any) => {
  const createdDate = ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : 'N/A';
  const description = ticket.description ? (ticket.description.length > 150 ? ticket.description.substring(0, 150) + '...' : ticket.description) : 'No description';
  return `- **Ticket #${ticket.ticket_number}** (${ticket.status}): ${ticket.subject}
  - Customer: ${ticket.user_email || 'Unknown'}
  - Created: ${createdDate}
  - Issue: ${description}`;
}).join('\n\n')}

**Note**: Use this context to identify patterns and similar issues, but always prioritize the CURRENT ticket conversation when writing your response.
`;
    }

    // Build the user prompt with conversation context prominently featured
    let userPrompt = '';
    
    if (currentTicketContext) {
      userPrompt = `${currentTicketContext}\n\n---\n\n**Your Task**: ${prompt}\n\nPlease write a response based on the conversation above.`;
    } else {
      userPrompt = prompt;
    }

    // Build the system prompt with knowledge base
    const systemPrompt = `You are a helpful support agent for Cymasphere, a music creation software. Your role is to help write professional, friendly, and helpful responses to customer support tickets.

${CYMASPHERE_KNOWLEDGE_BASE}

${allTicketsContext ? `\n${allTicketsContext}\n` : ''}

**CRITICAL INSTRUCTIONS:**
- Read the ENTIRE conversation thread provided in the user message
- Address the customer's specific questions and concerns from the conversation
- Reference previous messages in the thread to show you understand the context
- Write responses that are professional, empathetic, and solution-oriented
- Use information from the knowledge base above when relevant
- Keep responses concise but complete
- Use a friendly, helpful tone
- If you don't know something, suggest contacting support@nnaud.io
- Always be respectful and patient`;

    // Generate AI response
    let response: string;
    
    try {
      console.log('[AI Response] Attempting to connect to OpenAI API...');
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      response = completion.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.";
      console.log('[AI Response] Successfully received response from OpenAI API');
    } catch (apiError: any) {
      // If OpenAI API fails (quota, errors, etc.), provide a helpful fallback response
      console.error("OpenAI API error:", apiError);
      
      // Generate a basic template response based on the prompt
      response = generateFallbackResponse(prompt, currentTicketContext);
      
      // Still return success but indicate it's a fallback
      return NextResponse.json({
        success: true,
        response,
        isFallback: true,
        error: apiError?.status === 429 
          ? "OpenAI quota exceeded - using template response"
          : apiError?.status === 401
          ? "OpenAI API key issue - using template response"
          : "OpenAI API error - using template response"
      });
    }

    return NextResponse.json({
      success: true,
      response,
    });
  } catch (error: any) {
    console.error("Error generating AI response:", error);
    
    // Final fallback - generate a basic response
    // Note: body was already parsed above, so we use the prompt from there
    const fallbackResponse = generateFallbackResponse(prompt || "", "");
    
    return NextResponse.json({
      success: true,
      response: fallbackResponse,
      isFallback: true,
      error: "Error occurred - using template response"
    });
  }
}

// Fallback response generator when OpenAI is unavailable
function generateFallbackResponse(prompt: string, ticketContext: string): string {
  const lowerPrompt = prompt.toLowerCase();
  
  // Basic template responses based on common support scenarios
  if (lowerPrompt.includes("refund") || lowerPrompt.includes("money back")) {
    return `Thank you for reaching out. I understand your concern about a refund.

Cymasphere offers a free trial period to ensure the software meets your needs before making a purchase. As a digital software product, we generally do not offer refunds after purchase, as stated in our refund policy.

However, I'd be happy to help troubleshoot any issues you're experiencing. Could you please share more details about what's not working as expected? Our support team is here to help make sure you get the most out of Cymasphere.

If you have specific technical issues, please let me know and I'll do my best to assist you.`;
  }
  
  if (lowerPrompt.includes("install") || lowerPrompt.includes("installation") || lowerPrompt.includes("setup")) {
    return `I'd be happy to help you with installation!

**Windows:**
- Standalone: Install to C:\\ (default location)
- VST3: Install to your DAW's VST3 plugin folder

**macOS:**
- Standalone: Install to /Applications/
- AU Plugin: Install to /Library/Audio/Plug-Ins/Components/
- VST3: Install to /Library/Audio/Plug-Ins/VST3/

On first launch, you'll need to log in with your Cymasphere account credentials.

If you're having trouble with a specific DAW integration, let me know which DAW you're using and I can provide more specific guidance.`;
  }
  
  if (lowerPrompt.includes("trial") || lowerPrompt.includes("free")) {
    return `Great question about our trial options!

Cymasphere offers two trial options:
- **7-day free trial** - No credit card required
- **14-day free trial** - With a card on file (you won't be charged until the trial ends)

Both options give you full access to all premium features. After your trial ends, you can choose from our subscription plans:
- Monthly: $6/month
- Annual: $59/year (save 25%)
- Lifetime: $149 one-time payment

Is there anything specific about the trial or features you'd like to know more about?`;
  }
  
  if (lowerPrompt.includes("pricing") || lowerPrompt.includes("price") || lowerPrompt.includes("cost")) {
    return `Here's our simple pricing:

- **Monthly**: $6/month - Most flexible, cancel anytime
- **Annual**: $59/year - Save 25% with yearly billing
- **Lifetime**: $149 one-time payment - Best value, all future updates included

All plans include full access to all features. We also offer free trials so you can try before you buy.

Which plan interests you most?`;
  }
  
  if (lowerPrompt.includes("feature") || lowerPrompt.includes("what can") || lowerPrompt.includes("capabilities")) {
    return `Cymasphere is a complete song creation suite with powerful features:

**Key Features:**
- Song Builder with multi-track management
- Intelligent Pattern Editor & Chord Adaptation
- Gestural Harmony Palette Interface
- Advanced Voice Leading & Chord Voicings
- Interactive Chord Progression Timeline
- Complete Voice and Range Control
- Standalone App & DAW Plugin Support (AU/VST3)
- Real-Time Chord Reharmonization Tools

It works as both a standalone application and as a plugin in your DAW. Would you like more details about any specific feature?`;
  }
  
  // Default helpful response
  return `Thank you for contacting Cymasphere support!

${ticketContext ? `Based on the ticket information, ` : ''}I'm here to help. Could you please provide a bit more detail about what you need assistance with? 

Some common topics I can help with:
- Installation and setup
- Feature questions
- DAW integration
- Troubleshooting technical issues
- Billing and subscription questions

Feel free to share more details, and I'll do my best to assist you!

If you need immediate assistance, you can also reach us at support@nnaud.io or join our Discord community.`;
}

