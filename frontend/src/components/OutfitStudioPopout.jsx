import { useEffect } from 'react'
import { FaTimes } from 'react-icons/fa'

/**
 * Full-screen (mobile) / large modal (desktop) for outfit detail from My Outfits studio lists.
 */
const OutfitStudioPopout = ({ open, onClose, title, shareTargetRef, children, footer }) => {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="outfit-studio-popout-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div
        className="relative z-10 flex flex-col w-full h-[100dvh] sm:h-auto sm:max-h-[min(92dvh,900px)] sm:max-w-2xl sm:rounded-2xl overflow-hidden bg-white shadow-xl border border-[#D0CEC8]"
      >
        <header className="flex items-center justify-between gap-3 px-4 py-3 sm:pt-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))] border-b border-[#D0CEC8] shrink-0">
          <h2 id="outfit-studio-popout-title" className="text-lg font-semibold text-[#0D0D0D] truncate min-w-0 pr-2">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-10 h-10 rounded-xl border border-[#D0CEC8] flex items-center justify-center text-[#0D0D0D] hover:bg-[#f4f4f2] transition-colors"
            aria-label="Close"
          >
            <FaTimes className="text-lg" />
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4">
          <div
            ref={shareTargetRef}
            data-outfit-card
            className="rounded-2xl overflow-hidden border-2 border-[#D0CEC8] shadow-sm bg-white"
          >
            {children}
          </div>
        </div>

        {footer ? (
          <footer className="shrink-0 border-t border-[#D0CEC8] px-4 py-3 sm:pb-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] bg-white flex flex-wrap gap-2">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  )
}

export default OutfitStudioPopout
