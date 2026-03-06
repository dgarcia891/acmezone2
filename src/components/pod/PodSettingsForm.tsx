import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Printer, Eraser, CheckCircle2, XCircle, Save, Loader2 } from "lucide-react";
import { usePodSettings, useSavePodSettings } from "@/hooks/usePodPipeline";

export default function PodSettingsForm() {
  const { data: settings, isLoading } = usePodSettings();
  const saveMutation = useSavePodSettings();

  const [form, setForm] = useState({
    printify_api_key: "",
    printify_shop_id: "",
    removebg_api_key: "",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        printify_api_key: "",
        printify_shop_id: settings.printify_shop_id || "",
        removebg_api_key: "",
      });
    }
  }, [settings]);

  const update = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const handleSave = () => {
    const body: Record<string, string> = {};
    Object.entries(form).forEach(([k, v]) => {
      if (v) body[k] = v;
    });
    if (Object.keys(body).length === 0) return;
    saveMutation.mutate(body);
  };

  function StatusIcon({ has }: { has: boolean }) {
    return has ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-muted-foreground" />;
  }

  if (isLoading) {
    return <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Configuration</CardTitle>
        <CardDescription>
          Configure your third-party service credentials for the POD pipeline. AI analysis and image generation are powered by Lovable AI — no external AI keys needed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* AI Banner */}
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
          <p className="text-sm">
            <span className="font-medium">AI Powered by Lovable AI</span> — Content analysis uses{" "}
            <span className="font-medium">Gemini 3 Flash</span> and design generation uses{" "}
            <span className="font-medium">Nano Banana Pro</span>. These are built-in and require no API keys. Usage is billed through your Lovable AI balance.
          </p>
        </div>

        {/* Printify */}
        <div>
          <h3 className="flex items-center gap-2 font-medium mb-3">
            <Printer className="h-4 w-4" /> Printify
          </h3>
          <Separator className="mb-4" />
          <div className="space-y-4">
            <div>
              <label className="text-sm flex items-center gap-2 mb-1">
                Printify API Key <StatusIcon has={settings?.has_printify_api_key} />
              </label>
              <Input type="password" placeholder="Enter Printify API Key" value={form.printify_api_key} onChange={(e) => update("printify_api_key", e.target.value)} />
            </div>
            <div>
              <label className="text-sm flex items-center gap-2 mb-1">
                Printify Shop ID <StatusIcon has={settings?.has_printify_shop_id} />
              </label>
              <Input type="text" placeholder="Enter Printify Shop ID" value={form.printify_shop_id} onChange={(e) => update("printify_shop_id", e.target.value)} />
            </div>
          </div>
        </div>

        {/* Remove.bg */}
        <div>
          <h3 className="flex items-center gap-2 font-medium mb-3">
            <Eraser className="h-4 w-4" /> Remove.bg
          </h3>
          <Separator className="mb-4" />
          <div>
            <label className="text-sm flex items-center gap-2 mb-1">
              Remove.bg API Key <StatusIcon has={settings?.has_removebg_api_key} />
            </label>
            <Input type="password" placeholder="Enter Remove.bg API Key" value={form.removebg_api_key} onChange={(e) => update("removebg_api_key", e.target.value)} />
          </div>
        </div>

        <Button className="w-full" onClick={handleSave} disabled={saveMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
}
