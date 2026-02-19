import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema } from '../../utils/validators'
import { useAuth } from '../../hooks/useAuth'
import { Link, useNavigate } from 'react-router-dom'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { useToast } from '../ui/toast'
import { useState } from 'react'

const RegisterForm = () => {
  const { register: registerUser, isLoading } = useAuth()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [error, setError] = useState(null)

  const {
    register: registerForm,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data) => {
    setError(null)
    try {
      const result = await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
      })
      
      // Check if registration was successful
      if (result.meta && result.meta.requestStatus === 'rejected') {
        const errorMessage = result.payload || 'Registration failed. Please try again.'
        setError(errorMessage)
        addToast({ type: 'error', message: errorMessage })
      } else {
        addToast({ type: 'success', message: 'Registration successful!' })
        navigate('/profile-setup')
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

      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          type="text"
          placeholder="John Doe"
          {...registerForm('name')}
        />
        {errors.name && (
          <p className="text-sm text-red-500">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          {...registerForm('email')}
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
          placeholder="Create a password"
          {...registerForm('password')}
        />
        {errors.password && (
          <p className="text-sm text-red-500">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="Confirm your password"
          {...registerForm('confirmPassword')}
        />
        {errors.confirmPassword && (
          <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full border border-black cursor-pointer text-black" disabled={isLoading}>
        {isLoading ? 'Creating account...' : 'Register'}
      </Button>

      <p className="text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link to="/login" className="text-primary-500 hover:underline font-medium">
          Login
        </Link>
      </p>
    </form>
  )
}

export default RegisterForm
