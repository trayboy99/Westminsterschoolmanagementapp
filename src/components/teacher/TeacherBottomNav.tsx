import { 
  LayoutDashboard, 
  GraduationCap, 
  FileQuestion, 
  ClipboardCheck,
  MoreHorizontal
} from 'lucide-react';

interface TeacherBottomNavProps {
  activeView: string;
  onViewChange: (view: string) => void;
  isClassTeacher: boolean;
}

export function TeacherBottomNav({ activeView, onViewChange, isClassTeacher }: TeacherBottomNavProps) {
  const navItems = [
    { id: 'overview', label: 'Home', icon: LayoutDashboard },
    ...(isClassTeacher ? [{ id: 'my-class', label: 'My Class', icon: GraduationCap }] : []),
    { id: 'cbt-questions', label: 'CBT', icon: FileQuestion },
    ...(isClassTeacher ? [{ id: 'attendance', label: 'Attendance', icon: ClipboardCheck }] : []),
    { id: 'more', label: 'More', icon: MoreHorizontal },
  ];

  // If not a class teacher, adjust the items
  const displayItems = isClassTeacher 
    ? navItems 
    : [
        { id: 'overview', label: 'Home', icon: LayoutDashboard },
        { id: 'my-subjects', label: 'Subjects', icon: GraduationCap },
        { id: 'cbt-questions', label: 'CBT', icon: FileQuestion },
        { id: 'marks', label: 'Marks', icon: ClipboardCheck },
        { id: 'more', label: 'More', icon: MoreHorizontal },
      ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-bottom">
      <div className="grid grid-cols-5 h-16">
        {displayItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`flex flex-col items-center justify-center gap-1 transition-colors relative ${
                isActive 
                  ? 'text-blue-600' 
                  : 'text-gray-500 active:bg-gray-100'
              }`}
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-blue-600 rounded-b-full" />
              )}
              <Icon className={`h-5 w-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
              <span className={`text-xs font-medium ${isActive ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
