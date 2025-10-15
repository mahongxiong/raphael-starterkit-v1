"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  Calendar, 
  Heart, 
  Image as ImageIcon,
  ChevronRight,
  Loader2,
  Trash2,
  AlertTriangle
} from "lucide-react";

interface GenerationRecord {
  id: string;
  type: 'txt2img' | 'img2img';
  prompt: string;
  input_images: string[];
  output_image_url: string | null;
  status: 'queued' | 'processing' | 'succeeded' | 'failed';
  error?: string;
  metadata: any;
  created_at: string;
  updated_at: string;
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: React.ReactNode;
}

function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="p-12 text-center">
        <div className="mx-auto mb-4">{icon}</div>
        <h3 className="text-lg font-medium mb-2">{title}</h3>
        <p className="text-muted-foreground mb-4">{description}</p>
        {action}
      </CardContent>
    </Card>
  );
}

export default function ProfilePage() {
  const { user } = useUser();
  const { toast } = useToast();
  const [generationHistory, setGenerationHistory] = useState<GenerationRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState("history");
  const [recordToDelete, setRecordToDelete] = useState<GenerationRecord | null>(null);

  // Fetch generation history
  useEffect(() => {
    if (!user?.id) return;
    
    const fetchHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const response = await fetch('/api/generation-records');
        if (!response.ok) throw new Error('Failed to fetch history');
        const data = await response.json();
        setGenerationHistory(data);
      } catch (error) {
        console.error('Error fetching history:', error);
        toast({
          title: "Error",
          description: "Failed to load generation history",
          variant: "destructive",
        });
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [user?.id, toast]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const deleteRecord = async (record: GenerationRecord) => {
    setRecordToDelete(record);
  };

  const confirmDelete = async () => {
    if (!recordToDelete) return;

    try {
      const response = await fetch(`/api/generation-records/${recordToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete record');

      setGenerationHistory(prev => 
        prev.filter(record => record.id !== recordToDelete.id)
      );

      toast({
        title: "Success",
        description: "Generation record deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting record:', error);
      toast({
        title: "Error",
        description: "Failed to delete generation record",
        variant: "destructive",
      });
    } finally {
      setRecordToDelete(null);
    }
  };

  const cancelDelete = () => {
    setRecordToDelete(null);
  };

  return (
    <div className="container max-w-6xl py-6 space-y-8">
      <div className="flex items-center gap-2">
        <ArrowLeft className="h-4 w-4" />
        <Link href="/" className="text-sm hover:underline">
          Back to Home
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Profile</h1>
        <Button asChild variant="outline">
          <Link href="/dashboard">
            Go to Dashboard
            <ChevronRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Generation History
          </TabsTrigger>
          {/* <TabsTrigger value="saved" className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            Saved Images
          </TabsTrigger> */}
        </TabsList>

        <TabsContent value="history" className="space-y-6">
          {isLoadingHistory ? (
            <div className="grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="relative">
                  <CardHeader className="space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-[200px]" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : generationHistory.length === 0 ? (
            <EmptyState
              icon={<ImageIcon className="h-12 w-12 text-muted-foreground" />}
              title="No generations yet"
              description="Start creating amazing images with our AI image generator"
              action={
                <Button asChild>
                  <Link href="/product/image-generator">
                    Create Images
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {generationHistory.map((record) => (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <Card className="relative group">
                    <CardHeader className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant={record.status === 'succeeded' ? 'default' : 'secondary'}>
                          {record.type === 'txt2img' ? 'Text to Image' : 'Image to Image'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => deleteRecord(record)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {record.prompt}
                      </p>
                    </CardHeader>
                    <CardContent>
                      {record.status === 'succeeded' && record.output_image_url ? (
                        <div className="relative aspect-square rounded-md overflow-hidden">
                          <Image
                            src={record.output_image_url}
                            alt={record.prompt}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : record.status === 'failed' ? (
                        <div className="aspect-square rounded-md bg-muted flex items-center justify-center">
                          <div className="text-center p-4">
                            <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">Generation failed</p>
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-square rounded-md bg-muted flex items-center justify-center">
                          <div className="text-center p-4">
                            <Loader2 className="h-8 w-8 text-muted-foreground mx-auto mb-2 animate-spin" />
                            <p className="text-sm text-muted-foreground">
                              {record.status === 'queued' ? 'Queued' : 'Generating'}...
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatDate(record.created_at)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="saved" className="space-y-6">
          <EmptyState
            icon={<Heart className="h-12 w-12 text-muted-foreground" />}
            title="No saved images"
            description="Save your favorite generated images to access them later"
            action={
              <Button asChild>
                <Link href="/product/image-generator">
                  Create Images
                </Link>
              </Button>
            }
          />
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!recordToDelete} onOpenChange={() => cancelDelete()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Generation Record</DialogTitle>
            <DialogDescription className="space-y-2">
              Are you sure you want to delete this generation record?
              <br />
              <span className="text-sm text-muted-foreground">
                This action cannot be undone and the image will be permanently deleted.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={cancelDelete}>
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}