const OutfitCardSkeleton = () => (
  <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm animate-pulse">
    <div className="px-6 pt-5 pb-4 bg-slate-50 border-b border-slate-100">
      <div className="flex justify-between items-center mb-2">
        <div className="h-4 w-20 bg-slate-200 rounded" />
        <div className="h-3 w-24 bg-slate-100 rounded" />
      </div>
      <div className="h-2 bg-slate-200 rounded-full" />
      <div className="flex gap-2 mt-3">
        <div className="h-6 w-24 bg-slate-100 rounded-full" />
        <div className="h-6 w-28 bg-slate-100 rounded-full" />
        <div className="h-6 w-20 bg-slate-100 rounded-full" />
      </div>
    </div>
    <div className="p-6">
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center">
            <div className="w-full aspect-square max-w-[120px] mx-auto rounded-xl bg-slate-200" />
            <div className="h-3 w-12 bg-slate-100 rounded mt-2" />
            <div className="h-3 w-16 bg-slate-100 rounded mt-1" />
          </div>
        ))}
      </div>
    </div>
  </div>
)

export default OutfitCardSkeleton
