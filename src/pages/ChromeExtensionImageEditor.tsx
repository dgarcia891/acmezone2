import React, { useState, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Upload, Download, Image as ImageIcon, Loader2, RotateCcw, Settings } from 'lucide-react';
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
  const [showPreview, setShowPreview] = useState(false);
  const [previewSettings, setPreviewSettings] = useState({
    margin: 10,
    scaleMode: 'fit' as 'fit' | 'fill' | 'crop'
  });
  const [originalImageElement, setOriginalImageElement] = useState<HTMLImageElement | null>(null);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [isCodeValid, setIsCodeValid] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Daily conversion limit functions
  const DAILY_LIMIT = 10;
  const UNLOCK_CODE = '24202';

  const getTodayKey = () => {
    return new Date().toDateString();
  };

  const getConversionCount = () => {
    const today = getTodayKey();
    const stored = localStorage.getItem(`conversions_${today}`);
    return stored ? parseInt(stored, 10) : 0;
  };

  const incrementConversionCount = () => {
    const today = getTodayKey();
    const current = getConversionCount();
    localStorage.setItem(`conversions_${today}`, (current + 1).toString());
  };

  const checkDailyLimit = () => {
    const count = getConversionCount();
    return count >= DAILY_LIMIT && !isCodeValid;
  };

  const validateCode = (code: string) => {
    return code === UNLOCK_CODE;
  };

  const handleCodeSubmit = () => {
    if (validateCode(codeInput)) {
      setIsCodeValid(true);
      setShowCodeDialog(false);
      setCodeInput('');
      toast.success('Code accepted! You can now continue processing images.');
    } else {
      toast.error('Invalid code. Please try again.');
    }
  };

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

  const resizeImageWithSettings = (imageBlob: Blob, targetSize: number, settings = previewSettings): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        console.log(`Resizing to ${targetSize}x${targetSize}, original: ${img.width}x${img.height}`);
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        canvas.width = targetSize;
        canvas.height = targetSize;
        
        // Always use high-quality smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Calculate available space after margin
        const marginPixels = (settings.margin / 100) * targetSize;
        const availableSize = targetSize - (marginPixels * 2);
        
        let scale, scaledWidth, scaledHeight, offsetX, offsetY;
        
        if (settings.scaleMode === 'fit') {
          // Fit entire image within available space
          scale = Math.min(availableSize / img.width, availableSize / img.height);
          scaledWidth = img.width * scale;
          scaledHeight = img.height * scale;
          offsetX = (targetSize - scaledWidth) / 2;
          offsetY = (targetSize - scaledHeight) / 2;
        } else if (settings.scaleMode === 'fill') {
          // Fill available space, may crop image
          scale = Math.max(availableSize / img.width, availableSize / img.height);
          scaledWidth = img.width * scale;
          scaledHeight = img.height * scale;
          offsetX = (targetSize - scaledWidth) / 2;
          offsetY = (targetSize - scaledHeight) / 2;
        } else { // crop
          // Use largest square crop from center of image
          const minDimension = Math.min(img.width, img.height);
          const cropX = (img.width - minDimension) / 2;
          const cropY = (img.height - minDimension) / 2;
          
          scaledWidth = availableSize;
          scaledHeight = availableSize;
          offsetX = marginPixels;
          offsetY = marginPixels;
          
          // Draw cropped image
          ctx.drawImage(
            img,
            cropX, cropY, minDimension, minDimension,  // source (cropped square)
            offsetX, offsetY, scaledWidth, scaledHeight // destination
          );
          
          canvas.toBlob(resolve, 'image/png', 1.0);
          return;
        }
        
        // Draw the image with calculated dimensions
        ctx.drawImage(
          img,
          0, 0, img.width, img.height,              // source (full image)
          offsetX, offsetY, scaledWidth, scaledHeight // destination
        );
        
        canvas.toBlob(resolve, 'image/png', 1.0);
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
      // Clear previous state and free memory
      if (originalImage) {
        URL.revokeObjectURL(originalImage);
      }
      processedImages.forEach(img => {
        URL.revokeObjectURL(img.url);
      });
      
      // Reset all state to initial values
      setOriginalImage(null);
      setProcessedImages([]);
      setIsProcessing(true);
      
      // Set new original image
      setOriginalImage(URL.createObjectURL(file));
      
      // Load the original image and store it for preview
      const imageElement = await loadImage(file);
      setOriginalImageElement(imageElement);
      
      // Show preview instead of immediately processing
      setShowPreview(true);
      toast.info('Image loaded! Adjust settings and click process.');
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

  const processImages = async () => {
    if (!originalImageElement) return;
    
    // Check daily limit
    if (checkDailyLimit()) {
      setShowCodeDialog(true);
      return;
    }
    
    setIsProcessing(true);
    setShowPreview(false);
    
    try {
      // Remove background
      toast.info('Removing background...');
      const backgroundRemovedBlob = await removeBackground(originalImageElement);
      
      // Create different sizes with current settings
      toast.info('Creating icon sizes...');
      
      const processedImagesPromises = ICON_SIZES.map(async (size) => {
        console.log(`Creating final size: ${size}x${size}`);
        const resizedBlob = await resizeImageWithSettings(backgroundRemovedBlob, size);
        return {
          size,
          url: URL.createObjectURL(resizedBlob),
          blob: resizedBlob
        };
      });
      
      const processed = await Promise.all(processedImagesPromises);
      setProcessedImages(processed);
      
      // Increment conversion count after successful processing
      incrementConversionCount();
      
      toast.success('Images processed successfully!');
    } catch (error) {
      console.error('Processing error:', error);
      toast.error('Failed to process image. Please try again.');
      setShowPreview(true); // Show preview again on error
    } finally {
      setIsProcessing(false);
    }
  };

  const resetEditor = () => {
    // Revoke URLs to prevent memory leaks
    if (originalImage) {
      URL.revokeObjectURL(originalImage);
    }
    processedImages.forEach(img => {
      URL.revokeObjectURL(img.url);
    });
    
    // Reset all state
    setOriginalImage(null);
    setProcessedImages([]);
    setOriginalImageElement(null);
    setShowPreview(false);
    setIsProcessing(false);
    setPreviewSettings({ margin: 10, scaleMode: 'fit' });
    setShowCodeDialog(false);
    setCodeInput('');
    setIsCodeValid(false);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    toast.success('Editor reset successfully!');
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

              {/* Preview Settings */}
              {showPreview && originalImage && originalImageElement && (
                <Card className="border-2 border-primary/50 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-primary">
                      <Settings className="h-5 w-5" />
                      🎯 Adjust Settings Before Processing
                    </CardTitle>
                    <CardDescription className="text-lg font-medium">
                      Preview how your icons will look and adjust margins and scaling, then click "Process Images" below
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Settings Controls */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Margin Control */}
                      <div className="space-y-3">
                        <Label htmlFor="margin-slider">
                          Margin: {previewSettings.margin}%
                        </Label>
                        <Slider
                          id="margin-slider"
                          min={0}
                          max={30}
                          step={1}
                          value={[previewSettings.margin]}
                          onValueChange={([value]) => 
                            setPreviewSettings(prev => ({ ...prev, margin: value }))
                          }
                          className="w-full"
                        />
                      </div>

                      {/* Scale Mode Control */}
                      <div className="space-y-3">
                        <Label>Scale Mode</Label>
                        <div className="flex gap-2">
                          {[
                            { value: 'fit', label: 'Fit All' },
                            { value: 'fill', label: 'Fill' },
                            { value: 'crop', label: 'Crop' }
                          ].map(({ value, label }) => (
                            <Button
                              key={value}
                              variant={previewSettings.scaleMode === value ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => 
                                setPreviewSettings(prev => ({ ...prev, scaleMode: value as any }))
                              }
                            >
                              {label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Preview Grid */}
                    <div className="space-y-4">
                      <h4 className="font-medium">Preview (Background will be removed)</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {ICON_SIZES.map((size) => (
                          <div key={size} className="text-center">
                            <div className="bg-checkered p-2 rounded-lg mb-2 inline-block">
                              <PreviewIcon 
                                originalImage={originalImageElement}
                                size={size}
                                settings={previewSettings}
                              />
                            </div>
                            <p className="text-sm font-medium">{size}×{size}px</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Process Button */}
                    <div className="pt-4 border-t">
                      <Button 
                        onClick={processImages}
                        className="w-full h-12 text-lg font-semibold"
                        size="lg"
                      >
                        🚀 Process Images with Background Removal
                      </Button>
                      <p className="text-sm text-muted-foreground text-center mt-2">
                        This will remove the background and create all icon sizes
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Original Image Preview */}
              {originalImage && !showPreview && (
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
                    <div className="flex gap-2">
                      <Button onClick={downloadAll} className="flex-1">
                        <Download className="h-4 w-4 mr-2" />
                        Download All
                      </Button>
                      <Button 
                        onClick={resetEditor}
                        variant="outline"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reset
                      </Button>
                    </div>
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
        
        {/* Code Entry Dialog */}
        <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Daily Limit Reached</DialogTitle>
              <DialogDescription>
                You've reached the daily limit of {DAILY_LIMIT} image conversions. 
                Enter the unlock code to continue processing more images today.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="unlock-code">Unlock Code</Label>
                <Input
                  id="unlock-code"
                  type="text"
                  placeholder="Enter unlock code..."
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCodeSubmit()}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCodeDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCodeSubmit}>
                Submit Code
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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

// Preview component to show how icons will look
const PreviewIcon: React.FC<{
  originalImage: HTMLImageElement;
  size: number;
  settings: { margin: number; scaleMode: 'fit' | 'fill' | 'crop' };
}> = ({ originalImage, size, settings }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = size;
    canvas.height = size;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);
    
    // Enable high-quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Calculate available space after margin
    const marginPixels = (settings.margin / 100) * size;
    const availableSize = size - (marginPixels * 2);

    let scale, scaledWidth, scaledHeight, offsetX, offsetY;

    if (settings.scaleMode === 'fit') {
      // Fit entire image within available space
      scale = Math.min(availableSize / originalImage.width, availableSize / originalImage.height);
      scaledWidth = originalImage.width * scale;
      scaledHeight = originalImage.height * scale;
      offsetX = (size - scaledWidth) / 2;
      offsetY = (size - scaledHeight) / 2;
    } else if (settings.scaleMode === 'fill') {
      // Fill available space, may crop image
      scale = Math.max(availableSize / originalImage.width, availableSize / originalImage.height);
      scaledWidth = originalImage.width * scale;
      scaledHeight = originalImage.height * scale;
      offsetX = (size - scaledWidth) / 2;
      offsetY = (size - scaledHeight) / 2;
    } else { // crop
      // Use largest square crop from center of image
      const minDimension = Math.min(originalImage.width, originalImage.height);
      const cropX = (originalImage.width - minDimension) / 2;
      const cropY = (originalImage.height - minDimension) / 2;

      scaledWidth = availableSize;
      scaledHeight = availableSize;
      offsetX = marginPixels;
      offsetY = marginPixels;

      // Draw cropped image
      ctx.drawImage(
        originalImage,
        cropX, cropY, minDimension, minDimension,  // source (cropped square)
        offsetX, offsetY, scaledWidth, scaledHeight // destination
      );
      return;
    }

    // Draw the image with calculated dimensions
    ctx.drawImage(
      originalImage,
      0, 0, originalImage.width, originalImage.height,    // source (full image)
      offsetX, offsetY, scaledWidth, scaledHeight         // destination
    );
  }, [originalImage, size, settings]);

  return (
    <canvas 
      ref={canvasRef} 
      width={size} 
      height={size}
      style={{ width: size, height: size }}
      className="border rounded"
    />
  );
};

export default ChromeExtensionImageEditor;