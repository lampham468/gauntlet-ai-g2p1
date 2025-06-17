"use client"
import React, { useState, useRef, KeyboardEvent } from 'react'

interface ChipProps {
  email: string
  onRemove: () => void
}

const Chip: React.FC<ChipProps> = ({ email, onRemove }) => (
  <div className="flex items-center bg-blue-100 dark:bg-blue-800/50 text-blue-800 dark:text-blue-200 rounded-full px-3 py-1 text-sm font-medium mr-2 my-1">
    <span>{email}</span>
    <button
      type="button"
      onClick={onRemove}
      className="ml-2 text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100 focus:outline-none"
      aria-label={`Remove ${email}`}
    >
      &times;
    </button>
  </div>
)

interface EmailInputProps {
  emails: string[]
  onChange: (emails: string[]) => void
  validateEmail: (email: string) => { isValid: boolean; error?: string }
  onInputValueChange?: (value: string) => void
  placeholder?: string
}

export const EmailInput: React.FC<EmailInputProps> = ({
  emails,
  onChange,
  validateEmail,
  onInputValueChange,
  placeholder = 'Enter email addresses...',
}) => {
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const processText = (text: string) => {
    if (!text.trim()) return

    const potentialEmails = text.split(/[\s,;]+/).filter(Boolean)
    const validNewEmails: string[] = []
    const invalidInputs: string[] = []

    potentialEmails.forEach(email => {
      const trimmedEmail = email.trim()
      if (validateEmail(trimmedEmail).isValid && !emails.includes(trimmedEmail) && !validNewEmails.includes(trimmedEmail)) {
        validNewEmails.push(trimmedEmail)
      } else {
        invalidInputs.push(trimmedEmail)
      }
    })

    if (validNewEmails.length > 0) {
      onChange([...emails, ...validNewEmails])
    }

    const newInputValue = invalidInputs.join(' ')
    setInputValue(newInputValue)
    onInputValueChange?.(newInputValue)

    if (invalidInputs.length > 0) {
      setError(`Invalid or duplicate: ${invalidInputs.join(', ')}`)
      setTimeout(() => setError(null), 3000)
    } else {
      setError(null)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ([' ', 'Enter', ','].includes(e.key)) {
      e.preventDefault()
      processText(inputValue)
    } else if (e.key === 'Backspace' && !inputValue && emails.length > 0) {
      e.preventDefault()
      onChange(emails.slice(0, -1))
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const paste = e.clipboardData.getData('text')
    processText(paste)
  }

  const handleBlur = () => {
    processText(inputValue)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target
    setInputValue(value)
    onInputValueChange?.(value)
    if (error) setError(null)
  }

  const removeEmail = (index: number) => {
    onChange(emails.filter((_, i) => i !== index))
  }

  return (
    <div
      className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white flex flex-wrap items-center ${error ? 'border-red-500' : ''}`}
      onClick={() => inputRef.current?.focus()}
    >
      {emails.map((email, index) => (
        <Chip key={index} email={email} onRemove={() => removeEmail(index)} />
      ))}
      <input
        ref={inputRef}
        type="email"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={handleBlur}
        placeholder={emails.length === 0 ? placeholder : ''}
        className="flex-1 bg-transparent outline-none min-w-[150px] h-8"
      />
      {error && <p className="text-red-500 text-xs w-full mt-1">{error}</p>}
    </div>
  )
} 
