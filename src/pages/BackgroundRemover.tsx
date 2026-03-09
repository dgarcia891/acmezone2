import React, { useState, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import JsonLd, { softwareAppSchema, faqSchema, breadcrumbSchema, SITE_URL } from '@/components/seo/JsonLd';
import FAQSection from '@/components/seo/FAQSection';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Download, Loader2, RotateCcw, ImageIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;
env.useBrowserCache = false;

const MAX_IMAGE_DIMENSION = 1024;

const BackgroundRemover: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [threshold, setThreshold] = useState([0.5]);
  const [smoothing, setSmoothing] = useState([1]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      toast.success('Image loaded! Click "Remove Background" to process.');
    } catch (error) {
      console.error('Error loading image:', error);
      toast.error('Failed to load image');
    }
  };

  const handleRemoveBackground = async () => {
    if (!originalImage) return;

    setIsProcessing(true);
    try {
      const img = await loadImage(await fetch(originalImage).then((r) => r.blob()) as File);
      const result = await removeBackground(img);
      setProcessedImage(result);
      toast.success('Background removed successfully!');
    } catch (error) {
      console.error('Error removing background:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove background. Please try again.';
      toast.error(errorMessage);
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

  return (
    <>
      <Helmet>
        <title>Background Remover – Free Browser-Based Background Removal Tool | Acme Zone</title>
        <meta
          name="description"
          content="Remove backgrounds from images instantly in your browser. 100% private, no uploads to servers. Perfect for products, logos, and portraits. Unlimited free uses."
        />
        <meta name="keywords" content="background remover, image editing, transparent background, free tool, browser-based" />
        <link rel="canonical" href="https://acme.zone/background-remover" />
        
        <meta property="og:title" content="Background Remover – Free Browser-Based Background Removal Tool" />
        <meta property="og:description" content="Remove backgrounds from images instantly in your browser. 100% private, no uploads to servers." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://acme.zone/background-remover" />
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Background Remover – Free Browser-Based Background Removal Tool" />
        <meta name="twitter:description" content="Remove backgrounds from images instantly in your browser. 100% private, no uploads to servers." />
      </Helmet>

      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Background Remover
            </h1>
            <p className="text-xl text-muted-foreground mb-6">
              Remove backgrounds from images instantly. Free, unlimited, and 100% private – all processing happens in your browser.
            </p>
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
              {/* Adjustment Controls */}
              <Card className="max-w-2xl mx-auto">
                <CardHeader>
                  <CardTitle>Adjustment Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
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
                        Lower values capture more details but may include background
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Edge Smoothing: {smoothing[0].toFixed(1)}</Label>
                      <Slider
                        value={smoothing}
                        onValueChange={setSmoothing}
                        min={0}
                        max={5}
                        step={0.1}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        Higher values create smoother edges
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Image Preview Grid */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Original Image */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ImageIcon className="h-5 w-5" />
                      Original Image
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-square bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                      <img
                        src={originalImage}
                        alt="Original"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Processed Image */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ImageIcon className="h-5 w-5" />
                      Processed Image
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div 
                      className="aspect-square rounded-lg overflow-hidden flex items-center justify-center"
                      style={{
                        background: 'repeating-conic-gradient(#e5e5e5 0% 25%, white 0% 50%) 50% / 20px 20px'
                      }}
                    >
                      {processedImage ? (
                        <img
                          src={processedImage}
                          alt="Processed"
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <div className="text-center text-muted-foreground p-4">
                          <ImageIcon className="mx-auto h-12 w-12 mb-2 opacity-50" />
                          <p>Click "Remove Background" to process</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap justify-center gap-4">
                <Button
                  onClick={handleRemoveBackground}
                  disabled={isProcessing}
                  size="lg"
                  className="min-w-[200px]"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Remove Background'
                  )}
                </Button>

                {processedImage && (
                  <Button onClick={handleDownload} variant="outline" size="lg">
                    <Download className="mr-2 h-5 w-5" />
                    Download PNG
                  </Button>
                )}

                <Button onClick={handleReset} variant="ghost" size="lg">
                  <RotateCcw className="mr-2 h-5 w-5" />
                  Start Over
                </Button>
              </div>
            </div>
          )}

          {/* Feature List */}
          <div className="mt-16 grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-lg flex items-center justify-center">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">100% Private</h3>
              <p className="text-sm text-muted-foreground">
                All processing happens in your browser. Your images never leave your device.
              </p>
            </div>
            <div>
              <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-lg flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Unlimited Free Uses</h3>
              <p className="text-sm text-muted-foreground">
                No daily limits, no sign-up required. Use as many times as you need.
              </p>
            </div>
            <div>
              <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-lg flex items-center justify-center">
                <Download className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">High Quality Output</h3>
              <p className="text-sm text-muted-foreground">
                Download transparent PNG files ready for any use.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default BackgroundRemover;
