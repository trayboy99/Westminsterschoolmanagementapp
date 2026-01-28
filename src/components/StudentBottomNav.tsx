import { Home, FileText, MonitorPlay, ClipboardCheck, MoreHorizontal } from 'lucide-react';

interface StudentBottomNavProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export function StudentBottomNav({ activeView, onViewChange }: StudentBottomNavProps) {
  const navItems = [
    { id: 'overview', label: 'Home', icon: Home },
    { id: 'results', label: 'Results', icon: FileText },
    { id: 'cbt-exams', label: 'CBT', icon: MonitorPlay },
    { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
    { id: 'more', label: 'More', icon: MoreHorizontal },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom z-50 md:hidden shadow-lg">
      {/* Active Indicator Line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300" 
        style={{
          width: `${100 / navItems.length}%`,
          transform: `translateX(${navItems.findIndex(item => item.id === activeView) * 100}%)`
        }}
      />
      
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`flex flex-col items-center justify-center gap-1 transition-all duration-200 active:scale-95 relative ${
                isActive 
                  ? 'text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {/* Ripple effect background */}
              {isActive && (
                <div className="absolute inset-0 bg-blue-50 opacity-50 rounded-lg m-1 transition-opacity duration-200" />
              )}
              
              <Icon className={`h-6 w-6 transition-all duration-200 relative z-10 ${isActive ? 'scale-110' : ''}`} />
              <span className={`text-xs font-medium relative z-10 transition-all duration-200 ${
                isActive ? 'font-semibold scale-105' : ''
              }`}>
                {item.label}
              </span>
              
              {/* Active dot indicator */}
              {isActive && (
                <div className="absolute top-1 w-1 h-1 bg-blue-600 rounded-full animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}