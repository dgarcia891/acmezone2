import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Eye, 
  TrendingUp, 
  Globe, 
  Ban,
  Check,
  Loader2,
  BarChart3,
  Calendar,
  Users
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PageViewStats {
  totalViews: number;
  totalUniqueVisitors: number;
  todayViews: number;
  todayUniqueVisitors: number;
  weekViews: number;
  weekUniqueVisitors: number;
  topPages: { path: string; views: number; uniqueVisitors: number }[];
  dailyTrend: { date: string; views: number; uniqueVisitors: number }[];
}

interface ExcludedIp {
  id: string;
  ip_address: string;
  created_at: string;
}

const SiteAnalytics = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<PageViewStats>({
    totalViews: 0,
    totalUniqueVisitors: 0,
    todayViews: 0,
    todayUniqueVisitors: 0,
    weekViews: 0,
    weekUniqueVisitors: 0,
    topPages: [],
    dailyTrend: [],
  });
  const [excludedIps, setExcludedIps] = useState<ExcludedIp[]>([]);
  const [currentIp, setCurrentIp] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [excludingIp, setExcludingIp] = useState(false);

  useEffect(() => {
    fetchAnalytics();
    fetchCurrentIp();
    fetchExcludedIps();
  }, []);

  const fetchCurrentIp = async () => {
    try {
      const { data } = await supabase.functions.invoke('track-pageview', {
        method: 'GET',
      });
      if (data?.ip) {
        setCurrentIp(data.ip);
      }
    } catch (error) {
      console.debug('Could not fetch IP:', error);
    }
  };

  const fetchExcludedIps = async () => {
    try {
      const { data, error } = await supabase
        .from('az_excluded_ips' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExcludedIps((data as unknown as ExcludedIp[]) || []);
    } catch (error) {
      console.error('Error fetching excluded IPs:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch all page views
      const { data: pageViews, error } = await supabase
        .from('az_page_views' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const views = (pageViews as unknown as Array<{
        id: string;
        path: string;
        ip_address: string;
        created_at: string;
      }>) || [];

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      // Calculate stats
      const totalViews = views.length;
      const totalUniqueVisitors = new Set(views.map(v => v.ip_address).filter(Boolean)).size;
      
      const todayViewsData = views.filter(v => new Date(v.created_at) >= today);
      const todayViews = todayViewsData.length;
      const todayUniqueVisitors = new Set(todayViewsData.map(v => v.ip_address).filter(Boolean)).size;
      
      const weekViewsData = views.filter(v => new Date(v.created_at) >= weekAgo);
      const weekViews = weekViewsData.length;
      const weekUniqueVisitors = new Set(weekViewsData.map(v => v.ip_address).filter(Boolean)).size;

      // Top pages with unique visitors
      const pageData: Record<string, { views: number; ips: Set<string> }> = {};
      views.forEach(v => {
        if (!pageData[v.path]) {
          pageData[v.path] = { views: 0, ips: new Set() };
        }
        pageData[v.path].views++;
        if (v.ip_address) {
          pageData[v.path].ips.add(v.ip_address);
        }
      });
      const topPages = Object.entries(pageData)
        .map(([path, data]) => ({ 
          path, 
          views: data.views, 
          uniqueVisitors: data.ips.size 
        }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

      // Daily trend (last 7 days) with unique visitors
      const dailyTrend: { date: string; views: number; uniqueVisitors: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        
        const dayViews = views.filter(v => {
          const viewDate = new Date(v.created_at);
          return viewDate >= date && viewDate < nextDate;
        });

        dailyTrend.push({
          date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          views: dayViews.length,
          uniqueVisitors: new Set(dayViews.map(v => v.ip_address).filter(Boolean)).size,
        });
      }

      setStats({ 
        totalViews, 
        totalUniqueVisitors, 
        todayViews, 
        todayUniqueVisitors, 
        weekViews, 
        weekUniqueVisitors, 
        topPages, 
        dailyTrend 
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const excludeCurrentIp = async () => {
    if (!currentIp || !user) return;

    try {
      setExcludingIp(true);

      const { error } = await supabase
        .from('az_excluded_ips' as any)
        .insert({
          ip_address: currentIp,
          excluded_by: user.id,
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Already Excluded",
            description: "This IP is already in the exclusion list.",
          });
          return;
        }
        throw error;
      }

      toast({
        title: "IP Excluded",
        description: `Your IP (${currentIp}) will no longer be tracked.`,
      });

      fetchExcludedIps();
    } catch (error) {
      console.error('Error excluding IP:', error);
      toast({
        title: "Error",
        description: "Failed to exclude IP address.",
        variant: "destructive",
      });
    } finally {
      setExcludingIp(false);
    }
  };

  const removeExcludedIp = async (id: string) => {
    try {
      const { error } = await supabase
        .from('az_excluded_ips' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "IP Removed",
        description: "IP address will now be tracked.",
      });

      fetchExcludedIps();
    } catch (error) {
      console.error('Error removing excluded IP:', error);
      toast({
        title: "Error",
        description: "Failed to remove IP from exclusion list.",
        variant: "destructive",
      });
    }
  };

  const isCurrentIpExcluded = currentIp && excludedIps.some(ip => ip.ip_address === currentIp);

  const maxTrendViews = Math.max(...stats.dailyTrend.map(d => d.views), 1);

  return (
    <div className="space-y-6">
      {/* Page View Stats */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : stats.totalViews.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : stats.totalUniqueVisitors.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Views</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : stats.todayViews.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">{stats.todayUniqueVisitors} unique</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Visitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : stats.todayUniqueVisitors.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Since midnight</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Week Views</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : stats.weekViews.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Week Visitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : stats.weekUniqueVisitors.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Traffic Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Traffic Trend (Last 7 Days)
          </CardTitle>
          <CardDescription>Daily page views and unique visitors</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-primary/80 rounded" />
                  <span className="text-muted-foreground">Views</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500/80 rounded" />
                  <span className="text-muted-foreground">Unique Visitors</span>
                </div>
              </div>
              <div className="flex items-end justify-between gap-2 h-40">
                {stats.dailyTrend.map((day, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex gap-0.5 justify-center items-end h-[120px]">
                      <div 
                        className="flex-1 bg-primary/80 rounded-t transition-all hover:bg-primary"
                        style={{ 
                          height: `${Math.max((day.views / maxTrendViews) * 120, 4)}px` 
                        }}
                        title={`${day.views} views`}
                      />
                      <div 
                        className="flex-1 bg-green-500/80 rounded-t transition-all hover:bg-green-500"
                        style={{ 
                          height: `${Math.max((day.uniqueVisitors / maxTrendViews) * 120, 4)}px` 
                        }}
                        title={`${day.uniqueVisitors} unique visitors`}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground text-center">
                      {day.date.split(' ')[0]}
                    </span>
                    <span className="text-xs font-medium">{day.views}/{day.uniqueVisitors}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Pages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Most Visited Pages
          </CardTitle>
          <CardDescription>Top 10 pages by view count</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse h-8 bg-muted rounded" />
              ))}
            </div>
          ) : stats.topPages.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No page views recorded yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Page</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead className="text-right">Unique</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.topPages.map((page, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-sm">{page.path}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{page.views.toLocaleString()}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">{page.uniqueVisitors.toLocaleString()}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* IP Exclusion */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5" />
            IP Exclusions
          </CardTitle>
          <CardDescription>
            Exclude IP addresses from analytics tracking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current IP */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
            <div>
              <p className="text-sm font-medium">Your Current IP</p>
              <p className="text-sm text-muted-foreground font-mono">
                {currentIp || 'Detecting...'}
              </p>
            </div>
            {isCurrentIpExcluded ? (
              <Badge variant="outline" className="gap-1">
                <Check className="h-3 w-3" />
                Excluded
              </Badge>
            ) : (
              <Button 
                onClick={excludeCurrentIp} 
                disabled={!currentIp || excludingIp}
                size="sm"
              >
                {excludingIp ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Ban className="h-4 w-4 mr-2" />
                )}
                Exclude My IP
              </Button>
            )}
          </div>

          {/* Excluded IPs List */}
          {excludedIps.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Excluded IP Addresses</p>
              {excludedIps.map((ip) => (
                <div 
                  key={ip.id} 
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <span className="font-mono text-sm">{ip.ip_address}</span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => removeExcludedIp(ip.id)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SiteAnalytics;
