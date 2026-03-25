import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, Shirt, Sparkles, ScanLine, LogIn, Settings } from 'lucide-react'
import { cn } from '../../lib/utils'

const defaultNavItems = [
  { name: 'Dashboard', url: '/', icon: Home },
  { name: 'Wardrobe', url: '/wardrobe', icon: Shirt },
  { name: 'Generate', url: '/generate', icon: Sparkles },
  { name: 'Mirror', url: '/mirror', icon: ScanLine },
  { name: 'Settings', url: '/settings', icon: Settings },
]

const linkBase =
  'relative z-0 shrink-0 font-semibold text-sm transition-colors text-[#0D0D0D] hover:text-[#FF3B00] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF3B00]'

/** Barra principal siempre abajo (mismo patrón que antes solo en móvil). */
export function TubelightNavbar({ items = defaultNavItems, isAuthenticated, onLogin, className }) {
  const location = useLocation()

  return (
    <div className="fixed z-50 inset-x-0 bottom-0 pointer-events-none">
      <div className={cn('mx-auto w-full max-w-none px-0 pointer-events-none flex justify-center', className)}>
        <div
          className={cn(
            'pointer-events-auto flex w-full max-w-full items-stretch',
            'rounded-t-2xl border-x-0 border-t border-[#D0CEC8] bg-white/95 backdrop-blur-xl shadow-[0_-6px_28px_rgba(0,0,0,0.07)]',
            'px-1 pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom,0px))]'
          )}
        >
          <nav
            className="scrollbar-touch flex flex-1 min-h-[3.25rem] items-center justify-around gap-0 overflow-x-auto overflow-y-hidden"
            aria-label="Main"
          >
            {items.map((item) => {
              const Icon = item.icon
              const isActive =
                item.url === '/' ? location.pathname === '/' : location.pathname.startsWith(item.url)

              return (
                <Link
                  key={item.name}
                  to={item.url}
                  className={cn(
                    linkBase,
                    'relative flex min-h-[3.25rem] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1.5',
                    isActive && 'text-[#FF3B00]'
                  )}
                >
                  {isActive && (
                    <span
                      className="absolute left-1/2 top-0 h-0.5 w-7 -translate-x-1/2 rounded-full bg-[#FF3B00] shadow-[0_0_10px_rgba(255,59,0,0.5)]"
                      aria-hidden
                    />
                  )}
                  {Icon ? (
                    <Icon
                      size={22}
                      strokeWidth={2.25}
                      className={cn('shrink-0 opacity-90', isActive && 'opacity-100')}
                      aria-hidden
                    />
                  ) : null}
                  <span className="max-w-[4.75rem] truncate text-center text-[10px] font-semibold leading-tight sm:text-[11px]">
                    {item.name}
                  </span>
                </Link>
              )
            })}
          </nav>
          {onLogin && !isAuthenticated && (
            <button
              type="button"
              onClick={onLogin}
              className="mx-1 my-auto inline-flex min-h-[2.75rem] min-w-[2.75rem] shrink-0 items-center justify-center gap-1 self-center rounded-xl bg-[#0D0D0D] text-white hover:bg-[#FF3B00]"
              title="Log in"
            >
              <LogIn size={20} strokeWidth={2.25} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
