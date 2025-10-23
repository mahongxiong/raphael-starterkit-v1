"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";

interface ShowcaseImage {
  title: string;
  description: string;
  imagePath: string;
}

const showcaseImages: ShowcaseImage[] = [
  {
    title: "AI Generated bumblebee",
    description: "A hyper-realistic macro photograph of a bumblebee, covered in pollen, landing on a single, dew-covered petal of a purple iris. The background is a soft, out-of-focus garden.",
    imagePath: "/images/AI Generated bumblebee.png"
  },
  {
    title: "AI Generated city",
    description: "A photograph of a bustling Tokyo street at night, with a high shutter speed capturing the motion of people and cars as streaks of light. Neon signs illuminate the scene with vibrant color.",
    imagePath: "/images/AI Generated city.png"
  },
  {
    title: "AI Generated infographic",
    description: "Turn the ingredients in the picture into a complete step-by-step recipe infographic, using a top-down perspective. Present it in a minimalist style on a white background. Include labeled photos of the ingredients, use dashed lines to connect icons representing the preparation steps, and display a photo of the final plated dish at the bottom of the infographic,At the same time, remove the background from the food items that have a background in the image and place the food on a white background.",
    imagePath: "/images/AI Generated infographic.png"
  },
  {
    title: "AI Generated realistic figurine person",
    description: "Create a realistic figurine of this person with incredibly detailed textures, capturing their unique personality and expression. Place on a nature-themed base with tiny grass, flowers, or appropriate habitat elements. Include a small nameplate details.",
    imagePath: "/images/AI Generated person.png"
  },
  {
    title: "AI Generated moons in the sky",
    description: "A hyper-realistic sci-fi landscape of a vibrant alien planet with multiple moons in the sky. The ground is covered in bioluminescent flora, and a sleek, futuristic starship is landed in the foreground.",
    imagePath: "/images/AI Generated real city.png"
  },
  {
    title: "AI Generated fantasy person",
    description: "Transform this person into a detailed fantasy RPG figurine with elaborate costume, magical accessories, and heroic pose. Place it on a mystical base with glowing runes, surrounded by miniature fantasy landscape elements like crystals, tiny trees, and magical effects.",
    imagePath: "/images/AI Generated fantasy person.png"
  }
];

interface PopularNamesProps {
  onScrollToGenerator?: () => void;
}

function PopularNames({ onScrollToGenerator }: PopularNamesProps) {
  return (
    <section className="w-full py-12">
      <div className="container px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-4">Get Inspired</h2>
          <p className="text-muted-foreground">
            Get inspired by what others are creating with Nano Banana
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {showcaseImages.map((image, index) => (
            <motion.div
              key={image.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group cursor-pointer"
            >
              <div className="relative aspect-[3/4] overflow-hidden rounded-lg">
                <Image
                  src={image.imagePath}
                  alt={image.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-white text-lg font-semibold mb-1">
                      {image.title}
                    </h3>
                    <p className="text-white/80 text-sm">
                      {image.description}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Button
            onClick={onScrollToGenerator}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8"
          >
            Start Creating
          </Button>
        </div>
      </div>
    </section>
  );
}

export default PopularNames;