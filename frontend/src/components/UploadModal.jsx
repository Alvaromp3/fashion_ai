import { useState, useEffect } from 'react'
import { FaTimes, FaUpload, FaSpinner, FaCalendar, FaBrain, FaNetworkWired } from 'react-icons/fa'
import axios from 'axios'

const ML_UNAVAILABLE_HINT = 'Run ./start-all.sh from the project root and wait ~1–2 min for models to load. If it still fails, check logs/ml-service.log.'

const UploadModal = ({ onClose, onSuccess }) => {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [classifying, setClassifying] = useState(false)
  const [classifyingVit, setClassifyingVit] = useState(false)
  const [classification, setClassification] = useState(null)
  const [usedModel, setUsedModel] = useState(null)
  const [selectedOccasions, setSelectedOccasions] = useState([])
  const [error, setError] = useState(null)
  const [mlStatus, setMlStatus] = useState('checking') // 'checking' | 'available' | 'unavailable'

  const [vitReady, setVitReady] = useState(false)

  const checkMlHealth = () => {
    setMlStatus('checking')
    axios.get('/api/ml-health', { timeout: 5000 })
      .then((res) => {
        if (res?.data?.available) {
          setMlStatus('available')
          setVitReady(Boolean(res?.data?.vit_model_loaded))
          setError((prev) => (prev && prev.includes('ML service not available')) ? null : prev)
        } else {
          setMlStatus('unavailable')
          setVitReady(false)
        }
      })
      .catch(() => { setMlStatus('unavailable'); setVitReady(false) })
  }

  useEffect(() => {
    let cancelled = false
    axios.get('/api/ml-health', { timeout: 5000 })
      .then((res) => {
        if (cancelled) return
        if (res?.data?.available) {
          setMlStatus('available')
          setVitReady(Boolean(res?.data?.vit_model_loaded))
          setError((prev) => (prev && prev.includes('ML service not available')) ? null : prev)
        } else {
          setMlStatus('unavailable')
          setVitReady(false)
        }
      })
      .catch(() => { if (!cancelled) { setMlStatus('unavailable'); setVitReady(false) } })
    return () => { cancelled = true }
  }, [])

  const occasions = [
    { value: 'casual', label: 'Casual', desc: 'Everyday wear' },
    { value: 'formal', label: 'Formal', desc: 'Important events' },
    { value: 'deportivo', label: 'Sporty', desc: 'Exercise and activity' },
    { value: 'fiesta', label: 'Party', desc: 'Celebrations' },
    { value: 'trabajo', label: 'Work', desc: 'Professional office' }
  ]

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      const fileExt = selectedFile.name.toLowerCase().split('.').pop()
      if (fileExt === 'heic' || fileExt === 'heif') {
        setPreview(null)
        setError('Note: HEIC images will be automatically converted to JPEG')
      } else {
        setPreview(URL.createObjectURL(selectedFile))
        setError(null)
      }
      setClassification(null)
    }
  }

  const handleClassify = async (useVit = false) => {
    if (!file) {
      setError('Please select an image first')
      return
    }

    useVit ? setClassifyingVit(true) : setClassifying(true)
    setError(null)

    const formData = new FormData()
    formData.append('imagen', file)

    try {
      const endpoint = useVit ? '/api/classify/vit' : '/api/classify'
      const response = await axios.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setClassification(response.data)
      setUsedModel(useVit ? 'vit' : 'cnn')
    } catch (err) {
      const res = err.response?.data
      if (err.response?.status === 503 && res?.loading) {
        setError('Models still loading. Wait about 1 minute and try again.')
        return
      }
      if (useVit && (err.response?.status === 503 || res?.error?.includes('Vision Transformer'))) {
        try {
          const fallback = await axios.post('/api/classify', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          })
          setClassification(fallback.data)
          setUsedModel('cnn')
          const isFallbackResponse = fallback.data?.clase_nombre === 'desconocido' && fallback.data?.confianza === 0.5 && fallback.data?.warning
          setError(isFallbackResponse
            ? 'ML service not responding. Start the ML service (port 6001).'
            : 'ViT (vision_transformer_moda_modelo.keras) not ready yet; CNN was used. Wait ~1 min for ViT to load and try "Classify (ViT)" again, or check logs/ml-service.log.')
        } catch (fallbackErr) {
          const errMsg = fallbackErr.response?.data?.error || 'ML service not available.'
          setError(errMsg.includes('ML service') ? `${errMsg} ${ML_UNAVAILABLE_HINT}` : errMsg)
        }
      } else {
        const msg = res?.error || 'Classification failed. Please try again.'
        setError(msg === 'ML service not available' ? `${msg} ${ML_UNAVAILABLE_HINT}` : msg)
      }
    } finally {
      setClassifying(false)
      setClassifyingVit(false)
    }
  }

  const handleSave = async () => {
    if (!file || !classification) {
      setError('Please classify the image first')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('imagen', file)
      formData.append('tipo', classification.tipo)
      formData.append('clase_nombre', classification.clase_nombre || 'desconocido')
      formData.append('color', classification.color)
      formData.append('confianza', classification.confianza)
      selectedOccasions.forEach(oc => formData.append('ocasion', oc))

      await axios.post('/api/prendas/upload', formData, {
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      })

      setFile(null)
      setPreview(null)
      setClassification(null)
      setSelectedOccasions([])
      setError(null)
      onSuccess()
    } catch (err) {
      const data = err.response?.data
      const msg = data?.error || 'Error saving the garment. Please try again.'
      const details = data?.details && data.details !== msg ? ` (${data.details})` : ''
      setError(msg + details)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-large max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-100">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-2xl font-semibold text-gray-900">Upload Garment</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg">
            <FaTimes className="text-lg" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-sm text-gray-600 -mt-2">
            Upload an image, classify it with AI (CNN or ViT), then save the garment to your wardrobe.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Image</label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-gray-400 transition-colors bg-gray-50">
              <input type="file" accept="image/*,.heic,.heif" onChange={handleFileChange} className="hidden" id="file-upload" />
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center space-y-2">
                <FaUpload className="text-4xl text-gray-400" />
                <span className="text-gray-600">{file ? file.name : 'Click or drag an image here'}</span>
              </label>
            </div>
          </div>

          {preview ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
              <img src={preview} alt="Preview" className="max-w-full h-64 object-contain mx-auto rounded-lg border" />
            </div>
          ) : file && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Selected File</label>
              <div className="bg-gray-100 p-4 rounded-lg text-center">
                <p className="text-gray-600">{file.name}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif') 
                    ? 'HEIC image - Will be automatically converted' : 'Preview not available'}
                </p>
              </div>
            </div>
          )}

          {classification && (
            <>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">Classification:</h3>
                  {usedModel && (
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${usedModel === 'vit' ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'}`}>
                      {usedModel === 'vit' ? <><FaBrain className="mr-1" />ViT</> : <><FaNetworkWired className="mr-1" />CNN</>}
                    </span>
                  )}
                </div>
                {classification.model_file && (
                  <p className="text-xs text-gray-500 mb-2">
                    Model: {classification.model_file}
                  </p>
                )}
                <div className="space-y-2 text-sm">
                  <p className="text-gray-700"><span className="font-medium text-gray-900">Garment:</span> {classification.clase_nombre || 'unknown'}</p>
                  <p className="text-gray-700"><span className="font-medium text-gray-900">Type:</span> {classification.tipo}</p>
                  <p className="text-gray-700"><span className="font-medium text-gray-900">Color:</span> {classification.color}</p>
                  <p className="text-gray-700"><span className="font-medium text-gray-900">Confidence:</span> {(classification.confianza * 100).toFixed(1)}%</p>
                  
                  {classification.top3?.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="font-medium text-gray-900 mb-2 text-xs">Top 3 Predictions:</p>
                      <div className="space-y-1 text-xs text-gray-600">
                        {classification.top3.map((pred, idx) => (
                          <p key={idx} className={idx === 0 ? 'font-semibold text-gray-900' : ''}>
                            {idx + 1}. {pred.clase_nombre} ({pred.tipo}) - {(pred.confianza * 100).toFixed(1)}%
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FaCalendar className="text-gray-500 w-4 h-4" />
                  <label className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Occasions (optional)</label>
                </div>
                <p className="text-sm text-gray-500 mb-3">
                  Select the occasions this garment is suitable for.
                  {selectedOccasions.length > 0 && <span className="ml-1 font-medium text-gray-600">({selectedOccasions.length} selected)</span>}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {occasions.map(oc => {
                    const isSelected = selectedOccasions.includes(oc.value)
                    return (
                      <button
                        key={oc.value}
                        type="button"
                        onClick={() => setSelectedOccasions(prev => isSelected ? prev.filter(o => o !== oc.value) : [...prev, oc.value])}
                        className={`py-3 px-4 rounded-lg border-2 text-left transition-all ${
                          isSelected ? 'border-gray-800 bg-gray-800 text-white' : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        <span className="font-medium text-sm block">{oc.label}</span>
                        <span className={`text-xs mt-0.5 block ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>{oc.desc}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {/* ML service status */}
          {mlStatus === 'checking' && (
            <div className="bg-gray-100 border border-gray-200 rounded-xl px-4 py-2 text-gray-600 text-sm flex items-center gap-2">
              <FaSpinner className="animate-spin flex-shrink-0" />
              <span>Checking ML service…</span>
            </div>
          )}
          {mlStatus === 'unavailable' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm">
              <p className="font-medium">ML service not available</p>
              <p className="mt-1">{ML_UNAVAILABLE_HINT}</p>
              <p className="mt-2 text-xs text-amber-700">To see errors in the terminal: <code className="bg-amber-100 px-1 rounded">./ml-service/run_ml.sh</code></p>
              <button
                type="button"
                onClick={checkMlHealth}
                className="mt-3 px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-lg text-sm font-medium"
              >
                Check again
              </button>
            </div>
          )}
          {mlStatus === 'available' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 text-emerald-800 text-sm flex items-center gap-2">
              <FaBrain className="flex-shrink-0" />
              <span>
                {vitReady
                  ? 'ML service ready — CNN and ViT (vision_transformer_moda_modelo.keras) available.'
                  : 'ML service ready — CNN available; ViT still loading (wait ~1 min) or check logs/ml-service.log.'}
              </span>
            </div>
          )}

          {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-sm">{error}</div>}

          <div className="space-y-3">
            <div className="flex space-x-3">
              <button
                onClick={() => handleClassify(false)}
                disabled={!file || classifying || classifyingVit}
                className="flex-1 bg-emerald-600 text-white px-4 py-3 rounded-xl font-medium hover:bg-emerald-700 transition-all shadow-soft disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {classifying ? <><FaSpinner className="animate-spin" /><span>Classifying...</span></> : <><FaNetworkWired /><span>Classify (CNN)</span></>}
              </button>
              <button
                onClick={() => handleClassify(true)}
                disabled={!file || classifying || classifyingVit}
                className="flex-1 bg-purple-600 text-white px-4 py-3 rounded-xl font-medium hover:bg-purple-700 transition-all shadow-soft disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {classifyingVit ? <><FaSpinner className="animate-spin" /><span>Classifying...</span></> : <><FaBrain /><span>Classify (ViT)</span></>}
              </button>
            </div>
            <button
              onClick={handleSave}
              disabled={!classification || loading}
              className="w-full bg-gray-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-800 transition-all shadow-soft disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? <><FaSpinner className="animate-spin" /><span>Saving...</span></> : <span>Save Garment</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UploadModal
