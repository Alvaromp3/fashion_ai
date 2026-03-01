import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { FaBrain, FaImage, FaChartLine, FaStar } from 'react-icons/fa'
import { MusicReactiveHeroSection } from '../components/ui/music-reactive-hero-section'

const Index = () => {
  const mainContentRef = useRef(null)
  const navigate = useNavigate()
  const { isAuthenticated, loginWithRedirect } = useAuth0()

  const handleScrollToContent = () => {
    mainContentRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/dashboard')
    } else {
      loginWithRedirect()
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--content-bg)' }}>
      <MusicReactiveHeroSection
        tagline="Classify with AI"
        titleLine1="FASHION"
        titleLine2="AI"
        subtitle="Classify your garments with AI and get personalized outfit recommendations."
        onScrollClick={handleScrollToContent}
      />

      <div
        className="dashboard-hero-transition h-28 sm:h-36 w-full shrink-0"
        aria-hidden
      />

      <main ref={mainContentRef} className="dashboard-content max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 -mt-px min-h-[60vh]">
        {/* How it works */}
        <section className="dashboard-card mb-20 rounded-2xl shadow-sm border border-slate-700 p-8 lg:p-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-slate-700">
              <FaBrain className="text-white text-xl" />
            </div>
            <h2 className="text-2xl font-semibold text-slate-100">How it works</h2>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed mb-8 max-w-2xl">
            Upload a photo of a garment and our AI classifies its type and color, then suggests outfits based on your preferences.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-slate-600/50 flex-shrink-0">
                <FaImage className="text-slate-200" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-100 mb-1 text-sm">Automatic classification</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  CNN or ViT identifies garment type (T-shirt, Pullover, Sneakers, etc.) from your photo.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-slate-600/50 flex-shrink-0">
                <FaStar className="text-slate-200" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-100 mb-1 text-sm">Color detection</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Dominant color is detected from the garment so outfits stay harmonious.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-slate-600/50 flex-shrink-0">
                <FaChartLine className="text-slate-200" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-100 mb-1 text-sm">Smart recommendations</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Outfits are generated from your wardrobe using occasion, style, and color preferences.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-8 border-t border-slate-600">
            <button
              type="button"
              onClick={handleGetStarted}
              className="bg-white text-slate-900 px-8 py-3 rounded-xl font-semibold hover:bg-slate-100 transition-colors"
            >
              {isAuthenticated ? 'Go to dashboard' : 'Get started'}
            </button>
          </div>
        </section>

        <footer className="app-footer">
          <p className="text-slate-500 text-sm">Fashion AI</p>
        </footer>
      </main>
    </div>
  )
}

export default Index
