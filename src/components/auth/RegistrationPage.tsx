import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { GraduationCap, User as UserIcon, Shield, ArrowLeft, Search } from 'lucide-react';
import { RegistrationForm } from './RegistrationForm';
import { RegistrationStatusChecker } from './RegistrationStatusChecker';

type RegistrationStep = 'choose-role' | 'register' | 'check-status';
type UserRole = 'student' | 'teacher' | 'admin';

export function RegistrationPage() {
  const [currentStep, setCurrentStep] = useState<RegistrationStep>('choose-role');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setCurrentStep('register');
  };

  const handleRegistrationComplete = () => {
    // Could redirect to status checker or show success message
    setCurrentStep('check-status');
  };

  const handleBackToRoleSelection = () => {
    setCurrentStep('choose-role');
    setSelectedRole(null);
  };

  const RoleSelectionCard = ({ 
    role, 
    title, 
    description, 
    icon: Icon,
    onClick 
  }: {
    role: UserRole;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    onClick: (role: UserRole) => void;
  }) => (
    <Card 
      className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 border-2 hover:border-primary/50"
      onClick={() => onClick(role)}
    >
      <CardHeader className="text-center pb-4">
        <div className="flex justify-center mb-3">
          <div className="p-3 rounded-full bg-primary/10">
            <Icon className="h-8 w-8 text-primary" />
          </div>
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription className="text-center">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Button className="w-full">
          Register as {title}
        </Button>
      </CardContent>
    </Card>
  );

  if (currentStep === 'choose-role') {
    return (
      <div className="min-h-screen bg-[#7B9FCC] p-4">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4 text-white">Join Our School Community</h1>
            <p className="text-lg text-white/90 max-w-2xl mx-auto">
              Choose your role to begin the registration process. All applications are reviewed by our administration team.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <RoleSelectionCard
              role="student"
              title="Student"
              description="Apply to join our school as a student. Submit your academic background and get started on your educational journey."
              icon={GraduationCap}
              onClick={handleRoleSelect}
            />
            
            <RoleSelectionCard
              role="teacher"
              title="Teacher"
              description="Join our dedicated teaching staff. Share your qualifications, experience, and passion for education."
              icon={UserIcon}
              onClick={handleRoleSelect}
            />
            
            <RoleSelectionCard
              role="admin"
              title="Administrator"
              description="Apply for an administrative position. Help manage and support our school operations."
              icon={Shield}
              onClick={handleRoleSelect}
            />
          </div>

          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-muted-foreground mb-4">
              <div className="h-px bg-border flex-1"></div>
              <span className="text-sm">Already Applied?</span>
              <div className="h-px bg-border flex-1"></div>
            </div>
            
            <Button
              variant="outline"
              onClick={() => setCurrentStep('check-status')}
              className="flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              Check Application Status
            </Button>
            
            <div className="mt-6 text-sm text-muted-foreground">
              <p>Have questions? <a href="/contact" className="text-primary hover:underline">Contact our admissions office</a></p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'register' && selectedRole) {
    return (
      <div className="min-h-screen bg-[#7B9FCC] p-4">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="mb-6">
            <Button 
              variant="ghost" 
              onClick={handleBackToRoleSelection}
              className="flex items-center gap-2 mb-4 text-white hover:text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Role Selection
            </Button>
            
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold mb-2 text-white">
                {selectedRole === 'student' && 'Student Registration'}
                {selectedRole === 'teacher' && 'Teacher Registration'}
                {selectedRole === 'admin' && 'Administrator Registration'}
              </h1>
              <p className="text-white/90">
                Complete the form below to submit your application
              </p>
            </div>
          </div>

          <RegistrationForm 
            role={selectedRole}
            onSubmit={handleRegistrationComplete}
          />
        </div>
      </div>
    );
  }

  if (currentStep === 'check-status') {
    return (
      <div className="min-h-screen bg-[#7B9FCC] p-4">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="mb-6">
            <Button 
              variant="ghost" 
              onClick={handleBackToRoleSelection}
              className="flex items-center gap-2 mb-4 text-white hover:text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Registration
            </Button>
          </div>

          <RegistrationStatusChecker />
        </div>
      </div>
    );
  }

  return null;
}