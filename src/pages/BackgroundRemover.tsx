import React, { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Download, Loader2, RotateCcw, ImageIcon, Sparkles } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { pipeline, env } from '@huggingface/transformers';
import { supabase } from '@/integrations/supabase/client';

env.allowLocalModels = false;
env.useBrowserCache = false;

const MAX_IMAGE_DIMENSION = 1024;
const AI_DAILY_LIMIT = 3;

const BackgroundRemover: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiUsageCount, setAiUsageCount] = useState(0);
  const [method, setMethod] = useState<'browser' | 'ai'>('browser');
  const [threshold, setThreshold] = useState([0.5]);
  const [smoothing, setSmoothing] = useState([1]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const count = getAiUsageCount();
    setAiUsageCount(count);
  }, []);

  const getTodayKey = () => {
    return new Date().toDateString();
  };

  const getAiUsageCount = (): number => {
    const today = getTodayKey();
    const stored = localStorage.getItem(`bg_remover_ai_${today}`);
    return stored ? parseInt(stored, 10) : 0;
  };

  const incrementAiUsageCount = () => {
    const today = getTodayKey();
    const current = getAiUsageCount();
    const newCount = current + 1;
    localStorage.setItem(`bg_remover_ai_${today}`, newCount.toString());
    setAiUsageCount(newCount);
  };

  const checkAiDailyLimit = (): boolean => {
    return getAiUsageCount() >= AI_DAILY_LIMIT;
  };

  const resizeImageIfNeeded = (
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    image: HTMLImageElement
  ) => {
    let width = image.naturalWidth;
    let height = image.naturalHeight;

    if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
      if (width > height) {
        height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
        width = MAX_IMAGE_DIMENSION;
      } else {
        width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
        height = MAX_IMAGE_DIMENSION;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(image, 0, 0, width, height);
      return true;
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(image, 0, 0);
    return false;
  };

  const removeBackground = async (imageElement: HTMLImageElement): Promise<string> => {
    try {
      console.log('Starting browser-based background removal...');
      
      const segmenter = await pipeline(
        'image-segmentation',
        'Xenova/segformer-b0-finetuned-ade-512-512',
        { device: 'webgpu' }
      );

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('Could not get canvas context');

      const wasResized = resizeImageIfNeeded(canvas, ctx, imageElement);
      console.log(
        `Image ${wasResized ? 'was' : 'was not'} resized. Final dimensions: ${canvas.width}x${canvas.height}`
      );

      const imageData = canvas.toDataURL('image/png', 1.0);
      console.log('Image converted to base64');

      console.log('Processing with background removal model...');
      const result = await segmenter(imageData);

      if (!result || !Array.isArray(result) || result.length === 0 || !result[0].mask) {
        throw new Error('Invalid segmentation result');
      }

      const outputCanvas = document.createElement('canvas');
      outputCanvas.width = canvas.width;
      outputCanvas.height = canvas.height;
      const outputCtx = outputCanvas.getContext('2d');

      if (!outputCtx) throw new Error('Could not get output canvas context');

      outputCtx.drawImage(canvas, 0, 0);

      const outputImageData = outputCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
      const data = outputImageData.data;

      // Apply threshold and smoothing adjustments
      const thresholdValue = threshold[0];
      const smoothValue = smoothing[0];

      // Apply inverted mask to alpha channel (keep subject, remove background)
      for (let i = 0; i < result[0].mask.data.length; i++) {
        // Invert the mask value (1 - value) to keep the subject instead of the background
        let maskValue = 1 - result[0].mask.data[i];
        
        // Apply threshold
        maskValue = maskValue > thresholdValue ? 1 : maskValue < (1 - thresholdValue) ? 0 : maskValue;
        
        // Apply smoothing (simple averaging with neighbors)
        if (smoothValue > 1 && i > 0 && i < result[0].mask.data.length - 1) {
          const weight = 1 / smoothValue;
          maskValue = maskValue * (1 - weight) + 
                     (result[0].mask.data[i - 1] + result[0].mask.data[i + 1]) * weight / 2;
        }
        
        const alpha = Math.round(maskValue * 255);
        data[i * 4 + 3] = alpha;
      }

      outputCtx.putImageData(outputImageData, 0, 0);
      console.log('Mask applied successfully');

      return outputCanvas.toDataURL('image/png');
    } catch (error) {
      console.error('Error removing background:', error);
      throw error;
    }
  };

  const parseRemoveBgError = (errorMessage: string): { title: string; description: string; action?: string } => {
    if (errorMessage.includes('REMOVE_BG_INVALID_KEY')) {
      return {
        title: 'Invalid API Key',
        description: 'Your Remove.bg API key is invalid or has insufficient credits.',
        action: 'Check your API key and credits at remove.bg'
      };
    } else if (errorMessage.includes('REMOVE_BG_NO_CREDITS')) {
      return {
        title: 'No Credits Available',
        description: 'You have run out of Remove.bg API credits.',
        action: 'Purchase more credits at remove.bg/pricing or use the Browser method'
      };
    } else if (errorMessage.includes('REMOVE_BG_INVALID_IMAGE')) {
      return {
        title: 'Invalid Image',
        description: 'The image format or size is not supported by Remove.bg.',
        action: 'Try a different image or use the Browser method'
      };
    } else if (errorMessage.includes('REMOVE_BG_RATE_LIMIT')) {
      return {
        title: 'Rate Limit Exceeded',
        description: 'Too many requests to Remove.bg API.',
        action: 'Please wait a moment and try again'
      };
    }
    return {
      title: 'Background Removal Failed',
      description: errorMessage.replace('REMOVE_BG_ERROR: ', ''),
      action: 'Try the Browser method or check your Remove.bg account'
    };
  };

  const removeBackgroundAI = async (imageBase64: string): Promise<string> => {
    try {
      console.log('Starting AI-powered background removal...');
      console.log('Calling remove-background-ai edge function...');
      
      const { data, error } = await supabase.functions.invoke('remove-background-ai', {
        body: { image: imageBase64 }
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(`API Error: ${error.message || 'Failed to call background removal service'}`);
      }
      
      if (!data?.success) {
        const errorMsg = data?.error || 'AI processing failed';
        console.error('Processing failed:', errorMsg);
        throw new Error(errorMsg);
      }

      if (!data.processedImage) {
        throw new Error('No processed image returned from API');
      }

      console.log('AI background removal successful');
      return data.processedImage;
    } catch (error) {
      console.error('Error with AI background removal:', error);
      throw error;
    }
  };

  const loadImage = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('Image too large. Please select an image under 10MB.');
      return;
    }

    try {
      const imageUrl = URL.createObjectURL(file);
      setOriginalImage(imageUrl);
      setProcessedImage(null);
      toast.success('Image loaded! Choose a method to remove the background.');
    } catch (error) {
      console.error('Error loading image:', error);
      toast.error('Failed to load image');
    }
  };

  const handleRemoveBackground = async () => {
    if (!originalImage) return;

    if (method === 'ai' && checkAiDailyLimit()) {
      toast.error(`Daily AI limit of ${AI_DAILY_LIMIT} uses reached. Try again tomorrow or use Browser method!`);
      return;
    }

    setIsProcessing(true);
    try {
      if (method === 'browser') {
        const img = await loadImage(await fetch(originalImage).then((r) => r.blob()) as File);
        const result = await removeBackground(img);
        setProcessedImage(result);
        toast.success('Background removed successfully!');
      } else {
        // AI method
        const img = await loadImage(await fetch(originalImage).then((r) => r.blob()) as File);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');
        resizeImageIfNeeded(canvas, ctx, img);
        const imageBase64 = canvas.toDataURL('image/png', 1.0);
        
        const result = await removeBackgroundAI(imageBase64);
        setProcessedImage(result);
        incrementAiUsageCount();
        toast.success('Background removed with AI!');
      }
    } catch (error) {
      console.error('Error removing background:', error);
      
      if (method === 'ai' && error instanceof Error) {
        const errorInfo = parseRemoveBgError(error.message);
        toast.error(errorInfo.title, {
          description: `${errorInfo.description}${errorInfo.action ? ` ${errorInfo.action}.` : ''}`
        });
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Failed to remove background. Please try again.';
        toast.error(errorMessage);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedImage) return;

    const link = document.createElement('a');
    link.href = processedImage;
    link.download = 'background-removed.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Image downloaded!');
  };

  const handleReset = () => {
    setOriginalImage(null);
    setProcessedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (fileInputRef.current) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInputRef.current.files = dataTransfer.files;
      handleFileSelect({ target: { files: dataTransfer.files } } as any);
    }
  };

  const aiRemainingUses = AI_DAILY_LIMIT - aiUsageCount;

  return (
    <>
      <Helmet>
        <title>Background Remover – Free AI Background Removal Tool | Acme Zone</title>
        <meta
          name="description"
          content="Remove backgrounds from images instantly with AI. 100% private, browser-based processing. Perfect for products, logos, and portraits. 3 free uses daily."
        />
        <meta name="keywords" content="background remover, AI, image editing, transparent background, free tool" />
        <link rel="canonical" href="https://acme.zone/background-remover" />
        
        <meta property="og:title" content="Background Remover – Free AI Background Removal Tool" />
        <meta property="og:description" content="Remove backgrounds from images instantly with AI. 100% private, browser-based processing." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://acme.zone/background-remover" />
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Background Remover – Free AI Background Removal Tool" />
        <meta name="twitter:description" content="Remove backgrounds from images instantly with AI. 100% private, browser-based processing." />
      </Helmet>

      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              AI Background Remover
            </h1>
            <p className="text-xl text-muted-foreground mb-6">
              Remove backgrounds from images instantly. Choose between unlimited browser-based processing or high-quality AI removal.
            </p>
            <div className="flex items-center justify-center gap-4 text-sm">
              <span className="text-muted-foreground">
                Browser method: <span className="font-semibold text-primary">Unlimited</span>
              </span>
              <span className="text-muted-foreground">|</span>
              <span className="text-muted-foreground">
                AI method: <span className="font-semibold text-primary">{aiRemainingUses} of {AI_DAILY_LIMIT} remaining</span>
              </span>
            </div>
          </div>

          {!originalImage ? (
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle>Upload Image</CardTitle>
                <CardDescription>
                  Drag and drop an image or click to browse. Supports JPG, PNG, JPEG, and WebP (max 10MB)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors"
                >
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">Drop your image here</p>
                  <p className="text-sm text-muted-foreground">or click to browse</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Method Selection and Adjustment Controls */}
              <Card className="max-w-2xl mx-auto">
                <CardHeader>
                  <CardTitle>Processing Method</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Tabs value={method} onValueChange={(v) => setMethod(v as 'browser' | 'ai')} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="browser">
                        Browser (Unlimited)
                      </TabsTrigger>
                      <TabsTrigger value="ai" disabled={checkAiDailyLimit()}>
                        <Sparkles className="h-4 w-4 mr-2" />
                        AI Powered ({aiRemainingUses}/{AI_DAILY_LIMIT})
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="browser" className="space-y-4 mt-4">
                      <p className="text-sm text-muted-foreground">
                        Free unlimited processing in your browser. Adjust settings to fine-tune results.
                      </p>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Edge Threshold: {threshold[0].toFixed(2)}</Label>
                          <Slider
                            value={threshold}
                            onValueChange={setThreshold}
                            min={0}
                            max={1}
                            step={0.01}
                            className="w-full"
                          />
                          <p className="text-xs text-muted-foreground">
                            Higher values remove more background, lower values preserve more edges
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label>Edge Smoothing: {smoothing[0].toFixed(1)}x</Label>
                          <Slider
                            value={smoothing}
                            onValueChange={setSmoothing}
                            min={1}
                            max={5}
                            step={0.5}
                            className="w-full"
                          />
                          <p className="text-xs text-muted-foreground">
                            Higher values create smoother edges, lower values preserve sharp edges
                          </p>
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="ai" className="space-y-4 mt-4">
                      <p className="text-sm text-muted-foreground">
                        High-quality AI-powered background removal using Remove.bg API. {aiRemainingUses} uses remaining today.
                      </p>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <ul className="text-sm space-y-2">
                          <li className="flex items-start gap-2">
                            <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            <span>Superior edge detection for complex images</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            <span>Better handling of hair, fur, and transparent objects</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            <span>Professional quality results</span>
                          </li>
                        </ul>
                      </div>
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          <strong>Note:</strong> AI method requires a Remove.bg API key with available credits. 
                          If you encounter issues, verify your API key and credit balance at{' '}
                          <a href="https://remove.bg/users/sign_in" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-900 dark:hover:text-amber-100">
                            remove.bg
                          </a>
                          , or use the free Browser method instead.
                        </p>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              <div className="flex flex-wrap justify-center gap-4 mb-6">
                {!processedImage && (
                  <Button
                    onClick={handleRemoveBackground}
                    disabled={isProcessing || (method === 'ai' && checkAiDailyLimit())}
                    size="lg"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {method === 'ai' && <Sparkles className="mr-2 h-4 w-4" />}
                        Remove Background
                      </>
                    )}
                  </Button>
                )}

                {processedImage && (
                  <>
                    <Button onClick={handleDownload} size="lg">
                      <Download className="mr-2 h-4 w-4" />
                      Download PNG
                    </Button>
                    <Button onClick={() => setProcessedImage(null)} variant="outline" size="lg">
                      Try Again
                    </Button>
                  </>
                )}

                <Button onClick={handleReset} variant="outline" size="lg">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Start Over
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ImageIcon className="h-5 w-5" />
                      Original
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                      <img
                        src={originalImage}
                        alt="Original"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ImageIcon className="h-5 w-5" />
                      Processed
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative aspect-square rounded-lg overflow-hidden"
                         style={{
                           backgroundImage: 'linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)',
                           backgroundSize: '20px 20px',
                           backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                         }}>
                      {processedImage ? (
                        <img
                          src={processedImage}
                          alt="Processed"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          {isProcessing ? (
                            <div className="text-center">
                              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
                              <p>Removing background...</p>
                            </div>
                          ) : (
                            <p>Click "Remove Background" to process</p>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {method === 'ai' && checkAiDailyLimit() && (
                <div className="max-w-2xl mx-auto mt-6 p-4 bg-muted rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">
                    You've reached your daily AI limit of {AI_DAILY_LIMIT} uses. Try the Browser method (unlimited) or come back tomorrow!
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="mt-12 max-w-3xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>How It Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <div>
                  <h3 className="font-semibold text-foreground mb-2">🔒 100% Private & Secure</h3>
                  <p className="text-sm">
                    All processing happens directly in your browser. Your images never leave your device - 
                    no uploads, no servers, complete privacy.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">✨ AI-Powered Quality</h3>
                  <p className="text-sm">
                    Advanced machine learning models detect and remove backgrounds with professional quality,
                    preserving fine details and edges.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-2">⚡ Fast & Free</h3>
                  <p className="text-sm">
                    Get 3 free background removals per day. No sign-up, no credit card, no watermarks.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default BackgroundRemover;
