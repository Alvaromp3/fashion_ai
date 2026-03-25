const OutfitCardSkeleton = ({ compact = false }) => (
  <div className={`sw-card ${compact ? 'rounded-xl' : 'rounded-2xl'} overflow-hidden border-[#D0CEC8] animate-pulse`}>
    <div className={`${compact ? 'px-3 pt-2 pb-2' : 'px-6 pt-5 pb-4'} bg-white border-b border-[#D0CEC8]`}>
      <div className="flex justify-between items-center mb-1.5">
        <div className={`${compact ? 'h-3 w-14' : 'h-4 w-20'} bg-[#E8E6E0] rounded`} />
        <div className={`${compact ? 'h-2.5 w-16' : 'h-3 w-24'} bg-[#E8E6E0] rounded`} />
      </div>
      <div className={`${compact ? 'h-1.5' : 'h-2'} bg-[#E8E6E0] rounded-full`} />
      <div className={`flex gap-1.5 ${compact ? 'mt-2' : 'mt-3'}`}>
        <div className={`${compact ? 'h-5 w-16' : 'h-6 w-24'} bg-[#E8E6E0] rounded-full`} />
        <div className={`${compact ? 'h-5 w-14' : 'h-6 w-28'} bg-[#E8E6E0] rounded-full`} />
      </div>
    </div>
    <div className={compact ? 'p-3' : 'p-6'}>
      <div className={`grid grid-cols-3 ${compact ? 'gap-1.5' : 'gap-4'}`}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center">
            <div
              className={`w-full aspect-square mx-auto rounded-lg bg-[#E8E6E0] border border-[#D0CEC8] ${compact ? 'max-w-[56px]' : 'max-w-[120px]'}`}
            />
            <div className={`${compact ? 'h-2 w-8 mt-1' : 'h-3 w-12 mt-2'} bg-[#E8E6E0] rounded`} />
            <div className={`${compact ? 'h-2 w-10 mt-0.5' : 'h-3 w-16 mt-1'} bg-[#E8E6E0] rounded`} />
          </div>
        ))}
      </div>
    </div>
  </div>
)

export default OutfitCardSkeleton
