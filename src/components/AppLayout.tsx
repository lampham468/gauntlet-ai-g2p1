"use client"
import type { ReactNode } from "react"
import { LogOut } from "lucide-react"


interface AppLayoutProps {
  sidebar: ReactNode
  editor?: ReactNode
  rightSidebar?: ReactNode
  user?: {
    email: string
  }
  onLogout?: () => void
  _editorContent?: string
  className?: string
}

export function AppLayout({
  sidebar,
  editor,
  rightSidebar,
  user,
  onLogout,
  _editorContent = "",
  className = "",
}: AppLayoutProps) {
  return (
    <div className={`app-layout flex flex-col h-screen bg-gray-50 dark:bg-gray-900 ${className}`}>
      {/* Main Content Area - No top bar needed */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Fixed width, not collapsible */}
        <aside className="flex-shrink-0 w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto shadow-sm flex flex-col">
          {/* Sidebar Header with title and user info */}
          <div className="p-6 border-b border-gray-100 dark:border-gray-700">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">WordWise</h1>
            {user && <div className="text-sm text-gray-500 dark:text-gray-400">Welcome, {user.email}</div>}
          </div>

          {/* Sidebar Content - Flexible area */}
          <div className="flex-1 overflow-y-auto">{sidebar}</div>

          {/* Sidebar Footer with Logout */}
          {onLogout && (
            <div className="p-6 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </aside>

        {/* Editor Area - Clean background for bevel containers */}
        <main className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
          <div className="flex-1 overflow-y-auto">{editor}</div>
        </main>

        {/* Right Sidebar */}
        {rightSidebar && (
          <aside className="flex-shrink-0 w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto shadow-sm">
            <div className="p-6">{rightSidebar}</div>
          </aside>
        )}
      </div>
    </div>
  )
}

export default AppLayout
