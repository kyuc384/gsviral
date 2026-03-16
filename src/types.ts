export interface ThumbnailAnalysis {
  main_subject: string;
  emotion: string;
  color_style: string;
  composition: string;
  text_style: string;
  strengths: string;
  weaknesses: string;
}

export interface NewThumbnailConcept {
  idea_number: number;
  hook_text: string;
  emotion: string;
  visual_scene: string;
  color_style: string;
  composition: string;
  thumbnail_prompt: string;
  generated_image_url?: string;
}

export interface ThumbnailReport {
  thumbnail_analysis: ThumbnailAnalysis;
  new_thumbnails: NewThumbnailConcept[];
}
