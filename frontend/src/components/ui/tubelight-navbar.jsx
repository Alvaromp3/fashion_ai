import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
import { Home, Shirt, Sparkles, BarChart3, Image, ScanLine } from 'lucide-react'
import { cn } from '../../lib/utils'

const defaultNavItems = [
  { name: 'Dashboard', url: '/', icon: Home },
  { name: 'Garments', url: '/prendas', icon: Shirt },
  { name: 'Outfits', url: '/outfits', icon: Sparkles },
  { name: 'Mirror', url: '/mirror', icon: ScanLine },
  { name: 'Metrics', url: '/modelo/confusion-matrix', icon: BarChart3 },
  { name: 'Examples', url: '/modelo/ejemplos', icon: Image },
]

export function TubelightNavbar({ items = defaultNavItems, className }) {
  const location = useLocation()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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
      </div>
    </div>
  )
}
