import { GoogleGenAI, Type } from "@google/genai";
import { ThumbnailReport } from "../types";

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

export async function analyzeAndImproveThumbnail(
  imageB64: string, 
  mimeType: string, 
  videoTitle: string, 
  targetAudience: string, 
  language: "English" | "Vietnamese",
  textColors: string[],
  fontStyle: string,
  fontSize: string,
  textEffect: string
): Promise<ThumbnailReport> {
  const colorsStr = textColors.join(", ");
  const fontDescriptions: Record<string, string> = {
    "Impact": "bold, thick, condensed sans-serif, high-impact block letters",
    "Anton": "bold, condensed, modern sans-serif, very tall and thick",
    "Bebas Neue": "tall, clean, all-caps sans-serif, elegant but strong",
    "Montserrat": "modern, geometric sans-serif, clean and balanced",
    "Bangers": "comic book style, energetic, cartoonish, loud and fun",
    "Marker": "permanent marker style, casual, handwritten, expressive",
    "Roboto": "clean, professional, standard sans-serif"
  };
  const fontDesc = fontDescriptions[fontStyle] || "";
  
  const sizeDescriptions: Record<string, string> = {
    "Small": "subtle, smaller text size",
    "Medium": "standard readable size",
    "Large": "big, prominent, easy to read",
    "XL": "massive, dominant, screen-filling size"
  };
  const sizeDesc = sizeDescriptions[fontSize] || "";

  const effectDescriptions: Record<string, string> = {
    "Outline": "thick black or white stroke around letters for maximum contrast",
    "Glow": "bright neon outer glow effect",
    "Shadow": "deep drop shadow for depth",
    "3D": "3D extruded letters with depth and perspective",
    "Flat": "clean, modern flat design without effects"
  };
  const effectDesc = effectDescriptions[textEffect] || "";

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        inlineData: {
          data: imageB64,
          mimeType: mimeType,
        },
      },
      {
        text: `You are a professional YouTube thumbnail designer and visual strategist.

Your job is to analyze this reference YouTube thumbnail and generate improved thumbnail ideas based on it, specifically for the following video:

Video Details:
- Title: "${videoTitle}"
- Target Audience: "${targetAudience}"
- Output Language for Hook Text: "${language}"
- Preferred Text Colors: "${colorsStr}"
- Preferred Font Style: "${fontStyle}" (${fontDesc})
- Preferred Font Size: "${fontSize}" (${sizeDesc})
- Preferred Text Effect: "${textEffect}" (${effectDesc})

You must carefully analyze the thumbnail image and identify:
- main subject
- facial emotion
- text style
- colors
- composition
- visual hierarchy
- curiosity factor

Steps:
1. Analyze the uploaded thumbnail image in the context of the video title and audience.
2. Identify strengths and weaknesses of the design.
3. Extract the main visual concept.
4. Generate 2 improved thumbnail concepts inspired by the original but optimized for the specific title and audience.
5. Each concept must be different while keeping the same topic.

For each new thumbnail concept generate:
- hook_text (4 to 8 words, MUST BE IN ${language.toUpperCase()})
- emotion
- visual_scene
- color_style
- composition
- image_generation_prompt (viral YouTube thumbnail style, ultra sharp, cinematic lighting, dramatic composition, high contrast, bold text, 16:9 aspect ratio, resolution 1280x720. IMPORTANT: You MUST explicitly include the generated "hook_text" in this prompt to ensure it appears on the image. The text MUST be rendered using the "${fontStyle}" font style (${fontDesc}). Use a coordinated combination of the preferred colors [${colorsStr}] for the text to create visual contrast and emphasis (e.g., highlight the most important word with a different color from the list). Use the preferred font style "${fontStyle}" (${fontDesc}) (this is critical), font size "${fontSize}" (${sizeDesc}), and text effect "${textEffect}" (${effectDesc}) for the text. Any text in the image MUST be exactly the "hook_text" with perfect Vietnamese diacritics and spelling. Pay extreme attention to accents like dấu sắc, huyền, hỏi, ngã, nặng. The text must be clearly legible, correctly spelled in ${language}, and styled with the "${fontStyle}" font (${fontDesc}).)

Thumbnail design rules:
- Hook text should have 4 to 8 words.
- Use a coordinated combination of selected colors [${colorsStr}] for the text to make it pop.
- CRITICAL: The text MUST use the "${fontStyle}" font style (${fontDesc}).
- Use the font style "${fontStyle}" (${fontDesc}), font size "${fontSize}" (${sizeDesc}), and text effect "${textEffect}" (${effectDesc}) to maintain the desired look.
- Use strong emotions.
- Bright and high contrast colors.
- Focus on one main subject.
- Dramatic lighting.
- Mobile-friendly readability.`,
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          thumbnail_analysis: {
            type: Type.OBJECT,
            properties: {
              main_subject: { type: Type.STRING },
              emotion: { type: Type.STRING },
              color_style: { type: Type.STRING },
              composition: { type: Type.STRING },
              text_style: { type: Type.STRING },
              strengths: { type: Type.STRING },
              weaknesses: { type: Type.STRING },
            },
            required: ["main_subject", "emotion", "color_style", "composition", "text_style", "strengths", "weaknesses"],
          },
          new_thumbnails: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                idea_number: { type: Type.INTEGER },
                hook_text: { type: Type.STRING },
                emotion: { type: Type.STRING },
                visual_scene: { type: Type.STRING },
                color_style: { type: Type.STRING },
                composition: { type: Type.STRING },
                thumbnail_prompt: { type: Type.STRING },
              },
              required: ["idea_number", "hook_text", "emotion", "visual_scene", "color_style", "composition", "thumbnail_prompt"],
            },
          },
        },
        required: ["thumbnail_analysis", "new_thumbnails"],
      },
    },
  });

  return JSON.parse(response.text);
}

export async function generateThumbnailImage(prompt: string, referenceImage?: { data: string, mimeType: string }): Promise<string> {
  const parts: any[] = [{ text: prompt }];
  
  if (referenceImage) {
    parts.unshift({
      inlineData: {
        data: referenceImage.data,
        mimeType: referenceImage.mimeType,
      },
    });
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: {
      parts: parts,
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9",
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  
  throw new Error("No image generated");
}

export async function removeTextFromImage(imageB64: string, mimeType: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: {
      parts: [
        {
          inlineData: {
            data: imageB64,
            mimeType: mimeType,
          },
        },
        {
          text: "Please remove all text from this image. Keep the main subject and background intact, but erase any words, letters, or numbers. Fill in the gaps naturally to make it look like there was never any text there. Output only the modified image.",
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9",
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  
  throw new Error("Failed to remove text from image");
}
