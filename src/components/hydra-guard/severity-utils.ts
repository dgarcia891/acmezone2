export const severityBadgeClass = (severity: string): string => {
  const s = severity?.toLowerCase() ?? '';
  switch (s) {
    case 'critical':
      return 'bg-red-500/15 text-red-700 border-red-200 dark:text-red-400';
    case 'high':
      return 'bg-orange-500/15 text-orange-700 border-orange-200 dark:text-orange-400';
    case 'medium':
      return 'bg-yellow-500/15 text-yellow-700 border-yellow-200 dark:text-yellow-400';
    case 'low':
      return 'bg-blue-500/15 text-blue-700 border-blue-200 dark:text-blue-400';
    case 'caution':
      return 'bg-muted text-muted-foreground border-border';
    case 'safe':
      return 'bg-green-500/15 text-green-700 border-green-200 dark:text-green-400';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

export const statusBadgeClass = (status: string): string => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-500/15 text-yellow-700 border-yellow-200 dark:text-yellow-400';
    case 'approved':
      return 'bg-green-500/15 text-green-700 border-green-200 dark:text-green-400';
    case 'rejected':
      return 'bg-red-500/15 text-red-700 border-red-200 dark:text-red-400';
    case 'needs_review':
      return 'bg-orange-500/15 text-orange-700 border-orange-200 dark:text-orange-400';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

export const sourceBadgeVariant = (source: string): 'default' | 'secondary' | 'outline' => {
  switch (source) {
    case 'ai_promoted':
      return 'default';
    case 'manual':
      return 'secondary';
    default:
      return 'outline';
  }
};

export const PAGE_SIZE = 50;

export const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
