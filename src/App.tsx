import React, { useState, ReactNode, useRef, ChangeEvent, useEffect } from "react";
import { analyzeAndImproveThumbnail, generateThumbnailImage, removeTextFromImage } from "./services/gemini";
import { ThumbnailReport, NewThumbnailConcept } from "./types";
import { Sparkles, Image as ImageIcon, Layout, Palette, Smile, Zap, Loader2, Download, RefreshCw, ArrowRight, Upload, AlertCircle, CheckCircle2, Eye, Edit3, X, ExternalLink, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [videoTitle, setVideoTitle] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [language, setLanguage] = useState<"English" | "Vietnamese">("English");
  const [textColors, setTextColors] = useState<string[]>(["Yellow"]);
  const [fontStyle, setFontStyle] = useState("Montserrat");
  const [fontSize, setFontSize] = useState("Large");
  const [textEffect, setTextEffect] = useState("Outline");
  const [keepReference, setKeepReference] = useState(true);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [isRemovingText, setIsRemovingText] = useState(false);
  const [report, setReport] = useState<ThumbnailReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [fontMenuOpen, setFontMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fontMenuRef = useRef<HTMLDivElement>(null);

  const fonts = [
    { name: "Montserrat", family: "'Montserrat', sans-serif" },
    { name: "Anton", family: "'Anton', sans-serif" },
    { name: "Impact", family: "Impact, sans-serif" },
    { name: "Bebas Neue", family: "'Bebas Neue', sans-serif" },
    { name: "Bangers", family: "'Bangers', system-ui" },
    { name: "Marker", family: "'Permanent Marker', cursive" },
    { name: "Roboto", family: "'Roboto', sans-serif" },
  ];

  const loadingMessages = [
    "Đang phân tích hệ thống phân cấp thị giác...",
    "Đang quét các yếu tố kích thích cảm xúc...",
    "Đang trích xuất tâm lý học màu sắc...",
    "Đang xác định các khoảng trống tò mò...",
    "Đang tạo các ý tưởng cải thiện...",
    "Đang dựng bản xem trước thumbnail...",
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fontMenuRef.current && !fontMenuRef.current.contains(event.target as Node)) {
        setFontMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fontDescriptions: Record<string, string> = {
    "Impact": "bold, thick, condensed sans-serif, high-impact block letters",
    "Anton": "bold, condensed, modern sans-serif, very tall and thick",
    "Bebas Neue": "tall, clean, all-caps sans-serif, elegant but strong",
    "Montserrat": "modern, geometric sans-serif, clean and balanced",
    "Bangers": "comic book style, energetic, cartoonish, loud and fun",
    "Marker": "permanent marker style, casual, handwritten, expressive",
    "Roboto": "clean, professional, standard sans-serif"
  };

  const handleReset = () => {
    setVideoTitle("");
    setTargetAudience("");
    setLanguage("English");
    setTextColors(["Yellow"]);
    setFontStyle("Montserrat");
    setFontSize("Large");
    setTextEffect("Outline");
    setKeepReference(true);
    setSelectedImage(null);
    setPreviewUrl(null);
    setLoading(false);
    setLoadingStep(0);
    setReport(null);
    setError(null);
    setEditingIndex(null);
    setEditPrompt("");
    setIsEditing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveText = async () => {
    if (!previewUrl || !selectedImage) return;
    
    setIsRemovingText(true);
    setError(null);
    
    try {
      const b64 = await fileToBase64(selectedImage);
      const cleanedImageUrl = await removeTextFromImage(b64, selectedImage.type);
      
      // Update preview and selected image
      setPreviewUrl(cleanedImageUrl);
      
      // Convert base64 back to File object to keep consistency
      const response = await fetch(cleanedImageUrl);
      const blob = await response.blob();
      const file = new File([blob], "cleaned_thumbnail.png", { type: "image/png" });
      setSelectedImage(file);
      
    } catch (err: any) {
      console.error(err);
      setError("Không thể xoá chữ. Vui lòng thử lại.");
    } finally {
      setIsRemovingText(false);
    }
  };

  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setReport(null);
      setError(null);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(",")[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleAnalyze = async () => {
    if (!selectedImage) return;

    setLoading(true);
    setError(null);
    setLoadingStep(0);

    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => (prev < loadingMessages.length - 1 ? prev + 1 : prev));
    }, 3000);

    try {
      const b64 = await fileToBase64(selectedImage);
      const result = await analyzeAndImproveThumbnail(b64, selectedImage.type, videoTitle, targetAudience, language, textColors, fontStyle, fontSize, textEffect);
      
      // Generate images for each concept
      const updatedThumbnails = await Promise.all(
        result.new_thumbnails.map(async (concept) => {
          try {
            const fontDesc = fontDescriptions[fontStyle] || "";
            const sizeDescriptions: Record<string, string> = {
              "Small": "subtle, smaller text size",
              "Medium": "standard readable size",
              "Large": "big, prominent, easy to read",
              "XL": "massive, dominant, screen-filling size"
            };
            const effectDescriptions: Record<string, string> = {
              "Outline": "thick black or white stroke around letters for maximum contrast",
              "Glow": "bright neon outer glow effect",
              "Shadow": "deep drop shadow for depth",
              "3D": "3D extruded letters with depth and perspective",
              "Flat": "clean, modern flat design without effects"
            };
            const sizeDesc = sizeDescriptions[fontSize] || "";
            const effectDesc = effectDescriptions[textEffect] || "";

            // Reinforce the hook text and font style in the prompt to ensure consistency
            const finalPrompt = `${concept.thumbnail_prompt}. IMPORTANT: The text displayed on the image MUST be exactly: "${concept.hook_text}". The text MUST use the "${fontStyle}" font style (${fontDesc}), size "${fontSize}" (${sizeDesc}), and effect "${textEffect}" (${effectDesc}). Pay extreme attention to Vietnamese diacritics (accents). Ensure the spelling is 100% correct and every accent is in the right place.`;
            
            const imageUrl = await generateThumbnailImage(
              finalPrompt, 
              keepReference ? { data: b64, mimeType: selectedImage.type } : undefined
            );
            return { ...concept, generated_image_url: imageUrl };
          } catch (err) {
            console.error("Failed to generate image for concept", concept.idea_number, err);
            return concept;
          }
        })
      );

      setReport({
        ...result,
        new_thumbnails: updatedThumbnails,
      });
    } catch (err: any) {
      console.error(err);
      setError("Phân tích thất bại. Vui lòng thử ảnh khác hoặc kiểm tra kết nối của bạn.");
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
    }
  };

  const downloadImage = (url: string, name: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `${name}-${Date.now()}.png`;
    link.click();
  };

  const handleEditImage = async (index: number) => {
    if (!editPrompt.trim() || !report) return;
    
    setIsEditing(true);
    try {
      const currentThumbnail = report.new_thumbnails[index];
      if (!currentThumbnail.generated_image_url) return;

      // Extract base64 from data URL
      const base64Data = currentThumbnail.generated_image_url.split(',')[1];
      
      const fontDesc = fontDescriptions[fontStyle] || "";
      const sizeDescriptions: Record<string, string> = {
        "Small": "subtle, smaller text size",
        "Medium": "standard readable size",
        "Large": "big, prominent, easy to read",
        "XL": "massive, dominant, screen-filling size"
      };
      const effectDescriptions: Record<string, string> = {
        "Outline": "thick black or white stroke around letters for maximum contrast",
        "Glow": "bright neon outer glow effect",
        "Shadow": "deep drop shadow for depth",
        "3D": "3D extruded letters with depth and perspective",
        "Flat": "clean, modern flat design without effects"
      };
      const sizeDesc = sizeDescriptions[fontSize] || "";
      const effectDesc = effectDescriptions[textEffect] || "";

      const newImageUrl = await generateThumbnailImage(
        `Edit this thumbnail: ${editPrompt}. Keep the same style and text: "${currentThumbnail.hook_text}". The text MUST use the "${fontStyle}" font style (${fontDesc}), size "${fontSize}" (${sizeDesc}), and effect "${textEffect}" (${effectDesc}).`,
        { data: base64Data, mimeType: "image/png" }
      );

      const updatedThumbnails = [...report.new_thumbnails];
      updatedThumbnails[index] = {
        ...currentThumbnail,
        generated_image_url: newImageUrl
      };
      
      setReport({
        ...report,
        new_thumbnails: updatedThumbnails
      });
      setEditingIndex(null);
      setEditPrompt("");
    } catch (err) {
      console.error("Error editing image:", err);
      setError("Failed to edit image. Please try again.");
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-orange-500/30">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="mb-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-orange-400 mb-4"
          >
            <Sparkles className="w-3 h-3" />
            <span>Phát triển bởi G.Studio</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tighter mb-4 bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent"
          >
            G-VIRAL THUMBNAIL
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-white/50 text-lg max-w-2xl mx-auto"
          >
            Phân tích bất kỳ thumbnail nào và tạo ra 2 ý tưởng CTR cao lấy cảm hứng từ những video hàng đầu.
          </motion.p>
        </header>

        {/* Upload Section */}
        <section className="max-w-3xl mx-auto mb-16">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-blue-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500" />
            <div className="relative bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest ml-2">Tiêu đề Video</label>
                  <input
                    type="text"
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    placeholder="VD: Tôi đã xây một căn phòng bí mật"
                    className="bg-white/5 border border-white/5 rounded-xl px-4 py-3 outline-none text-sm placeholder:text-white/20 focus:border-orange-500/50 transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest ml-2">Đối tượng khán giả</label>
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="VD: Gen Z, Người thích tự làm đồ (DIY)"
                    className="bg-white/5 border border-white/5 rounded-xl px-4 py-3 outline-none text-sm placeholder:text-white/20 focus:border-orange-500/50 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest ml-2">Ngôn ngữ thiết kế</label>
                  <div className="flex gap-2 bg-white/5 p-1 rounded-xl border border-white/5">
                    <button
                      onClick={() => setLanguage("Vietnamese")}
                      className={cn(
                        "flex-1 py-2 text-xs font-medium rounded-lg transition-all",
                        language === "Vietnamese" ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "text-white/40 hover:text-white/60"
                      )}
                    >
                      Tiếng Việt
                    </button>
                    <button
                      onClick={() => setLanguage("English")}
                      className={cn(
                        "flex-1 py-2 text-xs font-medium rounded-lg transition-all",
                        language === "English" ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "text-white/40 hover:text-white/60"
                      )}
                    >
                      English
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest ml-2">Màu sắc tiêu đề</label>
                  <div className="flex gap-2 bg-white/5 p-1 rounded-xl border border-white/5 overflow-x-auto no-scrollbar">
                    {[
                      { name: "Yellow", color: "bg-yellow-400" },
                      { name: "White", color: "bg-white" },
                      { name: "Red", color: "bg-red-500" },
                      { name: "Green", color: "bg-green-500" },
                      { name: "Cyan", color: "bg-cyan-400" }
                    ].map((c) => (
                      <button
                        key={c.name}
                        onClick={() => {
                          setTextColors(prev => {
                            if (prev.includes(c.name)) {
                              if (prev.length === 1) return prev; // Keep at least one
                              return prev.filter(t => t !== c.name);
                            }
                            return [...prev, c.name];
                          });
                        }}
                        className={cn(
                          "w-8 h-8 rounded-lg transition-all flex-shrink-0 border-2",
                          textColors.includes(c.name) ? "border-orange-500 scale-110" : "border-transparent opacity-50 hover:opacity-100"
                        )}
                        title={c.name}
                      >
                        <div className={cn("w-full h-full rounded-md", c.color)} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest ml-2">Font chữ (Viral YouTube)</label>
                  <div className="relative" ref={fontMenuRef}>
                    <button
                      type="button"
                      onClick={() => setFontMenuOpen(!fontMenuOpen)}
                      className="w-full flex items-center justify-between bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 outline-none text-xs font-bold hover:border-white/10 transition-colors"
                      style={{ fontFamily: fonts.find(f => f.name === fontStyle)?.family }}
                    >
                      <span>{fontStyle}</span>
                      <ChevronDown className={cn("w-3.5 h-3.5 text-white/20 transition-transform", fontMenuOpen && "rotate-180")} />
                    </button>

                    <AnimatePresence>
                      {fontMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute z-50 bottom-full mb-2 left-0 right-0 bg-[#121212] border border-white/10 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl"
                        >
                          <div className="max-h-[240px] overflow-y-auto p-1 custom-scrollbar">
                            {fonts.map((f) => (
                              <button
                                key={f.name}
                                type="button"
                                onClick={() => {
                                  setFontStyle(f.name);
                                  setFontMenuOpen(false);
                                }}
                                className={cn(
                                  "w-full flex items-center px-4 py-3 text-sm transition-colors rounded-lg mb-0.5 last:mb-0",
                                  fontStyle === f.name ? "bg-orange-500 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                                )}
                                style={{ fontFamily: f.family }}
                              >
                                {f.name}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest ml-2">Kích thước chữ</label>
                  <div className="flex gap-2 bg-white/5 p-1 rounded-xl border border-white/5">
                    {["Small", "Medium", "Large", "XL"].map((s) => (
                      <button
                        key={s}
                        onClick={() => setFontSize(s)}
                        className={cn(
                          "flex-1 py-2 text-[10px] font-bold rounded-lg transition-all",
                          fontSize === s ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "text-white/40 hover:text-white/60"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest ml-2">Hiệu ứng chữ</label>
                <div className="flex gap-2 bg-white/5 p-1 rounded-xl border border-white/5 overflow-x-auto no-scrollbar">
                  {["Outline", "Glow", "Shadow", "3D", "Flat"].map((e) => (
                    <button
                      key={e}
                      onClick={() => setTextEffect(e)}
                      className={cn(
                        "flex-1 py-2 px-3 text-[10px] font-bold rounded-lg transition-all whitespace-nowrap",
                        textEffect === e ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "text-white/40 hover:text-white/60"
                      )}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest ml-2">Tùy chọn nâng cao</label>
                <div className="flex items-center justify-between px-4 py-2 bg-white/5 rounded-xl border border-white/5 h-[42px]">
                  <div className="flex items-center gap-2">
                    <ImageIcon className={cn("w-3.5 h-3.5", keepReference ? "text-orange-400" : "text-white/20")} />
                    <span className="text-xs font-medium">Giữ tham chiếu gốc</span>
                  </div>
                  <button
                    onClick={() => setKeepReference(!keepReference)}
                    className={cn(
                      "relative w-10 h-5 rounded-full transition-colors duration-300 outline-none",
                      keepReference ? "bg-orange-500" : "bg-white/10"
                    )}
                  >
                    <div className={cn(
                      "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-300",
                      keepReference ? "left-5.5" : "left-0.5"
                    )} />
                  </button>
                </div>
              </div>

              <div 
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-xl p-16 flex flex-col items-center justify-center cursor-pointer transition-all duration-300",
                  previewUrl ? "border-orange-500/50 bg-orange-500/5" : "border-white/10 hover:border-white/20 hover:bg-white/5"
                )}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  accept="image/*"
                  className="hidden"
                />
                
                {previewUrl ? (
                  <div className="flex flex-col gap-4 w-full max-w-md">
                    <div className="relative aspect-video rounded-lg overflow-hidden shadow-2xl group">
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white font-bold flex items-center gap-2">
                          <RefreshCw className="w-5 h-5" />
                          Thay đổi ảnh
                        </p>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveText();
                      }}
                      disabled={isRemovingText || loading}
                      className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-3 text-xs font-bold transition-all disabled:opacity-50"
                    >
                      {isRemovingText ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Đang xoá chữ...
                        </>
                      ) : (
                        <>
                          <Edit3 className="w-4 h-4 text-orange-400" />
                          Xoá chữ trong ảnh tham khảo
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="p-4 rounded-full bg-white/5 mb-4">
                      <Upload className="w-8 h-8 text-white/40" />
                    </div>
                    <p className="text-lg font-medium mb-1">Tải lên Thumbnail tham khảo</p>
                    <p className="text-white/40 text-sm">Kéo thả hoặc nhấp để chọn ảnh</p>
                  </>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleReset}
                  disabled={loading || isRemovingText}
                  className="flex-shrink-0 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 px-6 py-4 rounded-xl transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
                  title="Đặt lại tất cả"
                >
                  <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
                </button>
                <button
                  onClick={handleAnalyze}
                  disabled={loading || !selectedImage || isRemovingText}
                  className="flex-1 bg-white text-black font-bold px-8 py-4 rounded-xl hover:bg-orange-500 hover:text-white transition-all duration-300 disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-black flex items-center justify-center gap-2 group/btn"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      PHÂN TÍCH & CẢI THIỆN
                      <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm mt-4 justify-center bg-red-400/10 p-3 rounded-lg border border-red-400/20">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </section>

        {/* Results Section */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div className="relative w-24 h-24 mb-8">
                <div className="absolute inset-0 border-4 border-orange-500/20 rounded-full" />
                <div className="absolute inset-0 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-xl font-medium text-white/80 animate-pulse">
                {loadingMessages[loadingStep]}
              </p>
            </motion.div>
          ) : report && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-12"
            >
              {/* Analysis Report */}
              <section className="bg-white/5 border border-white/10 rounded-3xl p-10 md:p-16">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                  <div>
                    <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
                      <Eye className="w-8 h-8 text-blue-500" />
                      Kiểm định Thị giác
                    </h2>
                    <p className="text-white/40">Phân tích chi tiết hiệu suất của thumbnail tham khảo.</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Phân tích Hoàn tất
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 mb-12">
                  <AnalysisItem label="Chủ thể chính" value={report.thumbnail_analysis.main_subject} icon={<ImageIcon className="w-4 h-4" />} />
                  <AnalysisItem label="Cảm xúc" value={report.thumbnail_analysis.emotion} icon={<Smile className="w-4 h-4" />} />
                  <AnalysisItem label="Phong cách màu sắc" value={report.thumbnail_analysis.color_style} icon={<Palette className="w-4 h-4" />} />
                  <AnalysisItem label="Bố cục" value={report.thumbnail_analysis.composition} icon={<Layout className="w-4 h-4" />} />
                  <AnalysisItem label="Kiểu chữ" value={report.thumbnail_analysis.text_style} icon={<Zap className="w-4 h-4" />} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-white/5">
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-green-400 uppercase tracking-widest flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Điểm mạnh
                    </h4>
                    <p className="text-white/70 leading-relaxed text-xl">{report.thumbnail_analysis.strengths}</p>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-red-400 uppercase tracking-widest flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Điểm yếu
                    </h4>
                    <p className="text-white/70 leading-relaxed text-xl">{report.thumbnail_analysis.weaknesses}</p>
                  </div>
                </div>
              </section>

              {/* Improved Concepts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {report.new_thumbnails.map((concept, index) => (
                  <ConceptCard 
                    key={concept.idea_number} 
                    concept={concept} 
                    onDownload={() => concept.generated_image_url && downloadImage(concept.generated_image_url, `concept-${concept.idea_number}`)}
                    onEdit={() => setEditingIndex(index)}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!loading && !report && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12"
          >
            <FeatureCard
              icon={<Zap className="w-6 h-6 text-orange-500" />}
              title="Kiểm định Thị giác"
              description="Xác định chính xác lý do tại sao một thumbnail hiệu quả (hoặc không) bằng thị giác."
            />
            <FeatureCard
              icon={<Layout className="w-6 h-6 text-blue-500" />}
              title="Phát triển Ý tưởng"
              description="Nhận 2 hướng đi cải thiện rõ rệt dựa trên các mẫu viral đã được chứng minh."
            />
            <FeatureCard
              icon={<Sparkles className="w-6 h-6 text-purple-500" />}
              title="Xem trước thumbnail"
              description="Thấy các ý tưởng mới của bạn trở thành hiện thực với công nghệ tạo ảnh chất lượng cao."
            />
          </motion.div>
        )}
        {/* Edit Modal */}
        {editingIndex !== null && report && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-lg bg-[#1A1A1A] rounded-3xl border border-white/10 overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-orange-500" />
                  Biên tập lại Thumbnail
                </h3>
                <button 
                  onClick={() => setEditingIndex(null)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="aspect-video rounded-xl overflow-hidden border border-white/10">
                  <img 
                    src={report.new_thumbnails[editingIndex].generated_image_url} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest ml-1">Yêu cầu thay đổi</label>
                  <textarea
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    placeholder="Ví dụ: Làm nền tối hơn, đổi biểu cảm khuôn mặt ngạc nhiên hơn, thêm hiệu ứng lửa..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all resize-none h-24"
                  />
                </div>
              </div>
              
              <div className="p-6 bg-white/5 flex gap-3">
                <button
                  onClick={() => setEditingIndex(null)}
                  className="flex-1 py-3 text-sm font-bold text-white/60 hover:text-white transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={() => handleEditImage(editingIndex)}
                  disabled={isEditing || !editPrompt.trim()}
                  className="flex-[2] py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
                >
                  {isEditing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Cập nhật Thumbnail
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </main>

      <footer className="relative z-10 py-12 text-center text-white/20 text-sm border-t border-white/5 mt-20">
        <p>© 2026 G-VIRAL THUMBNAIL • Phát triển bởi G.Studio</p>
      </footer>
    </div>
  );
}

function AnalysisItem({ label, value, icon }: { label: string, value: string, icon: ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-widest flex items-center gap-2">
        {icon}
        {label}
      </h4>
      <p className="text-xl font-medium text-white/90">{value}</p>
    </div>
  );
}

interface ConceptCardProps {
  concept: NewThumbnailConcept;
  onDownload: () => void;
  onEdit: () => void;
}

const ConceptCard: React.FC<ConceptCardProps> = ({ concept, onDownload, onEdit }) => {
  return (
    <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl overflow-hidden flex flex-col group">
      <div className="relative aspect-video bg-white/5 overflow-hidden">
        {concept.generated_image_url ? (
          <>
            <img 
              src={concept.generated_image_url} 
              alt={`Concept ${concept.idea_number}`} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
              <button
                onClick={onDownload}
                className="p-3 bg-white text-black rounded-full hover:scale-110 transition-transform flex items-center gap-2 font-bold text-sm"
                title="Tải xuống"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={onEdit}
                className="p-3 bg-orange-500 text-white rounded-full hover:scale-110 transition-transform flex items-center gap-2 font-bold text-sm"
                title="Biên tập lại"
              >
                <Edit3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => window.open(concept.generated_image_url, '_blank')}
                className="p-3 bg-white/10 text-white rounded-full hover:scale-110 transition-transform flex items-center gap-2 font-bold text-sm backdrop-blur-md"
                title="Xem ảnh lớn"
              >
                <ExternalLink className="w-5 h-5" />
              </button>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-white/20">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <p className="text-sm">Đang tạo hình ảnh...</p>
          </div>
        )}
        <div className="absolute top-4 left-4 px-3 py-1 bg-orange-500 text-white text-[10px] font-black uppercase tracking-tighter rounded-md">
          Ý tưởng {concept.idea_number}
        </div>
      </div>

      <div className="p-10 flex-1 space-y-8">
        <div>
          <h3 className="text-4xl font-black text-orange-500 tracking-tighter mb-3 uppercase italic">
            "{concept.hook_text}"
          </h3>
          <p className="text-white/40 text-sm leading-relaxed">{concept.visual_scene}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Cảm xúc</p>
            <p className="text-sm font-medium">{concept.emotion}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Màu sắc</p>
            <p className="text-sm font-medium">{concept.color_style}</p>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5">
          <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-3">Câu lệnh AI</p>
          <p className="text-xs text-white/30 italic leading-relaxed line-clamp-2 group-hover:line-clamp-none transition-all">
            {concept.thumbnail_prompt}
          </p>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: ReactNode, title: string, description: string }) {
  return (
    <div className="p-10 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/[0.07] transition-colors group">
      <div className="mb-4 p-3 rounded-2xl bg-white/5 w-fit group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-white/40 leading-relaxed">{description}</p>
    </div>
  );
}
