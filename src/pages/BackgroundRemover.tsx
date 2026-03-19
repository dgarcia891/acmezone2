import React, { useState, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Download, Loader2, RotateCcw, ImageIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { removeBackground as imglyRemoveBackground } from '@imgly/background-removal';

const BackgroundRemover: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const removeBackground = async (imageElement: HTMLImageElement): Promise<string> => {
    try {
      console.log('Starting browser-based background removal...');
      const blob = await imglyRemoveBackground(imageElement.src, {
        publicPath: "https://unpkg.com/@imgly/background-removal-data@1.7.0/dist/"
      });
      return URL.createObjectURL(blob);
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
      handleFileSelect({ target: { files: dataTransfer.files } } as unknown as React.ChangeEvent<HTMLInputElement>);
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
