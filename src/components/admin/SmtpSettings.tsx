import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Save, Eye, EyeOff, TestTube } from 'lucide-react';

interface SmtpConfig {
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_pass: string;
  contact_to_email: string;
  contact_from_email: string;
}

const DEFAULT_CONFIG: SmtpConfig = {
  smtp_host: '',
  smtp_port: '587',
  smtp_user: '',
  smtp_pass: '',
  contact_to_email: '',
  contact_from_email: '',
};

const SmtpSettings = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState<SmtpConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('az_app_config')
        .select('*')
        .eq('key', 'smtp_config')
        .maybeSingle();

      if (error) throw error;
      if (data?.value) {
        const val = data.value as Record<string, string>;
        setConfig({
          smtp_host: val.smtp_host || '',
          smtp_port: val.smtp_port || '587',
          smtp_user: val.smtp_user || '',
          smtp_pass: val.smtp_pass || '',
          contact_to_email: val.contact_to_email || '',
          contact_from_email: val.contact_from_email || '',
        });
      }
    } catch (err) {
      console.error('Error loading SMTP config:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      // Check if row exists
      const { data: existing } = await supabase
        .from('az_app_config')
        .select('id')
        .eq('key', 'smtp_config')
        .maybeSingle();

      let error;
      const jsonValue = JSON.parse(JSON.stringify(config));
      if (existing) {
        ({ error } = await supabase
          .from('az_app_config')
          .update({ value: jsonValue, updated_at: new Date().toISOString() })
          .eq('key', 'smtp_config'));
      } else {
        ({ error } = await supabase
          .from('az_app_config')
          .insert([{ key: 'smtp_config', value: jsonValue }]));
      }

      if (error) throw error;
      toast({ title: 'Saved', description: 'SMTP settings updated.' });
    } catch (err) {
      console.error('Error saving SMTP config:', err);
      toast({ title: 'Error', description: 'Failed to save SMTP settings.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const sendTestEmail = async () => {
    if (!config.smtp_host || !config.smtp_user || !config.contact_to_email) {
      toast({ title: 'Missing fields', description: 'Please fill in host, user, and recipient email first.', variant: 'destructive' });
      return;
    }
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('contact-notify', {
        body: {
          name: 'Test User',
          email: 'test@example.com',
          message: 'This is a test email from Acme Zone SMTP settings.',
          timestamp: new Date().toISOString(),
          source: window.location.origin,
          test: true,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: 'Test sent', description: `Test email sent to ${config.contact_to_email}.` });
    } catch (err: any) {
      console.error('Test email error:', err);
      toast({ title: 'Test failed', description: err.message || 'Could not send test email.', variant: 'destructive' });
    } finally {
      setTesting(false);
    }
  };

  const updateField = (field: keyof SmtpConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <Card className="elevated">
        <CardContent className="py-8">
          <div className="animate-pulse space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="elevated">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          SMTP Email Settings
        </CardTitle>
        <CardDescription>
          Configure SMTP to receive email notifications when someone submits the contact form.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Server settings */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="smtp_host">SMTP Host</Label>
            <Input id="smtp_host" placeholder="smtp.gmail.com" value={config.smtp_host} onChange={e => updateField('smtp_host', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtp_port">SMTP Port</Label>
            <Input id="smtp_port" placeholder="587" value={config.smtp_port} onChange={e => updateField('smtp_port', e.target.value)} />
          </div>
        </div>

        {/* Credentials */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="smtp_user">SMTP Username</Label>
            <Input id="smtp_user" placeholder="user@gmail.com" value={config.smtp_user} onChange={e => updateField('smtp_user', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtp_pass">SMTP Password</Label>
            <div className="relative">
              <Input
                id="smtp_pass"
                type={showPass ? 'text' : 'password'}
                placeholder="App password"
                value={config.smtp_pass}
                onChange={e => updateField('smtp_pass', e.target.value)}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPass(p => !p)}
                aria-label={showPass ? 'Hide password' : 'Show password'}
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Email addresses */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="contact_from_email">From Email</Label>
            <Input id="contact_from_email" type="email" placeholder="noreply@acme.zone" value={config.contact_from_email} onChange={e => updateField('contact_from_email', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_to_email">Notification Recipient</Label>
            <Input id="contact_to_email" type="email" placeholder="admin@acme.zone" value={config.contact_to_email} onChange={e => updateField('contact_to_email', e.target.value)} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pt-2">
          <Button onClick={saveConfig} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
          <Button variant="outline" onClick={sendTestEmail} disabled={testing}>
            <TestTube className="h-4 w-4 mr-2" />
            {testing ? 'Sending...' : 'Send Test Email'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SmtpSettings;
