"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";

import NameGeneratorForm from "@/components/product/generator/name-generator-form";
import ChineseNamePricing from "@/components/product/pricing/chinese-name-pricing";
import PopularNames from "@/components/product/popular/popular-names";
import { saveFormData, loadFormData } from "@/utils/form-storage";
// 新增：Image Editor 依赖
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Image from "next/image";
import { Loader2, Image as ImageIcon } from "lucide-react";

interface NameData {
  chinese: string;
  pinyin: string;
  characters: Array<{
    character: string;
    pinyin: string;
    meaning: string;
    explanation: string;
  }>;
  meaning: string;
  culturalNotes: string;
  personalityMatch: string;
  style: string;
}

interface FormData {
  englishName: string;
  gender: 'male' | 'female' | 'other';
  birthYear?: string;
  personalityTraits?: string;
  namePreferences?: string;
  planType: '1' | '4';
}

export default function Home() {
  const router = useRouter();
  const { user, loading } = useUser();
  const { toast } = useToast();
  
  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasTriedFree, setHasTriedFree] = useState(false);

  // Check localStorage for previous free trial usage
  useEffect(() => {
    if (!loading) {
      if (!user) {
        const hasUsedFree = localStorage.getItem('hasTriedFreeGeneration') === 'true';
        setHasTriedFree(hasUsedFree);
      } else {
        // Clear localStorage flag for authenticated users
        localStorage.removeItem('hasTriedFreeGeneration');
        setHasTriedFree(false);
      }
    }
  }, [user, loading]);

  // Load saved form data
  const [savedFormData, setSavedFormData] = useState<any>(null);
  useEffect(() => {
    const loadedData = loadFormData();
    if (loadedData) {
      setSavedFormData(loadedData);
    }
  }, []);


  const handleGenerate = async (formData: FormData) => {
    // Check if it's a free trial attempt
    if (!user && hasTriedFree) {
      toast({
        title: "Free trial used",
        description: "You've already used your free generation. Please sign in for unlimited access!",
      });
      router.push('/sign-in');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch('/api/chinese-names/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle rate limiting specifically
        if (response.status === 429 && (data as any).rateLimited) {
          toast({
            title: "Daily limit reached",
            description: (data as any).error || "You can generate 3 free names per day. Please sign in for unlimited access!",
          });
          // Show sign-in option
          setTimeout(() => {
            router.push('/sign-in');
          }, 3000);
          return;
        }
        throw new Error((data as any).error || 'Failed to generate names');
      }

      // Calculate total rounds based on generation round
      const estimatedTotalRounds = (data as any).isContinuation 
        ? Math.ceil((data as any).batch.totalNamesGenerated / 6)
        : (data as any).generationRound;

      // Save results to sessionStorage and redirect to results page
      const sessionData = {
        names: (data as any).names,
        formData: formData,
        batch: (data as any).batch,
        generationRound: (data as any).generationRound,
        totalGenerationRounds: estimatedTotalRounds,
        isHistoryMode: false,
      };
      
      sessionStorage.setItem('nameGenerationResults', JSON.stringify(sessionData));
      
      // Mark free trial as used for non-authenticated users
      if (!user) {
        setHasTriedFree(true);
        localStorage.setItem('hasTriedFreeGeneration', 'true');
      }

      // Save form data to localStorage for future use
      saveFormData({
        englishName: formData.englishName,
        gender: formData.gender,
        birthYear: formData.birthYear,
        personalityTraits: formData.personalityTraits,
        namePreferences: formData.namePreferences
      });

      toast({
        title: (data as any).message || "Names generated successfully!",
        description: `Generated ${(data as any).names.length} unique Chinese names${(data as any).creditsUsed ? ` using ${(data as any).creditsUsed} credits` : ' for free'}`,
      });
      
      // Navigate to results page
      router.push('/results');
    } catch (error) {
      console.error('Generation error:', error);
      const errorMessage = error instanceof Error ? error.message : "Something went wrong. Please try again.";
      console.error('Detailed error:', errorMessage);
      toast({
        title: "Generation failed",
        description: errorMessage,
      });
    } finally {
      setIsGenerating(false);
    }
  };



  const scrollToForm = () => {
    const formSection = document.querySelector('[data-name-generator-form]');
    if (formSection) {
      (formSection as HTMLElement).scrollIntoView({ behavior: 'smooth' });
    }
  };

  // ===== Image Editor 状态与逻辑（移入组件内部） =====
  const [imagePrompt, setImagePrompt] = useState("");
  const [isImageGenerating, setIsImageGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [img2imgPrompt, setImg2imgPrompt] = useState("");
  const [img2imgUrl, setImg2imgUrl] = useState<string | null>(null);
  const [isImg2ImgGenerating, setIsImg2ImgGenerating] = useState(false);
  const [imgFilePreview, setImgFilePreview] = useState<string | null>(null);
  const [imgWebHook, setImgWebHook] = useState<string>("");
  const [imgShutProgress, setImgShutProgress] = useState<boolean>(false);

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) {
      toast({
        title: "Prompt cannot be empty",
        description: "Please enter a description to generate the image",
        variant: "destructive",
      });
      return;
    }
  
    setIsImageGenerating(true);
    try {
      const response = await fetch("/api/image-generator/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: imagePrompt }),
      });
      const data = await response.json();
      if (response.ok && (data as any).success && (data as any).image) {
        setGeneratedImageUrl((data as any).image);
      } else {
        throw new Error((data as any).error || "Failed to generate image");
      }
    } catch (error) {
      console.error("Error generating image:", error);
      toast({
        title: "Generation failed",
        description: "An error occurred during image generation, please try again later",
        variant: "destructive",
      });
    } finally {
      setIsImageGenerating(false);
    }
  };
  
  const handleDownload = () => {
    if (!generatedImageUrl) return;
    const link = document.createElement("a");
    link.href = generatedImageUrl;
    link.download = `generated-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 bg-gradient-to-b from-muted/20 to-background">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="container px-4 md:px-6 relative">
          <div className="flex flex-col items-center space-y-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <div className="inline-flex items-center rounded-full px-3 py-1 text-sm bg-primary/10 text-primary mb-4">
                <span className="mr-2">🇨🇳</span>
                AI-Powered Chinese Name Generation
              </div>
              
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
                Discover Your Perfect
                <br />
                <span className="text-primary">Chinese Name</span>
              </h1>
              
              <p className="mt-6 text-xl text-muted-foreground md:text-2xl max-w-3xl mx-auto">
                Create your authentic Chinese identity with our advanced AI that understands cultural significance, personal meaning, and traditional naming conventions.
              </p>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-8 flex flex-col sm:flex-row gap-4 justify-center"
              >
                <button
                  onClick={scrollToForm}
                  className="inline-flex items-center justify-center h-14 px-8 text-lg font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors shadow-lg"
                >
                  {loading ? 'Loading...' : !user ? (hasTriedFree ? '🔒 Sign In for More' : '🎁 Generate Free Name') : '🎯 Generate Name'}
                </button>
                <button
                  onClick={() => {
                    router.push('/product/random-generator');
                  }}
                  className="inline-flex items-center justify-center h-14 px-8 text-lg font-medium border border-border text-foreground hover:bg-muted rounded-md transition-colors"
                >
                  Random Name Generator
                </button>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex items-center justify-center gap-8 pt-8 text-sm text-muted-foreground"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  {loading ? 'Loading...' : !user ? '3 free names daily' : 'Unlimited generation'}
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  Instant generation
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  Cultural accuracy
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 bg-background">
        <div className="container px-4 md:px-6">
          <div className="mx-auto max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="space-y-12"
            >
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-bold tracking-tight text-foreground">
                  Create Your Chinese Name
                </h2>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                  Tell us about yourself and let our AI create a meaningful Chinese name that reflects your personality and cultural significance.
                </p>
              </div>

              <div id="name-generator-form" data-name-generator-form>
                {/* 替换为 Image Editor 内容 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* 左侧：编辑器输入区域 */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Card className="overflow-hidden">
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          <div className="mb-4">
                            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                              <ImageIcon className="h-5 w-5 text-primary" />
                              Image Generation
                            </h2>
                            <p className="text-sm text-muted-foreground mb-4">
                              Switch between Text-to-Image and Image-to-Image
                            </p>
                          </div>

                          <Tabs defaultValue="t2i">
                            <TabsList>
                              <TabsTrigger value="t2i">Text-to-Image</TabsTrigger>
                              <TabsTrigger value="i2i">Image-to-Image</TabsTrigger>
                            </TabsList>

                            <TabsContent value="t2i" className="space-y-4">
                              <Textarea
                                placeholder="e.g. A cute cat sitting on a windowsill with sunlight, blue sky and white clouds in the background"
                                className="min-h-[150px] resize-none"
                                value={imagePrompt}
                                onChange={(e) => setImagePrompt(e.target.value)}
                              />

                              <Button
                                onClick={handleGenerateImage}
                                disabled={isImageGenerating || !imagePrompt.trim()}
                                className="w-full"
                              >
                                {isImageGenerating ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generating...
                                  </>
                                ) : (
                                  "Generate Image"
                                )}
                              </Button>
                            </TabsContent>

                            <TabsContent value="i2i" className="space-y-4">
                              <Textarea
                                placeholder="Enter the prompt for transformation"
                                className="min-h-[120px] resize-none"
                                value={img2imgPrompt}
                                onChange={(e) => setImg2imgPrompt(e.target.value)}
                              />

                              {/* Upload image */}
                              <input
                                type="file"
                                accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const reader = new FileReader();
                                  reader.onload = async () => {
                                    const base64 = (reader.result as string).split(",")[1];
                                    const uploadRes = await fetch('/api/image-generator/upload', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        fileName: `${Date.now()}-${file.name}`,
                                        contentType: file.type,
                                        data: base64,
                                      }),
                                    });
                                    const uploadData = await uploadRes.json();
                                    if (uploadRes.ok && uploadData.url) {
                                      setImgFilePreview(uploadData.url);
                                      setImg2imgUrl(uploadData.url);
                                    } else {
                                      toast({
                                        title: 'Upload failed',
                                        description: uploadData.error || 'Unable to upload image',
                                        variant: 'destructive',
                                      });
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }}
                              />

                              {imgFilePreview && (
                                <div className="relative w-full h-48">
                                  <Image src={imgFilePreview} alt="Upload preview" fill className="object-contain" />
                                </div>
                              )}

                              <Button
                                onClick={async () => {
                                  if (!img2imgPrompt.trim() || !img2imgUrl) {
                                    toast({ title: 'Prompt and image are required', variant: 'destructive' });
                                    return;
                                  }
                                  setIsImg2ImgGenerating(true);
                                  try {
                                    const res = await fetch('/api/image-generator/img2img', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        prompt: img2imgPrompt,
                                        urls: [img2imgUrl],
                                        webHook: imgWebHook || undefined,
                                        shutProgress: imgShutProgress,
                                      }),
                                    });
                                    const data = await res.json();
                                    if (res.ok && data.success && data.image) {
                                      setGeneratedImageUrl(data.image);
                                    } else {
                                      toast({ title: 'Image-to-Image failed', description: data.error || 'Try again later', variant: 'destructive' });
                                    }
                                  } catch (err) {
                                    toast({ title: 'Image-to-Image error', description: String(err), variant: 'destructive' });
                                  } finally {
                                    setIsImg2ImgGenerating(false);
                                  }
                                }}
                                className="w-full"
                                disabled={isImg2ImgGenerating}
                              >
                                {isImg2ImgGenerating ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generating...
                                  </>
                                ) : (
                                  'Generate from Image'
                                )}
                              </Button>
                            </TabsContent>
                          </Tabs>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* 右侧：结果展示区域 */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <Card className="overflow-hidden h-full">
                      <CardContent className="p-6 flex flex-col h-full">
                        <div>
                          <h2 className="text-xl font-semibold mb-2">Generated Result</h2>
                          <p className="text-sm text-muted-foreground mb-4">
                            {generatedImageUrl ? "Your image has been generated" : "Image will appear here"}
                          </p>
                        </div>

                        <div className="flex-1 flex items-center justify-center bg-muted/30 rounded-lg overflow-hidden relative min-h-[300px]">
                          {(isImageGenerating || isImg2ImgGenerating) ? (
                            <div className="flex flex-col items-center justify-center gap-2">
                              <Loader2 className="h-8 w-8 animate-spin text-primary" />
                              <p className="text-sm text-muted-foreground">Generating your image...</p>
                            </div>
                          ) : generatedImageUrl ? (
                            <div className="relative w-full h-full min-h-[300px]">
                              <Image ref={imageRef} src={generatedImageUrl} alt="Generated image" fill className="object-contain" />
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-2">
                              <ImageIcon className="h-16 w-16 text-muted-foreground/40" />
                              <p className="text-sm text-muted-foreground">Enter a prompt and click the generate button</p>
                            </div>
                          )}
                        </div>

                        {generatedImageUrl && (
                          <Button onClick={handleDownload} className="mt-4" variant="outline">
                            Download Image
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Popular Names Section */}
      <section className="py-20 bg-gradient-to-b from-background to-muted/20" data-popular-names>
        <div className="container px-4 md:px-6">
          <div className="mx-auto max-w-6xl">
            <PopularNames onScrollToGenerator={scrollToForm} />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/20">
        <div className="container px-4 md:px-6">
          <div className="mx-auto max-w-6xl space-y-12 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="space-y-4"
            >
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Why Choose Our Chinese Name Generator?
              </h2>
              <p className="mx-auto max-w-3xl text-muted-foreground text-lg">
                Advanced AI technology combined with deep cultural understanding to create meaningful Chinese names that truly represent you.
              </p>
            </motion.div>
            
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="rounded-2xl bg-background p-8 shadow-sm border border-border"
              >
                <div className="space-y-4">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <span className="text-2xl">🤖</span>
                  </div>
                  <h3 className="text-xl font-bold text-foreground">AI-Powered Intelligence</h3>
                  <p className="text-muted-foreground">
                    Our advanced AI understands your personality traits, preferences, and cultural nuances to create names that truly represent you.
                  </p>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="rounded-2xl bg-background p-8 shadow-sm border border-border"
              >
                <div className="space-y-4">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <span className="text-2xl">🏮</span>
                  </div>
                  <h3 className="text-xl font-bold text-foreground">Cultural Authenticity</h3>
                  <p className="text-muted-foreground">
                    Each name is crafted with deep understanding of Chinese naming traditions, character meanings, and cultural significance.
                  </p>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
                className="rounded-2xl bg-background p-8 shadow-sm border border-border"
              >
                <div className="space-y-4">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <span className="text-2xl">⚡</span>
                  </div>
                  <h3 className="text-xl font-bold text-foreground">Instant Generation</h3>
                  <p className="text-muted-foreground">
                    Get your personalized Chinese name in seconds, complete with detailed meanings, pronunciation guides, and cultural context.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <div id="pricing">
        <ChineseNamePricing onScrollToForm={scrollToForm} />
      </div>


      {/* Final CTA Section */}
      <section className="py-20 bg-gradient-to-b from-muted/10 to-background">
        <div className="container px-4 md:px-6">
          <div className="mx-auto max-w-4xl text-center space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.9 }}
              className="space-y-6"
            >
              <h2 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
                Start Your Cultural Journey Today
              </h2>
              <p className="mx-auto max-w-2xl text-muted-foreground text-lg">
                Discover the perfect Chinese name that represents your identity, personality, and cultural connection.
                <br />
                Join thousands who have found their authentic Chinese identity.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
                <button 
                  onClick={scrollToForm}
                  className="inline-flex items-center justify-center h-14 px-8 text-lg font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors shadow-lg"
                >
                  {loading ? 'Loading...' : !user ? (hasTriedFree ? '🔒 Sign In for Unlimited Names' : '🎁 Get Your Free Chinese Name') : '🎯 Generate Chinese Name'}
                </button>
                <a 
                  href="#chinese-name-pricing"
                  className="inline-flex items-center justify-center h-14 px-8 text-lg font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  View Premium Features →
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
