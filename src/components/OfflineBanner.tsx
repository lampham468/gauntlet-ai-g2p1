"use client"
import { useState, useEffect } from "react"
import { WifiOff, Wifi } from "lucide-react"

interface OfflineBannerProps {
  className?: string
}

export function OfflineBanner({ className = "" }: OfflineBannerProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showBanner, setShowBanner] = useState(!navigator.onLine)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      // Show "back online" message briefly
      setShowBanner(true)
      setTimeout(() => setShowBanner(false), 3000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowBanner(true)
    }

    // Add event listeners
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Cleanup
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  if (!showBanner) return null

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out ${
        isOnline ? "bg-green-600 text-white" : "bg-red-600 text-white"
      } ${className}`}
    >
      <div className="flex items-center justify-center px-4 py-3">
        <div className="flex items-center space-x-3">
          {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
          <div className="flex items-center space-x-4">
            <span className="font-medium">{isOnline ? "You're back online!" : "You're currently offline"}</span>
            {!isOnline && <span className="text-sm opacity-90">Some features may not be available</span>}
          </div>
        </div>

        {isOnline && (
          <button
            onClick={() => setShowBanner(false)}
            className="ml-4 text-white hover:text-gray-200 transition-colors duration-200"
            aria-label="Dismiss notification"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

export default OfflineBanner
