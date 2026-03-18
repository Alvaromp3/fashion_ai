const OutfitCardSkeleton = () => (
  <div className="sw-card rounded-2xl overflow-hidden border-[#D0CEC8] animate-pulse">
    <div className="px-6 pt-5 pb-4 bg-white border-b border-[#D0CEC8]">
      <div className="flex justify-between items-center mb-2">
        <div className="h-4 w-20 bg-[#E8E6E0] rounded" />
        <div className="h-3 w-24 bg-[#E8E6E0] rounded" />
      </div>
      <div className="h-2 bg-[#E8E6E0] rounded-full" />
      <div className="flex gap-2 mt-3">
        <div className="h-6 w-24 bg-[#E8E6E0] rounded-full" />
        <div className="h-6 w-28 bg-[#E8E6E0] rounded-full" />
        <div className="h-6 w-20 bg-[#E8E6E0] rounded-full" />
      </div>
    </div>
    <div className="p-6">
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center">
            <div className="w-full aspect-square max-w-[120px] mx-auto rounded-xl bg-[#E8E6E0] border border-[#D0CEC8]" />
            <div className="h-3 w-12 bg-[#E8E6E0] rounded mt-2" />
            <div className="h-3 w-16 bg-[#E8E6E0] rounded mt-1" />
          </div>
        ))}
      </div>
    </div>
  </div>
)

export default OutfitCardSkeleton
