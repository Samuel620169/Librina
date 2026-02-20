import { GoogleGenAI } from "@google/genai";

const getAI = () => {
  // Graceful fallback if API key is missing to prevent app crash
  if (!process.env.API_KEY) {
    console.warn("API Key missing");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const geminiService = {
  /**
   * Defines a word in context using Gemini.
   */
  async defineWord(word: string, contextSentence: string): Promise<string> {
    const ai = getAI();
    if (!ai) return "Configura tu API Key para usar definiciones inteligentes.";

    try {
      const model = 'gemini-2.5-flash';
      const prompt = `Define la palabra "${word}" de manera breve y sencilla (máximo 40 palabras). El contexto de uso es: "${contextSentence}". Responde en español.`;
      
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });
      
      return response.text || "No se pudo obtener la definición.";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Error de conexión al obtener definición.";
    }
  },

  /**
   * Performs OCR on an image.
   */
  async performOCR(base64Image: string): Promise<string> {
    const ai = getAI();
    if (!ai) throw new Error("API Key requerida");

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
                    { text: "Extrae todo el texto legible de esta imagen. Mantén el formato de párrafos si es posible. No añadas comentarios, solo el texto." }
                ]
            }
        });
        return response.text || "";
    } catch (e) {
        console.error("OCR Error", e);
        throw e;
    }
  },

  /**
   * Summarizes a text chunk.
   */
  async summarizeText(text: string): Promise<string> {
      const ai = getAI();
      if (!ai) return "Modo offline. Conecta la API Key para resúmenes.";

      try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Resume el siguiente texto en 3 puntos clave:\n\n${text.substring(0, 5000)}`
        });
        return response.text;
      } catch (e) {
          return "Error al generar resumen.";
      }
  }
};
