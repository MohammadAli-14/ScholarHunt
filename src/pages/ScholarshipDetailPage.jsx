import { useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useScholarships } from '../hooks/useScholarships'
import { useSelector, useDispatch } from 'react-redux'
import { addSaved, removeSaved, saveScholarship, removeSavedScholarship } from '../store/slices/savedSlice'
import { Header, LoadingSpinner, EmptyState } from '../components/Common'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { formatDeadline, calculateMatchScore } from '../utils/formatters'
import { useToast } from '../components/ui/toast'
import { Heart, ExternalLink, MapPin, Calendar, GraduationCap, DollarSign, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '../lib/utils'

const ScholarshipDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { selectedScholarship, isLoading, loadScholarshipById } = useScholarships()
  const { savedScholarships } = useSelector((state) => state.saved)
  const profile = useSelector((state) => state.profile)
  const { addToast } = useToast()
  
  const isSaved = savedScholarships.some(s => s.id === id)

  useEffect(() => {
    loadScholarshipById(id)
  }, [id, loadScholarshipById])

  const handleSave = () => {
    if (isSaved) {
      dispatch(removeSaved(id))
      dispatch(removeSavedScholarship(id))
      addToast({ type: 'success', message: 'Scholarship removed from saved' })
    } else {
      dispatch(addSaved(selectedScholarship))
      dispatch(saveScholarship(selectedScholarship))
      addToast({ type: 'success', message: 'Scholarship saved!' })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  if (!selectedScholarship) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <EmptyState
          title="Scholarship not found"
          description="The scholarship you're looking for doesn't exist"
          actionLabel="Search Scholarships"
          onAction={() => navigate('/scholarships')}
        />
      </div>
    )
  }

  const matchScore = calculateMatchScore(profile, selectedScholarship)

  const getScoreColor = (score) => {
    if (score >= 70) return 'bg-green-500'
    if (score >= 50) return 'bg-amber-500'
    return 'bg-red-500'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container-custom mx-auto px-4 py-8">
        <Link to="/scholarships" className="text-primary-500 hover:underline mb-4 inline-block">
          ← Back to Search
        </Link>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Badge className={cn("text-white font-medium mb-3", getScoreColor(matchScore))}>
                      {matchScore}% Match
                    </Badge>
                    <CardTitle className="text-2xl">{selectedScholarship.title}</CardTitle>
                    <p className="text-lg text-gray-600 mt-2">
                      {selectedScholarship.university || selectedScholarship.partnerUniversities?.join(', ')}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 mb-6">
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="h-5 w-5" />
                    <span>{selectedScholarship.country}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="h-5 w-5" />
                    <span>Deadline: {formatDeadline(selectedScholarship.deadline)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <DollarSign className="h-5 w-5" />
                    <span>{selectedScholarship.amount}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                  {selectedScholarship.fieldOfStudy?.map((field) => (
                    <Badge key={field} variant="secondary">{field}</Badge>
                  ))}
                </div>

                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-600">{selectedScholarship.description}</p>
                </div>

                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Requirements</h3>
                  <ul className="space-y-2">
                    {selectedScholarship.requirements?.map((req, index) => (
                      <li key={index} className="flex items-start gap-2 text-gray-600">
                        <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                        {req}
                      </li>
                    ))}
                    <li className="flex items-start gap-2 text-gray-600">
                      {selectedScholarship.ieltsRequired ? (
                        <>
                          <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                          <span>IELTS Required</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                          <span>No IELTS Required</span>
                        </>
                      )}
                    </li>
                    <li className="flex items-start gap-2 text-gray-600">
                      {selectedScholarship.applicationFee > 0 ? (
                        <>
                          <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                          <span>Application Fee: ${selectedScholarship.applicationFee}</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                          <span>No Application Fee</span>
                        </>
                      )}
                    </li>
                    <li className="flex items-start gap-2 text-gray-600">
                      <GraduationCap className="h-5 w-5 text-primary-500 shrink-0 mt-0.5" />
                      <span>Minimum GPA: {selectedScholarship.minGPA}</span>
                    </li>
                  </ul>
                </div>

                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Benefits</h3>
                  <ul className="space-y-2">
                    {selectedScholarship.benefits?.map((benefit, index) => (
                      <li key={index} className="flex items-start gap-2 text-gray-600">
                        <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>

                <a
                  href={selectedScholarship.applicationLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="w-50 rounded-2xl bg-black text-white">
                    Apply Now
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Button>
                </a>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant={isSaved ? "destructive" : "outline"}
                  className="w-full"
                  onClick={handleSave}
                >
                  <Heart className={cn("h-4 w-4 mr-2", isSaved && "fill-current")} />
                  {isSaved ? 'Remove from Saved' : 'Save Scholarship'}
                </Button>
                
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">Deadline</h4>
                  <p className="text-2xl font-bold text-primary-500">
                    {formatDeadline(selectedScholarship.deadline)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ScholarshipDetailPage
