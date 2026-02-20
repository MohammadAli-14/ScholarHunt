import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import QuickStats from './QuickStats'
import UpcomingDeadlines from './UpcomingDeadlines'
import MatchedForYou from './MatchedForYou'
import { useScholarships } from '../../hooks/useScholarships'
import { useAuth } from '../../hooks/useAuth'

const Dashboard = () => {
  const { user } = useAuth()
  const { loadScholarships } = useScholarships()

  useEffect(() => {
    loadScholarships()
  }, [loadScholarships])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name || 'User'}!
        </h1>
        <p className="text-gray-600">
          Here's an overview of your scholarship search
        </p>
      </div>

      <QuickStats />

      {/* New Matched Section */}
      <MatchedForYou />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <UpcomingDeadlines />
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <Link to="/scholarships">
                  <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2 hover:bg-gray-50 cursor-pointer">
                    <span className="text-lg">🔍</span>
                    <span>Search Scholarships</span>
                  </Button>
                </Link>
                <Link to="/profile-setup">
                  <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2 hover:bg-gray-50 cursor-pointer">
                    <span className="text-lg">📝</span>
                    <span>Update Profile</span>
                  </Button>
                </Link>
                <Link to="/saved">
                  <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2 hover:bg-gray-50 cursor-pointer">
                    <span className="text-lg">🔖</span>
                    <span>Saved List</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
