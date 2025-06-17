"use client"
import { useStore } from "../store/useStore"
import { Send, Clock, CheckCircle, XCircle, AlertCircle, Search } from "lucide-react"
import { useState } from "react"

interface SidebarSentListProps {
  onSentSelect?: (sentId: string) => void | Promise<void>
  className?: string
}

export function SidebarSentList({ onSentSelect, className = "" }: SidebarSentListProps) {
  const { sentMessages, activeSentId, setActiveSent, isLoadingSentMessages } = useStore()
  const [searchQuery, setSearchQuery] = useState("")

  const handleSentClick = async (sentId: string) => {
    setActiveSent(sentId)
    await onSentSelect?.(sentId)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case "pending":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "delivered":
        return "Delivered"
      case "pending":
        return "Pending"
      case "failed":
        return "Failed"
      default:
        return "Unknown"
    }
  }

  const filteredSentMessages = sentMessages.filter(
    (message) =>
      message.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      message.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      message.recipient.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className={`sidebar-sent-list px-6 ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Sent Messages</h3>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search sent messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>

        <div className="space-y-2">
          {isLoadingSentMessages && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Loading sent messages...</p>
            </div>
          )}
          {!isLoadingSentMessages && filteredSentMessages.map((message) => (
            <div
              key={message.id}
              onClick={() => handleSentClick(message.id)}
              className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${
                activeSentId === message.id
                  ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                  : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              <div className="flex items-start space-x-3">
                <Send
                  className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                    activeSentId === message.id
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <h4
                    className={`font-medium truncate ${
                      activeSentId === message.id ? "text-blue-900 dark:text-blue-100" : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {message.title}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">To: {message.recipient}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                    {message.content.substring(0, 60)}...
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center text-xs text-gray-400 dark:text-gray-500">
                      <Clock className="w-3 h-3 mr-1" />
                      <span>Sent {formatDate(message.sentAt)}</span>
                    </div>
                    <div className="flex items-center text-xs">
                      {getStatusIcon(message.status)}
                      <span className="ml-1 text-gray-500 dark:text-gray-400">{getStatusText(message.status)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {!isLoadingSentMessages && filteredSentMessages.length === 0 && searchQuery && (
        <div className="text-center py-8">
          <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">No sent messages found</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Try adjusting your search terms</p>
        </div>
      )}

      {!isLoadingSentMessages && filteredSentMessages.length === 0 && !searchQuery && (
        <div className="text-center py-8">
          <Send className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">No sent messages yet</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Messages you send will appear here</p>
        </div>
      )}
    </div>
  )
}

export default SidebarSentList
