import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Shield, Mail, Search, Activity, AlertTriangle, ArrowRight, Zap } from "lucide-react";
import { useActivePatterns, ActivePattern } from "@/hooks/use-active-patterns";
import { Progress } from "@/components/ui/progress";

// Simple debounce custom hook
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

const getSeverityDetails = (score: number) => {
  if (score >= 80) return { label: "CRITICAL", color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/20", border: "border-red-500", msg: "Virtually certain to be a scam." };
  if (score >= 50) return { label: "HIGH", color: "text-orange-600", bg: "bg-orange-100 dark:bg-orange-900/20", border: "border-orange-500", msg: "Strongly indicates a scam." };
  if (score >= 30) return { label: "MEDIUM", color: "text-yellow-600", bg: "bg-yellow-100 dark:bg-yellow-900/20", border: "border-yellow-500", msg: "Suspicious, proceed with caution." };
  return { label: "LOW", color: "text-green-600", bg: "bg-green-100 dark:bg-green-900/20", border: "border-green-500", msg: "No obvious scam signals detected." };
};

export default function DetectionExplainer() {
  const { data: patterns = [] } = useActivePatterns();
  const [inputText, setInputText] = useState("");
  const debouncedText = useDebounce(inputText, 300);
  
  const [matches, setMatches] = useState<{ pattern: ActivePattern, count: number }[]>([]);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (!debouncedText) {
      setMatches([]);
      setScore(0);
      return;
    }

    const lowerText = debouncedText.toLowerCase();
    const found: { pattern: ActivePattern, count: number }[] = [];
    let totalScore = 0;

    patterns.forEach((p) => {
      // Basic exact string match just for the demo
      const phraseLower = p.phrase.toLowerCase();
      // Count non-overlapping occurrences
      let count = 0;
      let pos = lowerText.indexOf(phraseLower);
      while (pos !== -1) {
        count++;
        pos = lowerText.indexOf(phraseLower, pos + phraseLower.length);
      }

      if (count > 0) {
        found.push({ pattern: p, count });
        // The real extension caps certain categories, but for the demo we'll do a simple cumulative add
        totalScore += p.severity_weight * count;
      }
    });

    setMatches(found.sort((a, b) => b.pattern.severity_weight - a.pattern.severity_weight));
    setScore(Math.min(100, Math.max(0, totalScore)));

  }, [debouncedText, patterns]);

  const severity = getSeverityDetails(score);

  return (
    <div className="space-y-12">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold tracking-tight">How Hydra Guard Works</h2>
        <p className="text-muted-foreground text-lg">
          Hydra Guard does not rely on a single red flag. It uses a cumulative scoring system that scans your emails locally against our library of active scam phrases.
        </p>
      </div>

      {/* Process Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
        <Card className="text-center p-6 bg-muted/40">
          <Mail className="w-10 h-10 mx-auto mb-3 text-blue-500" />
          <h3 className="font-semibold mb-1">Email Received</h3>
          <p className="text-xs text-muted-foreground">Scanned securely in your browser</p>
        </Card>
        
        <ArrowRight className="w-6 h-6 mx-auto text-muted-foreground hidden md:block" />
        
        <Card className="text-center p-6 bg-muted/40 border-primary/20">
          <Search className="w-10 h-10 mx-auto mb-3 text-primary" />
          <h3 className="font-semibold mb-1">Phrase Scan</h3>
          <p className="text-xs text-muted-foreground">Matches text against {patterns.length || '100+'} patterns</p>
        </Card>
        
        <ArrowRight className="w-6 h-6 mx-auto text-muted-foreground hidden md:block" />
        
        <Card className="text-center p-6 bg-muted/40">
          <Activity className="w-10 h-10 mx-auto mb-3 text-orange-500" />
          <h3 className="font-semibold mb-1">Scoring</h3>
          <p className="text-xs text-muted-foreground">Weights are added up to reach thresholds</p>
        </Card>
      </div>

      {/* Threshold Explainer */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="p-4">
            <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-2">
              <Shield className="w-4 h-4" /> LOW (0-29)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-sm text-muted-foreground">
            Normal business or personal communication. No warnings shown.
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="p-4">
            <CardTitle className="text-sm font-medium text-yellow-600 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> MEDIUM (30-49)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-sm text-muted-foreground">
            Suspicious language detected. Subdued warning banner shown.
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="p-4">
            <CardTitle className="text-sm font-medium text-orange-600 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> HIGH (50-79)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-sm text-muted-foreground">
            Strong indicators of a scam. Prominent warning banner and blocked links.
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-950/10">
          <CardHeader className="p-4">
            <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
              <Shield className="w-4 h-4" /> CRITICAL (80+)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-sm text-muted-foreground">
            Confirmed threat (e.g. known malicious link). Full screen blockage.
          </CardContent>
        </Card>
      </div>

      {/* Interactive Demo */}
      <Card className="border-2 border-primary/20 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <CardTitle>Try The Engine</CardTitle>
          </div>
          <CardDescription>
            Type or paste a suspicious email below to see how our phrase engine analyzes it in real-time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <Textarea 
                placeholder="e.g., URGENT: We have locked your account due to unauthorized activity. Click here to verify your identity immediately..."
                className="min-h-[250px] resize-none font-mono text-sm"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
            </div>
            
            <div className="bg-muted/30 rounded-lg p-6 border flex flex-col">
              <h4 className="font-medium mb-4 flex items-center justify-between">
                <span>Analysis Results</span>
                <Badge variant="outline" className={`${severity.color} ${severity.bg} ${severity.border} font-bold px-3 py-1`}>
                  {severity.label}
                </Badge>
              </h4>
              
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Cumulative Risk Score</span>
                  <span className="font-mono font-bold">{score} / 100</span>
                </div>
                <Progress value={score} className="h-3" />
                <p className="text-xs text-muted-foreground mt-2">{severity.msg}</p>
              </div>

              <div className="flex-1">
                <h5 className="text-sm font-medium text-muted-foreground mb-3">Detected Phrases ({matches.length})</h5>
                {matches.length === 0 ? (
                  <div className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-md">
                    No scam phrases detected yet. Start typing to test.
                  </div>
                ) : (
                  <div className="space-y-2 overflow-y-auto pr-2" style={{ maxHeight: "150px" }}>
                    {matches.map((m, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-background p-2 rounded border text-sm">
                        <div className="flex flex-col">
                          <span className="font-semibold text-primary">"{m.pattern.phrase}"</span>
                          <span className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                            {m.pattern.category.replace('_', ' ')}
                            {m.count > 1 && <span className="bg-muted px-1.5 rounded-full text-[10px]">{m.count}x</span>}
                          </span>
                        </div>
                        <Badge variant="secondary">+{m.pattern.severity_weight * m.count}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
    </div>
  );
}
