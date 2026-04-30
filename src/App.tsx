import React, { useState, useRef } from 'react';
import { Camera, ImagePlus, Loader2, Download, RefreshCw, Sparkles, ChevronRight } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { motion, AnimatePresence } from 'motion/react';

const STYLES = [
  { id: 'corporate', label: 'Corporate Grey', image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80', prompt: 'corporate headshot, formal business attire, neutral grey seamless studio background, soft flattering studio lighting, photorealistic, highly detailed, professional' },
  { id: 'tech', label: 'Modern Tech Office', image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&q=80', prompt: 'smart casual attire, modern tech office background with a blurred depth of field, bright natural lighting, approachable and professional, realistic' },
  { id: 'outdoor', label: 'Outdoor Natural Light', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80', prompt: 'business casual attire, outdoor modern urban setting background with natural bokeh, golden hour natural lighting, professional portrait, realistic' },
  { id: 'creative', label: 'Creative Studio', image: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&q=80', prompt: 'trendy and stylish smart casual attire, creative design studio background, warm and inviting atmosphere with subtle accent lighting, highly detailed' },
];

export default function App() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string>(STYLES[0].id);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalImage(reader.result as string);
        setGeneratedImage(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalImage(reader.result as string);
        setGeneratedImage(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateHeadshot = async () => {
    if (!originalImage) return;

    setIsGenerating(true);
    setError(null);

    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is missing. Please configure it in the AI Studio Settings.');
      }

      const style = STYLES.find(s => s.id === selectedStyle);
      if (!style) throw new Error('Invalid style selected');

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // Extract base64 and mime type from data URL
      const matches = originalImage.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        throw new Error('Invalid image format');
      }
      const mimeType = matches[1];
      const base64Data = matches[2];

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            {
              text: `Transform this casual selfie into a highly professional headshot. Maintain the person's identity and facial features exactly, but upgrade their attire and background to the following style: ${style.prompt}. Ensure high quality, realistic lighting, completely photorealistic. Do not add watermarks or text.`,
            },
          ],
        },
      });

      let foundImage = false;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          setGeneratedImage(`data:image/png;base64,${part.inlineData.data}`);
          foundImage = true;
          break;
        }
      }

      if (!foundImage) {
        // Sometimes the model might refuse to process faces or return an error.
        const textPart = response.candidates?.[0]?.content?.parts?.find(p => p.text);
        if (textPart) {
           throw new Error(textPart.text || 'Failed to generate image. The model might have refused the prompt due to safety guidelines on faces.');
        }
        throw new Error('No image was generated. Please try again with a different photo.');
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during generation.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-neutral-950 text-neutral-100 font-sans">
      <header className="h-20 border-b border-neutral-800 flex items-center flex-shrink-0 z-10 sticky top-0 bg-neutral-950/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 w-full flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
              <Camera className="w-4 h-4 text-neutral-950" />
            </div>
            <span className="text-xl font-serif tracking-tight font-semibold italic text-neutral-100">AI Headshot Pro</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-12">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-serif italic mb-4 leading-tight">
            The Preview
          </h1>
          <p className="text-neutral-500 text-sm italic">
            Refining your professional presence with AI precision. Upload a selfie and choose an aesthetic.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left Column: Upload & Style */}
          <div className="space-y-10">
            <section>
              <h2 className="text-xs uppercase tracking-widest text-neutral-500 font-bold mb-4">Step 1: Your Photo</h2>
              
              {!originalImage ? (
                <div 
                  className="border-2 border-dashed border-neutral-700 rounded-xl p-10 flex flex-col items-center justify-center text-center bg-neutral-900 transition hover:border-amber-500/50 cursor-pointer group h-[300px]"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                    <ImagePlus className="w-8 h-8 text-neutral-400" />
                  </div>
                  <h3 className="text-sm text-neutral-300 font-medium mb-1">Click or drag to upload</h3>
                  <p className="text-[10px] text-neutral-500 mt-1 uppercase">JPG, PNG up to 10MB. Use a well-lit front-facing selfie.</p>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                  />
                </div>
              ) : (
                <div className="relative group rounded-xl overflow-hidden border border-neutral-800 h-[300px] bg-neutral-900">
                  <img src={originalImage} alt="Original selfie" className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                    <button 
                      onClick={() => { setOriginalImage(null); setGeneratedImage(null); }}
                      className="px-6 py-2 bg-neutral-100 text-neutral-950 rounded-full text-xs font-bold hover:bg-neutral-200 transition-colors flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" /> Change Photo
                    </button>
                  </div>
                </div>
              )}
            </section>

            <AnimatePresence>
              {originalImage && (
                <motion.section
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <h2 className="text-xs uppercase tracking-widest text-neutral-500 font-bold mb-4">Step 2: Choose Style</h2>
                  <div className="flex flex-col gap-3">
                    {STYLES.map(style => (
                      <button
                        key={style.id}
                        onClick={() => setSelectedStyle(style.id)}
                        className={`text-left rounded-lg p-3 border transition-all flex items-center gap-4 ${
                          selectedStyle === style.id 
                            ? 'border-amber-500/50 bg-amber-500/5' 
                            : 'border-neutral-800 hover:border-neutral-600 bg-neutral-900'
                        }`}
                      >
                        <div className="w-12 h-12 bg-neutral-800 rounded-md overflow-hidden flex-shrink-0">
                           <img src={style.image} alt={style.label} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-neutral-100">{style.label}</p>
                          <p className="text-[10px] text-neutral-400 mt-0.5">Professional aesthetic</p>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="mt-8">
                     <button
                        onClick={generateHeadshot}
                        disabled={isGenerating}
                        className="w-full py-4 bg-amber-500 text-neutral-950 font-bold rounded-xl text-sm uppercase tracking-wider shadow-lg shadow-amber-500/10 hover:bg-amber-400 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" /> Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5" /> Generate Headshot
                          </>
                        )}
                      </button>
                      {error && (
                        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100">
                          {error}
                        </div>
                      )}
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column: Result */}
          <div className="lg:sticky top-24">
             <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 min-h-[500px] flex flex-col relative overflow-hidden shadow-2xl">
                <h2 className="text-xs uppercase tracking-widest text-neutral-500 font-bold mb-6 flex items-center justify-between">
                  <span>Result</span>
                  {generatedImage && (
                    <span className="text-[10px] font-bold uppercase tracking-tighter bg-amber-500/20 text-amber-500 border border-amber-500/30 px-2 py-1 rounded flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Ready
                    </span>
                  )}
                </h2>

                <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
                  {isGenerating ? (
                    <div className="absolute inset-0 bg-neutral-900/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center border-2 border-amber-500/20 rounded-2xl overflow-hidden">
                      <div className="w-16 h-16 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-4"></div>
                      <p className="text-amber-500 font-bold uppercase text-xs tracking-widest">Generating 4K Render...</p>
                    </div>
                  ) : generatedImage ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="w-full"
                    >
                       <div className="relative group">
                         <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-neutral-800 shadow-xl max-w-sm mx-auto relative">
                            <img src={generatedImage} alt="Generated Headshot" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="absolute bottom-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] uppercase font-bold tracking-tighter text-neutral-100 border border-neutral-700/50">8k Render</span>
                            </div>
                         </div>
                       </div>
                       <div className="mt-8 flex justify-center">
                          <a 
                            href={generatedImage} 
                            download={`headshot-${selectedStyle}.png`}
                            className="px-6 py-2 border border-neutral-700 bg-neutral-900 text-neutral-100 rounded-full text-xs font-semibold hover:bg-neutral-800 transition-colors flex items-center gap-2"
                          >
                            <Download className="w-4 h-4" /> Download All (JPG)
                          </a>
                       </div>
                    </motion.div>
                  ) : (
                    <div className="text-center px-6 relative z-0">
                      <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-neutral-700">
                         <Sparkles className="w-6 h-6 text-neutral-500" />
                      </div>
                      <p className="text-neutral-500 text-sm italic font-serif">Your generated professional headshot will appear here.</p>
                    </div>
                  )}
                </div>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}

