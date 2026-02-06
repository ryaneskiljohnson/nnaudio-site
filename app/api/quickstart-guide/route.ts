import { NextRequest, NextResponse } from 'next/server';
import { CymasphereQuickstartPDF } from '../../../utils/pdfGenerator';

export async function GET(request: NextRequest) {
  try {
    // Create PDF generator instance
    const pdfGenerator = new CymasphereQuickstartPDF();
    
    // Generate the PDF
    const pdfBuffer = await pdfGenerator.generateQuickstartGuide();
    
    // Set headers for PDF download
    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', 'inline; filename="Cymasphere-QuickStart-Guide.pdf"');
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate'); // Disable caching for testing
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');
    
    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error generating quickstart guide PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
} 