import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema } from '../../utils/validators'
import { useAuth } from '../../hooks/useAuth'
import { Link, useNavigate } from 'react-router-dom'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { useToast } from '../ui/toast'
import { useState } from 'react'

const LoginForm = () => {
  const { login, isLoading } = useAuth()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [error, setError] = useState(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data) => {
    setError(null)
    try {
      const result = await login(data)
      
      // Check if the login was successful (fulfilled) or failed (rejected)
      if (result.meta && result.meta.requestStatus === 'rejected') {
        const errorMessage = result.payload || 'Login failed. Please check your credentials.'
        setError(errorMessage)
        addToast({ type: 'error', message: errorMessage })
      } else {
        addToast({ type: 'success', message: 'Login successful!' })
        navigate('/dashboard')
      }
    } catch (err) {
      console.error(err)
      const errorMessage = 'An unexpected error occurred'
      setError(errorMessage)
      addToast({ type: 'error', message: errorMessage })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="p-3 text-sm text-red-500 bg-red-50 rounded-lg">
          {error}
        </div>
      )}
<div></div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          {...register('email')}
        />
        {errors.email && (
          <p className="text-sm text-red-500">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="Enter your password"
          {...register('password')}
        />
        {errors.password && (
          <p className="text-sm text-red-500">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full text-black border border-black cursor-pointer" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
      </Button>

      <p className="text-center text-sm text-gray-600">
        Don't have an account?{' '}
        <Link to="/register" className="text-primary-500 hover:underline font-medium">
          Register
        </Link>
      </p>
    </form>
  )
}

export default LoginForm
