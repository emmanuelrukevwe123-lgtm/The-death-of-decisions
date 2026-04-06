import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export type AnalysisType = 'pros-cons' | 'comparison' | 'swot';

export interface AnalysisResult {
  title: string;
  summary: string;
  data: any;
  recommendation: string;
}

export async function analyzeDecision(decision: string, type: AnalysisType): Promise<AnalysisResult> {
  const model = "gemini-3-flash-preview";
  
  let systemInstruction = "You are a master strategist and decision analyst. Your goal is to help users make the best possible decisions by providing deep, objective analysis.";
  
  let responseSchema: any;

  if (type === 'pros-cons') {
    responseSchema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        summary: { type: Type.STRING },
        data: {
          type: Type.OBJECT,
          properties: {
            pros: { type: Type.ARRAY, items: { type: Type.STRING } },
            cons: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["pros", "cons"]
        },
        recommendation: { type: Type.STRING }
      },
      required: ["title", "summary", "data", "recommendation"]
    };
  } else if (type === 'swot') {
    responseSchema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        summary: { type: Type.STRING },
        data: {
          type: Type.OBJECT,
          properties: {
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            opportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
            threats: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["strengths", "weaknesses", "opportunities", "threats"]
        },
        recommendation: { type: Type.STRING }
      },
      required: ["title", "summary", "data", "recommendation"]
    };
  } else { // comparison
    responseSchema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        summary: { type: Type.STRING },
        data: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              option: { type: Type.STRING },
              criteria: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    score: { type: Type.NUMBER, description: "Score from 1 to 10" },
                    comment: { type: Type.STRING }
                  },
                  required: ["name", "score", "comment"]
                }
              }
            },
            required: ["option", "criteria"]
          }
        },
        recommendation: { type: Type.STRING }
      },
      required: ["title", "summary", "data", "recommendation"]
    };
  }

  const prompt = `Analyze the following decision: "${decision}". 
  Format the output as a ${type} analysis. 
  ${type === 'comparison' ? 'Ensure that for each option, you use the exact same set of criteria names so they can be compared in a table.' : ''}
  Be objective, thorough, and provide a clear recommendation at the end.`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema
    }
  });

  return JSON.parse(response.text || "{}");
}
