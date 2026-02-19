import { Link } from 'react-router-dom'
import { LoginForm } from '../components/Auth'
import { Header } from '../components/Common'
import { GraduationCap } from 'lucide-react'

const LoginPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container-custom mx-auto px-4 py-16">
        <div className="mx-auto max-w-md">
          <div className="bg-white rounded-lg p-6 shadow-lg border border-black">
            <div className="mb-8 text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center mb-4">
                <GraduationCap className="h-6 w-6 text-primary-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
              <p className="mt-2 text-gray-600">Sign in to your account to continue</p>
            </div>
            <div className="rounded-lg border border-gray-600 bg-white p-6 shadow-sm">
              <LoginForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
