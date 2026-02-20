import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useDispatch } from 'react-redux'
import { setFullProfile } from '../../store/slices/profileSlice'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Badge } from '../ui/badge'
import { useToast } from '../ui/toast'
import { Upload, FileText, Check, X, Loader2, Save } from 'lucide-react'
import apiClient from '../../services/apiClient'

const ResumeUploadWizard = ({ onComplete }) => {
  const dispatch = useDispatch()
  const { addToast } = useToast()
  const [file, setFile] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [extractedData, setExtractedData] = useState(null)

  const processFile = useCallback(async (file) => {
    setIsProcessing(true)
    
    try {
      const formData = new FormData()
      formData.append('resume', file)
      
      const response = await apiClient.post('/upload/resume', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      
      // Transform response to match expected format
      const data = response.data.parsedData
      
      let educationData = [];
      if (data.education && Array.isArray(data.education) && data.education.length > 0) {
        educationData = data.education.map(edu => ({
          degree: edu.degree || '',
          university: edu.institution || edu.university || '',
          field: edu.field || '',
          graduationYear: edu.graduationYear || '',
          gpa: edu.gpa || ''
        }));
      } else {
        // Fallback if detailed education parsing failed
        educationData = [{
          degree: data.educationLevel || '',
          university: '',
          field: data.fieldOfStudy[0] || '',
          graduationYear: new Date().getFullYear(),
          gpa: ''
        }];
      }

      setExtractedData({
        educationLevel: data.educationLevel,
        fieldOfStudy: data.fieldOfStudy,
        targetCountries: data.country ? [data.country] : [],
        confidence: data.confidence,
        skills: data.skills || [],
        experience: data.experience || [],
        education: educationData
      })
      
      addToast({ type: 'success', message: 'Resume processed! You can edit the extracted info below.' })
    } catch (error) {
      console.error('Resume parsing error:', error)
      addToast({ type: 'error', message: 'Failed to parse resume. Please try again or use manual entry.' })
    } finally {
      setIsProcessing(false)
    }
  }, [addToast])

  const onDrop = useCallback((acceptedFiles) => {
    const uploadedFile = acceptedFiles[0]
    if (uploadedFile) {
      if (uploadedFile.size > 10 * 1024 * 1024) {
        addToast({ type: 'error', message: 'File size must be less than 10MB' })
        return
      }
      setFile(uploadedFile)
      processFile(uploadedFile)
    }
  }, [addToast, processFile])

  const updateField = (section, index, field, value) => {
    setExtractedData(prev => {
      const newData = { ...prev }
      newData[section] = [...newData[section]]
      newData[section][index] = { ...newData[section][index], [field]: value }
      return newData
    })
  }

  const addSkill = (skill) => {
    if (skill && skill.trim() && !extractedData.skills.includes(skill)) {
      setExtractedData(prev => ({
        ...prev,
        skills: [...prev.skills, skill.trim()]
      }))
    }
  }

  const removeSkill = (skillToRemove) => {
    setExtractedData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skillToRemove)
    }))
  }

  const handleConfirm = () => {
    if (extractedData) {
      dispatch(setFullProfile(extractedData))
      addToast({ type: 'success', message: 'Profile saved successfully!' })
      if (onComplete) {
        onComplete(extractedData)
      }
    }
  }

  const handleRemoveFile = () => {
    setFile(null)
    setExtractedData(null)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
  })

  return (
    <div className="space-y-6">
      {!extractedData ? (
        <div>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-500'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            {isProcessing ? (
              <div>
                <Loader2 className="h-8 w-8 mx-auto text-primary-500 animate-spin mb-2" />
                <p className="text-gray-600">Processing your resume...</p>
              </div>
            ) : (
              <div>
                <p className="text-lg font-medium text-gray-900 mb-1">Drag and drop your resume here</p>
                <p className="text-sm text-gray-500">or click to browse (PDF only, max 10MB)</p>
              </div>
            )}
          </div>

          {file && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary-500" />
                <div>
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleRemoveFile}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 mb-3">Or</p>
            <Button variant="outline" onClick={onComplete}>
              Enter Details Manually
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-600">
              <Check className="h-5 w-5" />
              <span className="font-medium">Resume processed! Edit your information below:</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleRemoveFile}>
              Upload Different
            </Button>
          </div>

          {/* Education */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Education</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {extractedData.education?.map((edu, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Degree</Label>
                    <Input
                      value={edu.degree || ''}
                      onChange={(e) => updateField('education', index, 'degree', e.target.value)}
                      placeholder="Bachelor of Science"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">University</Label>
                    <Input
                      value={edu.university || ''}
                      onChange={(e) => updateField('education', index, 'university', e.target.value)}
                      placeholder="University Name"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Field of Study</Label>
                    <Input
                      value={edu.field || ''}
                      onChange={(e) => updateField('education', index, 'field', e.target.value)}
                      placeholder="Computer Science"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">GPA</Label>
                      <Input
                        value={edu.gpa || ''}
                        onChange={(e) => updateField('education', index, 'gpa', e.target.value)}
                        placeholder="3.5"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Year</Label>
                      <Input
                        value={edu.graduationYear || ''}
                        onChange={(e) => updateField('education', index, 'graduationYear', e.target.value)}
                        placeholder="2024"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Experience */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Experience</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {extractedData.experience?.map((exp, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Company</Label>
                    <Input
                      value={exp.company || ''}
                      onChange={(e) => updateField('experience', index, 'company', e.target.value)}
                      placeholder="Company Name"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Position</Label>
                    <Input
                      value={exp.position || ''}
                      onChange={(e) => updateField('experience', index, 'position', e.target.value)}
                      placeholder="Software Engineer"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Duration</Label>
                    <Input
                      value={exp.duration || ''}
                      onChange={(e) => updateField('experience', index, 'duration', e.target.value)}
                      placeholder="1-2 years"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-3">
                {extractedData.skills?.map((skill) => (
                  <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                    {skill}
                    <button onClick={() => removeSkill(skill)} className="ml-1 hover:text-red-500">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <Input
                placeholder="Add a skill and press Enter"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    addSkill(e.target.value)
                    e.target.value = ''
                  }
                }}
              />
            </CardContent>
          </Card>

          <Button onClick={handleConfirm} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            Save Profile
          </Button>
        </div>
      )}
    </div>
  )
}

export default ResumeUploadWizard
