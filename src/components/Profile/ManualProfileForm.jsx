import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { setFullProfile } from '../../store/slices/profileSlice'
import { userService } from '../../services/userService'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Badge } from '../ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select'
import { useToast } from '../ui/toast'
import { COUNTRIES, FIELDS_OF_STUDY, ENGLISH_LEVELS, DEGREE_TYPES } from '../../utils/constants'
import { ChevronLeft, ChevronRight, Check, Plus, X, Loader2, Save } from 'lucide-react'

const STEPS = [
  { id: 1, title: 'Personal Info' },
  { id: 2, title: 'Education' },
  { id: 3, title: 'Experience' },
  { id: 4, title: 'Skills' },
  { id: 5, title: 'Preferences' },
]

const ManualProfileForm = ({ onComplete }) => {
  const dispatch = useDispatch()
  const { addToast } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  
  const [personalInfo, setPersonalInfo] = useState({
    name: '',
    phone: '',
  })
  
  const [education, setEducation] = useState({
    degree: '',
    university: '',
    field: '',
    gpa: '',
    graduationYear: '',
  })
  
  const [experience, setExperience] = useState({
    company: '',
    position: '',
    duration: '',
  })
  
  const [skills, setSkills] = useState([])
  const [newSkill, setNewSkill] = useState('')
  
  const [preferences, setPreferences] = useState({
    targetCountries: [],
    fieldOfStudy: [],
    englishLevel: 'intermediate',
  })

  const validateStep = (step) => {
    const errors = {}
    
    switch (step) {
      case 1:
        if (!personalInfo.name.trim()) {
          errors.name = 'Name is required'
        } else if (personalInfo.name.trim().length < 2) {
          errors.name = 'Name must be at least 2 characters'
        }
        if (personalInfo.phone && !/^[\+]?[1-9][\d]{0,15}$/.test(personalInfo.phone.replace(/\D/g, ''))) {
          errors.phone = 'Please enter a valid phone number'
        }
        break
        
      case 2:
        if (!education.degree) {
          errors.degree = 'Degree is required'
        }
        if (!education.university.trim()) {
          errors.university = 'University is required'
        }
        if (!education.field.trim()) {
          errors.field = 'Field of study is required'
        }
        if (education.gpa) {
          const gpaValue = parseFloat(education.gpa)
          if (isNaN(gpaValue) || gpaValue < 0 || gpaValue > 4) {
            errors.gpa = 'GPA must be between 0 and 4'
          }
        }
        if (education.graduationYear) {
          const year = parseInt(education.graduationYear)
          const currentYear = new Date().getFullYear()
          if (isNaN(year) || year < 1900 || year > currentYear + 10) {
            errors.graduationYear = 'Please enter a valid graduation year'
          }
        }
        break
        
      case 3:
        // Experience is optional, no validation required
        break
        
      case 4:
        if (skills.length === 0) {
          errors.skills = 'Please add at least one skill'
        }
        break
        
      case 5:
        if (preferences.targetCountries.length === 0) {
          errors.targetCountries = 'Please select at least one target country'
        }
        if (preferences.fieldOfStudy.length === 0) {
          errors.fieldOfStudy = 'Please select at least one field of study'
        }
        break
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < STEPS.length) {
        setCurrentStep(currentStep + 1)
        setValidationErrors({})
      }
    } else {
      // Show error toast for the first step with errors
      const firstError = Object.values(validationErrors)[0]
      if (firstError) {
        addToast({ type: 'error', message: firstError })
      }
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const addSkill = () => {
    if (newSkill && newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()])
      setNewSkill('')
    }
  }

  const removeSkill = (skillToRemove) => {
    setSkills(skills.filter(s => s !== skillToRemove))
  }

  const toggleCountry = (country) => {
    if (preferences.targetCountries.includes(country)) {
      setPreferences(prev => ({
        ...prev,
        targetCountries: prev.targetCountries.filter(c => c !== country)
      }))
    } else {
      setPreferences(prev => ({
        ...prev,
        targetCountries: [...prev.targetCountries, country]
      }))
    }
  }

  const toggleField = (field) => {
    if (preferences.fieldOfStudy.includes(field)) {
      setPreferences(prev => ({
        ...prev,
        fieldOfStudy: prev.fieldOfStudy.filter(f => f !== field)
      }))
    } else {
      setPreferences(prev => ({
        ...prev,
        fieldOfStudy: [...prev.fieldOfStudy, field]
      }))
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    const profileData = {
      name: personalInfo.name || 'User',
      phone: personalInfo.phone || '',
      education: [education],
      experience: [experience],
      skills,
      targetCountries: preferences.targetCountries,
      fieldOfStudy: preferences.fieldOfStudy,
      englishLevel: preferences.englishLevel,
      gpa: parseFloat(education.gpa) || 3.5,
    }
    
    try {
      // Save to backend API
      await userService.updateProfile(profileData)
      
      // Update Redux state
      dispatch(setFullProfile(profileData))
      addToast({ type: 'success', message: 'Profile saved successfully!' })
      
      if (onComplete) {
        onComplete(profileData)
      }
    } catch (error) {
      console.error('Failed to save profile:', error)
      addToast({ type: 'error', message: 'Failed to save profile. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={personalInfo.name}
                onChange={(e) => {
                  setPersonalInfo({ ...personalInfo, name: e.target.value })
                  if (validationErrors.name) {
                    setValidationErrors({ ...validationErrors, name: '' })
                  }
                }}
                placeholder="John Doe"
                className={validationErrors.name ? 'border-red-500' : ''}
              />
              {validationErrors.name && (
                <p className="text-sm text-red-500">{validationErrors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={personalInfo.phone}
                onChange={(e) => {
                  setPersonalInfo({ ...personalInfo, phone: e.target.value })
                  if (validationErrors.phone) {
                    setValidationErrors({ ...validationErrors, phone: '' })
                  }
                }}
                placeholder="+1 234 567 8900"
                className={validationErrors.phone ? 'border-red-500' : ''}
              />
              {validationErrors.phone && (
                <p className="text-sm text-red-500">{validationErrors.phone}</p>
              )}
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Degree *</Label>
              <Select
                value={education.degree}
                onValueChange={(value) => {
                  setEducation({ ...education, degree: value })
                  if (validationErrors.degree) {
                    setValidationErrors({ ...validationErrors, degree: '' })
                  }
                }}
              >
                <SelectTrigger className={validationErrors.degree ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select degree" />
                </SelectTrigger>
                <SelectContent>
                  {DEGREE_TYPES.map((deg) => (
                    <SelectItem key={deg} value={deg}>{deg}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.degree && (
                <p className="text-sm text-red-500">{validationErrors.degree}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>University</Label>
              <Input
                value={education.university}
                onChange={(e) => setEducation({ ...education, university: e.target.value })}
                placeholder="University Name"
              />
            </div>
            <div className="space-y-2">
              <Label>Field of Study</Label>
              <Input
                value={education.field}
                onChange={(e) => setEducation({ ...education, field: e.target.value })}
                placeholder="Computer Science"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>GPA (out of 4)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={education.gpa}
                  onChange={(e) => setEducation({ ...education, gpa: e.target.value })}
                  placeholder="3.5"
                />
              </div>
              <div className="space-y-2">
                <Label>Graduation Year</Label>
                <Input
                  type="number"
                  value={education.graduationYear}
                  onChange={(e) => setEducation({ ...education, graduationYear: e.target.value })}
                  placeholder="2024"
                />
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Company</Label>
              <Input
                value={experience.company}
                onChange={(e) => setExperience({ ...experience, company: e.target.value })}
                placeholder="Company Name"
              />
            </div>
            <div className="space-y-2">
              <Label>Position</Label>
              <Input
                value={experience.position}
                onChange={(e) => setExperience({ ...experience, position: e.target.value })}
                placeholder="Software Engineer"
              />
            </div>
            <div className="space-y-2">
              <Label>Duration</Label>
              <Input
                value={experience.duration}
                onChange={(e) => setExperience({ ...experience, duration: e.target.value })}
                placeholder="1 year"
              />
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Add Skills *</Label>
              <div className="flex gap-2">
                <Input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addSkill()
                    }
                  }}
                  placeholder="Type a skill and press Enter"
                  className={validationErrors.skills ? 'border-red-500' : ''}
                />
                <Button type="button" onClick={addSkill}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {validationErrors.skills && (
                <p className="text-sm text-red-500">{validationErrors.skills}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                  {skill}
                  <button onClick={() => removeSkill(skill)} className="ml-1 hover:text-red-500">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            {skills.length === 0 && (
              <p className="text-sm text-gray-500">Add skills like JavaScript, Python, React, etc.</p>
            )}
          </div>
        )

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <Label className="mb-2 block">Target Countries *</Label>
              <div className="flex flex-wrap gap-2">
                {COUNTRIES.slice(0, 10).map((country) => (
                  <Button
                    key={country}
                    variant={preferences.targetCountries.includes(country) ? "default" : "outline"}
                    size="sm"
                    type="button"
                    onClick={() => {
                      toggleCountry(country)
                      if (validationErrors.targetCountries && preferences.targetCountries.length >= 0) {
                        setValidationErrors({ ...validationErrors, targetCountries: '' })
                      }
                    }}
                  >
                    {country}
                  </Button>
                ))}
              </div>
              {validationErrors.targetCountries && (
                <p className="text-sm text-red-500 mt-2">{validationErrors.targetCountries}</p>
              )}
            </div>
            <div>
              <Label className="mb-2 block">Fields of Study *</Label>
              <div className="flex flex-wrap gap-2">
                {FIELDS_OF_STUDY.slice(0, 8).map((field) => (
                  <Button
                    key={field}
                    variant={preferences.fieldOfStudy.includes(field) ? "default" : "outline"}
                    size="sm"
                    type="button"
                    onClick={() => {
                      toggleField(field)
                      if (validationErrors.fieldOfStudy && preferences.fieldOfStudy.length >= 0) {
                        setValidationErrors({ ...validationErrors, fieldOfStudy: '' })
                      }
                    }}
                  >
                    {field}
                  </Button>
                ))}
              </div>
              {validationErrors.fieldOfStudy && (
                <p className="text-sm text-red-500 mt-2">{validationErrors.fieldOfStudy}</p>
              )}
            </div>
            <div>
              <Label className="mb-2 block">English Level</Label>
              <Select
                value={preferences.englishLevel}
                onValueChange={(value) => setPreferences({ ...preferences, englishLevel: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENGLISH_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep > step.id
                    ? 'bg-green-500 text-white'
                    : currentStep === step.id
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {currentStep > step.id ? <Check className="h-4 w-4" /> : step.id}
              </div>
              {index < STEPS.length - 1 && (
                <div className={`w-8 sm:w-16 h-0.5 ${currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
        <h3 className="text-center font-medium text-gray-900">
          {STEPS[currentStep - 1].title}
        </h3>
      </div>

      <div className="min-h-[300px]">
        {renderStep()}
      </div>

      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        {currentStep === STEPS.length ? (
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Complete Profile
              </>
            )}
          </Button>
        ) : (
          <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md">
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  )
}

export default ManualProfileForm
