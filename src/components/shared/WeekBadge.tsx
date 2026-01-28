import { Calendar } from 'lucide-react';
import { Badge } from '../ui/badge';
import { useCurrentWeek } from '../../hooks/useCurrentWeek';

interface WeekBadgeProps {
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
}

export function WeekBadge({ variant = 'default', className = '' }: WeekBadgeProps) {
  const { weekInfo, loading } = useCurrentWeek();

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="h-6 w-24 bg-slate-200 animate-pulse rounded-md"></div>
      </div>
    );
  }

  if (!weekInfo) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <Badge variant="outline" className={`flex items-center gap-1.5 px-3 py-1 bg-blue-50 border-blue-200 text-blue-700 ${className}`}>
        <Calendar className="h-3.5 w-3.5" />
        <span className="font-semibold">Week {weekInfo.weekNumber}</span>
      </Badge>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className={`bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 text-white rounded-xl px-4 py-3 shadow-lg ${className}`}>
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 flex-shrink-0" />
          <div className="flex flex-col">
            <p className="text-xs font-medium opacity-90">Current Week</p>
            <p className="text-base font-bold">
              Week {weekInfo.weekNumber}
            </p>
            <p className="text-xs opacity-80">
              {weekInfo.session} • {weekInfo.term}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <Badge variant="outline" className={`flex items-center gap-2 px-3 py-1.5 bg-blue-50 border-blue-200 text-blue-700 ${className}`}>
      <Calendar className="h-4 w-4" />
      <span className="font-semibold">Week {weekInfo.weekNumber}</span>
      <span className="text-xs opacity-75">• {weekInfo.session} • {weekInfo.term}</span>
    </Badge>
  );
}