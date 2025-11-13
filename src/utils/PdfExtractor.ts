import { PDFParse } from 'pdf-parse';
import { Notice } from 'obsidian';

PDFParse.setWorker(`https://cdn.jsdelivr.net/npm/pdf-parse@latest/dist/pdf-parse/web/pdf.worker.min.mjs`);
/**
 * Extracts text content from a PDF file buffer.
 *
 * @param pdfFileBuffer - ArrayBuffer containing the .pdf file data.
 * @returns Promise<string> with the extracted text content.
 * @throws Error if the buffer is invalid or the PDF cannot be parsed.
 */
export async function extractTextFromPdf(
  pdfFileBuffer: ArrayBuffer,
  timeoutMs = 30000
): Promise<string> {
  if (!pdfFileBuffer || pdfFileBuffer.byteLength === 0) {
    const msg = 'Invalid input: Empty or null ArrayBuffer provided';
    try { new Notice(msg); } catch {}
    throw new Error(msg);
  }

  const data = new Uint8Array(pdfFileBuffer);
  let parser: any = null;
  let timer: any = null;

  try {
    const textPromise = (async () => {
      // pdf-parse accepts a Buffer/Uint8Array; convert to Buffer for Node/Electron
      const buffer = Buffer.from(data);
      // Create parser instance. Use any cast because types may vary between versions.
      parser = new (PDFParse as any)({ data: buffer });
      const result = await parser.getText();
      // result.text is expected to contain the extracted text
      return result && typeof result.text === 'string' ? result.text : String(result);
    })();

    const resultText = await Promise.race<string>([
      textPromise,
      new Promise<string>((_, reject) => {
        timer = setTimeout(() => {
          try {
            if (parser && typeof parser.destroy === 'function') {
              parser.destroy();
            }
          } catch (e) {
            // ignore
          }
          reject(new Error(`PDF extraction timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);

    return resultText;
  } catch (err: any) {
    const friendly = err && err.message ? `PDF extraction error: ${err.message}` : `PDF extraction error: ${String(err)}`;
    try { new Notice(friendly); } catch {}
    throw err;
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
    try {
      if (parser && typeof parser.destroy === 'function') {
        await parser.destroy();
      }
    } catch (e) {
      // ignore destroy errors
    }
  }
}