"use client"
import { useState, useEffect } from "react"
import type React from "react"
import { authHelpers, useAuth } from "../hooks/useAuth"

interface AuthFormData {
  email: string
  password: string
  confirmPassword?: string
}

interface AuthFormProps {
  onSuccess?: (data: AuthFormData) => void
  className?: string
}

export function AuthForm({ onSuccess, className = "" }: AuthFormProps) {
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin")
  const [formData, setFormData] = useState<AuthFormData>({
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState("")
  const { user } = useAuth()

  // Comprehensive email validation function
  const validateEmail = (email: string): { isValid: boolean; error?: string } => {
    const trimmedEmail = email.trim()
    
    // Check if email is empty
    if (!trimmedEmail) {
      return { isValid: false, error: 'Email address is required' }
    }
    
    // Check length constraints (RFC 5321 limits)
    if (trimmedEmail.length > 254) {
      return { isValid: false, error: 'Email address is too long' }
    }
    
    // Basic format validation with improved regex
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    
    if (!emailRegex.test(trimmedEmail)) {
      return { isValid: false, error: 'Please enter a valid email address format' }
    }
    
    // Split into local and domain parts
    const [localPart, ...domainParts] = trimmedEmail.split('@')
    const domainPart = domainParts.join('@') // Handle edge case of multiple @ signs
    
    // Validate local part (before @)
    if (!localPart || localPart.length > 64) {
      return { isValid: false, error: 'Email local part is too long' }
    }
    
    // Check for consecutive dots in local part
    if (localPart.includes('..')) {
      return { isValid: false, error: 'Email address cannot contain consecutive dots' }
    }
    
    // Check if local part starts or ends with a dot
    if (localPart.startsWith('.') || localPart.endsWith('.')) {
      return { isValid: false, error: 'Email address cannot start or end with a dot' }
    }
    
    // Validate domain part (after @)
    if (!domainPart || domainPart.length > 253) {
      return { isValid: false, error: 'Email domain is invalid' }
    }
    
    // Check for valid domain format
    const domainLabels = domainPart.split('.')
    if (domainLabels.length < 2) {
      return { isValid: false, error: 'Email domain must contain at least one dot' }
    }
    
    // Check for common typos in popular domains
    const commonDomainTypos: Record<string, string> = {
      'gmai.com': 'gmail.com',
      'gmial.com': 'gmail.com',
      'gmail.co': 'gmail.com',
      'outlok.com': 'outlook.com',
      'outloo.com': 'outlook.com',
      'hotmial.com': 'hotmail.com',
      'hotmai.com': 'hotmail.com',
      'yahooo.com': 'yahoo.com',
      'yaho.com': 'yahoo.com'
    }
    
    const suggestedDomain = commonDomainTypos[domainPart.toLowerCase()]
    if (suggestedDomain) {
      return { isValid: false, error: `Did you mean ${localPart}@${suggestedDomain}?` }
    }
    
    return { isValid: true }
  }

  // When user becomes authenticated, call onSuccess
  useEffect(() => {
    if (user && isSuccess && onSuccess) {
      onSuccess(formData)
    }
  }, [user, isSuccess]) // Removed formData and onSuccess from deps to prevent loops

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    // Clear error when user starts typing
    if (error) setError("")
  }

  const handleTabChange = (tab: "signin" | "signup") => {
    setActiveTab(tab)
    setError("")
    // Keep email but clear passwords when switching tabs
    setFormData((prev) => ({
      ...prev,
      password: "",
      confirmPassword: "",
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Basic validation
    if (!formData.email || !formData.password) {
      setError("Please fill in all fields")
      return
    }

    // Use comprehensive email validation
    const emailValidation = validateEmail(formData.email)
    if (!emailValidation.isValid) {
      setError(emailValidation.error || "Please enter a valid email address")
      return
    }

    if (activeTab === "signup") {
      if (!formData.confirmPassword) {
        setError("Please confirm your password")
        return
      }
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match")
        return
      }
      if (formData.password.length < 6) {
        setError("Password must be at least 6 characters long")
        return
      }
    }

    setIsLoading(true)
    setError("")

    try {
      if (activeTab === "signup") {
        const { data, error } = await authHelpers.signUp(formData.email, formData.password)
        if (error) {
          setError(error.message)
          setIsLoading(false)
          return
        }
        
        console.log('User signed up:', data.user?.email)
        
        // Check if user needs email confirmation
        if (data.user && !data.session) {
          setError("Please check your email and click the confirmation link to activate your account.")
          setIsLoading(false)
          return
        }
      } else {
        const { data, error } = await authHelpers.signIn(formData.email, formData.password)
        if (error) {
          setError(error.message)
          setIsLoading(false)
          return
        }
        console.log('User signed in:', data.user?.email)
      }
      
      setIsLoading(false)
      setIsSuccess(true)
      // onSuccess will be called by useEffect when user state changes
    } catch (error) {
      console.error('Authentication error:', error)
      setError('An unexpected error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className={`auth-form ${className}`}>
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
          <div className="text-green-600 dark:text-green-400 text-2xl mb-2">✓</div>
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-1">
            {activeTab === "signin" ? "Sign In Successful!" : "Account Created Successfully!"}
          </h3>
          <p className="text-green-600 dark:text-green-400 text-sm">Redirecting to editor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`auth-form ${className}`}>
      {/* Tab Navigation */}
      <div className="flex mb-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
        <button
          type="button"
          onClick={() => handleTabChange("signin")}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors duration-200 ${
            activeTab === "signin"
              ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => handleTabChange("signup")}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors duration-200 ${
            activeTab === "signup"
              ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          Sign Up
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50"
            placeholder="Enter your email"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50"
            placeholder={activeTab === "signup" ? "Create a password (min 6 characters)" : "Enter your password"}
          />
        </div>

        {activeTab === "signup" && (
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50"
              placeholder="Confirm your password"
            />
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {activeTab === "signin" ? "Signing in..." : "Creating account..."}
            </>
          ) : activeTab === "signin" ? (
            "Sign In"
          ) : (
            "Create Account"
          )}
        </button>

        {activeTab === "signup" && (
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
            By creating an account, you agree to our Terms of Service and Privacy Policy.
          </p>
        )}
      </form>
    </div>
  )
}

export default AuthForm
