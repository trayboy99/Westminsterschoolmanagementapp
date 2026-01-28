import { Button } from './ui/button';
import { GraduationCap, Users, BookOpen, Award, ArrowRight, CheckCircle } from 'lucide-react';

interface LandingPageProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
  onAlumniClick: () => void;
}

export function LandingPage({ onLoginClick, onRegisterClick, onAlumniClick }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12 md:py-20 relative z-10">
        <div className="text-center mb-12 md:mb-20">
          {/* Logo */}
          <div className="flex justify-center mb-6 md:mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl blur-xl opacity-50 animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-blue-500 to-indigo-600 p-5 md:p-6 rounded-3xl shadow-2xl">
                <GraduationCap className="h-14 w-14 md:h-20 md:w-20 text-white" />
              </div>
            </div>
          </div>
          
          {/* Brand Name */}
          <div className="mb-4">
            <h1 className="text-6xl md:text-8xl font-black mb-2 tracking-tight">
              <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
                EDVANCE
              </span>
            </h1>
            <p className="text-lg md:text-xl text-blue-300 font-semibold tracking-widest uppercase">
              Education Advanced
            </p>
          </div>
          
          <p className="text-xl md:text-2xl text-slate-300 mb-8 md:mb-12 max-w-3xl mx-auto leading-relaxed">
            First-class digital education management platform for modern schools
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Button 
              onClick={onLoginClick}
              size="lg"
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-10 py-7 text-lg font-bold shadow-2xl hover:shadow-blue-500/50 transition-all transform hover:scale-105 border-2 border-blue-400/20"
            >
              Login to Dashboard
              <ArrowRight className="ml-2 h-6 w-6" />
            </Button>
            
            <Button 
              onClick={onRegisterClick}
              variant="outline"
              size="lg"
              className="bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white hover:bg-white/20 px-10 py-7 text-lg font-bold shadow-xl hover:shadow-2xl transition-all transform hover:scale-105"
            >
              Request Registration
            </Button>

            <Button 
              onClick={onAlumniClick}
              variant="outline"
              size="lg"
              className="bg-purple-500/10 backdrop-blur-sm border-2 border-purple-400/30 text-purple-300 hover:bg-purple-500/20 px-10 py-7 text-lg font-bold shadow-xl hover:shadow-2xl transition-all transform hover:scale-105"
            >
              Alumni Portal
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <FeatureCard
            icon={<Users className="h-8 w-8" />}
            title="Student Management"
            description="Track student profiles, attendance, and academic progress"
            color="blue"
          />
          <FeatureCard
            icon={<BookOpen className="h-8 w-8" />}
            title="Marks & Results"
            description="Enter marks, generate report cards, and publish results with PIN"
            color="indigo"
          />
          <FeatureCard
            icon={<Award className="h-8 w-8" />}
            title="CBT Exams"
            description="Computer-based testing with violation detection and auto-grading"
            color="purple"
          />
          <FeatureCard
            icon={<GraduationCap className="h-8 w-8" />}
            title="Teacher Portal"
            description="Lesson plans, attendance marking, and marks entry"
            color="pink"
          />
        </div>

        {/* Key Features List */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl shadow-2xl p-8 md:p-12 mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-8 text-white">
            Comprehensive School Management
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <FeatureListItem text="Student & Teacher Dashboards" />
            <FeatureListItem text="Marks Entry & Approval Workflow" />
            <FeatureListItem text="Result Publication with PIN" />
            <FeatureListItem text="Finance-Based Result Access Control" />
            <FeatureListItem text="CBT (Computer-Based Testing)" />
            <FeatureListItem text="Attendance Management" />
            <FeatureListItem text="Lesson Plan Management" />
            <FeatureListItem text="Gate Clock-In/Out System" />
            <FeatureListItem text="Academic Transcripts" />
            <FeatureListItem text="Alumni Portal" />
            <FeatureListItem text="Subject Offerings Management" />
            <FeatureListItem text="Student Promotion System" />
          </div>
        </div>

        {/* User Roles */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <RoleCard
            title="Students"
            description="View results, check attendance, take CBT exams, and track academic progress"
            icon={<GraduationCap className="h-12 w-12" />}
            color="blue"
          />
          <RoleCard
            title="Teachers"
            description="Enter marks, mark attendance, create lesson plans, and manage classes"
            icon={<Users className="h-12 w-12" />}
            color="indigo"
          />
          <RoleCard
            title="Administrators"
            description="Manage users, approve marks, configure settings, and oversee operations"
            icon={<Award className="h-12 w-12" />}
            color="purple"
          />
        </div>

        {/* Footer CTA */}
        <div className="text-center mt-16 bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl shadow-2xl p-12">
          <p className="text-xl text-slate-300 mb-6 font-medium">
            Ready to transform your school management?
          </p>
          <Button 
            onClick={onLoginClick}
            size="lg"
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-12 py-7 text-lg font-bold shadow-2xl hover:shadow-blue-500/50 transition-all transform hover:scale-105 border-2 border-blue-400/20"
          >
            Access Your Dashboard
            <ArrowRight className="ml-2 h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description, color }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: 'blue' | 'indigo' | 'purple' | 'pink';
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    indigo: 'from-indigo-500 to-indigo-600',
    purple: 'from-purple-500 to-purple-600',
    pink: 'from-pink-500 to-pink-600',
  };

  return (
    <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl p-6 hover:shadow-blue-500/20 hover:bg-white/10 transition-all transform hover:scale-105">
      <div className={`bg-gradient-to-br ${colorClasses[color]} p-3 rounded-xl inline-block mb-4 text-white shadow-lg`}>
        {icon}
      </div>
      <h3 className="font-bold text-lg mb-2 text-white">{title}</h3>
      <p className="text-slate-300 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function FeatureListItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
      <span className="text-slate-200 font-medium">{text}</span>
    </div>
  );
}

function RoleCard({ title, description, icon, color }: {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: 'blue' | 'indigo' | 'purple';
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    indigo: 'from-indigo-500 to-indigo-600',
    purple: 'from-purple-500 to-purple-600',
  };

  return (
    <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl shadow-2xl p-8 text-center hover:shadow-blue-500/20 hover:bg-white/10 transition-all transform hover:scale-105">
      <div className={`bg-gradient-to-br ${colorClasses[color]} p-4 rounded-full inline-block mb-4 text-white shadow-xl`}>
        {icon}
      </div>
      <h3 className="font-bold text-xl mb-3 text-white">{title}</h3>
      <p className="text-slate-300 leading-relaxed">{description}</p>
    </div>
  );
}