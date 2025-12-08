import { PDFParse } from 'pdf-parse';

PDFParse.setWorker(`https://cdn.jsdelivr.net/npm/pdf-parse@latest/dist/pdf-parse/web/pdf.worker.min.mjs`);
/**
 * Extracts text content from a PDF file buffer.
 *
 * @param pdfFileBuffer - ArrayBuffer containing the .pdf file data.
 * @returns Promise<string> with the extracted text content.
 * @throws Error if the buffer is invalid or the PDF cannot be parsed.
 */
export async function extractTextFromPdf(pdfFileBuffer: ArrayBuffer,timeoutMs = 30000): Promise<string> {
  if (!pdfFileBuffer || pdfFileBuffer.byteLength === 0) {
    const msg = 'Invalid input: Empty or null ArrayBuffer provided';
    throw new Error(msg); 
  }

  const data = new Uint8Array(pdfFileBuffer);
  let parser: PDFParse | null = null;
  let timer: NodeJS.Timeout | null = null;

  try {
    const textPromise = (async () => {
      // pdf-parse accepts a Buffer/Uint8Array; convert to Buffer for Node/Electron
      const buffer = Buffer.from(data);
      // Create parser instance.
      parser = new PDFParse({ data: buffer });
      if (!parser) {
        throw new Error('Failed to create PDF parser instance');
      }
      const result = await parser.getText();
      parser.destroy().catch(() => {});
      // result.text is expected to contain the extracted text
      return result && typeof result.text === 'string' ? result.text : '';
    })();

    const resultText = await Promise.race<string>([
      textPromise,
      new Promise<string>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`PDF extraction timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
    
    return resultText;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const friendly = `PDF extraction error: ${message}`;
    throw new Error(friendly);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}