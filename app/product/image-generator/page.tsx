"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Image as ImageIcon, Plus } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function ImageGeneratorPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  // Approximate progress state
  const [progress, setProgress] = useState(0);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 图生图相关状态
  const [imgFilePreview, setImgFilePreview] = useState<string | null>(null);
  const [img2imgUrl, setImg2imgUrl] = useState<string | null>(null);
  const [img2imgPrompt, setImg2imgPrompt] = useState("");
  const [isImg2ImgGenerating, setIsImg2ImgGenerating] = useState(false);
  const [imgWebHook, setImgWebHook] = useState<string | null>(null);
  const [imgShutProgress, setImgShutProgress] = useState<boolean>(false);

  const startProgress = () => {
    setProgress(0);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    let current = 0;
    progressTimerRef.current = setInterval(() => {
      // Increase 3-10% until reaching ~90%
      current = Math.min(current + Math.floor(Math.random() * 8) + 3, 90);
      setProgress(current);
    }, 500);
  };

  const stopProgress = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    setProgress(100);
    setTimeout(() => setProgress(0), 1500);
  };

  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt cannot be empty",
        description: "Please enter a description to generate the image",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    startProgress();
    try {
      const response = await fetch("/api/image-generator/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.image) {
        setGeneratedImage(data.image);
      } else {
        throw new Error(data.error || "Failed to generate image");
      }
    } catch (error) {
      console.error("Error generating image:", error);
      toast({
        title: "Generation failed",
        description: "An error occurred during image generation, please try again later",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      stopProgress();
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;

    const link = document.createElement("a");
    link.href = generatedImage;
    link.download = `generated-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/20 to-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur-sm sticky top-16 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
            <div className="flex-1 text-center">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                AI Image Generator
              </h1>
              <p className="text-muted-foreground mt-1">
                Create stunning images with Google Imagen 3.0
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Tabs for T2I and I2I */}
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
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                      />

                      <Button
                        onClick={handleGenerateImage}
                        disabled={isGenerating || !prompt.trim()}
                        className="w-full"
                      >
                        {isGenerating ? `生成中...` : "生成图片"}
                      </Button>
                    </TabsContent>

                    <TabsContent value="i2i" className="space-y-4">
                      {/* Upload image area first, styled big area */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">参考图像</label>
                        <div className="border-2 border-dashed rounded-lg min-h-[300px] h-[320px] p-6 bg-muted/10 text-center hover:bg-muted/20 transition relative cursor-pointer">
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
                            <Plus className="h-8 w-8 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">添加图片（最大50MB）</p>
                          </div>
                        </div>
                      </div>

                      {imgFilePreview && (
                        <div className="relative w-full h-72 rounded-lg overflow-hidden border bg-background">
                          <Image src={imgFilePreview} alt="Upload preview" fill className="object-contain" />
                        </div>
                      )}

                      {/* Prompt after upload area */}
                      <Textarea
                        placeholder="请输入用于转换的提示词"
                        className="min-h-[120px] resize-none"
                        value={img2imgPrompt}
                        onChange={(e) => setImg2imgPrompt(e.target.value)}
                      />

                      <Button
                        onClick={async () => {
                          if (!img2imgPrompt.trim() || !img2imgUrl) {
                            toast({
                              title: '提示词与参考图像必填',
                              variant: 'destructive',
                            });
                            return;
                          }
                          setIsImg2ImgGenerating(true);
                          startProgress();
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
                              setGeneratedImage(data.image);
                            } else {
                              toast({ title: '图生图失败', description: data.error || '请稍后再试', variant: 'destructive' });
                            }
                          } catch (err) {
                            toast({ title: '图生图错误', description: String(err), variant: 'destructive' });
                          } finally {
                            setIsImg2ImgGenerating(false);
                            stopProgress();
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

          {/* Image Display Section */}
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
                    {generatedImage ? "Your image has been generated" : "Image will appear here"}
                  </p>
                </div>

                <div className="flex-1 flex items-center justify-center bg-muted/30 rounded-lg overflow-hidden relative min-h-[300px]">
                  {isGenerating || isImg2ImgGenerating ? (
                    <div className="flex flex-col items-center justify-center gap-4 w-full px-6">
                      <p className="text-sm text-muted-foreground">正在生成您的图片，请稍候...</p>
                      <div className="w-full max-w-xl h-3 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary via-rose-400 to-emerald-400 transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">进度 {progress}%</p>
                    </div>
                  ) : generatedImage ? (
                    <div className="relative w-full h-full min-h-[300px]">
                      <Image
                        ref={imageRef}
                        src={generatedImage}
                        alt="Generated image"
                        fill
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ImageIcon className="h-16 w-16 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">
                        输入提示词并点击生成按钮
                      </p>
                    </div>
                  )}
                </div>

                {generatedImage && (
                  <Button
                    onClick={handleDownload}
                    className="mt-4"
                    variant="outline"
                  >
Download Image
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
