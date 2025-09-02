import React, { useState, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Download, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = false;

const ICON_SIZES = [16, 48, 128] as const;

interface ProcessedImage {
  size: number;
  url: string;
  blob: Blob;
}

const ChromeExtensionImageEditor: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadImage = (file: Blob): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const removeBackground = async (imageElement: HTMLImageElement): Promise<Blob> => {
    try {
      console.log('Starting background removal process...');
      const segmenter = await pipeline('image-segmentation', 'Xenova/segformer-b0-finetuned-ade-512-512', {
        device: 'webgpu',
      });
      
      // Convert HTMLImageElement to canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) throw new Error('Could not get canvas context');
      
      // Resize image if needed for processing (max 1024px)
      let width = imageElement.naturalWidth;
      let height = imageElement.naturalHeight;
      const maxDimension = 1024;
      
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(imageElement, 0, 0, width, height);
      
      // Get image data as base64
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      console.log('Processing with segmentation model...');
      
      // Process the image with the segmentation model
      const result = await segmenter(imageData);
      
      if (!result || !Array.isArray(result) || result.length === 0 || !result[0].mask) {
        throw new Error('Invalid segmentation result');
      }
      
      // Create a new canvas for the masked image
      const outputCanvas = document.createElement('canvas');
      outputCanvas.width = canvas.width;
      outputCanvas.height = canvas.height;
      const outputCtx = outputCanvas.getContext('2d');
      
      if (!outputCtx) throw new Error('Could not get output canvas context');
      
      // Draw original image
      outputCtx.drawImage(canvas, 0, 0);
      
      // Apply the mask
      const outputImageData = outputCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
      const data = outputImageData.data;
      
      // Apply inverted mask to alpha channel
      for (let i = 0; i < result[0].mask.data.length; i++) {
        const alpha = Math.round((1 - result[0].mask.data[i]) * 255);
        data[i * 4 + 3] = alpha;
      }
      
      outputCtx.putImageData(outputImageData, 0, 0);
      console.log('Background removal completed');
      
      // Convert canvas to blob
      return new Promise((resolve, reject) => {
        outputCanvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          },
          'image/png',
          1.0
        );
      });
    } catch (error) {
      console.error('Error removing background:', error);
      throw error;
    }
  };

  const resizeImage = (imageBlob: Blob, targetSize: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        canvas.width = targetSize;
        canvas.height = targetSize;
        
        // Draw image centered and scaled to fit
        const size = Math.min(img.width, img.height);
        const offsetX = (img.width - size) / 2;
        const offsetY = (img.height - size) / 2;
        
        ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, targetSize, targetSize);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to resize image'));
            }
          },
          'image/png',
          1.0
        );
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(imageBlob);
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    try {
      setIsProcessing(true);
      setOriginalImage(URL.createObjectURL(file));
      
      // Load the original image
      const imageElement = await loadImage(file);
      
      // Remove background
      toast.info('Removing background...');
      const backgroundRemovedBlob = await removeBackground(imageElement);
      
      // Create different sizes
      toast.info('Creating icon sizes...');
      const processedImagesPromises = ICON_SIZES.map(async (size) => {
        const resizedBlob = await resizeImage(backgroundRemovedBlob, size);
        return {
          size,
          url: URL.createObjectURL(resizedBlob),
          blob: resizedBlob
        };
      });
      
      const processed = await Promise.all(processedImagesPromises);
      setProcessedImages(processed);
      
      toast.success('Images processed successfully!');
    } catch (error) {
      console.error('Processing error:', error);
      toast.error('Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadImage = (processedImage: ProcessedImage) => {
    const link = document.createElement('a');
    link.href = processedImage.url;
    link.download = `icon-${processedImage.size}x${processedImage.size}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAll = () => {
    processedImages.forEach(img => {
      setTimeout(() => downloadImage(img), 100);
    });
    toast.success('All icons downloaded!');
  };

  return (
    <>
      <Helmet>
        <title>Chrome Extension Image Editor – Format Icons with Background Removal</title>
        <meta name="description" content="Upload any image and automatically format it for Chrome extension icons. AI background removal, multiple sizes, transparent PNG output." />
        <link rel="canonical" href="https://acme.zone/products/chrome-extension-image-editor" />
        <meta property="og:title" content="Chrome Extension Image Editor" />
        <meta property="og:description" content="Professional icon formatter for Chrome extensions with AI background removal" />
        <meta property="og:url" content="https://acme.zone/products/chrome-extension-image-editor" />
        <meta name="twitter:title" content="Chrome Extension Image Editor" />
        <meta name="twitter:description" content="Format images for Chrome extension icons with AI background removal" />
      </Helmet>

      <div className="min-h-screen flex flex-col">
        <Header />
        
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-4">Chrome Extension Image Editor</h1>
              <p className="text-xl text-muted-foreground mb-6">
                Upload any image and automatically format it for Chrome extension submissions with AI background removal
              </p>
            </div>

            <div className="grid gap-8">
              {/* Upload Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload Image
                  </CardTitle>
                  <CardDescription>
                    Upload your image to automatically format it for Chrome extension icons
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div 
                    className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg mb-2">Click to upload an image</p>
                    <p className="text-sm text-muted-foreground">PNG, JPG, JPEG up to 10MB</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </CardContent>
              </Card>

              {/* Processing Status */}
              {isProcessing && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-center gap-3">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span>Processing image...</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Original Image Preview */}
              {originalImage && (
                <Card>
                  <CardHeader>
                    <CardTitle>Original Image</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-center">
                      <img 
                        src={originalImage} 
                        alt="Original" 
                        className="max-w-sm max-h-64 object-contain rounded-lg border"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Processed Images */}
              {processedImages.length > 0 && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Download className="h-5 w-5" />
                        Chrome Extension Icons
                      </CardTitle>
                      <CardDescription>
                        Background removed, transparent PNG format, ready for Chrome Web Store
                      </CardDescription>
                    </div>
                    <Button onClick={downloadAll} className="ml-4">
                      Download All
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {processedImages.map((img) => (
                        <div key={img.size} className="text-center">
                          <div className="bg-checkered p-4 rounded-lg mb-3 inline-block">
                            <img 
                              src={img.url} 
                              alt={`${img.size}x${img.size} icon`}
                              className="block"
                              style={{ width: img.size, height: img.size }}
                            />
                          </div>
                          <p className="font-medium mb-2">{img.size}x{img.size}px</p>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => downloadImage(img)}
                          >
                            Download
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Instructions */}
              <Card>
                <CardHeader>
                  <CardTitle>How to Use</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">1</div>
                    <div>
                      <h4 className="font-medium">Upload Your Image</h4>
                      <p className="text-sm text-muted-foreground">Choose any image file (PNG, JPG, JPEG)</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">2</div>
                    <div>
                      <h4 className="font-medium">Automatic Processing</h4>
                      <p className="text-sm text-muted-foreground">AI removes background and creates all required sizes</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">3</div>
                    <div>
                      <h4 className="font-medium">Download & Use</h4>
                      <p className="text-sm text-muted-foreground">Download individual sizes or all at once for your Chrome extension</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>

        <Footer />
      </div>

      <style>{`
        .bg-checkered {
          background-image: 
            linear-gradient(45deg, #f0f0f0 25%, transparent 25%), 
            linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), 
            linear-gradient(45deg, transparent 75%, #f0f0f0 75%), 
            linear-gradient(-45deg, transparent 75%, #f0f0f0 75%);
          background-size: 20px 20px;
          background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
        }
      `}</style>
    </>
  );
};

export default ChromeExtensionImageEditor;