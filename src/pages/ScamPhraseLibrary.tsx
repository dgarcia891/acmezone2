import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Helmet } from "react-helmet-async";
import DetectionExplainer from "@/components/scam-library/DetectionExplainer";
import PhraseLibraryTable from "@/components/scam-library/PhraseLibraryTable";
import PhraseSubmissionForm from "@/components/scam-library/PhraseSubmissionForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, HelpCircle, ShieldAlert } from "lucide-react";

export default function ScamPhraseLibrary() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Hydra Guard Scam Phrase Library — How Email Scam Detection Works</title>
        <meta 
          name="description" 
          content="Explore the Hydra Guard Scam Phrase Library. Learn how our multi-layered detection engine analyzes emails, view our public phrase snapshot, or suggest a new scam pattern." 
        />
      </Helmet>
      
      <Navigation />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8 md:py-12 mt-20">
        <div className="mb-10 lg:mb-14">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 flex items-center gap-3">
            <ShieldAlert className="w-10 h-10 text-primary" /> Scam Phrase Library
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Transparency is key to security. Explore the inner workings of the Hydra Guard detection engine, 
            browse our active library of malicious patterns, and contribute to the community's defense.
          </p>
        </div>

        <Tabs defaultValue="explainer" className="w-full">
          <TabsList className="grid w-full md:w-auto grid-cols-3 mb-8 h-auto p-1">
            <TabsTrigger value="explainer" className="py-3 px-4 text-sm md:text-base flex items-center gap-2">
              <HelpCircle className="w-4 h-4 hidden sm:block" /> How It Works
            </TabsTrigger>
            <TabsTrigger value="library" className="py-3 px-4 text-sm md:text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4 hidden sm:block" /> Active Phrases
            </TabsTrigger>
            <TabsTrigger value="contribute" className="py-3 px-4 text-sm md:text-base flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 hidden sm:block" /> Contribute
            </TabsTrigger>
          </TabsList>
          
          <div className="bg-card border rounded-xl p-4 md:p-8 shadow-sm">
            <TabsContent value="explainer" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <DetectionExplainer />
            </TabsContent>
            
            <TabsContent value="library" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <PhraseLibraryTable />
            </TabsContent>
            
            <TabsContent value="contribute" className="mt-0 focus-visible:outline-none focus-visible:ring-0 max-w-2xl mx-auto">
              <PhraseSubmissionForm />
            </TabsContent>
          </div>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
