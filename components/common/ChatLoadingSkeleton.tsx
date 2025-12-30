'use client'

/**
 * Chat Loading Skeleton
 * 
 * Displays skeleton messages while chat comments are loading
 * Similar to modern chat applications like Slack or Discord
 */

interface ChatLoadingSkeletonProps {
  variant?: 'default' | 'compact'
  messageCount?: number
}

export function ChatLoadingSkeleton({ 
  variant = 'default',
  messageCount = 3 
}: ChatLoadingSkeletonProps) {
  const isCompact = variant === 'compact'

  return (
    <div className={isCompact ? 'flex flex-col gap-2' : 'space-y-3'}>
      {/* Skeleton messages with shimmer effect */}
      {Array.from({ length: messageCount }).map((_, i) => (
        <div 
          key={i} 
          className="group relative flex gap-2 hover:bg-gray-50/50 -mx-1 px-1.5 py-0.5 rounded transition-colors"
        >
          {/* Avatar skeleton */}
          <div className="flex-shrink-0">
            <div 
              className={`${isCompact ? 'w-6 h-6' : 'w-8 h-8'} bg-gray-200 rounded-full animate-pulse`}
            ></div>
          </div>
          
          {/* Content skeleton */}
          <div className="flex-1 min-w-0">
            {/* Author and time */}
            <div className="flex items-center gap-2 mb-1.5">
              <div 
                className={`h-3.5 bg-gray-200 rounded ${isCompact ? 'w-16' : 'w-20'} animate-pulse`} 
                style={{ animationDelay: `${i * 0.1}s` }}
              ></div>
              <div 
                className={`h-2.5 bg-gray-100 rounded ${isCompact ? 'w-12' : 'w-16'} animate-pulse`} 
                style={{ animationDelay: `${i * 0.15}s` }}
              ></div>
            </div>
            
            {/* Message content */}
            <div className="space-y-1.5">
              <div 
                className={`h-3 bg-gray-200 rounded ${isCompact ? 'w-full' : 'w-3/4'} animate-pulse`} 
                style={{ animationDelay: `${i * 0.2}s` }}
              ></div>
              {i === 0 && (
                <>
                  <div 
                    className="h-3 bg-gray-200 rounded w-5/6 animate-pulse" 
                    style={{ animationDelay: '0.25s' }}
                  ></div>
                  <div 
                    className="h-3 bg-gray-200 rounded w-2/3 animate-pulse" 
                    style={{ animationDelay: '0.3s' }}
                  ></div>
                </>
              )}
              {i === 1 && (
                <div 
                  className="h-3 bg-gray-200 rounded w-4/5 animate-pulse" 
                  style={{ animationDelay: '0.25s' }}
                ></div>
              )}
            </div>
            
            {/* Optional reactions skeleton */}
            {i === messageCount - 1 && (
              <div className="mt-2 flex gap-1">
                <div 
                  className="h-5 w-8 bg-gray-100 rounded-full animate-pulse" 
                  style={{ animationDelay: '0.3s' }}
                ></div>
                <div 
                  className="h-5 w-10 bg-gray-100 rounded-full animate-pulse" 
                  style={{ animationDelay: '0.35s' }}
                ></div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Chat Empty State
 * 
 * Displays when there are no comments yet
 */
interface ChatEmptyStateProps {
  variant?: 'default' | 'compact'
  title?: string
  subtitle?: string
}

export function ChatEmptyState({ 
  variant = 'default',
  title = 'No hay comentarios aún',
  subtitle = 'Inicia la conversación'
}: ChatEmptyStateProps) {
  const isCompact = variant === 'compact'

  return (
    <div className={`flex flex-col items-center justify-center text-center ${isCompact ? 'py-8 bg-gray-50/50 rounded-lg border border-dashed border-gray-200' : 'py-12'}`}>
      {!isCompact && (
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
          <svg 
            className="text-gray-400" 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
      )}
      <span className={`${isCompact ? 'text-gray-400' : 'text-gray-500'} font-medium text-sm`}>
        {title}
      </span>
      <span className={`text-xs text-gray-400 ${isCompact ? '' : 'mt-1'}`}>
        {subtitle}
      </span>
    </div>
  )
}

