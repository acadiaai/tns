import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import {
  User,
  Calendar,
  Phone,
  Mail,
  Heart,
  Brain,
  Shield,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  FileText,
  Activity,
  Target
} from 'lucide-react';

interface IntakeData {
  personalInfo: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    phone: string;
    email: string;
    emergencyContact: string;
    emergencyPhone: string;
  };
  mentalHealth: {
    primaryConcerns: string[];
    previousTherapy: boolean;
    medications: string;
    sleepQuality: number;
    stressLevel: number;
    anxietyLevel: number;
  };
  goals: {
    shortTerm: string[];
    longTerm: string[];
    expectations: string;
  };
  preferences: {
    sessionFrequency: string;
    sessionLength: string;
    communicationPreference: string;
    therapyApproach: string[];
  };
}

const CONCERN_OPTIONS = [
  'Anxiety',
  'Depression',
  'Trauma/PTSD',
  'Relationship Issues',
  'Grief/Loss',
  'Addiction',
  'Life Transitions',
  'Self-Esteem',
  'Stress Management',
  'Family Conflicts',
  'Work/Career Issues',
  'Other'
];

const THERAPY_APPROACHES = [
  'Cognitive Behavioral Therapy (CBT)',
  'EMDR',
  'Mindfulness-Based',
  'Psychodynamic',
  'Solution-Focused',
  'Trauma-Informed',
  'Integrative/Holistic',
  'Somatic Therapy'
];

export const ClientIntake: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [intakeData, setIntakeData] = useState<IntakeData>({
    personalInfo: {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      phone: '',
      email: '',
      emergencyContact: '',
      emergencyPhone: ''
    },
    mentalHealth: {
      primaryConcerns: [],
      previousTherapy: false,
      medications: '',
      sleepQuality: 5,
      stressLevel: 5,
      anxietyLevel: 5
    },
    goals: {
      shortTerm: [],
      longTerm: [],
      expectations: ''
    },
    preferences: {
      sessionFrequency: 'weekly',
      sessionLength: '60min',
      communicationPreference: 'email',
      therapyApproach: []
    }
  });

  const steps = [
    { id: 1, title: 'Personal Information', icon: <User className="h-5 w-5" /> },
    { id: 2, title: 'Mental Health Assessment', icon: <Brain className="h-5 w-5" /> },
    { id: 3, title: 'Goals & Expectations', icon: <Target className="h-5 w-5" /> },
    { id: 4, title: 'Preferences', icon: <Heart className="h-5 w-5" /> }
  ];

  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleConcernToggle = (concern: string) => {
    setIntakeData(prev => ({
      ...prev,
      mentalHealth: {
        ...prev.mentalHealth,
        primaryConcerns: prev.mentalHealth.primaryConcerns.includes(concern)
          ? prev.mentalHealth.primaryConcerns.filter(c => c !== concern)
          : [...prev.mentalHealth.primaryConcerns, concern]
      }
    }));
  };

  const handleApproachToggle = (approach: string) => {
    setIntakeData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        therapyApproach: prev.preferences.therapyApproach.includes(approach)
          ? prev.preferences.therapyApproach.filter(a => a !== approach)
          : [...prev.preferences.therapyApproach, approach]
      }
    }));
  };

  return (
    <div className="min-h-screen p-6 space-y-6 flex flex-col items-center">
      <div className="max-w-4xl w-full mx-auto">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg glass-card-strong">
                <FileText className="h-6 w-6 text-theme-light" />
              </div>
              Client Intake Form
            </CardTitle>
            <CardDescription>
              Let's gather some information to help create the best therapeutic experience for you
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Progress Steps */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`
                    flex items-center gap-2 px-4 py-2 rounded-full
                    ${currentStep >= step.id ? 'bg-theme/20 text-theme-light' : 'bg-gray-700 text-gray-400'}
                  `}>
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center
                      ${currentStep > step.id ? 'bg-green-500' : currentStep === step.id ? 'bg-theme' : 'bg-gray-600'}
                    `}>
                      {currentStep > step.id ? <CheckCircle className="h-4 w-4" /> : step.icon}
                    </div>
                    <span className="text-sm font-medium">{step.title}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`
                      w-16 h-1 mx-2
                      ${currentStep > step.id ? 'bg-green-500' : 'bg-gray-600'}
                    `} />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Form Content */}
        <Card>
          <CardContent className="p-8">
            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      First Name
                    </label>
                    <Input
                      placeholder="John"
                      value={intakeData.personalInfo.firstName}
                      onChange={(e) => setIntakeData(prev => ({
                        ...prev,
                        personalInfo: { ...prev.personalInfo, firstName: e.target.value }
                      }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Last Name
                    </label>
                    <Input
                      placeholder="Doe"
                      value={intakeData.personalInfo.lastName}
                      onChange={(e) => setIntakeData(prev => ({
                        ...prev,
                        personalInfo: { ...prev.personalInfo, lastName: e.target.value }
                      }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <Calendar className="inline h-4 w-4 mr-1" />
                      Date of Birth
                    </label>
                    <Input
                      type="date"
                      value={intakeData.personalInfo.dateOfBirth}
                      onChange={(e) => setIntakeData(prev => ({
                        ...prev,
                        personalInfo: { ...prev.personalInfo, dateOfBirth: e.target.value }
                      }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <Phone className="inline h-4 w-4 mr-1" />
                      Phone Number
                    </label>
                    <Input
                      placeholder="(555) 123-4567"
                      value={intakeData.personalInfo.phone}
                      onChange={(e) => setIntakeData(prev => ({
                        ...prev,
                        personalInfo: { ...prev.personalInfo, phone: e.target.value }
                      }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <Mail className="inline h-4 w-4 mr-1" />
                    Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder="john.doe@example.com"
                    value={intakeData.personalInfo.email}
                    onChange={(e) => setIntakeData(prev => ({
                      ...prev,
                      personalInfo: { ...prev.personalInfo, email: e.target.value }
                    }))}
                  />
                </div>

                <div className="border-t border-gray-700 pt-4">
                  <h4 className="text-lg font-medium mb-4 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Emergency Contact
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Contact Name
                      </label>
                      <Input
                        placeholder="Jane Doe"
                        value={intakeData.personalInfo.emergencyContact}
                        onChange={(e) => setIntakeData(prev => ({
                          ...prev,
                          personalInfo: { ...prev.personalInfo, emergencyContact: e.target.value }
                        }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Contact Phone
                      </label>
                      <Input
                        placeholder="(555) 987-6543"
                        value={intakeData.personalInfo.emergencyPhone}
                        onChange={(e) => setIntakeData(prev => ({
                          ...prev,
                          personalInfo: { ...prev.personalInfo, emergencyPhone: e.target.value }
                        }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Mental Health Assessment */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Mental Health Assessment
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    What brings you to therapy? (Select all that apply)
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {CONCERN_OPTIONS.map(concern => (
                      <Button
                        key={concern}
                        variant={intakeData.mentalHealth.primaryConcerns.includes(concern) ? "accent" : "outline"}
                        size="sm"
                        onClick={() => handleConcernToggle(concern)}
                        className="justify-start"
                      >
                        {intakeData.mentalHealth.primaryConcerns.includes(concern) && 
                          <CheckCircle className="h-4 w-4 mr-2" />
                        }
                        {concern}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Have you been in therapy before?
                  </label>
                  <div className="flex gap-4">
                    <Button
                      variant={intakeData.mentalHealth.previousTherapy ? "accent" : "outline"}
                      onClick={() => setIntakeData(prev => ({
                        ...prev,
                        mentalHealth: { ...prev.mentalHealth, previousTherapy: true }
                      }))}
                    >
                      Yes
                    </Button>
                    <Button
                      variant={!intakeData.mentalHealth.previousTherapy ? "accent" : "outline"}
                      onClick={() => setIntakeData(prev => ({
                        ...prev,
                        mentalHealth: { ...prev.mentalHealth, previousTherapy: false }
                      }))}
                    >
                      No
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Current medications (if any)
                  </label>
                  <textarea
                    className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white resize-none"
                    rows={3}
                    placeholder="List any medications you're currently taking..."
                    value={intakeData.mentalHealth.medications}
                    onChange={(e) => setIntakeData(prev => ({
                      ...prev,
                      mentalHealth: { ...prev.mentalHealth, medications: e.target.value }
                    }))}
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Sleep Quality: {intakeData.mentalHealth.sleepQuality}/10
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={intakeData.mentalHealth.sleepQuality}
                      onChange={(e) => setIntakeData(prev => ({
                        ...prev,
                        mentalHealth: { ...prev.mentalHealth, sleepQuality: parseInt(e.target.value) }
                      }))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Current Stress Level: {intakeData.mentalHealth.stressLevel}/10
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={intakeData.mentalHealth.stressLevel}
                      onChange={(e) => setIntakeData(prev => ({
                        ...prev,
                        mentalHealth: { ...prev.mentalHealth, stressLevel: parseInt(e.target.value) }
                      }))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Anxiety Level: {intakeData.mentalHealth.anxietyLevel}/10
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={intakeData.mentalHealth.anxietyLevel}
                      onChange={(e) => setIntakeData(prev => ({
                        ...prev,
                        mentalHealth: { ...prev.mentalHealth, anxietyLevel: parseInt(e.target.value) }
                      }))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Goals & Expectations */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Goals & Expectations
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    What would you like to achieve in the next 3 months?
                  </label>
                  <textarea
                    className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white resize-none"
                    rows={4}
                    placeholder="Describe your short-term goals..."
                    value={intakeData.goals.shortTerm.join('\n')}
                    onChange={(e) => setIntakeData(prev => ({
                      ...prev,
                      goals: { ...prev.goals, shortTerm: e.target.value.split('\n').filter(g => g) }
                    }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    What are your long-term goals for therapy?
                  </label>
                  <textarea
                    className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white resize-none"
                    rows={4}
                    placeholder="Describe your long-term goals..."
                    value={intakeData.goals.longTerm.join('\n')}
                    onChange={(e) => setIntakeData(prev => ({
                      ...prev,
                      goals: { ...prev.goals, longTerm: e.target.value.split('\n').filter(g => g) }
                    }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    What are your expectations from therapy?
                  </label>
                  <textarea
                    className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white resize-none"
                    rows={4}
                    placeholder="Share your expectations..."
                    value={intakeData.goals.expectations}
                    onChange={(e) => setIntakeData(prev => ({
                      ...prev,
                      goals: { ...prev.goals, expectations: e.target.value }
                    }))}
                  />
                </div>
              </div>
            )}

            {/* Step 4: Preferences */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Your Preferences
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Preferred Session Frequency
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {['weekly', 'bi-weekly', 'monthly'].map(freq => (
                      <Button
                        key={freq}
                        variant={intakeData.preferences.sessionFrequency === freq ? "accent" : "outline"}
                        onClick={() => setIntakeData(prev => ({
                          ...prev,
                          preferences: { ...prev.preferences, sessionFrequency: freq }
                        }))}
                      >
                        {freq.charAt(0).toUpperCase() + freq.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Preferred Session Length
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {['45min', '60min', '90min'].map(length => (
                      <Button
                        key={length}
                        variant={intakeData.preferences.sessionLength === length ? "accent" : "outline"}
                        onClick={() => setIntakeData(prev => ({
                          ...prev,
                          preferences: { ...prev.preferences, sessionLength: length }
                        }))}
                      >
                        {length}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Therapy Approaches You're Interested In
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {THERAPY_APPROACHES.map(approach => (
                      <Button
                        key={approach}
                        variant={intakeData.preferences.therapyApproach.includes(approach) ? "accent" : "outline"}
                        size="sm"
                        onClick={() => handleApproachToggle(approach)}
                        className="justify-start text-left"
                      >
                        {intakeData.preferences.therapyApproach.includes(approach) && 
                          <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                        }
                        <span className="text-xs">{approach}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Preferred Communication Method
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {['email', 'phone', 'text'].map(method => (
                      <Button
                        key={method}
                        variant={intakeData.preferences.communicationPreference === method ? "accent" : "outline"}
                        onClick={() => setIntakeData(prev => ({
                          ...prev,
                          preferences: { ...prev.preferences, communicationPreference: method }
                        }))}
                      >
                        {method === 'email' && <Mail className="h-4 w-4 mr-2" />}
                        {method === 'phone' && <Phone className="h-4 w-4 mr-2" />}
                        {method === 'text' && <Activity className="h-4 w-4 mr-2" />}
                        {method.charAt(0).toUpperCase() + method.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                Previous
              </Button>
              
              {currentStep < 4 ? (
                <Button onClick={nextStep} className="flex items-center gap-2">
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Submit Intake Form
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary Card (shown on last step) */}
        {currentStep === 4 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
                Review Your Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">Primary Concerns</h4>
                  <p className="text-gray-400">{intakeData.mentalHealth.primaryConcerns.join(', ')}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Session Preferences</h4>
                  <p className="text-gray-400">{intakeData.preferences.sessionFrequency} • {intakeData.preferences.sessionLength}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Current Stress Level</h4>
                  <p className="text-gray-400">{intakeData.mentalHealth.stressLevel}/10</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Therapy Approaches</h4>
                  <p className="text-gray-400">{intakeData.preferences.therapyApproach.length} selected</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};