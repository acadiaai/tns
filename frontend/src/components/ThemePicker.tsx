import { useTheme, Theme } from './ThemeProvider'
import { Button } from './ui/Button'
import { ChevronDown, Palette, Check } from 'lucide-react'
import { useState } from 'react'

const themes: { id: Theme; name: string; color: string; description: string }[] = [
  {
    id: 'slate',
    name: 'Slate',
    color: '#64748b',
    description: 'Clean and timeless'
  },
  {
    id: 'navy',
    name: 'Navy',
    color: '#0ea5e9',
    description: 'Professional and trustworthy'
  },
  {
    id: 'forest',
    name: 'Forest',
    color: '#22c55e',
    description: 'Natural and refreshing'
  },
  {
    id: 'charcoal',
    name: 'Charcoal',
    color: '#71717a',
    description: 'Modern and sophisticated'
  },
  {
    id: 'plum',
    name: 'Plum',
    color: '#a855f7',
    description: 'Creative and inspiring'
  }
]

export function ThemePicker() {
  const { theme, setTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)

  const currentTheme = themes.find(t => t.id === theme) || themes[0]

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="flex items-center gap-2 px-3 py-2 h-10 glass-card hover:bg-white/15 transition-all"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div
          className="w-4 h-4 rounded-full theme-indicator shadow-sm border border-white/30"
          style={{ backgroundColor: currentTheme.color }}
        />
        <span className="text-sm font-medium text-white/90 hidden sm:inline">
          {currentTheme.name}
        </span>
        <ChevronDown className={`h-4 w-4 text-white/70 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute top-full right-0 mt-2 w-56 dropdown-content rounded-xl z-50 p-2">
            <div className="flex items-center gap-2 px-3 py-2 mb-2 border-b border-white/20">
              <Palette className="h-4 w-4 text-white/70" />
              <span className="text-sm font-medium text-white/90">Select Theme</span>
            </div>

            <div className="space-y-1">
              {themes.map((themeOption) => (
                <button
                  key={themeOption.id}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left
                    transition-all duration-200 group
                    ${theme === themeOption.id
                      ? 'bg-white/20 border border-white/30'
                      : 'hover:bg-white/10 border border-transparent hover:border-white/20'
                    }
                  `}
                  onClick={() => {
                    setTheme(themeOption.id)
                    setIsOpen(false)
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-full theme-indicator shadow-sm border border-white/30 group-hover:scale-105"
                    style={{ backgroundColor: themeOption.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white/90">
                        {themeOption.name}
                      </span>
                      {theme === themeOption.id && (
                        <Check className="h-3 w-3 text-white/70" />
                      )}
                    </div>
                    <p className="text-xs text-white/60 mt-0.5">
                      {themeOption.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
} 