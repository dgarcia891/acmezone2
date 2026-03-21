import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { 
  Loader2,
  BarChart3,
  RotateCcw
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface GaData {
  overview?: {
    rows?: any[];
    totals?: any[];
  };
  topPages?: {
    rows?: any[];
  };
  events?: {
    rows?: any[];
  };
}

const SiteAnalytics = () => {
  const [gaData, setGaData] = useState<GaData | null>(null);
  const [loadingGa, setLoadingGa] = useState(true);

  useEffect(() => {
    fetchGaAnalytics();
  }, []);

  const fetchGaAnalytics = async () => {
    try {
      setLoadingGa(true);
      const { data, error } = await supabase.functions.invoke('ga-analytics');
      if (error) throw error;
      setGaData(data);
    } catch (error) {
      console.error('Error fetching GA analytics:', error);
      // Silently fail if secrets aren't set yet during initial setup
    } finally {
      setLoadingGa(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Google Analytics Section */}
      <div className="space-y-6 pt-2">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Google Analytics (GA4)
            </h2>
            <p className="text-muted-foreground">
              Official metrics and custom event tracking fueled by Google Analytics.
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchGaAnalytics}
            disabled={loadingGa}
          >
            {loadingGa ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
            Refresh Data
          </Button>
        </div>

        {!gaData && !loadingGa ? (
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
              <h3 className="font-semibold text-lg">GA API Data not available</h3>
              <p className="text-muted-foreground max-w-sm">
                Ensure your Service Account JSON and Property ID are configured in Supabase Secrets.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Page Views</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loadingGa ? '...' : gaData?.overview?.rows?.[0]?.metricValues?.[0]?.value || '0'}
                  </div>
                  <p className="text-xs text-muted-foreground">Last 7 days</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loadingGa ? '...' : gaData?.overview?.rows?.[0]?.metricValues?.[1]?.value || '0'}
                  </div>
                  <p className="text-xs text-muted-foreground">Last 7 days</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top Events (Button Clicks)</CardTitle>
                  <CardDescription>Most triggered custom interactions</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingGa ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => <div key={i} className="h-8 bg-muted animate-pulse rounded" />)}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Event</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {gaData?.events?.rows?.map((row: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-sm">{row.dimensionValues[0].value}</TableCell>
                            <TableCell className="text-right font-bold">{row.metricValues[0].value}</TableCell>
                          </TableRow>
                        )) || (
                          <TableRow>
                            <TableCell colSpan={2} className="text-center py-4 text-muted-foreground">No events found</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top Pages</CardTitle>
                  <CardDescription>Views recorded by Google Tracking</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingGa ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => <div key={i} className="h-8 bg-muted animate-pulse rounded" />)}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Path</TableHead>
                          <TableHead className="text-right">Views</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {gaData?.topPages?.rows?.map((row: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-sm max-w-[200px] truncate">{row.dimensionValues[0].value}</TableCell>
                            <TableCell className="text-right font-bold">{row.metricValues[0].value}</TableCell>
                          </TableRow>
                        )) || (
                          <TableRow>
                            <TableCell colSpan={2} className="text-center py-4 text-muted-foreground">No page data found</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SiteAnalytics;
