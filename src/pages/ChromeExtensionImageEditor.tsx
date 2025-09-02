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

const ICON_SIZES = [16, 32, 48, 128] as const;

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
      
      // Try a different, higher quality model
      const segmenter = await pipeline('image-segmentation', 'Xenova/segformer-b2-finetuned-ade-512-512', {
        device: 'webgpu',
      });
      
      // Work at higher resolution for better quality
      const originalWidth = imageElement.naturalWidth;
      const originalHeight = imageElement.naturalHeight;
      console.log(`Original image dimensions: ${originalWidth}x${originalHeight}`);
      
      // Create canvas at original resolution
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) throw new Error('Could not get canvas context');
      
      canvas.width = originalWidth;
      canvas.height = originalHeight;
      
      // Enable high-quality rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(imageElement, 0, 0);
      
      // For AI processing, limit to 1024px max dimension for quality vs performance balance
      let processCanvas = canvas;
      let processCtx = ctx;
      const maxDimension = 1024;
      
      if (originalWidth > maxDimension || originalHeight > maxDimension) {
        processCanvas = document.createElement('canvas');
        processCtx = processCanvas.getContext('2d');
        if (!processCtx) throw new Error('Could not get process canvas context');
        
        let processWidth = originalWidth;
        let processHeight = originalHeight;
        
        if (originalWidth > originalHeight) {
          processHeight = Math.round((originalHeight * maxDimension) / originalWidth);
          processWidth = maxDimension;
        } else {
          processWidth = Math.round((originalWidth * maxDimension) / originalHeight);
          processHeight = maxDimension;
        }
        
        console.log(`Processing at: ${processWidth}x${processHeight}`);
        
        processCanvas.width = processWidth;
        processCanvas.height = processHeight;
        processCtx.imageSmoothingEnabled = true;
        processCtx.imageSmoothingQuality = 'high';
        processCtx.drawImage(imageElement, 0, 0, processWidth, processHeight);
      }
      
      // Get image data as high-quality PNG
      const imageData = processCanvas.toDataURL('image/png', 1.0);
      console.log('Processing with segmentation model...');
      
      // Process the image with the segmentation model
      const result = await segmenter(imageData);
      console.log('Segmentation result:', result);
      
      if (!result || !Array.isArray(result) || result.length === 0 || !result[0].mask) {
        throw new Error('Invalid segmentation result');
      }
      
      // Create output canvas at original resolution for best quality
      const outputCanvas = document.createElement('canvas');
      outputCanvas.width = originalWidth;
      outputCanvas.height = originalHeight;
      const outputCtx = outputCanvas.getContext('2d');
      
      if (!outputCtx) throw new Error('Could not get output canvas context');
      
      // Enable high-quality rendering
      outputCtx.imageSmoothingEnabled = true;
      outputCtx.imageSmoothingQuality = 'high';
      
      // Draw original high-res image
      outputCtx.drawImage(imageElement, 0, 0);
      
      // Handle mask scaling
      const maskWidth = processCanvas.width;
      const maskHeight = processCanvas.height;
      console.log(`Mask dimensions: ${maskWidth}x${maskHeight}`);
      
      // Create mask canvas for visualization/debugging
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = maskWidth;
      maskCanvas.height = maskHeight;
      const maskCtx = maskCanvas.getContext('2d');
      if (!maskCtx) throw new Error('Could not get mask canvas context');
      
      const maskImageData = maskCtx.createImageData(maskWidth, maskHeight);
      for (let i = 0; i < result[0].mask.data.length; i++) {
        const value = Math.round((1 - result[0].mask.data[i]) * 255); // Invert here
        maskImageData.data[i * 4] = value;     // R
        maskImageData.data[i * 4 + 1] = value; // G
        maskImageData.data[i * 4 + 2] = value; // B
        maskImageData.data[i * 4 + 3] = 255;   // A
      }
      maskCtx.putImageData(maskImageData, 0, 0);
      
      // Apply mask using destination-in composite operation for cleaner results
      if (maskWidth !== originalWidth || maskHeight !== originalHeight) {
        // Scale mask to match original image
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = originalWidth;
        tempCanvas.height = originalHeight;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) throw new Error('Could not get temp canvas context');
        
        tempCtx.imageSmoothingEnabled = true;
        tempCtx.imageSmoothingQuality = 'high';
        tempCtx.drawImage(maskCanvas, 0, 0, originalWidth, originalHeight);
        
        // Use the scaled mask
        outputCtx.globalCompositeOperation = 'destination-in';
        outputCtx.drawImage(tempCanvas, 0, 0);
      } else {
        // Use mask directly
        outputCtx.globalCompositeOperation = 'destination-in';
        outputCtx.drawImage(maskCanvas, 0, 0);
      }
      
      outputCtx.globalCompositeOperation = 'source-over'; // Reset
      console.log('Background removal completed');
      
      // Convert canvas to blob
      return new Promise((resolve, reject) => {
        outputCanvas.toBlob(
          (blob) => {
            if (blob) {
              console.log(`Output blob size: ${blob.size} bytes`);
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
        console.log(`Resizing to ${targetSize}x${targetSize}, original: ${img.width}x${img.height}`);
        
        // For small icons, use a high-quality supersampling approach
        if (targetSize <= 48) {
          // Create a very high resolution intermediate (8x target size minimum)
          const supersampleFactor = Math.max(8, Math.ceil(512 / targetSize));
          const supersampleSize = targetSize * supersampleFactor;
          
          console.log(`Using supersampling factor ${supersampleFactor} for ${targetSize}px icon`);
          
          // Step 1: Create high-resolution version
          const supersampleCanvas = document.createElement('canvas');
          const supersampleCtx = supersampleCanvas.getContext('2d');
          
          if (!supersampleCtx) {
            reject(new Error('Could not get supersample canvas context'));
            return;
          }
          
          supersampleCanvas.width = supersampleSize;
          supersampleCanvas.height = supersampleSize;
          
          // Use highest quality settings for supersampling
          supersampleCtx.imageSmoothingEnabled = true;
          supersampleCtx.imageSmoothingQuality = 'high';
          
          // Draw at very high resolution, maintaining aspect ratio
          const size = Math.min(img.width, img.height);
          const offsetX = (img.width - size) / 2;
          const offsetY = (img.height - size) / 2;
          
          supersampleCtx.drawImage(img, offsetX, offsetY, size, size, 0, 0, supersampleSize, supersampleSize);
          
          // Step 2: Apply sharpening at high resolution
          const supersampleImageData = supersampleCtx.getImageData(0, 0, supersampleSize, supersampleSize);
          const sharpenedData = applyAdvancedSharpening(supersampleImageData);
          supersampleCtx.putImageData(sharpenedData, 0, 0);
          
          // Step 3: Create final canvas and downsample with high quality
          const finalCanvas = document.createElement('canvas');
          const finalCtx = finalCanvas.getContext('2d');
          
          if (!finalCtx) {
            reject(new Error('Could not get final canvas context'));
            return;
          }
          
          finalCanvas.width = targetSize;
          finalCanvas.height = targetSize;
          
          // Use high-quality downsampling
          finalCtx.imageSmoothingEnabled = true;
          finalCtx.imageSmoothingQuality = 'high';
          
          // Downsample from high-res to final size
          finalCtx.drawImage(supersampleCanvas, 0, 0, supersampleSize, supersampleSize, 0, 0, targetSize, targetSize);
          
          // Step 4: Apply final small-icon optimizations
          const finalImageData = finalCtx.getImageData(0, 0, targetSize, targetSize);
          const optimizedData = optimizeSmallIcon(finalImageData, targetSize);
          finalCtx.putImageData(optimizedData, 0, 0);
          
          finalCanvas.toBlob(
            (blob) => {
              if (blob) {
                console.log(`High-quality small icon (${targetSize}px) blob size: ${blob.size} bytes`);
                resolve(blob);
              } else {
                reject(new Error('Failed to create high-quality small icon'));
              }
            },
            'image/png',
            1.0
          );
        } else {
          // For larger icons (128px), use standard high-quality approach
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          canvas.width = targetSize;
          canvas.height = targetSize;
          
          // Use high-quality scaling for larger icons
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          // Center the image and maintain aspect ratio
          const size = Math.min(img.width, img.height);
          const offsetX = (img.width - size) / 2;
          const offsetY = (img.height - size) / 2;
          
          ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, targetSize, targetSize);
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                console.log(`Large icon (${targetSize}px) blob size: ${blob.size} bytes`);
                resolve(blob);
              } else {
                reject(new Error('Failed to resize large image'));
              }
            },
            'image/png',
            1.0
          );
        }
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(imageBlob);
    });
  };

  const applyAdvancedSharpening = (imageData: ImageData): ImageData => {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const newData = new Uint8ClampedArray(data);
    
    // Advanced unsharp mask kernel
    const kernel = [
      -1, -1, -1,
      -1,  9, -1,
      -1, -1, -1
    ];
    const kernelWeight = 1;
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) { // RGB channels only, preserve alpha
          let sum = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((y + ky) * width + (x + kx)) * 4 + c;
              sum += data[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
            }
          }
          const idx = (y * width + x) * 4 + c;
          newData[idx] = Math.max(0, Math.min(255, sum / kernelWeight));
        }
      }
    }
    
    return new ImageData(newData, width, height);
  };

  const optimizeSmallIcon = (imageData: ImageData, size: number): ImageData => {
    const data = imageData.data;
    const newData = new Uint8ClampedArray(data);
    
    // For very small icons, enhance contrast and clarity
    if (size <= 32) {
      // Apply contrast enhancement
      const contrast = 1.2; // Increase contrast slightly
      const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
      
      for (let i = 0; i < data.length; i += 4) {
        // Apply contrast to RGB channels
        for (let c = 0; c < 3; c++) {
          const value = data[i + c];
          newData[i + c] = Math.max(0, Math.min(255, factor * (value - 128) + 128));
        }
        // Preserve alpha channel
        newData[i + 3] = data[i + 3];
      }
    }
    
    return new ImageData(newData, imageData.width, imageData.height);
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
      
      // First, let's test without background removal to isolate the quality issue
      console.log('Testing resize quality without background removal...');
      const testProcessedImages = ICON_SIZES.map(async (size) => {
        console.log(`Creating test size: ${size}x${size}`);
        const resizedBlob = await resizeImage(new Blob([file], { type: file.type }), size);
        return {
          size,
          url: URL.createObjectURL(resizedBlob),
          blob: resizedBlob
        };
      });
      
      const testProcessed = await Promise.all(testProcessedImages);
      console.log('Test resize results:', testProcessed.map(p => ({ size: p.size, blobSize: p.blob.size })));
      
      // Now try with background removal
      const processedImagesPromises = ICON_SIZES.map(async (size) => {
        console.log(`Creating final size: ${size}x${size}`);
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
    link.download = `icon${processedImage.size}.png`;
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