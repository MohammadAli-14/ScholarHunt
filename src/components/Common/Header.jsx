import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../ui/button'
import { GraduationCap, Menu, X, LogOut } from 'lucide-react'
import { useState } from 'react'

const Header = () => {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
    setMobileMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white shadow-sm">
      <div className="container-custom mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <GraduationCap className="h-8 w-8 text-primary-500" />
          <span className="text-xl font-bold text-gray-900">ScholarHunter</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link to="/scholarships" className="text-sm font-medium text-gray-700 hover:text-primary-500">
            Find Scholarships
          </Link>
          {isAuthenticated && (
            <>
              <Link to="/saved" className="text-sm font-medium text-gray-600 hover:text-primary-500">
                Saved
              </Link>
              <Link to="/dashboard" className="text-sm font-medium text-gray-600 hover:text-primary-500">
                Dashboard
              </Link>
            </>
          )}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Welcome, {user?.name || 'User'}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          ) : (
            <>
              <Link to="/login">
                <Button className="bg-black text-emerald-200">Login</Button>
              </Link>
              <Link to="/register">
                <Button className="bg-black text-emerald-200">Register</Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <nav className="flex flex-col p-4 gap-4">

            {isAuthenticated ? (
              <>
                <Link 
                  to="/saved" 
                  className="text-sm font-medium text-gray-600 hover:text-primary-500"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Saved
                </Link>
                <Link 
                  to="/dashboard" 
                  className="text-sm font-medium text-gray-600 hover:text-primary-500"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Button variant="outline" onClick={handleLogout} className="w-full">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <div>
                
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}

export default Header
