import React, { useState, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import JsonLd, { softwareAppSchema, faqSchema, breadcrumbSchema, SITE_URL } from '@/components/seo/JsonLd';
import FAQSection from '@/components/seo/FAQSection';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Upload, Download, Image as ImageIcon, Loader2, RotateCcw } from 'lucide-react';
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
  const [cropMode, setCropMode] = useState(false);
  const [cropSelection, setCropSelection] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);

  // Redraw canvas when crop mode or selection changes
  React.useEffect(() => {
    if (originalImageElement) {
      drawImageWithCropOverlay();
    }
  }, [cropMode, cropSelection, originalImageElement]);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!cropMode || !imageCanvasRef.current) return;
    
    const canvas = imageCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const startX = (e.clientX - rect.left) * scaleX;
    const startY = (e.clientY - rect.top) * scaleY;
    
    setCropSelection({ startX, startY, endX: startX, endY: startY });
    setIsSelecting(true);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!cropMode || !isSelecting || !cropSelection || !imageCanvasRef.current) return;
    
    const canvas = imageCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const endX = (e.clientX - rect.left) * scaleX;
    const endY = (e.clientY - rect.top) * scaleY;
    
    setCropSelection({ ...cropSelection, endX, endY });
  };

  const handleCanvasMouseUp = () => {
    if (!cropMode) return;
    setIsSelecting(false);
  };

  const applyCrop = () => {
    if (!cropSelection || !originalImageElement) return;
    
    const { startX, startY, endX, endY } = cropSelection;
    const cropX = Math.min(startX, endX);
    const cropY = Math.min(startY, endY);
    const cropWidth = Math.abs(endX - startX);
    const cropHeight = Math.abs(endY - startY);
    
    if (cropWidth < 10 || cropHeight < 10) {
      toast.error('Crop area too small. Please select a larger area.');
      return;
    }
    
    // Create a new canvas for the cropped image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = cropWidth;
    canvas.height = cropHeight;
    
    // Draw the cropped portion
    ctx.drawImage(
      originalImageElement,
      cropX, cropY, cropWidth, cropHeight,
      0, 0, cropWidth, cropHeight
    );
    
    // Convert to blob and update the original image
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          setOriginalImage(url);
          setOriginalImageElement(img);
          setCropMode(false);
          setCropSelection(null);
          toast.success('Image cropped successfully!');
        };
        img.src = url;
      }
    }, 'image/png');
  };

  const cancelCrop = () => {
    setCropMode(false);
    setCropSelection(null);
    setIsSelecting(false);
  };

  const drawImageWithCropOverlay = () => {
    if (!originalImageElement || !imageCanvasRef.current) return;
    
    const canvas = imageCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size to match image
    canvas.width = originalImageElement.naturalWidth;
    canvas.height = originalImageElement.naturalHeight;
    
    // Draw the original image
    ctx.drawImage(originalImageElement, 0, 0);
    
    // Draw crop selection overlay if in crop mode
    if (cropMode && cropSelection) {
      const { startX, startY, endX, endY } = cropSelection;
      const cropX = Math.min(startX, endX);
      const cropY = Math.min(startY, endY);
      const cropWidth = Math.abs(endX - startX);
      const cropHeight = Math.abs(endY - startY);
      
      // Darken everything outside the selection
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Clear the selection area
      ctx.clearRect(cropX, cropY, cropWidth, cropHeight);
      
      // Redraw the image in the selection area
      ctx.drawImage(
        originalImageElement,
        cropX, cropY, cropWidth, cropHeight,
        cropX, cropY, cropWidth, cropHeight
      );
      
      // Draw selection border
      ctx.strokeStyle = '#0066cc';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(cropX, cropY, cropWidth, cropHeight);
      ctx.setLineDash([]);
    }
  };

  const removeBackground = async (imageElement: HTMLImageElement): Promise<Blob> => {
    try {
      console.log('Starting background removal process...');
      
      const segmenter = await pipeline('image-segmentation', 'Xenova/segformer-b2-finetuned-ade-512-512', {
        device: 'webgpu',
      });
      
      const originalWidth = imageElement.naturalWidth;
      const originalHeight = imageElement.naturalHeight;
      console.log(`Original image dimensions: ${originalWidth}x${originalHeight}`);
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) throw new Error('Could not get canvas context');
      
      canvas.width = originalWidth;
      canvas.height = originalHeight;
      
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(imageElement, 0, 0);
      
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
      
      const imageData = processCanvas.toDataURL('image/png', 1.0);
      console.log('Processing with segmentation model...');
      
      const result = await segmenter(imageData);
      console.log('Segmentation result:', result);
      
      if (!result || !Array.isArray(result) || result.length === 0 || !result[0].mask) {
        throw new Error('Invalid segmentation result');
      }
      
      const outputCanvas = document.createElement('canvas');
      outputCanvas.width = originalWidth;
      outputCanvas.height = originalHeight;
      const outputCtx = outputCanvas.getContext('2d');
      
      if (!outputCtx) throw new Error('Could not get output canvas context');
      
      outputCtx.imageSmoothingEnabled = true;
      outputCtx.imageSmoothingQuality = 'high';
      
      outputCtx.drawImage(imageElement, 0, 0);
      
      const maskWidth = processCanvas.width;
      const maskHeight = processCanvas.height;
      console.log(`Mask dimensions: ${maskWidth}x${maskHeight}`);
      
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = maskWidth;
      maskCanvas.height = maskHeight;
      const maskCtx = maskCanvas.getContext('2d');
      if (!maskCtx) throw new Error('Could not get mask canvas context');
      
      const maskImageData = maskCtx.createImageData(maskWidth, maskHeight);
      for (let i = 0; i < result[0].mask.data.length; i++) {
        const value = Math.round((1 - result[0].mask.data[i]) * 255);
        maskImageData.data[i * 4] = value;
        maskImageData.data[i * 4 + 1] = value;
        maskImageData.data[i * 4 + 2] = value;
        maskImageData.data[i * 4 + 3] = 255;
      }
      maskCtx.putImageData(maskImageData, 0, 0);
      
      if (maskWidth !== originalWidth || maskHeight !== originalHeight) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = originalWidth;
        tempCanvas.height = originalHeight;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) throw new Error('Could not get temp canvas context');
        
        tempCtx.imageSmoothingEnabled = true;
        tempCtx.imageSmoothingQuality = 'high';
        tempCtx.drawImage(maskCanvas, 0, 0, originalWidth, originalHeight);
        
        outputCtx.globalCompositeOperation = 'destination-in';
        outputCtx.drawImage(tempCanvas, 0, 0);
      } else {
        outputCtx.globalCompositeOperation = 'destination-in';
        outputCtx.drawImage(maskCanvas, 0, 0);
      }
      
      outputCtx.globalCompositeOperation = 'source-over';
      console.log('Background removal completed');
      
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
        
        canvas.style.width = `${targetSize}px`;
        canvas.style.height = `${targetSize}px`;
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        const marginPixels = targetSize <= 32 ? 
          Math.round((settings.margin / 100) * targetSize) : 
          (settings.margin / 100) * targetSize;
        const availableSize = targetSize - (marginPixels * 2);
        
        let scale, scaledWidth, scaledHeight, offsetX, offsetY;
        
        if (settings.scaleMode === 'fit') {
          scale = Math.min(availableSize / img.width, availableSize / img.height);
          scaledWidth = img.width * scale;
          scaledHeight = img.height * scale;
          offsetX = (targetSize - scaledWidth) / 2;
          offsetY = (targetSize - scaledHeight) / 2;
        } else if (settings.scaleMode === 'fill') {
          scale = Math.max(availableSize / img.width, availableSize / img.height);
          scaledWidth = img.width * scale;
          scaledHeight = img.height * scale;
          offsetX = (targetSize - scaledWidth) / 2;
          offsetY = (targetSize - scaledHeight) / 2;
        } else {
          const minDimension = Math.min(img.width, img.height);
          const cropX = (img.width - minDimension) / 2;
          const cropY = (img.height - minDimension) / 2;
          
          scaledWidth = availableSize;
          scaledHeight = availableSize;
          offsetX = marginPixels;
          offsetY = marginPixels;
          
          ctx.drawImage(
            img,
            cropX, cropY, minDimension, minDimension,
            offsetX, offsetY, scaledWidth, scaledHeight
          );
          
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to create blob'));
          }, 'image/png', 1.0);
          
          return;
        }
        
        ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
        
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob'));
        }, 'image/png', 1.0);
      };
      
      img.onerror = reject;
      img.src = URL.createObjectURL(imageBlob);
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files[0]) {
      const file = files[0];
      
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file.');
        return;
      }
      
      const url = URL.createObjectURL(file);
      setOriginalImage(url);
      setShowPreview(true);
      setProcessedImages([]);
      
      const img = new Image();
      img.onload = () => {
        setOriginalImageElement(img);
        drawImageWithCropOverlay();
      };
      img.src = url;
    }
  };

  const processImages = async () => {
    if (!originalImageElement) return;
    
    setIsProcessing(true);
    
    try {
      console.log('Processing image...');
      
      const processedBlob = await removeBackground(originalImageElement);
      console.log('Background removed, creating sizes...');
      
      const newProcessedImages: ProcessedImage[] = [];
      
      for (const size of ICON_SIZES) {
        console.log(`Creating ${size}x${size} version...`);
        const resizedBlob = await resizeImageWithSettings(processedBlob, size);
        
        newProcessedImages.push({
          size,
          url: URL.createObjectURL(resizedBlob),
          blob: resizedBlob
        });
      }
      
      setProcessedImages(newProcessedImages);
      
      toast.success(`Successfully processed ${ICON_SIZES.length} icon sizes!`);
    } catch (error) {
      console.error('Error processing images:', error);
      toast.error('Error processing images. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadImage = (img: ProcessedImage) => {
    const link = document.createElement('a');
    link.href = img.url;
    link.download = `chrome-icon-${img.size}x${img.size}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAll = () => {
    processedImages.forEach(img => {
      setTimeout(() => downloadImage(img), 100 * processedImages.indexOf(img));
    });
  };

  const resetEditor = () => {
    setOriginalImage(null);
    setOriginalImageElement(null);
    setProcessedImages([]);
    setShowPreview(false);
    setCropMode(false);
    setCropSelection(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <Helmet>
        <title>Chrome Extension Icon Generator | AI Background Removal & Auto-Resize</title>
        <meta 
          name="description" 
          content="Generate Chrome extension icons automatically. AI removes backgrounds and creates all required sizes (16x16, 32x32, 48x48, 128x128). Free, browser-based, no uploads." 
        />
        <link rel="canonical" href="https://acme.zone/products/chrome-extension-image-editor" />
        <meta property="og:title" content="Chrome Extension Icon Generator | AI Background Removal" />
        <meta property="og:description" content="Generate Chrome extension icons with AI background removal. Free and browser-based." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://acme.zone/products/chrome-extension-image-editor" />
        <meta property="og:site_name" content="Acme Zone" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Chrome Extension Icon Generator | AI Background Removal" />
        <meta name="twitter:description" content="Generate Chrome extension icons with AI. Free and browser-based." />
        <meta name="keywords" content="Chrome extension icons, icon generator, AI background removal, image resize, free tool" />
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
                    Choose any image file (PNG, JPG, JPEG) to get started
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-32 border-2 border-dashed border-border hover:border-primary"
                      variant="outline"
                      size="lg"
                    >
                      <div className="text-center">
                        <Upload className="h-8 w-8 mx-auto mb-2" />
                        <span className="text-lg">Click to upload image</span>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Preview Section with Crop Functionality */}
              {showPreview && originalImage && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <ImageIcon className="h-5 w-5" />
                        Image Preview & Settings
                      </span>
                      <div className="flex gap-2">
                        {cropMode ? (
                          <>
                            <Button 
                              onClick={applyCrop}
                              size="sm"
                              disabled={!cropSelection}
                            >
                              Apply Crop
                            </Button>
                            <Button 
                              onClick={cancelCrop}
                              variant="outline"
                              size="sm"
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <Button 
                            onClick={() => setCropMode(true)}
                            variant="outline"
                            size="sm"
                          >
                            Crop Image
                          </Button>
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Image Display with Crop Functionality */}
                    <div className="flex justify-center">
                      <div className="relative">
                        <canvas
                          ref={imageCanvasRef}
                          onMouseDown={handleCanvasMouseDown}
                          onMouseMove={handleCanvasMouseMove}
                          onMouseUp={handleCanvasMouseUp}
                          className={`max-w-full h-auto border rounded ${cropMode ? 'cursor-crosshair' : ''}`}
                          style={{ maxWidth: '500px', maxHeight: '400px' }}
                        />
                        {cropMode && (
                          <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded text-sm">
                            Drag to select crop area
                          </div>
                        )}
                      </div>
                    </div>

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
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          '🚀 Process Images with Background Removal'
                        )}
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
                        className="max-w-full h-auto border rounded"
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
                      <Button onClick={downloadAll}>
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
          {(() => {
            const editorFaqs = [
              { question: 'What sizes does this tool generate?', answer: 'It generates all four required Chrome extension icon sizes: 16×16, 32×32, 48×48, and 128×128 pixels, perfectly formatted for your manifest.json.' },
              { question: 'Do I need to install anything?', answer: 'No — this tool runs entirely in your browser. Just upload an image, adjust settings, and download your icons. No signup or software required.' },
              { question: 'What image formats can I upload?', answer: 'You can upload PNG, JPG, JPEG, SVG, or WebP images. For best results, use a high-resolution square image (at least 128×128 pixels).' },
              { question: 'Can I crop my image before generating icons?', answer: 'Yes! The tool includes a built-in crop feature that lets you select the perfect region of your image before generating all icon sizes.' },
              { question: 'Are my images uploaded to a server?', answer: 'No — all processing happens locally in your browser using the HTML Canvas API. Your images never leave your device.' },
            ];
            return (
              <>
                <JsonLd data={[
                  softwareAppSchema({ name: 'Chrome Extension Icon Generator', description: 'Generate all required Chrome extension icon sizes from a single image. Free, private, browser-based tool.', url: `${SITE_URL}/chrome-extension-image-editor`, category: 'DeveloperApplication' }),
                  faqSchema(editorFaqs),
                  breadcrumbSchema([{ name: 'Home', url: SITE_URL }, { name: 'Chrome Extension Icon Generator', url: `${SITE_URL}/chrome-extension-image-editor` }]),
                ]} />
                <FAQSection faqs={editorFaqs} />
              </>
            );
          })()}
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

// Preview component to show how icons will look
const PreviewIcon: React.FC<{
  originalImage: HTMLImageElement | null;
  size: number;
  settings: { margin: number; scaleMode: 'fit' | 'fill' | 'crop' };
}> = ({ originalImage, size, settings }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    if (originalImage && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = size;
      canvas.height = size;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const marginPixels = (settings.margin / 100) * size;
      const availableSize = size - (marginPixels * 2);

      let scale, scaledWidth, scaledHeight, offsetX, offsetY;

      if (settings.scaleMode === 'fit') {
        scale = Math.min(availableSize / originalImage.width, availableSize / originalImage.height);
        scaledWidth = originalImage.width * scale;
        scaledHeight = originalImage.height * scale;
        offsetX = (size - scaledWidth) / 2;
        offsetY = (size - scaledHeight) / 2;
      } else if (settings.scaleMode === 'fill') {
        scale = Math.max(availableSize / originalImage.width, availableSize / originalImage.height);
        scaledWidth = originalImage.width * scale;
        scaledHeight = originalImage.height * scale;
        offsetX = (size - scaledWidth) / 2;
        offsetY = (size - scaledHeight) / 2;
      } else {
        const minDimension = Math.min(originalImage.width, originalImage.height);
        const cropX = (originalImage.width - minDimension) / 2;
        const cropY = (originalImage.height - minDimension) / 2;
        
        scaledWidth = availableSize;
        scaledHeight = availableSize;
        offsetX = marginPixels;
        offsetY = marginPixels;
        
        ctx.drawImage(
          originalImage,
          cropX, cropY, minDimension, minDimension,
          offsetX, offsetY, scaledWidth, scaledHeight
        );
        return;
      }

      ctx.drawImage(originalImage, offsetX, offsetY, scaledWidth, scaledHeight);
    }
  }, [originalImage, size, settings]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ width: size, height: size }}
    />
  );
};

export default ChromeExtensionImageEditor;
