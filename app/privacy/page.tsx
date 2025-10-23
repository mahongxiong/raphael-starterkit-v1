"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shield, Eye, Database, Lock, UserCheck, Globe } from "lucide-react";

export default function PrivacyPage() {
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
              <h1 className="text-xl font-bold">Privacy Policy</h1>
              <p className="text-sm text-muted-foreground">
                How we protect your data and generated images
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container px-4 md:px-6 py-16">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-6"
          >
            <div className="inline-flex items-center rounded-full px-3 py-1 text-sm bg-primary/10 text-primary mb-4">
              <Shield className="mr-2 h-4 w-4" />
              Data Protection
            </div>
            <h2 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Image Generation Privacy
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Your privacy and intellectual property are important to us. Learn how we collect, use, and protect your data
              when you use our AI image generation platform.
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Last updated:</strong> March 15, 2024
            </p>
          </motion.div>

          {/* Privacy Principles */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid gap-6 md:grid-cols-3"
          >
            <Card className="border-2">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Eye className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Transparency</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  We clearly explain what data we collect and how we use it to provide you with the best AI image generation experience.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Security</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Your personal information and generated images are protected with industry-standard security measures and encryption protocols.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <UserCheck className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Control</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  You have full control over your data and generated content, including the ability to access, update, or delete your information.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Information We Collect */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="space-y-8"
          >
            <div className="bg-muted/30 rounded-2xl p-8">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <Database className="h-6 w-6 text-primary" />
                Information We Collect
              </h3>
              
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-3">Information You Provide</h4>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• <strong>Content Data:</strong> Text prompts, uploaded images, and generated images</li>
                    <li>• <strong>Preferences:</strong> Style preferences and generation settings</li>
                    <li>• <strong>Account Information:</strong> Email address when you create an account</li>
                    <li>• <strong>Generated Content:</strong> Images you create and save to your profile</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-3">Information We Collect Automatically</h4>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• <strong>Usage Data:</strong> How you interact with our image generation service</li>
                    <li>• <strong>Device Information:</strong> Browser type, operating system, IP address</li>
                    <li>• <strong>Cookies:</strong> To improve your experience and remember your preferences</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>

          {/* How We Use Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="space-y-8"
          >
            <div className="bg-muted/30 rounded-2xl p-8">
              <h3 className="text-2xl font-bold mb-6">How We Use Your Information</h3>
              
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h4 className="font-semibold mb-3">Service Provision</h4>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• Generate AI-powered images</li>
                    <li>• Save your generated images and preferences</li>
                    <li>• Provide customer support</li>
                    <li>• Process payments for premium features</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-3">Service Improvement</h4>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• Enhance image generation quality</li>
                    <li>• Develop new creative features</li>
                    <li>• Ensure content safety and prevent misuse</li>
                    <li>• Send service-related updates</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Data Sharing */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="space-y-8"
          >
            <div className="bg-muted/30 rounded-2xl p-8">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <Globe className="h-6 w-6 text-primary" />
                Information Sharing
              </h3>
              
              <div className="space-y-4 text-muted-foreground">
                <p>
                  <strong>We do not sell your personal information or generated content.</strong> We may share your information only in these limited circumstances:
                </p>
                
                <ul className="space-y-2">
                  <li>• <strong>Service Providers:</strong> Trusted third parties who help us operate our service (AI processing, hosting, analytics)</li>
                  <li>• <strong>Legal Requirements:</strong> When required by law or to protect our rights and safety</li>
                  <li>• <strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets</li>
                  <li>• <strong>With Your Consent:</strong> When you explicitly agree to share your generated content</li>
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Your Rights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.0 }}
            className="space-y-8"
          >
            <div className="bg-muted/30 rounded-2xl p-8">
              <h3 className="text-2xl font-bold mb-6">Your Rights and Choices</h3>
              
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h4 className="font-semibold mb-3">Content Control</h4>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• Access your generated images</li>
                    <li>• Manage your image gallery</li>
                    <li>• Delete your account and content</li>
                    <li>• Download your images</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-3">Privacy Settings</h4>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• Control image visibility</li>
                    <li>• Manage cookie preferences</li>
                    <li>• Set content sharing options</li>
                    <li>• Request data portability</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Data Security */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.2 }}
            className="space-y-8"
          >
            <div className="bg-muted/30 rounded-2xl p-8">
              <h3 className="text-2xl font-bold mb-6">Data Security and Retention</h3>
              
              <div className="space-y-4 text-muted-foreground">
                <p>
                  We implement robust security measures to protect your personal information and generated content against 
                  unauthorized access, alteration, disclosure, or destruction.
                </p>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-semibold mb-2 text-foreground">Security Measures</h4>
                    <ul className="space-y-1">
                      <li>• End-to-end encryption</li>
                      <li>• Content safety monitoring</li>
                      <li>• Access controls and logging</li>
                      <li>• Secure cloud storage</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2 text-foreground">Data Retention</h4>
                    <ul className="space-y-1">
                      <li>• Account data: Until deletion</li>
                      <li>• Generated images: Until removed</li>
                      <li>• Usage logs: Up to 1 year</li>
                      <li>• Temporary files: 24 hours</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Contact Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.4 }}
            className="text-center bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-2xl p-8"
          >
            <h3 className="text-2xl font-bold mb-4">Questions About Privacy?</h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              If you have any questions about this Privacy Policy or how we handle your data and generated content, 
              please don't hesitate to contact us. We're here to help ensure your privacy and creative work are protected.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild variant="outline">
                <Link href="/contact">
                  Contact Us
                </Link>
              </Button>
              <Button asChild>
                <Link href="/">
                  Back to Home
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}