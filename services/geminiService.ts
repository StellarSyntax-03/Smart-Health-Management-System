import { GoogleGenAI, Type } from "@google/genai";
import { ChatMessage, Patient, PrescriptionAnalysisResult } from '../types';
import { SYSTEM_INSTRUCTION_CHATBOT, SYSTEM_INSTRUCTION_PRESCRIPTION } from '../constants';

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const GeminiService = {
  /**
   * Chat with the AI Health Assistant (Supports Text + Images)
   */
  async chat(history: ChatMessage[], newMessage: string, imageAttachment?: { mimeType: string, data: string }): Promise<string> {
    try {
      // Create the content parts
      const parts: any[] = [{ text: newMessage }];
      
      // Add image if present
      if (imageAttachment) {
        parts.push({
          inlineData: {
            mimeType: imageAttachment.mimeType,
            data: imageAttachment.data
          }
        });
      }

      // Construct history context for the prompt (Simplified context window)
      // In a real production app, you would pass the formatted `history` object to a chat session.
      // Here we append recent context to the prompt to maintain stateless simplicity while giving memory.
      const recentHistory = history.slice(-5).map(h => 
        `${h.role === 'user' ? 'Patient' : 'Assistant'}: ${h.text}`
      ).join('\n\n');

      const fullPrompt = `
      PREVIOUS CONVERSATION:
      ${recentHistory}
      
      CURRENT REQUEST:
      ${newMessage}
      ${imageAttachment ? '[Image Uploaded by Patient]' : ''}
      
      Assistant:`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          role: 'user',
          parts: parts.length > 1 ? parts : [{ text: fullPrompt }] // Use parts if image, else text prompt with history
        },
        config: {
          systemInstruction: SYSTEM_INSTRUCTION_CHATBOT,
          temperature: 0.7,
        }
      });

      return response.text || "I'm sorry, I couldn't generate a response. Please try again.";
    } catch (error) {
      console.error("Gemini Chat Error:", error);
      return "I'm having trouble connecting to the network. Please check your internet connection and try again.";
    }
  },

  /**
   * Parse and Validate Prescription via Voice/Text Input
   */
  async analyzePrescription(text: string, patient: Patient): Promise<PrescriptionAnalysisResult> {
    try {
      const patientContext = `
      Patient Context:
      - Allergies: ${patient.allergies.join(', ') || 'None'}
      - Conditions: ${patient.chronicConditions.join(', ') || 'None'}
      - Age: ${patient.age}
      `;

      const prompt = `
      ${patientContext}
      
      Doctor's Dictation: "${text}"
      
      Please extract the medication details and check for safety issues against the patient context.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION_PRESCRIPTION,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              structuredPrescription: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    dosage: { type: Type.STRING },
                    frequency: { type: Type.STRING },
                    duration: { type: Type.STRING }
                  }
                }
              },
              safe: { type: Type.BOOLEAN },
              warnings: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            }
          }
        }
      });

      if (response.text) {
        return JSON.parse(response.text) as PrescriptionAnalysisResult;
      }
      throw new Error("Empty response from AI");

    } catch (error) {
      console.error("Prescription Analysis Error:", error);
      return {
        safe: false,
        warnings: ["System error: Could not analyze prescription. Please check manually."],
        structuredPrescription: []
      };
    }
  }
};