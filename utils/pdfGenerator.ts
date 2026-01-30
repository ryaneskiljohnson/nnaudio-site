import jsPDF from 'jspdf';

export interface QuickstartContent {
  title: string;
  sections: {
    title: string;
    content: string[];
  }[];
}

export class CymasphereQuickstartPDF {
  private doc: jsPDF;
  private primaryColor: string = '#6C63FF';
  private accentColor: string = '#36454F';
  private textColor: string = '#2D3748';
  private lightGray: string = '#F7FAFC';
  
  constructor() {
    this.doc = new jsPDF();
    this.setupDocument();
  }

  private setupDocument() {
    this.doc.setProperties({
      title: 'Cymasphere Quick Start Guide',
      subject: 'Getting started with Cymasphere',
      author: 'Cymasphere',
      creator: 'Cymasphere Website'
    });
  }

  private async addModernHeader() {
    const pageWidth = this.doc.internal.pageSize.width;
    
    // Main header background - charcoal grey like website header
    this.doc.setFillColor(15, 14, 23);
    this.doc.rect(0, 0, pageWidth, 60, 'F');
    
    // Accent stripe - purple brand color
    this.doc.setFillColor(108, 99, 255);
    this.doc.rect(0, 55, pageWidth, 5, 'F');
    
    try {
      // Load logo from file system at runtime with compression
      const fs = require('fs');
      const path = require('path');
      const logoPath = path.join(process.cwd(), 'public/images/cymasphere-logo.webp');
      
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        
        // Compress the image by reducing quality for PDF
        const canvas = require('canvas');
        const { createCanvas, loadImage } = canvas;
        
        // Load the original image
        const img = await loadImage(logoBuffer);
        
        // Create a medium-sized canvas for better quality
        const compressedCanvas = createCanvas(400, 80); // Better quality while still compressed
        const ctx = compressedCanvas.getContext('2d');
        
        // Draw the image scaled down
        ctx.drawImage(img, 0, 0, 400, 80);
        
        // Convert to base64 with good quality
        const logoBase64 = compressedCanvas.toDataURL('image/jpeg', 0.85); // JPEG with 85% quality for better appearance
        
        // Add centered logo
        const logoWidth = 100;
        const logoHeight = 20;
        this.doc.addImage(logoBase64, 'JPEG', pageWidth/2 - logoWidth/2, 20, logoWidth, logoHeight);
        console.log('Compressed logo successfully added to PDF');
      } else {
        throw new Error('Logo file not found');
      }
    } catch (error) {
      console.log('Logo loading failed, using text fallback:', error instanceof Error ? error.message : 'Unknown error');
      
      // Fallback: Create a circular background for logo area
      this.doc.setFillColor(255, 255, 255);
      this.doc.circle(pageWidth/2, 30, 15, 'F');
      
      // Add "C" as logo placeholder (centered)
      this.doc.setTextColor(108, 99, 255);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(20);
      this.doc.text('C', pageWidth/2, 34, { align: 'center' });
    }
    
    // Subtitle below the logo
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(12);
    this.doc.text('QUICK START GUIDE', pageWidth/2, 50, { align: 'center' });
  }

  private addStepCard(stepNumber: string, title: string, content: string[], y: number) {
    const pageWidth = this.doc.internal.pageSize.width;
    const cardX = 15;
    const cardWidth = pageWidth - 30;
    
    // Calculate dynamic height based on content (compact)
    let contentHeight = 25; // Further reduced base height
    content.forEach(line => {
      if (line.trim() === '') {
        contentHeight += 3; // Reduced spacing
        return;
      }
      
      if (line.startsWith('•')) {
        const bulletText = line.substring(1).trim();
        const lines = this.doc.splitTextToSize(bulletText, cardWidth - 25);
        contentHeight += lines.length * 5; // Slightly more spacing
      } else {
        const lines = this.doc.splitTextToSize(line, cardWidth - 20);
        contentHeight += lines.length * 5; // Slightly more spacing
      }
    });
    
    // Minimal padding
    contentHeight += 4;
    
    // Card background with shadow effect
    this.doc.setFillColor(247, 250, 252);
    this.doc.setDrawColor(220, 220, 220);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(cardX, y, cardWidth, contentHeight, 2, 2, 'FD');
    
    // Step number circle - keep purple for brand accent
    this.doc.setFillColor(108, 99, 255);
    this.doc.circle(cardX + 12, y + 12, 6, 'F');
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(12);
    // Better centering for the number - adjust Y position slightly up
    this.doc.text(stepNumber, cardX + 12, y + 13.5, { align: 'center' });
    
    // Step title
    this.doc.setTextColor(45, 55, 72);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(14);
    this.doc.text(title, cardX + 25, y + 15);
    
    // Content
    let contentY = y + 25;
    content.forEach(line => {
      if (line.trim() === '') {
        contentY += 4;
        return;
      }
      
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(10);
      this.doc.setTextColor(45, 55, 72);
      
      if (line.startsWith('•')) {
        // Bullet point
        this.doc.setTextColor(108, 99, 255);
        this.doc.text('•', cardX + 8, contentY);
        this.doc.setTextColor(45, 55, 72);
        const bulletText = line.substring(1).trim();
        const lines = this.doc.splitTextToSize(bulletText, cardWidth - 25);
        
        // Check for hyperlinks in bullet text
        if (bulletText.includes('Discord community')) {
          lines.forEach((textLine: string, index: number) => {
            const lineY = contentY + (index * 5);
            
            if (textLine.includes('Discord community')) {
              // Split the line into parts before and after the link text
              const linkStart = textLine.indexOf('Discord community');
              const beforeLink = textLine.substring(0, linkStart);
              const linkText = 'Discord community';
              const afterLink = textLine.substring(linkStart + linkText.length);
              
              let currentX = cardX + 15;
              
              // Render text before link
              if (beforeLink) {
                this.doc.setTextColor(45, 55, 72);
                this.doc.text(beforeLink, currentX, lineY);
                currentX += this.doc.getTextWidth(beforeLink);
              }
              
              // Render clickable link text
              this.doc.setTextColor(108, 99, 255);
              this.doc.textWithLink(linkText, currentX, lineY, { url: 'https://discord.gg/gXGqqYR47B' });
              currentX += this.doc.getTextWidth(linkText);
              
              // Render text after link
              if (afterLink) {
                this.doc.setTextColor(45, 55, 72);
                this.doc.text(afterLink, currentX, lineY);
              }
            } else {
              // No link in this line, render normally
              this.doc.setTextColor(45, 55, 72);
              this.doc.text(textLine, cardX + 15, lineY);
            }
          });
        } else {
          this.doc.text(lines, cardX + 15, contentY);
        }
        
        contentY += lines.length * 5;
      } else {
        // Regular text or section headers
        if (line.endsWith(':')) {
          // Section header (like "Windows:", "macOS:")
          this.doc.setFont('helvetica', 'bold');
          this.doc.setFontSize(11);
          this.doc.setTextColor(45, 55, 72);
        } else {
          this.doc.setFont('helvetica', 'normal');
          this.doc.setFontSize(10);
        }
        const lines = this.doc.splitTextToSize(line, cardWidth - 20);
        
        // Check for URLs and make them clickable
        if (line.includes(' downloads section') || line.includes('Discord community')) {
          // Handle URLs as inline links within the text
                      lines.forEach((textLine: string, index: number) => {
              const lineY = contentY + (index * 5);
            
            if (textLine.includes(' downloads section')) {
              // Split the line into parts before and after the link text
              const linkStart = textLine.indexOf(' downloads section');
              const beforeLink = textLine.substring(0, linkStart);
              const linkText = ' downloads section';
              const afterLink = textLine.substring(linkStart + linkText.length);
              
              let currentX = cardX + 8;
              
                             // Render text before link
               if (beforeLink) {
                 this.doc.setTextColor(45, 55, 72);
                 this.doc.text(beforeLink, currentX, lineY);
                 currentX += this.doc.getTextWidth(beforeLink);
               }
               
               // Render clickable link text
               this.doc.setTextColor(108, 99, 255);
               this.doc.textWithLink(linkText, currentX, lineY, { url: 'https://cymasphere.com/dashboard/downloads' });
               currentX += this.doc.getTextWidth(linkText);
               
               // Render text after link
               if (afterLink) {
                 this.doc.setTextColor(45, 55, 72);
                 this.doc.text(afterLink, currentX, lineY);
               }
                         } else if (textLine.includes('Discord community')) {
               // Split the line into parts before and after the link text
               const linkStart = textLine.indexOf('Discord community');
               const beforeLink = textLine.substring(0, linkStart);
               const linkText = 'Discord community';
               const afterLink = textLine.substring(linkStart + linkText.length);
               
               let currentX = cardX + 8;
               
               // Render text before link
               if (beforeLink) {
                 this.doc.setTextColor(45, 55, 72);
                 this.doc.text(beforeLink, currentX, lineY);
                 currentX += this.doc.getTextWidth(beforeLink);
               }
               
               // Render clickable link text
               this.doc.setTextColor(108, 99, 255);
               this.doc.textWithLink(linkText, currentX, lineY, { url: 'https://discord.gg/gXGqqYR47B' });
               currentX += this.doc.getTextWidth(linkText);
               
               // Render text after link
               if (afterLink) {
                 this.doc.setTextColor(45, 55, 72);
                 this.doc.text(afterLink, currentX, lineY);
               }
            } else {
              // No URL in this line, render normally
              this.doc.setTextColor(45, 55, 72);
              this.doc.text(textLine, cardX + 8, lineY);
            }
          });
          
          this.doc.setTextColor(45, 55, 72); // Reset color
        } else {
          this.doc.text(lines, cardX + 8, contentY);
        }
        
        contentY += lines.length * 5;
      }
    });
    
    return contentHeight; // Return actual height for spacing calculations
  }

  private addFooter() {
    const pageWidth = this.doc.internal.pageSize.width;
    const pageHeight = this.doc.internal.pageSize.height;
    
    // Footer background - same charcoal grey as header
    this.doc.setFillColor(15, 14, 23);
    this.doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
    
    // Support info
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    this.doc.text('Need help? Email: support@cymasphere.com  |  Discord: discord.gg/gXGqqYR47B', 15, pageHeight - 10);
    
    // Website
    this.doc.text('cymasphere.com', pageWidth - 15, pageHeight - 10, { align: 'right' });
  }

  public async generateQuickstartGuide(): Promise<Uint8Array> {
    // Add header
    await this.addModernHeader();
    
    let currentY = 70;
    
    // Step 1: Download & Install
    const step1Height = this.addStepCard('1', 'Download & Install', [
      'Download the installer from your dashboard  downloads section.',
      '',
      'Installation options: Standalone app, VST3 plugin, AU plugin (macOS)',
      '',
      'Windows:',
      '• Standalone: C:\\Program Files\\Cymasphere\\',
      '• Plugins: C:\\Program Files\\Common Files\\VST3\\',
      '',
      'macOS:',
      '• Standalone: /Applications/',
      '• Plugins: /Library/Audio/Plug-Ins/'
    ], currentY);
    
    currentY += step1Height + 10;
    
    // Step 2: Launch
    const step2Height = this.addStepCard('2', 'Launch Cymasphere', [
      '• Standalone: Open from Applications folder or Start menu',
      '• Plugin: Add as MIDI FX in your DAW',
      '',
      'Login with your Cymasphere account credentials on first launch.'
    ], currentY);
    
    currentY += step2Height + 10;
    
    // Step 3: Virtual MIDI Setup
    const step3Height = this.addStepCard('3', 'Set Up Virtual MIDI Device', [
      'To use Cymasphere with your DAW, you need a virtual MIDI device:',
      '',
      'macOS:',
      '• Open "Audio MIDI Setup" (Applications > Utilities)',
      '• Click "Window" > "Show MIDI Studio"',
      '• Double-click "IAC Driver"',
      '• Check "Device is online"',
      '• Click "Done"',
      '',
      'Windows:',
      '• Download and install LoopMIDI from tobias-erichsen.de',
      '• Launch LoopMIDI and click "+" to create a new port',
      '• Name it (e.g., "Cymasphere MIDI")',
      '• Keep LoopMIDI running while using Cymasphere',
      '',
      'After creating and enabling the virtual MIDI device:',
      '',
      'In Logic Pro:',
      '• Create a software instrument track',
      '• Add an External Instrument track, and set the MIDI destination to the IAC Driver (macOS) or LoopMIDI port (Windows)',
      '• Add an instrument track with any virtual instrument',
      '',
      'Now Cymasphere will output MIDI to the virtual MIDI device, which will come back into the DAW like an external keyboard, and any record-enabled instrument tracks will play that MIDI.'
    ], currentY);
    
    currentY += step3Height + 10;
    
    // Step 4: Get Started
    this.addStepCard('4', 'Get Started', [
      '• Built-in help manager provides complete documentation (no separate PDF manual)',
      '• Explore presets and experiment with different scales and voicings',
      '• Join our Discord community for tips and support'
    ], currentY);
    
    // Add footer
    this.addFooter();
    
    const arrayBuffer = this.doc.output('arraybuffer') as ArrayBuffer;
    return new Uint8Array(arrayBuffer);
  }
} 