"use client"
import { useEffect } from "react"
import { useStore } from "../store/useStore"
import { AlertTriangle, CheckCircle, BookOpen, Lightbulb, X } from "lucide-react"
import type { Suggestion } from "../store/useStore"

interface GrammarSidebarProps {
  content: string
  className?: string
}

export function GrammarSidebar({ content, className = "" }: GrammarSidebarProps) {
  const { grammarSuggestions, isCheckingGrammar, clearGrammarSuggestions, applySuggestion } = useStore()

  useEffect(() => {
    // Clear suggestions when the content changes to avoid showing stale results
    clearGrammarSuggestions()
  }, [content, clearGrammarSuggestions])

  const getIssueIcon = (type: Suggestion["type"]) => {
    switch (type) {
      case 'grammar':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'spelling':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'clarity':
        return <Lightbulb className="w-4 h-4 text-blue-500" />
      default:
        return <BookOpen className="w-4 h-4 text-gray-500" />
    }
  }

  const getIssueColor = (type: Suggestion["type"]) => {
    switch (type) {
      case 'grammar':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
      case 'spelling':
        return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20'
      case 'clarity':
        return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
      default:
        return 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
    }
  }

  return (
    <div className={`grammar-sidebar h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Suggestions</h2>
        </div>
        {grammarSuggestions.length > 0 && (
          <button
            onClick={clearGrammarSuggestions}
            className="text-xs text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Analysis Status */}
      {isCheckingGrammar && (
        <div className="flex items-center space-x-2 mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm text-blue-700 dark:text-blue-300">Checking for suggestions...</span>
        </div>
      )}

      {/* Issues List */}
      <div className="space-y-3 overflow-y-auto flex-1">
        {grammarSuggestions.length === 0 && !isCheckingGrammar ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              No suggestions yet
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Suggestions will appear here as you type.
            </p>
          </div>
        ) : (
          grammarSuggestions.map((issue) => (
            <div
              key={issue.id}
              className={`p-3 rounded-lg border ${getIssueColor(issue.type)} transition-all duration-200 hover:shadow-sm`}
            >
              <div className="flex items-start space-x-2">
                {getIssueIcon(issue.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                      {issue.type}
                    </span>
                  </div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    {issue.explanation}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    Suggested: <strong className="font-semibold">{issue.suggestion}</strong>
                  </p>
                  {issue.original && (
                    <div className="text-xs text-gray-500 dark:text-gray-500 font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      Original: "{issue.original}"
                    </div>
                  )}
                  <button
                    onClick={() => applySuggestion(issue.id)}
                    className="mt-3 w-full text-left px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md transition-all"
                  >
                    Apply Suggestion
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default GrammarSidebar 
