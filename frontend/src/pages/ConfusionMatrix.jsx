import { useState, useEffect } from 'react'
import axios from 'axios'
import { BarChart3, Cpu, Sparkles } from 'lucide-react'

const ConfusionMatrix = () => {
  const [activeTab, setActiveTab] = useState('cnn')
  const [cnnImageUrl, setCnnImageUrl] = useState(null)
  const [cnnMetrics, setCnnMetrics] = useState(null)
  const [cnnOverall, setCnnOverall] = useState(null)
  const [cnnLoading, setCnnLoading] = useState(true)
  const [cnnError, setCnnError] = useState(null)
  const [vitImageUrl, setVitImageUrl] = useState(null)
  const [vitMetrics, setVitMetrics] = useState(null)
  const [vitOverall, setVitOverall] = useState(null)
  const [vitLoading, setVitLoading] = useState(true)
  const [vitError, setVitError] = useState(null)

  useEffect(() => {
    const fetchCnnData = async () => {
      try {
        setCnnLoading(true)
        setCnnImageUrl('/api/model/confusion-matrix')
        const res = await axios.get('/api/model/metrics')
        setCnnMetrics(res.data.metrics || [])
        setCnnOverall(res.data.overall || null)
        setCnnError(null)
      } catch (err) {
        setCnnError('Could not load CNN model data. Make sure the backend is running (http://localhost:4000).')
      } finally {
        setCnnLoading(false)
      }
    }

    const fetchVitData = async () => {
      try {
        setVitLoading(true)
        setVitImageUrl('/api/model/confusion-matrix-vit')
        const res = await axios.get('/api/model/metrics-vit')
        setVitMetrics(res.data.metrics || [])
        setVitOverall(res.data.overall || null)
        setVitError(null)
      } catch (err) {
        setVitError('Could not load Vision Transformer model data. Make sure the backend is running (http://localhost:4000).')
      } finally {
        setVitLoading(false)
      }
    }

    fetchCnnData()
    fetchVitData()
  }, [])

  const imageUrl = activeTab === 'cnn' ? cnnImageUrl : vitImageUrl
  const metrics = activeTab === 'cnn' ? cnnMetrics : vitMetrics
  const overall = activeTab === 'cnn' ? cnnOverall : vitOverall
  const loading = activeTab === 'cnn' ? cnnLoading : vitLoading
  const error = activeTab === 'cnn' ? cnnError : vitError

  const formatValue = (value) => value.toFixed(2)

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10" style={{ background: 'var(--content-bg)' }}>
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-xl bg-slate-600/80 border border-slate-500">
            <BarChart3 className="text-slate-200 w-7 h-7" />
          </div>
          <h1 className="text-4xl font-bold text-slate-100 tracking-tight">Confusion Matrix & Metrics</h1>
        </div>
        <p className="text-slate-400 text-lg max-w-2xl">
          Compare CNN and Vision Transformer (ViT) performance on clothing classification.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1.5 bg-slate-700/80 rounded-xl w-fit mb-8 border border-slate-600">
        <button
          type="button"
          onClick={() => setActiveTab('cnn')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all ${
            activeTab === 'cnn'
              ? 'bg-white text-slate-900 shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-600/50'
          }`}
        >
          <Cpu className="w-4 h-4" />
          CNN
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('vit')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all ${
            activeTab === 'vit'
              ? 'bg-white text-slate-900 shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-slate-600/50'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Vision Transformer
        </button>
      </div>

      {/* Model description */}
      <div className="dashboard-card rounded-2xl border border-slate-600 p-5 mb-8">
        {activeTab === 'cnn' ? (
          <p className="text-slate-300 text-sm">
            <span className="font-semibold text-slate-100">CNN:</span> Convolutional neural network that extracts spatial features from images. Fast inference, solid baseline.
          </p>
        ) : (
          <p className="text-slate-300 text-sm">
            <span className="font-semibold text-slate-100">ViT:</span> Transformer-based model using patches and self-attention. Often higher accuracy, more parameters.
          </p>
        )}
      </div>

      {loading && (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-14 w-14 border-2 border-slate-500 border-t-slate-200" />
        </div>
      )}

      {error && (
        <div className="dashboard-card rounded-2xl border border-red-500/50 bg-red-900/20 text-red-200 px-6 py-4 mb-8">
          {error}
        </div>
      )}

      {!loading && !error && imageUrl && (
        <div className="dashboard-card rounded-2xl border border-slate-600 p-6 mb-8 overflow-hidden">
          <h2 className="text-lg font-semibold text-slate-100 mb-4">Confusion Matrix</h2>
          <div className="bg-slate-800/50 rounded-xl p-4 flex justify-center">
            <img src={imageUrl} alt="Confusion Matrix" className="max-w-full h-auto rounded-lg shadow-xl" />
          </div>
        </div>
      )}

      {metrics?.length > 0 && (
        <div className="dashboard-card rounded-2xl border border-slate-600 p-6 mb-8 overflow-hidden">
          <h2 className="text-xl font-semibold text-slate-100 mb-4">
            Classification Report — {activeTab === 'cnn' ? 'CNN' : 'ViT'}
          </h2>
          <div className="overflow-x-auto rounded-xl border border-slate-600">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-600 bg-slate-700/80">
                  <th className="px-5 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Class</th>
                  <th className="px-5 py-4 text-center text-xs font-semibold text-slate-300 uppercase tracking-wider">Precision</th>
                  <th className="px-5 py-4 text-center text-xs font-semibold text-slate-300 uppercase tracking-wider">Recall</th>
                  <th className="px-5 py-4 text-center text-xs font-semibold text-slate-300 uppercase tracking-wider">F1-Score</th>
                  <th className="px-5 py-4 text-center text-xs font-semibold text-slate-300 uppercase tracking-wider">Support</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-600">
                {metrics.map((m, i) => (
                  <tr key={i} className="hover:bg-slate-600/30 transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-slate-100">{m.class}</td>
                    <td className="px-5 py-3 text-center text-sm text-slate-300">{formatValue(m.precision)}</td>
                    <td className="px-5 py-3 text-center text-sm text-slate-300">{formatValue(m.recall)}</td>
                    <td className="px-5 py-3 text-center text-sm text-slate-300">{formatValue(m.f1_score)}</td>
                    <td className="px-5 py-3 text-center text-sm text-slate-300">{m.support}</td>
                  </tr>
                ))}
              </tbody>
              {overall && (
                <tfoot className="border-t-2 border-slate-500 bg-slate-700/60">
                  <tr>
                    <td className="px-5 py-3 text-sm font-semibold text-slate-100">accuracy</td>
                    <td colSpan="3" className="px-5 py-3 text-center text-sm font-semibold text-slate-200">{formatValue(overall.accuracy)}</td>
                    <td className="px-5 py-3 text-center text-sm font-semibold text-slate-200">{metrics.reduce((s, m) => s + m.support, 0)}</td>
                  </tr>
                  <tr className="border-t border-slate-600">
                    <td className="px-5 py-3 text-sm font-semibold text-slate-100">macro avg</td>
                    <td className="px-5 py-3 text-center text-sm font-semibold text-slate-200">{formatValue(overall.macro_avg_precision)}</td>
                    <td className="px-5 py-3 text-center text-sm font-semibold text-slate-200">{formatValue(overall.macro_avg_recall)}</td>
                    <td className="px-5 py-3 text-center text-sm font-semibold text-slate-200">{formatValue(overall.macro_avg_f1)}</td>
                    <td className="px-5 py-3 text-center text-sm font-semibold text-slate-200">{metrics.reduce((s, m) => s + m.support, 0)}</td>
                  </tr>
                  <tr className="border-t border-slate-600">
                    <td className="px-5 py-3 text-sm font-semibold text-slate-100">weighted avg</td>
                    <td className="px-5 py-3 text-center text-sm font-semibold text-slate-200">{formatValue(overall.weighted_avg_precision)}</td>
                    <td className="px-5 py-3 text-center text-sm font-semibold text-slate-200">{formatValue(overall.weighted_avg_recall)}</td>
                    <td className="px-5 py-3 text-center text-sm font-semibold text-slate-200">{formatValue(overall.weighted_avg_f1)}</td>
                    <td className="px-5 py-3 text-center text-sm font-semibold text-slate-200">{metrics.reduce((s, m) => s + m.support, 0)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* How to interpret */}
      <div className="dashboard-card rounded-2xl border border-slate-600 p-6 mb-8">
        <h3 className="font-semibold text-slate-100 mb-3">How to read the matrix</h3>
        <ul className="text-sm text-slate-400 space-y-2">
          <li><span className="text-slate-200 font-medium">Main diagonal:</span> Correct predictions (true positives per class).</li>
          <li><span className="text-slate-200 font-medium">Precision:</span> Of predicted positives, how many were correct.</li>
          <li><span className="text-slate-200 font-medium">Recall:</span> Of all real positives, how many were detected.</li>
          <li><span className="text-slate-200 font-medium">F1-Score:</span> Harmonic mean of precision and recall.</li>
        </ul>
      </div>

      {/* Accuracy comparison */}
      {cnnOverall && vitOverall && (
        <div className="dashboard-card rounded-2xl border border-slate-600 p-6">
          <h3 className="font-semibold text-slate-100 mb-4">Accuracy comparison</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-700/60 rounded-xl p-6 border border-slate-600">
              <p className="text-slate-400 text-sm font-medium mb-1">CNN</p>
              <p className="text-3xl font-bold text-white">{(cnnOverall.accuracy * 100).toFixed(2)}%</p>
            </div>
            <div className="bg-slate-700/60 rounded-xl p-6 border border-slate-600">
              <p className="text-slate-400 text-sm font-medium mb-1">Vision Transformer</p>
              <p className="text-3xl font-bold text-white">{(vitOverall.accuracy * 100).toFixed(2)}%</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ConfusionMatrix
