"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

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
  
  // FAQ展开/收起状态
  const [expandedFaqs, setExpandedFaqs] = useState<{ [key: string]: boolean }>({
    'what-is': false,
    'how-works': false,
    'better-than': false,
    'commercial': false,
    'edits': false,
    'try-it': false
  });
  
  // 切换FAQ展开/收起状态
  const toggleFaq = (id: string) => {
    setExpandedFaqs(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  // 进度条状态与计时器（新增）
  const [progress, setProgress] = useState(0);
  const progressIntervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const resetTimeoutRef = useRef<number | null>(null);
  
  useEffect(() => {
    const generating = isImageGenerating || isImg2ImgGenerating;

    const clearAll = () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
        resetTimeoutRef.current = null;
      }
    };

    const calcProgress = (elapsed: number) => {
      // 通过里程碑控制 40s 左右到达 98%，前期更慢，后期逐步加速
      const milestones = [
        { t: 0, p: 1 },      // 0s -> 1%
        { t: 1000, p: 12 },  // 1s -> 12%
        { t: 2000, p: 28 },  // 2s -> 28%
        { t: 4000, p: 45 },  // 4s -> 45%
        { t: 5000, p: 68 },  // 5s -> 68%
        { t: 7000, p: 88 }, // 7s -> 88%
        { t: 10000, p: 98 }, // 10s -> 98%
      ];

      if (elapsed <= 0) return 1;
      for (let i = 1; i < milestones.length; i++) {
        if (elapsed <= milestones[i].t) {
          const prev = milestones[i - 1];
          const curr = milestones[i];
          const ratio = (elapsed - prev.t) / (curr.t - prev.t);
          return Math.floor(prev.p + ratio * (curr.p - prev.p));
        }
      }
      return 98; // 超过 40s 也不超过 98%，等待真实完成再到 100%
    };

    if (generating) {
      clearAll();
      setProgress(0);
      startTimeRef.current = Date.now();
      // 以较短间隔匀速刷新，计算基于时间插值，避免“前快后卡 95%”
      progressIntervalRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        const next = calcProgress(elapsed);
        setProgress((prev) => (next > prev ? next : prev));
      }, 250);
    } else {
      // 生成结束后，快速补到 100%，短暂停留后复位
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setProgress(100);
      resetTimeoutRef.current = window.setTimeout(() => setProgress(0), 1200);
    }

    return () => clearAll();
  }, [isImageGenerating, isImg2ImgGenerating]);

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
                <span className="mr-2">🎨</span>
                AI-Powered Image Generation
              </div>
              
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
                Create Amazing Images with
                <br />
                <span className="text-primary">Nano Banana</span>
              </h1>
              
              <p className="mt-6 text-xl text-muted-foreground md:text-2xl max-w-3xl mx-auto">
                Transform your ideas into stunning visuals with our advanced AI image generation technology. From text descriptions to image transformations, bring your creativity to life.
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
                  {loading ? 'Loading...' : !user ? '🎨 Start Creating' : '🎨 Generate Images'}
                </button>
                <button
                  onClick={() => {
                    router.push('/product/image-generator');
                  }}
                  className="inline-flex items-center justify-center h-14 px-8 text-lg font-medium border border-border text-foreground hover:bg-muted rounded-md transition-colors"
                >
                  Advanced Image Tools
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
                  Text to Image
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  Image to Image
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  High Quality Output
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
                Create Your Images
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Use our powerful AI to transform your text descriptions into stunning images or enhance existing images with creative transformations.
              </p>
            </div>

            <div id="image-generator-form" data-name-generator-form>
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
                             <TabsTrigger value="i2i">Image-to-Image</TabsTrigger>
                              <TabsTrigger value="t2i">Text-to-Image</TabsTrigger>
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
                                {isImageGenerating ? `生成中...` : "生成图片"}
                              </Button>
                            </TabsContent>

                            <TabsContent value="i2i" className="space-y-4">
                              {/* 上传区域置前，统一风格的大卡片样式（缩小为原来的一半），并在框内显示预览 */}
                              <div className="space-y-2">
                                <label className="text-sm font-medium">参考图像</label>
                                {imgFilePreview ? (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* 左侧：已添加图片，仍可点击更换 */}
                                    <div className="relative border-2 border-dashed rounded-lg min-h-[150px] h-[160px] p-4 bg-muted/10 hover:bg-muted/20 transition cursor-pointer overflow-hidden">
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
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
                                                title: '上传失败',
                                                description: uploadData.error || '图片上传失败',
                                                variant: 'destructive',
                                              });
                                            }
                                          };
                                          reader.readAsDataURL(file);
                                        }}
                                      />
                                      <Image src={imgFilePreview} alt="Upload preview" fill className="object-contain" />
                                      <div className="absolute bottom-2 left-2 text-xs text-muted-foreground bg-background/50 rounded px-2 py-1">
                                        已添加图片，点击可更换
                                      </div>
                                    </div>
                                    {/* 右侧：再添加一个“添加图片”卡片，往旁边挪一个 */}
                                    <div className="relative border-2 border-dashed rounded-lg min-h-[150px] h-[160px] p-4 bg-muted/10 text-center hover:bg-muted/20 transition cursor-pointer">
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
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
                                                title: '上传失败',
                                                description: uploadData.error || '图片上传失败',
                                                variant: 'destructive',
                                              });
                                            }
                                          };
                                          reader.readAsDataURL(file);
                                        }}
                                      />
                                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
                                      <p className="text-sm text-muted-foreground">添加图片（最大50MB）</p>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  // 仅展示一个添加图片卡片（尺寸为原来的一半）
                                  <div className="relative border-2 border-dashed rounded-lg min-h-[150px] h-[160px] p-4 bg-muted/10 text-center hover:bg-muted/20 transition cursor-pointer">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="absolute inset-0 opacity-0 cursor-pointer"
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
                                              title: '上传失败',
                                              description: uploadData.error || '图片上传失败',
                                              variant: 'destructive',
                                            });
                                          }
                                        };
                                        reader.readAsDataURL(file);
                                      }}
                                    />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
                                      {/* 移除 + 号图标 */}
                                      <p className="text-sm text-muted-foreground">添加图片（最大50MB）</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            
                            {/* 提示词在上传区域之后 */}
                            <Textarea
                              placeholder="请输入用于转换的提示词"
                              className="min-h-[120px] resize-none"
                              value={img2imgPrompt}
                              onChange={(e) => setImg2imgPrompt(e.target.value)}
                            />
                            
                            <Button
                              onClick={async () => {
                                if (!img2imgPrompt.trim() || !img2imgUrl) {
                                  toast({ title: '提示词与参考图像必填', variant: 'destructive' });
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
                                    toast({ title: '图生图失败', description: data.error || '请稍后再试', variant: 'destructive' });
                                  }
                                } catch (err) {
                                  toast({ title: '图生图错误', description: String(err), variant: 'destructive' });
                                } finally {
                                  setIsImg2ImgGenerating(false);
                                }
                              }}
                              className="w-full"
                              disabled={isImg2ImgGenerating}
                            >
                              {isImg2ImgGenerating ? `生成中...` : '根据图片生成'}
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

                        <div className="flex-1 flex items-center justify-center bg-muted/30 rounded-lg overflow-hidden relative min-h-[500px] sm:min-h-[550px]">
                          {(isImageGenerating || isImg2ImgGenerating) ? (
                            <div className="flex flex-col items-center justify-center gap-3">
                              <p className="text-sm text-muted-foreground">正在生成您的图片，请稍候...</p>
                              <div className="w-64 sm:w-80 md:w-96 mt-2">
                                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                  <span>Progress</span>
                                  <span>{progress}%</span>
                                </div>
                                <div className="h-3 w-full bg-muted rounded-full overflow-hidden border border-border">
                                  <div
                                    className="h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(99,102,241,0.6)]"
                                    style={{
                                      width: `${progress}%`,
                                      backgroundImage: 'linear-gradient(90deg, rgba(59,130,246,1) 0%, rgba(99,102,241,1) 50%, rgba(236,72,153,1) 100%)',
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          ) : generatedImageUrl ? (
                            <div className="relative w-full h-full min-h-[500px]">
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

      {/* FAQ Section */}
      <section className="py-20 bg-gradient-to-b from-muted/20 to-muted/10">
        <div className="container px-4 md:px-6">
          <div className="mx-auto max-w-4xl space-y-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center space-y-4"
            >
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Frequently Asked Questions
              </h2>
              <p className="text-lg text-muted-foreground">
                Find answers to common questions about Nano Banana AI image generation.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="space-y-4"
            >
              <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
                <button 
                  onClick={() => toggleFaq('what-is')}
                  className="w-full px-6 py-4 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">What is Nano Banana?</h3>
                    <svg
                      className={`w-6 h-6 transform transition-transform ${expandedFaqs['what-is'] ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <div className={`mt-2 text-muted-foreground overflow-hidden transition-all duration-300 ${expandedFaqs['what-is'] ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                    Nano Banana is an advanced AI image generation platform that transforms your text descriptions into stunning visuals. 
                    Our technology combines state-of-the-art AI models with an intuitive interface to help you create amazing images quickly and easily.
                  </div>
                </button>
              </div>

              <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
                <button 
                  onClick={() => toggleFaq('how-works')}
                  className="w-full px-6 py-4 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">How does it work?</h3>
                    <svg
                      className={`w-6 h-6 transform transition-transform ${expandedFaqs['how-works'] ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <div className={`mt-2 text-muted-foreground overflow-hidden transition-all duration-300 ${expandedFaqs['how-works'] ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                    Simply enter a text description of the image you want to create, and our AI will generate it for you. 
                    You can also use our image-to-image feature to transform existing images with new styles or modifications. 
                    Our system processes your request in real-time, with progress tracking and quick delivery of results.
                  </div>
                </button>
              </div>

              <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
                <button 
                  onClick={() => toggleFaq('better-than')}
                  className="w-full px-6 py-4 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">How is it better than Flux Kontext?</h3>
                    <svg
                      className={`w-6 h-6 transform transition-transform ${expandedFaqs['better-than'] ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <div className={`mt-2 text-muted-foreground overflow-hidden transition-all duration-300 ${expandedFaqs['better-than'] ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                    Nano Banana offers superior image quality, faster generation times, and a more user-friendly interface. 
                    Our platform also provides unique features like real-time progress tracking, advanced style controls, 
                    and flexible image manipulation options that set us apart from other services.
                  </div>
                </button>
              </div>

              <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
                <button 
                  onClick={() => toggleFaq('commercial')}
                  className="w-full px-6 py-4 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Can I use it for commercial projects?</h3>
                    <svg
                      className={`w-6 h-6 transform transition-transform ${expandedFaqs['commercial'] ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <div className={`mt-2 text-muted-foreground overflow-hidden transition-all duration-300 ${expandedFaqs['commercial'] ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                    Yes! With our premium subscription, you get full commercial usage rights for all generated images. 
                    We provide clear licensing terms and high-resolution outputs suitable for professional use. 
                    Check our pricing page for more details on commercial licenses and usage rights.
                  </div>
                </button>
              </div>

              <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
                <button 
                  onClick={() => toggleFaq('edits')}
                  className="w-full px-6 py-4 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">What types of edits can it handle?</h3>
                    <svg
                      className={`w-6 h-6 transform transition-transform ${expandedFaqs['edits'] ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <div className={`mt-2 text-muted-foreground overflow-hidden transition-all duration-300 ${expandedFaqs['edits'] ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                    Our platform supports a wide range of image manipulations, including style transfer, background changes, 
                    object addition or removal, color adjustments, and artistic effects. You can also combine multiple 
                    editing techniques to achieve your desired results.
                  </div>
                </button>
              </div>

              <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
                <button 
                  onClick={() => toggleFaq('try-it')}
                  className="w-full px-6 py-4 text-left hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Where can I try Nano Banana?</h3>
                    <svg
                      className={`w-6 h-6 transform transition-transform ${expandedFaqs['try-it'] ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <div className={`mt-2 text-muted-foreground overflow-hidden transition-all duration-300 ${expandedFaqs['try-it'] ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                    You can start using Nano Banana right now! Try our free tier with 5 daily generations, 
                    or sign up for a premium account to unlock unlimited generations and advanced features. 
                    Just scroll up to the generator section and start creating.
                  </div>
                </button>
              </div>
            </motion.div>
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
                Ready to Create Amazing Images?
              </h2>
              <p className="mx-auto max-w-3xl text-muted-foreground text-lg">
                Start your creative journey with Nano Banana's AI image generation today.
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Button asChild>
                  <Link href="#image-generator-form">Get Started</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/terms">Learn more</Link>
                </Button>
              </div>
            </motion.div>
            
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="rounded-2xl bg-background p-8 shadow-sm border border-border"
              >
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-foreground">Free</h3>
                  <p className="text-muted-foreground">Perfect for trying out our service.</p>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>✓ 5 image generations per day</li>
                    <li>✓ Basic image styles</li>
                    <li>✓ Standard resolution</li>
                  </ul>
                  <p className="text-3xl font-bold text-foreground">$0</p>
                  <Button className="w-full" variant="outline">
                    Get Started
                  </Button>
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
                    <span className="text-2xl">🖼️</span>
                  </div>
                  <h3 className="text-xl font-bold text-foreground">Image Enhancement</h3>
                  <p className="text-muted-foreground">
                    Take your existing images to the next level with our image-to-image transformation technology and creative style transfer.
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
                  <h3 className="text-xl font-bold text-foreground">Fast Generation</h3>
                  <p className="text-muted-foreground">
                    Get your generated images quickly with our optimized processing pipeline, complete with real-time progress tracking.
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
