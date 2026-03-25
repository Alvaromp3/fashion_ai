import { NavLink } from 'react-router-dom'
import { cn } from '../lib/utils'

/**
 * Tabs within wardrobe: garments index vs saved outfits sub-page.
 */
export function WardrobeSubNav({ className }) {
  return (
    <nav
      className={cn('chip-row scrollbar-touch -mx-1 px-1 mb-8', className)}
      aria-label="Wardrobe sections"
    >
      <NavLink
        to="/wardrobe"
        end
        className={({ isActive }) => cn('sw-chip', isActive && 'active')}
      >
        Garments
      </NavLink>
      <NavLink to="/wardrobe/outfits" className={({ isActive }) => cn('sw-chip', isActive && 'active')}>
        Saved outfits
      </NavLink>
    </nav>
  )
}
