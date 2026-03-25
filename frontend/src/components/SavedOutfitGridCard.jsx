import { memo } from 'react'
import { FaTrash, FaSave } from 'react-icons/fa'

const placeholderImg =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect width="200" height="200" fill="%23f1f5f9"/%3E%3C/svg%3E'

function getImageUrl(url) {
  if (!url) return placeholderImg
  if (url.startsWith('http')) return url
  if (url.startsWith('/uploads/')) return url
  if (!url.startsWith('/')) return `/${url}`
  return url
}

function collectPieces(outfit) {
  const superior = outfit.superior_id || outfit.superior
  const superiorSecundario = outfit.superior_secundario_id || outfit.superiorSecundario
  const inferior = outfit.inferior_id || outfit.inferior
  const zapatos = outfit.zapatos_id || outfit.zapatos
  const abrigo = outfit.abrigo_id || outfit.abrigo
  return [superior, superiorSecundario, inferior, zapatos, abrigo].filter((p) => p?.imagen_url)
}

const pieceBtnClass =
  'relative rounded-lg overflow-hidden border border-[#D0CEC8] bg-white min-h-0 min-w-0 w-full h-full group'

/**
 * Compact outfit card: garment grid adapts to 1–4 pieces (no empty slots for 3 items).
 * First four pieces shown; +N when there are more than four.
 */
const SavedOutfitGridCard = ({
  outfit,
  onOpen,
  onDelete,
  onPieceClick,
  onSaveToWardrobe,
  saveToWardrobeLoading
}) => {
  const pieces = collectPieces(outfit)
  const shown = pieces.slice(0, 4)
  const extra = pieces.length > 4 ? pieces.length - 4 : 0
  const n = shown.length

  const renderPiece = (prenda, i, { showExtraBadge = false, className = '' } = {}) => {
    const media = (
      <>
        <img
          src={getImageUrl(prenda.imagen_url)}
          alt=""
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            e.target.onerror = null
            e.target.src = placeholderImg
          }}
        />
        {showExtraBadge && extra > 0 && (
          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-[#0D0D0D]/85 text-white text-[10px] font-semibold">
            +{extra}
          </span>
        )}
      </>
    )
    const shell = `${pieceBtnClass} ${onPieceClick ? '' : 'cursor-default'} ${className}`
    if (onPieceClick) {
      return (
        <button
          key={prenda._id || i}
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onPieceClick(prenda)
          }}
          className={shell}
        >
          {media}
        </button>
      )
    }
    return (
      <div
        key={prenda._id || i}
        className={shell}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="presentation"
      >
        {media}
      </div>
    )
  }

  const gridBody = (() => {
    if (n === 0) {
      return (
        <div
          className="rounded-lg bg-[#ecebe8] border border-[#D0CEC8]/50 aspect-square w-full"
          aria-hidden
        />
      )
    }
    if (n === 1) {
      return (
        <div className="aspect-square w-full flex min-h-0">
          {renderPiece(shown[0], 0, { className: 'flex-1 min-h-0' })}
        </div>
      )
    }
    if (n === 2) {
      return (
        <div className="grid grid-cols-2 gap-1.5 aspect-square w-full min-h-0">
          {renderPiece(shown[0], 0)}
          {renderPiece(shown[1], 1)}
        </div>
      )
    }
    if (n === 3) {
      return (
        <div className="grid grid-cols-2 grid-rows-2 gap-1.5 aspect-square w-full min-h-0">
          {renderPiece(shown[0], 0, { className: 'min-h-0' })}
          {renderPiece(shown[1], 1, { className: 'min-h-0' })}
          {renderPiece(shown[2], 2, { className: 'col-span-2 min-h-0' })}
        </div>
      )
    }
    return (
      <div className="grid grid-cols-2 grid-rows-2 gap-1.5 aspect-square w-full min-h-0">
        {shown.map((prenda, i) =>
          renderPiece(prenda, i, {
            showExtraBadge: i === 3,
            className: 'min-h-0'
          })
        )}
      </div>
    )
  })()

  return (
    <div
      className="sw-card rounded-2xl overflow-hidden border border-[#D0CEC8] cursor-pointer relative"
      onClick={onOpen}
      onKeyDown={
        onOpen
          ? (ev) => {
              if (ev.key === 'Enter' || ev.key === ' ') {
                ev.preventDefault()
                onOpen()
              }
            }
          : undefined
      }
      tabIndex={onOpen ? 0 : undefined}
    >
      {onDelete && (
        <div className="absolute top-2 right-2 z-20 pointer-events-auto">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="flex items-center justify-center w-10 h-10 min-w-10 rounded-xl bg-[#FF3B00] text-white border-2 border-white shadow-[0_2px_12px_rgba(0,0,0,0.2)] hover:bg-[#e63500] hover:shadow-[0_4px_14px_rgba(255,59,0,0.45)] active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D0D0D] focus-visible:ring-offset-2"
            aria-label="Delete outfit"
          >
            <FaTrash className="w-4 h-4 shrink-0" aria-hidden />
          </button>
        </div>
      )}

      <div className="p-2 bg-[#fafaf9]">{gridBody}</div>

      {onSaveToWardrobe && (
        <div
          className="border-t border-[#D0CEC8] bg-white px-2 py-2"
          onClick={(e) => e.stopPropagation()}
          role="presentation"
        >
          <button
            type="button"
            disabled={saveToWardrobeLoading}
            onClick={(e) => {
              e.stopPropagation()
              onSaveToWardrobe()
            }}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-sm font-semibold transition-colors border border-[#D0CEC8] bg-[#fafaf9] text-[#0D0D0D] hover:border-[#0D0D0D] hover:bg-white disabled:opacity-60 disabled:pointer-events-none"
          >
            <FaSave className="shrink-0 opacity-90" aria-hidden />
            <span>{saveToWardrobeLoading ? 'Saving…' : 'Save to wardrobe'}</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default memo(SavedOutfitGridCard)
