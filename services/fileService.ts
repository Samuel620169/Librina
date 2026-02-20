// @ts-ignore
declare const mammoth: any;
// @ts-ignore
declare const pdfjsLib: any;

export const fileService = {
  /**
   * Converts a File object to a Base64 string.
   */
  convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:mime/type;base64, prefix to just get the raw base64
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  },

  /**
   * Converts a Base64 string back to a Blob for rendering in iframes or download.
   */
  base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: mimeType });
  },

  /**
   * Creates a viewable Object URL from base64 content.
   */
  createObjectURL(base64: string, mimeType: string): string {
    const blob = this.base64ToBlob(base64, mimeType);
    return URL.createObjectURL(blob);
  },

  /**
   * Extracts text content from various file formats.
   * This is crucial for TTS and the "Smart Reader" view.
   */
  async extractText(file: File, base64: string): Promise<string> {
    const mime = file.type;
    
    if (mime === 'text/plain' || mime === 'text/markdown' || mime === 'application/json' || file.name.endsWith('.md')) {
      // Decode Base64 to text properly dealing with UTF-8
      const blob = this.base64ToBlob(base64, mime);
      return await blob.text();
    }

    if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // DOCX using Mammoth
      try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
        return result.value;
      } catch (e) {
        console.error("Error extracting DOCX:", e);
        return "Error al leer documento Word. Intenta guardarlo como TXT o PDF.";
      }
    }

    if (mime === 'application/pdf') {
      // PDF using PDF.js
      try {
        const loadingTask = pdfjsLib.getDocument({ data: atob(base64) });
        const pdf = await loadingTask.promise;
        let fullText = '';
        
        // Limit pages for performance on large books, or iterate all
        const maxPages = pdf.numPages;
        
        for (let i = 1; i <= maxPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          fullText += pageText + '\n\n';
        }
        
        return fullText || "No se pudo extraer texto de este PDF (puede que sea una imagen escaneada).";
      } catch (e) {
        console.error("Error extracting PDF:", e);
        return "Error al leer PDF. Es posible que esté encriptado.";
      }
    }

    if (mime === 'text/html') {
      const blob = this.base64ToBlob(base64, mime);
      const text = await blob.text();
      // Simple HTML stripping
      const doc = new DOMParser().parseFromString(text, 'text/html');
      return doc.body.textContent || "";
    }

    // Fallback
    return "Formato no compatible para extracción de texto. Usa la vista original.";
  },

  formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  },

  getFileIcon(mimeType: string) {
      if (mimeType.includes('pdf')) return 'pdf';
      if (mimeType.includes('word') || mimeType.includes('document')) return 'doc';
      if (mimeType.includes('text') || mimeType.includes('json')) return 'txt';
      return 'file';
  }
};