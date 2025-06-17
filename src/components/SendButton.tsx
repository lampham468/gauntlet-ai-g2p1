"use client"
import { Mail } from 'lucide-react'

interface SendButtonProps {
  onSendEmail?: () => void
  disabled?: boolean
  className?: string
}

export function SendButton({ onSendEmail, disabled = false, className = "" }: SendButtonProps) {
  return (
    <button
      type="button"
      onClick={onSendEmail}
      disabled={disabled}
      className={`flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors duration-200 ${className}`}
      aria-label="Email"
    >
      <Mail className="w-5 h-5 mr-2" />
      <span>Email</span>
    </button>
  )
}
