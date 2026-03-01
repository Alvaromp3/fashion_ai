import React, { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
import { Home, LayoutDashboard, Shirt, Sparkles, ScanLine, Shield, LogIn, LogOut, User } from 'lucide-react'
import { useAuth0 } from '@auth0/auth0-react'
import { cn } from '../../lib/utils'
import { useIsAdmin } from '../../hooks/useIsAdmin'

const guestNavItems = [{ name: 'Home', url: '/', icon: Home }]

const appNavItems = [
  { name: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { name: 'Garments', url: '/prendas', icon: Shirt },
  { name: 'Outfits', url: '/outfits', icon: Sparkles },
  { name: 'Mirror', url: '/mirror', icon: ScanLine },
]

export function TubelightNavbar({ items: itemsProp, className }) {
  const location = useLocation()
  const [isMobile, setIsMobile] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef(null)
  const { isAuthenticated, user, loginWithRedirect, logout } = useAuth0()
  const { isAdmin } = useIsAdmin()
  const items = itemsProp ?? (isAuthenticated
    ? [...appNavItems, ...(isAdmin ? [{ name: 'Admin', url: '/admin', icon: Shield }] : [])]
    : guestNavItems)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
    }
    if (profileOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [profileOpen])

  return (
    <div
      className={cn(
        'fixed bottom-0 sm:top-0 left-1/2 -translate-x-1/2 z-50 mb-6 sm:pt-6 w-full max-w-7xl px-4 sm:px-6 pointer-events-none',
        className
      )}
    >
      <div
        className="flex items-center justify-center gap-1 sm:gap-3 backdrop-blur-lg py-1.5 px-1.5 sm:py-1 sm:px-1 rounded-full shadow-xl mx-auto w-fit border-2 border-slate-500 bg-slate-700/95 pointer-events-auto"
      >
        {items.map((item) => {
          const Icon = item.icon
          const isActive =
            item.url === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.url)

          return (
            <Link
              key={item.name}
              to={item.url}
              className={cn(
                'relative cursor-pointer text-sm font-semibold px-4 sm:px-6 py-2 rounded-full transition-colors',
                'text-slate-300 hover:text-white',
                isActive && 'text-white bg-slate-600/90'
              )}
            >
              <span className="hidden md:inline">{item.name}</span>
              <span className="md:hidden inline-flex items-center justify-center w-8 h-8">
                {Icon ? <Icon size={18} strokeWidth={2.5} /> : item.name.slice(0, 1)}
              </span>
              {isActive && (
                <motion.div
                  layoutId="tubelight-lamp"
                  className="absolute inset-0 w-full rounded-full -z-10 bg-white/10"
                  initial={false}
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 30,
                  }}
                >
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 rounded-t-full bg-slate-300 shadow-[0_0_12px_rgba(203,213,225,0.6)]">
                    <div className="absolute w-12 h-6 rounded-full blur-md -top-2 -left-2 opacity-30 bg-slate-300" />
                    <div className="absolute w-8 h-6 rounded-full blur-md -top-1 opacity-20 bg-slate-200" />
                  </div>
                </motion.div>
              )}
            </Link>
          )
        })}
        <div className="flex items-center pl-1 sm:pl-2 border-l border-slate-600 ml-1">
          {!isAuthenticated ? (
            <button
              type="button"
              onClick={() => loginWithRedirect()}
              className="flex items-center gap-1.5 text-sm font-semibold text-slate-300 hover:text-white px-3 py-2 rounded-full transition-colors"
            >
              <LogIn size={18} strokeWidth={2.5} />
              <span className="hidden sm:inline">Log in</span>
            </button>
          ) : (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileOpen((o) => !o)}
                className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-slate-400"
                aria-expanded={profileOpen}
                aria-haspopup="true"
              >
                {user?.picture ? (
                  <img
                    src={user.picture}
                    alt={user?.name || 'Profile'}
                    className="w-8 h-8 rounded-full border-2 border-slate-500 object-cover"
                  />
                ) : (
                  <span className="w-8 h-8 rounded-full border-2 border-slate-500 bg-slate-600 flex items-center justify-center">
                    <User size={16} className="text-slate-300" />
                  </span>
                )}
                <span className="hidden md:inline text-sm font-semibold text-slate-200 max-w-[120px] truncate">
                  {user?.name || user?.email || 'Profile'}
                </span>
              </button>
              {profileOpen && (
                <div
                  className="absolute right-0 top-full mt-2 py-1 w-48 rounded-lg shadow-xl border border-slate-600 bg-slate-800 z-50"
                  role="menu"
                >
                  <div className="px-3 py-2 border-b border-slate-600">
                    <p className="text-sm font-medium text-slate-100 truncate">{user?.name || 'User'}</p>
                    {user?.email && (
                      <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false)
                      logout({ logoutParams: { returnTo: window.location.origin } })
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                    role="menuitem"
                  >
                    <LogOut size={16} />
                    Log out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
