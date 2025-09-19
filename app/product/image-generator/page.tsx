"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Image as ImageIcon, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";

export default function ImageGeneratorPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);

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
          {/* Prompt Input Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="overflow-hidden">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                      <ImageIcon className="h-5 w-5 text-primary" />
                      Enter Prompt
                    </h2>
                    <p className="text-sm text-muted-foreground mb-4">
                      Describe the image you want to generate—the more detailed, the better
                    </p>
                  </div>

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
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      "Generate Image"
                    )}
                  </Button>
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
                  {isGenerating ? (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">
                        Generating your image...
                      </p>
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
                        Enter a prompt and click the generate button
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
