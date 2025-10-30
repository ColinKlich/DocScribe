// pptx-extractor.ts
import * as JSZip from 'jszip';

/**
 * Extracts structured text content from a PowerPoint (.pptx) file buffer
 * Includes slide titles, content, and presenter notes in a structured format
 * 
 * @param pptxFileBuffer - ArrayBuffer containing the .pptx file data
 * @returns Promise<string> with structured slide information
 * @throws Error if the buffer is invalid or contains no slides
 */
export async function extractStructuredText(pptxFileBuffer: ArrayBuffer): Promise<string> {
  if (!pptxFileBuffer || pptxFileBuffer.byteLength === 0) {
    throw new Error('Invalid input: Empty or null ArrayBuffer provided');
  }

  const zip = await JSZip.loadAsync(pptxFileBuffer);
  let structuredNotes = '';
  let slideIndex = 1;

  // Process slides sequentially until no more slides are found
  while (true) {
    const slidePath = `ppt/slides/slide${slideIndex}.xml`;
    const notesPath = `ppt/notesSlides/notesSlide${slideIndex}.xml`;

    const slideFile = zip.file(slidePath);
    if (!slideFile) {
      break; // No more slides
    }

    try {
      const slideXml = await slideFile.async('text');
      
      // Extract slide title (looks for title placeholder)
      const titleMatch = slideXml.match(/<p:ph[^>]*type="title"[^>]*>[\s\S]*?<a:t>(.*?)<\/a:t>/i);
      const title = titleMatch ? decodeXmlEntities(titleMatch[1].trim()) : `Slide ${slideIndex}`;

      // Extract presenter notes
      let notesText = 'No presenter notes.';
      const notesFile = zip.file(notesPath);
      if (notesFile) {
        const notesXml = await notesFile.async('text');
        const notesMatches = notesXml.match(/<a:t>([\s\S]*?)<\/a:t>/g);
        if (notesMatches && notesMatches.length > 0) {
          notesText = notesMatches
            .map(m => decodeXmlEntities(m.replace(/<\/?a:t>/g, '').trim()))
            .filter(text => text.length > 0)
            .join(' ');
          notesText = notesText || 'No presenter notes.';
        }
      }

      // Extract main slide content (all text runs excluding title)
      const contentMatches = slideXml.match(/<a:t>([\s\S]*?)<\/a:t>/g);
      let content = '';
      if (contentMatches) {
        content = contentMatches
          .map(m => decodeXmlEntities(m.replace(/<\/?a:t>/g, '').trim()))
          .filter(text => text.length > 0)
          .join(' ');
      }

      structuredNotes += `
SLIDE_START:${slideIndex}
TITLE: ${title}
CONTENT: ${content}
NOTES: ${notesText}
SLIDE_END:${slideIndex}
---
`;
    } catch (error) {
      // Log error but continue processing other slides
      console.warn(`Warning: Failed to process slide ${slideIndex}:`, error);
      structuredNotes += `
SLIDE_START:${slideIndex}
TITLE: [Error processing slide]
CONTENT: [Extraction failed]
NOTES: [Extraction failed]
SLIDE_END:${slideIndex}
---
`;
    }

    slideIndex++;
  }

  if (slideIndex === 1) {
    throw new Error('No slides found in presentation. Invalid .pptx file?');
  }

  return structuredNotes.trim();
}

/**
 * Decodes common XML entities to their character equivalents
 * @param text - Text containing XML entities
 * @returns Decoded text string
 */
function decodeXmlEntities(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}