import React, { useState, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Download, Loader2, RotateCcw, ImageIcon, FileImage, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import heic2any from 'heic2any';

interface ConvertedFile {
  id: string;
  originalName: string;
  originalSize: number;
  convertedBlob: Blob | null;
  convertedUrl: string | null;
  status: 'pending' | 'converting' | 'done' | 'error';
  error?: string;
}

const HeicToJpgConverter: React.FC = () => {
  const [files, setFiles] = useState<ConvertedFile[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const convertFile = async (file: ConvertedFile, blob: Blob): Promise<ConvertedFile> => {
    try {
      const convertedBlob = await heic2any({
        blob,
        toType: 'image/jpeg',
        quality: 0.92,
      }) as Blob;

      const url = URL.createObjectURL(convertedBlob);
      
      return {
        ...file,
        convertedBlob,
        convertedUrl: url,
        status: 'done',
      };
    } catch (error) {
      console.error('Conversion error:', error);
      return {
        ...file,
        status: 'error',
        error: error instanceof Error ? error.message : 'Conversion failed',
      };
    }
  };

  const handleFileSelect = useCallback(async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const newFiles: ConvertedFile[] = [];
    const blobs: Map<string, Blob> = new Map();

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const ext = file.name.toLowerCase().split('.').pop();
      
      if (ext !== 'heic' && ext !== 'heif') {
        toast.error(`${file.name} is not a HEIC/HEIF file`);
        continue;
      }

      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        toast.error(`${file.name} is too large (max 50MB)`);
        continue;
      }

      const id = generateId();
      newFiles.push({
        id,
        originalName: file.name,
        originalSize: file.size,
        convertedBlob: null,
        convertedUrl: null,
        status: 'pending',
      });
      blobs.set(id, file);
    }

    if (newFiles.length === 0) return;

    setFiles(prev => [...prev, ...newFiles]);
    setIsConverting(true);

    // Convert files one by one
    for (const file of newFiles) {
      const blob = blobs.get(file.id);
      if (!blob) continue;

      setFiles(prev => prev.map(f => 
        f.id === file.id ? { ...f, status: 'converting' } : f
      ));

      const converted = await convertFile(file, blob);
      
      setFiles(prev => prev.map(f => 
        f.id === file.id ? converted : f
      ));
    }

    setIsConverting(false);
    toast.success(`Converted ${newFiles.length} file(s) successfully!`);
  }, []);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(event.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDownload = (file: ConvertedFile) => {
    if (!file.convertedUrl) return;

    const link = document.createElement('a');
    link.href = file.convertedUrl;
    link.download = file.originalName.replace(/\.(heic|heif)$/i, '.jpg');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = () => {
    const completedFiles = files.filter(f => f.status === 'done');
    completedFiles.forEach(file => handleDownload(file));
    toast.success(`Downloaded ${completedFiles.length} file(s)`);
  };

  const handleRemoveFile = (id: string) => {
    const file = files.find(f => f.id === id);
    if (file?.convertedUrl) {
      URL.revokeObjectURL(file.convertedUrl);
    }
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleReset = () => {
    files.forEach(file => {
      if (file.convertedUrl) {
        URL.revokeObjectURL(file.convertedUrl);
      }
    });
    setFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const completedCount = files.filter(f => f.status === 'done').length;

  return (
    <>
      <Helmet>
        <title>HEIC to JPG Converter – Free Browser-Based Converter | Acme Zone</title>
        <meta
          name="description"
          content="Convert HEIC to JPG instantly in your browser. 100% private, no uploads to servers. Perfect for iPhone photos. Batch convert multiple files at once."
        />
        <meta name="keywords" content="heic to jpg, heic converter, heif to jpeg, iphone photos, convert heic, free converter" />
        <link rel="canonical" href="https://acme.zone/heic-to-jpg" />
        
        <meta property="og:title" content="HEIC to JPG Converter – Free Browser-Based Converter" />
        <meta property="og:description" content="Convert HEIC to JPG instantly in your browser. 100% private, no uploads to servers." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://acme.zone/heic-to-jpg" />
        
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="HEIC to JPG Converter – Free Browser-Based Converter" />
        <meta name="twitter:description" content="Convert HEIC to JPG instantly in your browser. 100% private, no uploads to servers." />
      </Helmet>

      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Convert HEIC to JPG <span className="text-primary">Online</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-6">
              Quick, free, and secure HEIC to JPG conversion. No file upload needed – all processing happens directly in your browser.
            </p>
          </div>

          {/* Upload Area */}
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors"
              >
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">Drag & drop HEIC files here or click to browse</p>
                <p className="text-sm text-muted-foreground">Your files will be converted locally – no upload to any server</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".heic,.heif"
                  multiple
                  onChange={handleInputChange}
                  className="hidden"
                />
              </div>
            </CardContent>
          </Card>

          {/* File List */}
          {files.length > 0 && (
            <Card className="mb-8">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {completedCount} of {files.length} converted
                  </CardTitle>
                  <div className="flex gap-2">
                    {completedCount > 0 && (
                      <Button onClick={handleDownloadAll} size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Download All
                      </Button>
                    )}
                    <Button onClick={handleReset} variant="outline" size="sm">
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Clear All
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {files.map(file => (
                    <div
                      key={file.id}
                      className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex-shrink-0">
                        {file.status === 'converting' ? (
                          <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        ) : file.status === 'done' && file.convertedUrl ? (
                          <img
                            src={file.convertedUrl}
                            alt="Preview"
                            className="h-12 w-12 object-cover rounded"
                          />
                        ) : file.status === 'error' ? (
                          <div className="h-8 w-8 bg-destructive/10 rounded flex items-center justify-center">
                            <FileImage className="h-5 w-5 text-destructive" />
                          </div>
                        ) : (
                          <FileImage className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{file.originalName}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(file.originalSize)}
                          {file.status === 'converting' && ' • Converting...'}
                          {file.status === 'done' && file.convertedBlob && 
                            ` → ${formatFileSize(file.convertedBlob.size)}`}
                          {file.status === 'error' && ` • ${file.error}`}
                        </p>
                      </div>
                      
                      <div className="flex-shrink-0 flex gap-2">
                        {file.status === 'done' && (
                          <Button
                            onClick={() => handleDownload(file)}
                            size="sm"
                            variant="outline"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          onClick={() => handleRemoveFile(file.id)}
                          size="sm"
                          variant="ghost"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* How It Works */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-center mb-8">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 mx-auto mb-4 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-lg">
                    1
                  </div>
                  <h3 className="font-semibold mb-2">Upload HEIC Files</h3>
                  <p className="text-sm text-muted-foreground">
                    Drag and drop your HEIC files or click to select them from your device
                  </p>
                </CardContent>
              </Card>
              
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 mx-auto mb-4 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-lg">
                    2
                  </div>
                  <h3 className="font-semibold mb-2">Convert Locally</h3>
                  <p className="text-sm text-muted-foreground">
                    Your files are converted on your device without being uploaded to any server
                  </p>
                </CardContent>
              </Card>
              
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 mx-auto mb-4 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-lg">
                    3
                  </div>
                  <h3 className="font-semibold mb-2">Download JPGs</h3>
                  <p className="text-sm text-muted-foreground">
                    Download your converted JPG images individually or all at once
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Feature List */}
          <div className="grid md:grid-cols-3 gap-8 text-center">
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
              <h3 className="font-semibold mb-2">Batch Conversion</h3>
              <p className="text-sm text-muted-foreground">
                Convert multiple HEIC files at once. No daily limits, no sign-up required.
              </p>
            </div>
            <div>
              <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-lg flex items-center justify-center">
                <Download className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">High Quality Output</h3>
              <p className="text-sm text-muted-foreground">
                Download JPG files with excellent quality preservation.
              </p>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
            <div className="space-y-6 max-w-3xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">What is a HEIC file?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    HEIC (High Efficiency Image Container) is Apple's default image format for iPhones and iPads. 
                    It offers better compression than JPG while maintaining quality, but isn't universally supported.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Why convert from HEIC to JPG?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    While HEIC offers better compression, many applications, websites, and devices don't support it yet. 
                    Converting to JPG ensures maximum compatibility across older systems, social media, email services, 
                    photo editing software, and printing services.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Is my data safe?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Yes! All conversion happens directly in your browser using JavaScript. Your files are never 
                    uploaded to any server. Once you close the page, all data is gone.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default HeicToJpgConverter;
