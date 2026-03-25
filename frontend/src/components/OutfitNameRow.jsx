import { FaChevronRight } from 'react-icons/fa'

const OutfitNameRow = ({ name, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full min-w-0 text-left rounded-xl border border-[#D0CEC8] bg-white px-3 py-2.5 sm:px-4 sm:py-3 shadow-sm hover:border-[#0D0D0D] hover:bg-[#fafaf9] transition-colors flex items-center justify-between gap-2 group"
  >
    <span className="font-medium text-sm sm:text-base text-[#0D0D0D] truncate" title={name}>
      {name}
    </span>
    <FaChevronRight className="text-[#888] group-hover:text-[#0D0D0D] shrink-0 text-xs transition-colors" aria-hidden />
  </button>
)

export default OutfitNameRow
