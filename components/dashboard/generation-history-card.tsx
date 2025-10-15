"use client";

import { useState, useEffect, useMemo } from "react";
import { useUser } from "@/hooks/use-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, TrendingUp, Calendar, Image as ImageIcon, Loader2, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

interface GenerationRecord {
  id: string;
  type: 'txt2img' | 'img2img';
  prompt: string;
  input_images?: string[];
  output_image_url?: string | null;
  status: 'queued' | 'processing' | 'succeeded' | 'failed';
  created_at: string;
}

export function GenerationHistoryCard() {
  const { user } = useUser();
  const [records, setRecords] = useState<GenerationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const stats = useMemo(() => {
    const total_generations = records.length;
    const succeeded = records.filter(r => r.status === 'succeeded').length;
    const failed = records.filter(r => r.status === 'failed').length;
    const in_progress = records.filter(r => r.status === 'processing' || r.status === 'queued').length;
    return { total_generations, succeeded, failed, in_progress };
  }, [records]);

  useEffect(() => {
    if (user) {
      fetchImageGenerationHistory();
    }
  }, [user]);

  const fetchImageGenerationHistory = async () => {
    try {
      const response = await fetch('/api/generation-records');
      if (response.ok) {
        const data = await response.json();
        setRecords(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to fetch image generation history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusVariant = (status: GenerationRecord['status']) => {
    switch (status) {
      case 'succeeded':
        return 'default' as const;
      case 'failed':
        return 'destructive' as const;
      case 'processing':
      case 'queued':
      default:
        return 'secondary' as const;
    }
  };

  const truncate = (text: string, max = 60) => {
    if (!text) return '';
    return text.length > max ? text.slice(0, max) + '…' : text;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Generation History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-muted-foreground">Loading history...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Generation History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-primary">{stats.total_generations}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-primary">{stats.succeeded}</div>
            <div className="text-xs text-muted-foreground">Succeeded</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-primary">{stats.failed}</div>
            <div className="text-xs text-muted-foreground">Failed</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold text-primary">{stats.in_progress}</div>
            <div className="text-xs text-muted-foreground">In Progress</div>
          </div>
        </div>
        
        <div className="space-y-4">
          <h3 className="font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Recent Activity
          </h3>
          
          {records.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No generation history yet
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {records.slice(0, 10).map((rec, index) => (
                <motion.div
                  key={rec.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="group relative w-12 h-12 rounded-lg bg-muted overflow-hidden ring-1 ring-border">
                      {(() => {
                        return (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={rec.output_image_url ?? undefined}
                            alt={rec.prompt}
                            loading="lazy"
                            decoding="async"
                            draggable={false}
                            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                          />
                        );
                      })()}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm line-clamp-1" title={rec.prompt}>
                          {truncate(rec.prompt)}
                        </span>
                        <Badge variant={getStatusVariant(rec.status)} className="text-xs">
                          {rec.type === 'txt2img' ? 'Text to Image' : 'Image to Image'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(rec.created_at).toLocaleDateString()}
                        <span>•</span>
                        <span className="capitalize">{rec.status}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}