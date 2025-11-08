import React, { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Download, Loader2, RotateCcw, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;
env.useBrowserCache = false;

const MAX_IMAGE_DIMENSION = 1024;
const DAILY_LIMIT = 3;

const BackgroundRemover: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [usageCount, setUsageCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const count = getUsageCount();
    setUsageCount(count);
  }, []);

  const getTodayKey = () => {
    return new Date().toDateString();
  };

  const getUsageCount = (): number => {
    const today = getTodayKey();
    const stored = localStorage.getItem(`bg_remover_${today}`);
    return stored ? parseInt(stored, 10) : 0;
  };

  const incrementUsageCount = () => {
    const today = getTodayKey();
    const current = getUsageCount();
    const newCount = current + 1;
    localStorage.setItem(`bg_remover_${today}`, newCount.toString());
    setUsageCount(newCount);
  };

  const checkDailyLimit = (): boolean => {
    return getUsageCount() >= DAILY_LIMIT;
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
      console.log('Starting background removal process...');
      
      // Use RMBG model which is specifically trained for background removal
      const segmenter = await pipeline(
        'image-segmentation',
        'Xenova/rmbg-1.4',
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

      console.log('Segmentation result:', result);

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

      // Apply the mask with better edge handling
      // RMBG returns the foreground mask directly, so we use it as-is
      for (let i = 0; i < result[0].mask.data.length; i++) {
        // The mask value represents foreground confidence (0-1)
        // We use it directly as alpha
        const alpha = Math.round(result[0].mask.data[i] * 255);
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

    if (checkDailyLimit()) {
      toast.error(`Daily limit of ${DAILY_LIMIT} uses reached. Try again tomorrow!`);
      return;
    }

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
      toast.success('Image loaded! Click "Remove Background" to process.');
    } catch (error) {
      console.error('Error loading image:', error);
      toast.error('Failed to load image');
    }
  };

  const handleRemoveBackground = async () => {
    if (!originalImage) return;

    if (checkDailyLimit()) {
      toast.error(`Daily limit of ${DAILY_LIMIT} uses reached. Try again tomorrow!`);
      return;
    }

    setIsProcessing(true);
    try {
      const img = await loadImage(await fetch(originalImage).then((r) => r.blob()) as File);
      const result = await removeBackground(img);
      setProcessedImage(result);
      incrementUsageCount();
      toast.success('Background removed successfully!');
    } catch (error) {
      console.error('Error removing background:', error);
      toast.error('Failed to remove background. Please try again.');
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

  const remainingUses = DAILY_LIMIT - usageCount;

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
              Remove backgrounds from images instantly with AI. Perfect for logos, product photos, and graphics.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="text-muted-foreground">Daily uses:</span>
              <span className="font-semibold text-primary">
                {remainingUses} of {DAILY_LIMIT} remaining
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

              <div className="flex flex-wrap justify-center gap-4">
                {!processedImage && (
                  <Button
                    onClick={handleRemoveBackground}
                    disabled={isProcessing || checkDailyLimit()}
                    size="lg"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Remove Background'
                    )}
                  </Button>
                )}

                {processedImage && (
                  <Button onClick={handleDownload} size="lg">
                    <Download className="mr-2 h-4 w-4" />
                    Download PNG
                  </Button>
                )}

                <Button onClick={handleReset} variant="outline" size="lg">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Start Over
                </Button>
              </div>

              {checkDailyLimit() && (
                <div className="max-w-2xl mx-auto mt-6 p-4 bg-muted rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">
                    You've reached your daily limit of {DAILY_LIMIT} uses. Come back tomorrow for more!
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
