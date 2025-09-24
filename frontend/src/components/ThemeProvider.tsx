import { ThemeProvider as NextThemeProvider } from 'next-themes'
import { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'slate' | 'navy' | 'forest' | 'charcoal' | 'plum'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('slate')

  useEffect(() => {
    const saved = localStorage.getItem('app-theme') as Theme
    if (saved) {
      setTheme(saved)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('app-theme', theme)
    document.documentElement.className = `theme-${theme}`
  }, [theme])

  return (
    <NextThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <ThemeContext.Provider value={{ theme, setTheme }}>
        {children}
      </ThemeContext.Provider>
    </NextThemeProvider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
} 