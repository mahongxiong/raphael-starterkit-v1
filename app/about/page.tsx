"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Heart, Users, Globe, Sparkles } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container px-4 md:px-6 py-4">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm" className="gap-2">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold">About Us</h1>
              <p className="text-sm text-muted-foreground">
                Learn more about our mission and story
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container px-4 md:px-6 py-16">
        <div className="max-w-4xl mx-auto space-y-16">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-6"
          >
            <div className="inline-flex items-center rounded-full px-3 py-1 text-sm bg-primary/10 text-primary mb-4">
              <span className="mr-2">🎨</span>
              Transforming Ideas into Visual Art
            </div>
            <h2 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Unleash Creativity with
              <br />
              <span className="text-primary">Nano Banana AI</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              We believe that every idea deserves to be visualized - our AI technology transforms your 
              imagination into stunning images, bridging the gap between concept and creation.
            </p>
          </motion.div>

          {/* Mission Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid gap-8 md:grid-cols-2 lg:grid-cols-3"
          >
            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Heart className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Our Mission</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  To empower creators and innovators with cutting-edge AI technology that transforms 
                  their ideas into stunning visual content, making professional-quality image generation 
                  accessible to everyone.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Our Community</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  We've helped thousands of creators worldwide bring their visions to life, fostering 
                  a vibrant community of artists, designers, and innovators who push the boundaries 
                  of visual creativity.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Globe className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Global Impact</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  From individual creators to major brands, our platform serves a global community 
                  of users who rely on our technology to create compelling visual content that 
                  captivates audiences worldwide.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Story Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="prose prose-lg max-w-none"
          >
            <div className="bg-muted/30 rounded-2xl p-8 md:p-12">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-primary" />
                Our Story
              </h3>
              <div className="space-y-6 text-muted-foreground">
                <p>
                  Nano Banana was born from a simple yet powerful vision: in today's visual-first world, 
                  everyone should have the ability to create professional-quality images that bring their 
                  ideas to life, regardless of their artistic background or technical expertise.
                </p>
                <p>
                  Image generation is no longer just about technical capabilities - it's about empowering 
                  creativity and enabling expression. Our advanced AI technology combines cutting-edge 
                  machine learning with intuitive design to make image creation accessible, efficient, 
                  and enjoyable for everyone.
                </p>
                <p>
                  Whether you're a professional designer seeking to streamline your workflow, a content 
                  creator looking to enhance your visual storytelling, or simply someone with amazing ideas 
                  to share, we're here to help you transform your vision into stunning visual reality with 
                  just a few clicks.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Values Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="space-y-8"
          >
            <div className="text-center">
              <h3 className="text-3xl font-bold mb-4">Our Values</h3>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                These principles guide everything we do
              </p>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold">1</span>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Creative Excellence</h4>
                  <p className="text-muted-foreground">
                    Every image we generate aims for the highest quality, leveraging advanced AI 
                    to ensure stunning visuals that meet professional standards and exceed expectations.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold">2</span>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">User-Centric Innovation</h4>
                  <p className="text-muted-foreground">
                    We believe technology should serve creativity. Our AI adapts to your style and 
                    preferences, providing personalized results that align with your vision.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold">3</span>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Empowering Creation</h4>
                  <p className="text-muted-foreground">
                    Beyond just generating images, we provide tools and features that help users 
                    understand and control the creative process, making AI art more accessible.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold">4</span>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Universal Accessibility</h4>
                  <p className="text-muted-foreground">
                    We make professional-quality image generation accessible to everyone, regardless 
                    of their technical expertise or artistic background.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="text-center bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-2xl p-8 md:p-12"
          >
            <h3 className="text-2xl font-bold mb-4">Ready to Create Amazing Images?</h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Join thousands of creators who are already transforming their ideas into stunning visuals.
              Start your creative journey today with our AI-powered image generator.
            </p>
            <Button asChild size="lg" className="font-medium">
              <Link href="/">
                Start Creating Now
              </Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}