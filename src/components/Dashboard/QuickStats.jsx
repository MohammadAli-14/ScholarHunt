import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { GraduationCap, Calendar, TrendingUp, User } from 'lucide-react'
import { scholarshipService } from '../../services/scholarshipService'

const QuickStats = () => {
  const [stats, setStats] = useState({
    savedCount: 0,
    appliedCount: 0,
    successRate: 0,
    profileCompleted: false,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await scholarshipService.getUserStats()
        setStats(data)
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const statItems = [
    {
      title: 'Saved',
      value: stats.savedCount.toString(),
      icon: GraduationCap,
      color: 'text-primary-500',
      bgColor: 'bg-primary-50',
      hover: true,
    },
    {
      title: 'Applied',
      value: stats.appliedCount.toString(),
      icon: Calendar,
      color: 'text-amber-500',
      bgColor: 'bg-amber-50',
      hover: true,
    },
    {
      title: 'Success Rate',
      value: `${stats.successRate}%`,
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      hover: true,
    },
    {
      title: 'Profile Complete',
      value: stats.profileCompleted ? 'Yes' : 'No',
      icon: User,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      hover: true,
    },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="animate-pulse">
                <div className="h-12 w-12 bg-gray-200 rounded-lg mb-4"></div>
                <div className="h-8 w-16 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 w-20 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statItems.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.title} className={stat.hover ? 'hover:cursor-pointer' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-sm text-gray-600">{stat.title}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export default QuickStats
