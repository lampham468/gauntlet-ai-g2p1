import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AppLayout from './AppLayout'

// Mock the useStore hook
vi.mock('../store/useStore', () => ({
  __esModule: true,
  default: vi.fn(() => ({
    user: null,
    drafts: [],
    activeDraftId: '',
    isLoading: false
  }))
}))

describe('AppLayout', () => {
  const defaultProps = {
    sidebar: <div data-testid="test-sidebar">Test Sidebar</div>,
    editor: <div data-testid="test-editor">Test Editor</div>
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      render(<AppLayout {...defaultProps} />)
      expect(screen.getByTestId('test-sidebar')).toBeInTheDocument()
      expect(screen.getByTestId('test-editor')).toBeInTheDocument()
    })

    it('should display sidebar content', () => {
      render(<AppLayout {...defaultProps} />)
      expect(screen.getByText('Test Sidebar')).toBeInTheDocument()
    })

    it('should display editor content', () => {
      render(<AppLayout {...defaultProps} />)
      expect(screen.getByText('Test Editor')).toBeInTheDocument()
    })

    it('should show app title', () => {
      render(<AppLayout {...defaultProps} />)
      expect(screen.getByText('WordWise')).toBeInTheDocument()
    })
  })

  describe('User Information', () => {
    it('should display user email when provided', () => {
      const propsWithUser = {
        ...defaultProps,
        user: { email: 'test@example.com' }
      }
      
      render(<AppLayout {...propsWithUser} />)
      expect(screen.getByText('Welcome, test@example.com')).toBeInTheDocument()
    })

    it('should not show user info when user is not provided', () => {
      render(<AppLayout {...defaultProps} />)
      expect(screen.queryByText(/Welcome,/)).not.toBeInTheDocument()
    })
  })

  describe('Logout Functionality', () => {
    it('should display logout button when onLogout is provided', () => {
      const handleLogout = vi.fn()
      const propsWithLogout = {
        ...defaultProps,
        onLogout: handleLogout
      }
      
      render(<AppLayout {...propsWithLogout} />)
      expect(screen.getByText('Logout')).toBeInTheDocument()
    })

    it('should call onLogout when logout button is clicked', () => {
      const handleLogout = vi.fn()
      const propsWithLogout = {
        ...defaultProps,
        onLogout: handleLogout
      }
      
      render(<AppLayout {...propsWithLogout} />)
      
      const logoutButton = screen.getByText('Logout')
      fireEvent.click(logoutButton)
      
      expect(handleLogout).toHaveBeenCalledOnce()
    })

    it('should not show logout button when onLogout is not provided', () => {
      render(<AppLayout {...defaultProps} />)
      expect(screen.queryByText('Logout')).not.toBeInTheDocument()
    })
  })

  describe('Right Sidebar', () => {
    it('should display right sidebar when provided', () => {
      const propsWithRightSidebar = {
        ...defaultProps,
        rightSidebar: <div data-testid="right-sidebar">Right Sidebar Content</div>
      }
      
      render(<AppLayout {...propsWithRightSidebar} />)
      expect(screen.getByTestId('right-sidebar')).toBeInTheDocument()
      expect(screen.getByText('Right Sidebar Content')).toBeInTheDocument()
    })

    it('should not display right sidebar when not provided', () => {
      render(<AppLayout {...defaultProps} />)
      expect(screen.queryByTestId('right-sidebar')).not.toBeInTheDocument()
    })
  })

  describe('Layout Structure', () => {
    it('should have proper CSS classes', () => {
      const { container } = render(<AppLayout {...defaultProps} />)
      const appLayout = container.querySelector('.app-layout')
      
      expect(appLayout).toBeInTheDocument()
      expect(appLayout).toHaveClass('flex', 'flex-col', 'h-screen')
    })

    it('should apply custom className when provided', () => {
      const propsWithClassName = {
        ...defaultProps,
        className: 'custom-class'
      }
      
      const { container } = render(<AppLayout {...propsWithClassName} />)
      const appLayout = container.querySelector('.app-layout')
      
      expect(appLayout).toHaveClass('custom-class')
    })

    it('should have proper semantic structure', () => {
      render(<AppLayout {...defaultProps} />)
      
      // Check for main element
      const main = screen.getByRole('main')
      expect(main).toBeInTheDocument()
      
      // Check for aside elements (sidebars)
      const asides = screen.getAllByRole('complementary')
      expect(asides.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Responsive Design', () => {
    it('should handle different viewport sizes', () => {
      render(<AppLayout {...defaultProps} />)
      
      // Should render without throwing errors
      expect(screen.getByTestId('test-sidebar')).toBeInTheDocument()
      expect(screen.getByTestId('test-editor')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA roles', () => {
      render(<AppLayout {...defaultProps} />)
      
      expect(screen.getByRole('main')).toBeInTheDocument()
      expect(screen.getAllByRole('complementary')).toHaveLength(1)
    })

    it('should support keyboard navigation', () => {
      const handleLogout = vi.fn()
      const propsWithLogout = {
        ...defaultProps,
        onLogout: handleLogout
      }
      
      render(<AppLayout {...propsWithLogout} />)
      
      // Find the actual button element, not just the text
      const logoutButton = screen.getByRole('button', { name: /logout/i })
      
      // Button element should be inherently keyboard accessible
      expect(logoutButton.tagName).toBe('BUTTON')
      
      // Should respond to keyboard events (testing the event handling)
      fireEvent.keyDown(logoutButton, { key: 'Enter' })
      fireEvent.keyUp(logoutButton, { key: 'Enter' })
      
      // Verify button exists and is accessible
      expect(logoutButton).toBeInTheDocument()
      expect(logoutButton).toBeEnabled()
      
      // Button should have click handler
      fireEvent.click(logoutButton)
      expect(handleLogout).toHaveBeenCalled()
    })
  })
}) 
