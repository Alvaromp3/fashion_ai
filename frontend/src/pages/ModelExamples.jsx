import { useState, useEffect } from 'react'

const ModelExamples = ({ embedded = false }) => {
  const [imageError, setImageError] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const classes = [
    { name: 'Ankle_boot', desc: 'Ankle boots — footwear that covers the ankle.', tipo: 'zapatos' },
    { name: 'Bag', desc: 'Bag — accessory for carrying personal items.', tipo: 'accesorio' },
    { name: 'Coat', desc: 'Coat — outerwear for cold weather.', tipo: 'abrigo' },
    { name: 'Dress', desc: 'Dress — single-piece garment for torso and legs.', tipo: 'vestido' },
    { name: 'Pullover', desc: 'Pullover — knitted top.', tipo: 'superior' },
    { name: 'Sandal', desc: 'Sandal — open footwear with a sole.', tipo: 'zapatos' },
    { name: 'Shirt', desc: 'Shirt — top with buttons and collar.', tipo: 'superior' },
    { name: 'Sneaker', desc: 'Sneaker — casual or sports shoe.', tipo: 'zapatos' },
    { name: 'T-shirt', desc: 'T-shirt — casual top, usually cotton, no buttons.', tipo: 'superior' },
    { name: 'Trouser', desc: 'Trouser — lower-body garment covering the legs.', tipo: 'inferior' }
  ]

  const tipoLabels = {
    zapatos: 'Footwear',
    accesorio: 'Accessory',
    abrigo: 'Coat',
    vestido: 'Dress',
    superior: 'Top',
    inferior: 'Bottom'
  }

  const tipoStyles = {
    zapatos: { border: 'border-amber-500/50', badge: 'bg-amber-500/20 text-amber-200 border-amber-500/40', accent: 'from-amber-500/10 to-amber-600/5' },
    accesorio: { border: 'border-violet-500/50', badge: 'bg-violet-500/20 text-violet-200 border-violet-500/40', accent: 'from-violet-500/10 to-violet-600/5' },
    abrigo: { border: 'border-sky-500/50', badge: 'bg-sky-500/20 text-sky-200 border-sky-500/40', accent: 'from-sky-500/10 to-sky-600/5' },
    vestido: { border: 'border-pink-500/50', badge: 'bg-pink-500/20 text-pink-200 border-pink-500/40', accent: 'from-pink-500/10 to-pink-600/5' },
    superior: { border: 'border-emerald-500/50', badge: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40', accent: 'from-emerald-500/10 to-emerald-600/5' },
    inferior: { border: 'border-slate-400/50', badge: 'bg-slate-500/20 text-slate-200 border-slate-400/40', accent: 'from-slate-500/10 to-slate-600/5' }
  }

  return (
    <div
      className={embedded ? '' : 'min-h-screen sw-light max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10'}
      style={embedded ? undefined : { background: 'var(--sw-white)' }}
    >
      {!embedded && (
        <div className={`mb-10 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="border-b border-[#0D0D0D] relative overflow-hidden">
            <div className="absolute inset-0 sw-stripe opacity-50" />
            <div className="relative max-w-7xl mx-auto px-5 py-10">
              <p className="sw-label text-[#FF3B00] mb-2">— INTELLIGENCE</p>
              <h1 className="sw-display" style={{ fontSize: 'clamp(2.5rem, 7vw, 5rem)' }}>
                MODEL
                <br />
                EXAMPLES
              </h1>
              <p className="sw-label text-[#888] mt-2" style={{ fontSize: '0.7rem', letterSpacing: '0.12em' }}>
                VISUAL CLASSIFICATION POWERED BY VIT
              </p>
            </div>
          </div>
        </div>
      )}

      {!embedded && (
        <div className="marquee-bar">
          <div className="sw-marquee-track">
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} className="sw-label text-white px-5" style={{ fontSize: '0.7rem' }}>
                VIT-B/16 · 86M PARAMS ✦ 94.8% TOP-1 ACCURACY
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Visual examples image */}
      {!imageError && (
        <div className={`sw-card p-6 mb-10 overflow-hidden transition-all duration-700 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h2 className="sw-heading" style={{ fontSize: '1.3rem', marginBottom: 14 }}>Visual examples from the dataset</h2>
          <div className="rounded-xl p-4 flex justify-center border border-[#D0CEC8] bg-white">
            <img
              src="/api/model/data-audit"
              alt="Dataset class examples"
              className="max-w-full h-auto rounded-lg shadow"
              onError={() => setImageError(true)}
            />
          </div>
        </div>
      )}

      {/* Class cards */}
      <h2 className="sw-heading mb-5" style={{ fontSize: '1.6rem' }}>Class descriptions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
        {classes.map((c, i) => {
          const style = tipoStyles[c.tipo]
          return (
            <div
              key={i}
              className={`sw-card rounded-2xl border-2 ${style.border} p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-opacity-80`}
              style={{
                animation: isVisible ? `fadeInUp 0.5s ease-out ${i * 40}ms forwards` : 'none'
              }}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="font-bold text-lg text-[#0D0D0D]">{c.name.replace('_', ' ')}</h3>
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium shrink-0 ${style.badge}`}>
                  {tipoLabels[c.tipo]}
                </span>
              </div>
              <p className="text-sm text-[#888] leading-relaxed">{c.desc}</p>
            </div>
          )
        })}
      </div>

      {/* Models section */}
      <h2 className="sw-heading mb-5" style={{ fontSize: '1.6rem' }}>Available models</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="sw-card rounded-2xl border-2 border-[#D0CEC8] p-7 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          <h3 className="font-bold text-xl text-[#0D0D0D] mb-5">CNN</h3>
          <ul className="text-sm text-[#888] space-y-3">
            <li className="flex items-start gap-2">
              <span className="text-[#888] mt-0.5">•</span>
              <span>Convolutional neural network for spatial feature extraction.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#888] mt-0.5">•</span>
              <span>Fast inference, good baseline.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#888] mt-0.5">•</span>
              <span><strong className="text-[#0D0D0D]">Accuracy:</strong> ~87%</span>
            </li>
          </ul>
        </div>

        <div className="sw-card rounded-2xl border-2 border-[#D0CEC8] p-7 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          <h3 className="font-bold text-xl text-[#0D0D0D] mb-5">Vision Transformer (ViT)</h3>
          <ul className="text-sm text-[#888] space-y-3">
            <li className="flex items-start gap-2">
              <span className="text-[#888] mt-0.5">•</span>
              <span>Transformer-based architecture with patch embedding and self-attention.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#888] mt-0.5">•</span>
              <span>Higher accuracy, more parameters.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#888] mt-0.5">•</span>
              <span><strong className="text-[#0D0D0D]">Accuracy:</strong> ~94%</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default ModelExamples
