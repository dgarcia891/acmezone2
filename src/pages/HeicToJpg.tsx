import React, { useState, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Download, Loader2, RotateCcw, ImageIcon, ExternalLink, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import heic2any from 'heic2any';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const HeicToJpg: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [convertedUrl, setConvertedUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.heic') && file.type !== 'image/heic') {
      toast.error('Please select an HEIC image file');
      return;
    }

    setOriginalFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setConvertedUrl(null);
    toast.success('HEIC file loaded! Click "Convert to JPG" to start.');
  };

  const handleConvert = async () => {
    if (!originalFile) return;

    setIsProcessing(true);
    try {
      const result = await heic2any({
        blob: originalFile,
        toType: 'image/jpeg',
        quality: 0.9
      });

      const blob = Array.isArray(result) ? result[0] : result;
      const url = URL.createObjectURL(blob);
      setConvertedUrl(url);
      toast.success('Conversion successful!');
    } catch (error) {
      console.error('Error converting HEIC:', error);
      toast.error('Failed to convert HEIC. Please try a different file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!convertedUrl) return;
    const link = document.createElement('a');
    link.href = convertedUrl;
    link.download = originalFile?.name.replace(/\.heic$/i, '') + '.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Image downloaded!');
  };

  const handleReset = () => {
    setOriginalFile(null);
    setPreviewUrl(null);
    setConvertedUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic')) {
      if (fileInputRef.current) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInputRef.current.files = dataTransfer.files;
      }
      setOriginalFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setConvertedUrl(null);
      toast.success('HEIC file loaded! Click "Convert to JPG" to start.');
    } else {
      toast.error('Please drop an HEIC file.');
    }
  };

  return (
    <>
      <Helmet>
        <title>Free HEIC to JPG Converter - Fast & No Signup | Acme Zone</title>
        <meta
          name="description"
          content="Convert HEIC to JPG online in seconds. Learn how to turn off HEIC on iPhone, convert HEIC to JPG, and turn HEIC to JPG on Mac. No downloads, no sign-up needed."
        />
        <meta name="keywords" content="HEIC to JPG, convert HEIC, iPhone photos to JPG, HEIC converter, free online tool" />
        <link rel="canonical" href="https://acme.zone/products/heic-to-jpg" />
      </Helmet>

      <Header />

      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Free HEIC to JPG Converter
            </h1>
            <p className="text-xl text-muted-foreground">
              Fast, private, and no signup required. Convert your iPhone HEIC photos to standard JPG format directly in your browser.
            </p>
          </div>

          <Card className="mb-12 border-2 border-primary/20 shadow-xl overflow-hidden glassmorphism">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <CardTitle>Upload HEIC Image</CardTitle>
              <CardDescription>
                Drag and drop your .heic file or click to browse.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              {!originalFile ? (
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-primary/30 rounded-xl p-16 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group"
                >
                  <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <Upload className="h-10 w-10 text-primary" />
                  </div>
                  <p className="text-xl font-semibold mb-2 text-foreground">Drop your HEIC here</p>
                  <p className="text-muted-foreground mb-6">or click to choose a file from your computer</p>
                  <Button variant="outline" size="lg" className="px-8">
                    Choose File
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".heic,image/heic"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="space-y-8 animate-in fade-in zoom-in duration-300">
                  <div className="grid md:grid-cols-2 gap-8 items-center">
                    <div className="bg-muted rounded-xl aspect-square overflow-hidden flex items-center justify-center relative border border-primary/10">
                      <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs font-mono lowercase">
                        SOURCE: .HEIC
                      </div>
                      <ImageIcon className="h-16 w-16 text-muted-foreground/30 absolute" />
                      <p className="text-xs text-muted-foreground mt-20 absolute max-w-[150px] text-center">
                        HEIC previews may not show in all browsers, but conversion will work.
                      </p>
                    </div>

                    <div className="space-y-6">
                      <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                        <p className="text-sm font-medium mb-1 truncate">File Name: {originalFile.name}</p>
                        <p className="text-xs text-muted-foreground">Size: {(originalFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>

                      <div className="flex flex-col gap-3">
                        {!convertedUrl ? (
                          <Button 
                            onClick={handleConvert} 
                            disabled={isProcessing} 
                            size="lg" 
                            className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/20"
                          >
                            {isProcessing ? (
                              <>
                                <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                                Converting...
                              </>
                            ) : (
                              'Convert to JPG'
                            )}
                          </Button>
                        ) : (
                          <Button 
                            onClick={handleDownload} 
                            size="lg" 
                            className="w-full h-14 text-lg font-bold bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200"
                          >
                            <Download className="mr-3 h-6 w-6" />
                            Download JPG
                          </Button>
                        )}
                        <Button onClick={handleReset} variant="ghost" disabled={isProcessing}>
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Start Over
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reference Link Section */}
          <div className="bg-gradient-to-r from-primary/10 to-transparent p-6 rounded-2xl border border-primary/20 mb-16 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold mb-1">Looking for more features?</h3>
              <p className="text-sm text-muted-foreground">Check out our specialized partner tool for advanced HEIC management.</p>
            </div>
            <Button variant="secondary" asChild>
              <a href="https://heic2jpgconverter.com/" target="_blank" rel="noopener noreferrer">
                Visit heic2jpgconverter.com
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>

          {/* Educational Content Section */}
          <div className="grid md:grid-cols-2 gap-12 mb-16">
            <div className="space-y-6">
              <h2 className="text-2xl font-bold border-b pb-2">Why HEIC?</h2>
              <p className="text-muted-foreground leading-relaxed">
                HEIC (High Efficiency Image Coding) is the default image format for newer iPhones and iPads. It offers better compression than JPG, meaning your photos take up about half the storage space without losing quality.
              </p>
              <h2 className="text-2xl font-bold border-b pb-2 mt-8">Why Convert to JPG?</h2>
              <p className="text-muted-foreground leading-relaxed">
                While HEIC is great for storage, it isn't always compatible with Windows, older Android devices, or some web services. JPG remains the most widely supported image format in the world, making it the best choice for sharing and printing.
              </p>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-bold border-b pb-2 flex items-center">
                <HelpCircle className="mr-2 h-6 w-6 text-primary" />
                Frequently Asked Questions
              </h2>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>Is my data safe?</AccordionTrigger>
                  <AccordionContent>
                    Yes! All conversion happens directly in your browser. Your images are never uploaded to our servers, ensuring 100% privacy for your personal photos.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>Which devices use HEIC?</AccordionTrigger>
                  <AccordionContent>
                    Apple devices running iOS 11 or later and macOS High Sierra or later use HEIC as the default format.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger>How many files can I convert?</AccordionTrigger>
                  <AccordionContent>
                    Our browser-based tool is free and unlimited. You can convert as many files as you need, one by one.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-4">
                  <AccordionTrigger>How do I stop my iPhone from taking HEIC photos?</AccordionTrigger>
                  <AccordionContent>
                    Go to Settings &gt; Camera &gt; Formats and select "Most Compatible" to save photos as JPG instead of HEIC.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default HeicToJpg;
