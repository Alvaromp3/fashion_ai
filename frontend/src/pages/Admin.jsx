import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, Image, Shield, ArrowLeft } from 'lucide-react'
import ConfusionMatrix from './ConfusionMatrix'
import ModelExamples from './ModelExamples'

const TABS = [
  { id: 'metrics', label: 'Metrics', icon: BarChart3 },
  { id: 'examples', label: 'Examples', icon: Image }
]

const Admin = () => {
  const [activeTab, setActiveTab] = useState('metrics')
  const navigate = useNavigate()

  return (
    <div className="min-h-screen" style={{ background: 'var(--content-bg)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Admin header with back + tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded-lg border border-slate-600 text-slate-400 hover:text-slate-100 hover:bg-slate-700/50 transition-colors"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-600/80 border border-slate-500">
                <Shield className="text-slate-200 w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Admin</h1>
                <p className="text-slate-400 text-sm">Model metrics and dataset examples</p>
              </div>
            </div>
          </div>
          <div className="flex gap-1 p-1.5 bg-slate-700/80 rounded-xl w-fit border border-slate-600">
            {TABS.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                    activeTab === tab.id
                      ? 'bg-white text-slate-900 shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-slate-600/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab content */}
        <div className="admin-tab-content pt-6">
          {activeTab === 'metrics' && <ConfusionMatrix embedded />}
          {activeTab === 'examples' && <ModelExamples embedded />}
        </div>

        <footer className="mt-16 pt-8 border-t border-slate-600 text-center text-slate-500 text-sm">
          Development by <span className="text-slate-400">Alvaro Martin-Pena</span>
        </footer>
      </div>
    </div>
  )
}

export default Admin
