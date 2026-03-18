import { useState, useEffect } from 'react'
import { FaTimes, FaUpload, FaSpinner, FaCalendar, FaBrain } from 'react-icons/fa'
import axios from 'axios'
import heic2any from 'heic2any'

const ML_UNAVAILABLE_HINT_LOCAL = 'Run ./start-all.sh from the project root and wait ~1–2 min for models to load. If it still fails, check logs/ml-service.log.'
const ML_UNAVAILABLE_HINT_PROD = 'ML is on a hosted Space (e.g. Hugging Face). The Space may be sleeping—open the Space URL in a browser to wake it, or ask the admin to check ML_SERVICE_URL.'

// Cuando todo funcione bien, pon a false para que la clasificación corra en background sin mostrar pasos
const SHOW_CLASSIFY_STEPS = true

const CLASSIFY_STEPS = [
  'Detectando prenda (YOLO)...',
  'Recortando y preparando imagen...',
  'Clasificando con el modelo...'
]

const UploadModal = ({ onClose, onSuccess }) => {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [classifyingVit, setClassifyingVit] = useState(false)
  const [classifyStep, setClassifyStep] = useState(null)
  const [classification, setClassification] = useState(null)
  const [usedModel, setUsedModel] = useState(null)
  const [selectedOccasions, setSelectedOccasions] = useState([])
  const [error, setError] = useState(null)
  const [mlStatus, setMlStatus] = useState('checking') // 'checking' | 'available' | 'unavailable'
  const [mlHint, setMlHint] = useState(null)
  const [mlHosted, setMlHosted] = useState(false) // from backend 503: ML is hosted (e.g. HF Space)

  const [vitReady, setVitReady] = useState(false)

  const isLocalhost = typeof window !== 'undefined' && /^localhost$|^127\.0\.0\.1$/.test((window.location?.hostname || '').toLowerCase())
  const mlUnavailableHint = (mlHint != null && mlHint !== '') ? mlHint : ((mlHosted || !isLocalhost) ? ML_UNAVAILABLE_HINT_PROD : ML_UNAVAILABLE_HINT_LOCAL)
  const showTerminalTip = isLocalhost && !mlHosted

  const checkMlHealth = () => {
    setMlStatus('checking')
    setMlHint(null)
    setMlHosted(false)
    // Hosted ML (e.g. HF Space) can take 20+ s to wake; backend uses 20s timeout
    axios.get('/api/ml-health', { timeout: 25000 })
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
      .catch((err) => {
        setMlStatus('unavailable')
        setVitReady(false)
        const data = err.response?.data
        setMlHint(data?.hint ?? null)
        setMlHosted(Boolean(data?.hosted))
      })
  }

  useEffect(() => {
    let cancelled = false
    setMlHint(null)
    setMlHosted(false)
    axios.get('/api/ml-health', { timeout: 25000 })
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
      .catch((err) => {
        if (!cancelled) {
          setMlStatus('unavailable')
          setVitReady(false)
          const data = err.response?.data
          setMlHint(data?.hint ?? null)
          setMlHosted(Boolean(data?.hosted))
        }
      })
    return () => { cancelled = true }
  }, [])

  // Re-check ViT when ML is available but ViT not ready yet (models load in background)
  useEffect(() => {
    if (mlStatus !== 'available' || vitReady) return
    const t = setInterval(() => {
      axios.get('/api/ml-health', { timeout: 10000 })
        .then((res) => {
          if (res?.data?.available && res?.data?.vit_model_loaded) {
            setVitReady(Boolean(res?.data?.vit_model_loaded))
          }
        })
        .catch(() => {})
    }, 15000)
    return () => clearInterval(t)
  }, [mlStatus, vitReady])

  const occasions = [
    { value: 'casual', label: 'Casual', desc: 'Everyday wear' },
    { value: 'formal', label: 'Formal', desc: 'Important events' },
    { value: 'deportivo', label: 'Sporty', desc: 'Exercise and activity' },
    { value: 'fiesta', label: 'Party', desc: 'Celebrations' },
    { value: 'trabajo', label: 'Work', desc: 'Professional office' }
  ]

  // Convierte la imagen a JPEG en el navegador si no lo es ya.
  // Para HEIC/HEIF usamos heic2any en el frontend (el backend ya no necesita convertir).
  const ensureJpegFile = async (inputFile) => {
    if (!inputFile) return null
    const nameLower = inputFile.name.toLowerCase()
    const isHeic =
      nameLower.endsWith('.heic') ||
      nameLower.endsWith('.heif') ||
      inputFile.type === 'image/heic' ||
      inputFile.type === 'image/heif' ||
      inputFile.type === 'image/x-heic' ||
      inputFile.type === 'image/x-heif'
    if (isHeic) {
      try {
        const converted = await heic2any({
          blob: inputFile,
          toType: 'image/jpeg',
          quality: 0.9
        })
        const jpegBlob = converted instanceof Blob ? converted : converted[0]
        const baseName = inputFile.name.replace(/\.[^/.]+$/, '')
        return new File([jpegBlob], `${baseName}.jpg`, { type: 'image/jpeg' })
      } catch {
        // Si la conversión falla (por compatibilidad del navegador), seguimos con el archivo original HEIC.
        return inputFile
      }
    }

    const isAlreadyJpeg =
      inputFile.type === 'image/jpeg' ||
      nameLower.endsWith('.jpg') ||
      nameLower.endsWith('.jpeg')
    if (isAlreadyJpeg) return inputFile

    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth || img.width
          canvas.height = img.naturalHeight || img.height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0)
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('No se pudo convertir la imagen a JPEG'))
                return
              }
              const baseName = inputFile.name.replace(/\.[^/.]+$/, '')
              const jpegFile = new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' })
              resolve(jpegFile)
            },
            'image/jpeg',
            0.9
          )
        } catch (e) {
          reject(e)
        }
      }
      img.onerror = (e) => {
        reject(new Error('No se pudo leer la imagen para conversión a JPEG'))
      }
      img.src = URL.createObjectURL(inputFile)
    })
  }

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError(null)
      setClassification(null)
      try {
        const jpegForPreview = await ensureJpegFile(selectedFile)
        const previewFile = jpegForPreview || selectedFile
        setPreview(URL.createObjectURL(previewFile))
      } catch {
        // Si falla la conversión (HEIC muy raro), al menos intentamos previsualizar el original
        setPreview(URL.createObjectURL(selectedFile))
      }
    }
  }

  const handleClassify = async () => {
    if (!file) {
      setError('Please select an image first')
      return
    }

    setClassifyingVit(true)
    setError(null)
    setClassifyStep(SHOW_CLASSIFY_STEPS ? CLASSIFY_STEPS[0] : null)

    const stepIntervals = []
    if (SHOW_CLASSIFY_STEPS && CLASSIFY_STEPS.length > 1) {
      for (let i = 1; i < CLASSIFY_STEPS.length; i++) {
        stepIntervals.push(
          setTimeout(() => setClassifyStep(CLASSIFY_STEPS[i]), 500 * i)
        )
      }
    }
    const clearClassifyState = () => {
      setClassifyingVit(false)
      setClassifyStep(null)
      stepIntervals.forEach(clearTimeout)
    }

    let uploadFile = file
    try {
      uploadFile = await ensureJpegFile(file)
      if (!uploadFile) {
        setError('Could not prepare image for upload.')
        clearClassifyState()
        return
      }
      setFile(uploadFile)
    } catch (e) {
      setError(e.message || 'Error converting image to JPEG before upload.')
      clearClassifyState()
      return
    }

    const formData = new FormData()
    formData.append('imagen', uploadFile)

    try {
      const endpoint = '/api/classify/vit'
      const response = await axios.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setClassification(response.data)
      setUsedModel('vit')
    } catch (err) {
      const res = err.response?.data
      if (err.response?.status === 503 && res?.loading) {
        setError('Models still loading. Wait about 1 minute and try again.')
        return
      }
      const msg = res?.error || 'Classification failed. Please try again.'
      setError(msg === 'ML service not available' ? `${msg} ${mlUnavailableHint}` : msg)
    } finally {
      clearClassifyState()
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
      let uploadFile = file
      try {
        uploadFile = await ensureJpegFile(file)
        if (!uploadFile) {
          setError('Could not prepare image for upload.')
          setLoading(false)
          return
        }
        setFile(uploadFile)
      } catch (e) {
        setError(e.message || 'Error converting image to JPEG before upload.')
        setLoading(false)
        return
      }

      const formData = new FormData()
      formData.append('imagen', uploadFile)
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
      const status = err.response?.status
      const data = err.response?.data
      let msg = data?.error || 'Error saving the garment. Please try again.'
      const details = data?.details && data.details !== msg ? ` (${data.details})` : ''
      if (status === 401) {
        msg = 'Please log in to upload garments. Use the login button to sign in.'
      } else if (status === 404 || err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        msg = "Can't reach the backend. If you're on the production site, ensure the frontend was built with VITE_API_BASE_URL set to your backend URL (e.g. https://fashion-ai-backend-c6wd.onrender.com), then redeploy."
      }
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
            Upload an image, classify it with AI (ViT), then save the garment to your wardrobe.
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
                  Preview not available
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
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      usedModel === 'vit'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {usedModel === 'vit' && <><FaBrain className="mr-1" />ViT</>}
                    </span>
                  )}
                </div>
                {classification.model_file && (
                  <p className="text-xs text-gray-500 mb-2">
                    Model: {classification.model_file}
                  </p>
                )}
                {classification.yolo_detection && (
                  <div className="mb-3 p-2.5 bg-slate-100 rounded-lg border border-slate-200">
                    <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">YOLO detectó</p>
                    <p className="text-sm text-slate-800">
                      <span className="font-medium">
                        {classification.yolo_detection.tipo
                          ? classification.yolo_detection.tipo.charAt(0).toUpperCase() + classification.yolo_detection.tipo.slice(1)
                          : classification.yolo_detection.category}
                      </span>
                      {' '}({(classification.yolo_detection.confidence * 100).toFixed(1)}%)
                    </p>
                  </div>
                )}
                {classification.pipeline_steps && classification.pipeline_steps.length > 0 && (
                  <div className="mb-3 p-2.5 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-2">Pasos del pipeline</p>
                    <ul className="text-xs text-blue-900 space-y-1">
                      {classification.pipeline_steps.map((step, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-blue-500 flex-shrink-0">{idx + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
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
              <p className="mt-1">{mlUnavailableHint}</p>
              {showTerminalTip && (
                <p className="mt-2 text-xs text-amber-700">To see errors in the terminal: <code className="bg-amber-100 px-1 rounded">./ml-service/run_ml.sh</code></p>
              )}
              <p className="mt-2 text-xs text-amber-700">If the Space was sleeping, wait ~30s after opening its URL, then click below.</p>
              <button
                type="button"
                onClick={checkMlHealth}
                disabled={mlStatus === 'checking'}
                className="mt-3 px-4 py-2 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-lg text-sm font-medium disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {mlStatus === 'checking' ? <><FaSpinner className="animate-spin" /> Checking…</> : 'Check again'}
              </button>
            </div>
          )}
          {mlStatus === 'available' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 text-emerald-800 text-sm flex flex-wrap items-center gap-2">
              <FaBrain className="flex-shrink-0" />
              <span>
                {vitReady
                  ? 'ML service ready — ViT available.'
                  : 'ML service ready — ViT still loading (wait ~1 min) or check logs/ml-service.log.'}
              </span>
              {!vitReady && (
                <button
                  type="button"
                  onClick={checkMlHealth}
                  disabled={mlStatus === 'checking'}
                  className="ml-auto px-3 py-1.5 bg-emerald-200 hover:bg-emerald-300 text-emerald-900 rounded-lg text-xs font-medium disabled:opacity-70"
                >
                  {mlStatus === 'checking' ? 'Comprobando…' : 'Comprobar ViT de nuevo'}
                </button>
              )}
            </div>
          )}

          {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 text-sm">{error}</div>}

          <div className="space-y-3">
            {SHOW_CLASSIFY_STEPS && classifyingVit && classifyStep && (
              <p className="text-sm text-gray-600 bg-gray-100 rounded-lg px-3 py-2 flex items-center gap-2">
                <FaSpinner className="animate-spin flex-shrink-0" />
                <span>{classifyStep}</span>
              </p>
            )}
            <div className="flex flex-col sm:flex-row sm:space-x-3 space-y-3 sm:space-y-0">
              <button
                onClick={handleClassify}
                disabled={!file || classifyingVit || !vitReady}
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
