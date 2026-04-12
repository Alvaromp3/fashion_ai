import { useState, useEffect, useRef } from 'react'
import { FaTimes, FaUpload, FaSpinner, FaCalendar, FaBrain, FaCamera } from 'react-icons/fa'
import axios from 'axios'
import { API_BASE_URL } from '../api/client'
import heic2any from 'heic2any'
import { typeToEnglish, colorToEnglish, garmentClassLabel } from '../lib/classificationDisplay'

const ML_UNAVAILABLE_HINT_LOCAL = 'Run ./start-all.sh from the project root and wait ~1–2 min for models to load. If it still fails, check logs/ml-service.log.'
const ML_UNAVAILABLE_HINT_PROD = 'ML is on a hosted Space (e.g. Hugging Face). The Space may be sleeping—open the Space URL in a browser to wake it, or ask the admin to check ML_SERVICE_URL.'

// Set to false to run classification in the background without step messages.
const SHOW_CLASSIFY_STEPS = true

const CLASSIFY_STEPS = [
  'Detecting garment (YOLO)...',
  'Cropping and preparing the image...',
  'Classifying with the model...'
]

const vitClassToTipoEs = (className) => {
  if (!className) return null
  const s = String(className).toLowerCase().trim()
  // Fashion-MNIST-ish labels
  const map = {
    't-shirt': 'superior',
    'tshirt': 'superior',
    top: 'superior',
    trouser: 'inferior',
    pants: 'inferior',
    pullover: 'superior',
    dress: 'vestido',
    coat: 'abrigo',
    sandal: 'zapatos',
    sneaker: 'zapatos',
    boot: 'zapatos',
    shoe: 'zapatos',
    bag: 'bolso',
    'ankle boot': 'zapatos',
    shirt: 'superior',
  }
  return map[s] || null
}

const normalizeVitResponse = (raw) => {
  if (!raw || typeof raw !== 'object') return raw

  const top3 = Array.isArray(raw.top3) ? raw.top3 : []
  const normalizedTop3 = top3.map((pred) => {
    if (!pred || typeof pred !== 'object') return pred
    // Support both shapes:
    // - New (Render): { class_name, class_index, confidence }
    // - Old: { clase_nombre, clase, confianza, tipo }
    if ('class_name' in pred || 'confidence' in pred || 'class_index' in pred) {
      const inferredTipo = vitClassToTipoEs(pred.class_name)
      return {
        ...pred,
        clase_nombre: pred.clase_nombre ?? pred.class_name ?? 'desconocido',
        clase: pred.clase ?? pred.class_index ?? 0,
        confianza: pred.confianza ?? pred.confidence ?? 0,
        tipo: pred.tipo ?? raw.tipo ?? inferredTipo ?? 'desconocido',
      }
    }
    return pred
  })

  const top1 = normalizedTop3[0]
  const claseNombreFromTop1 = (top1 && typeof top1 === 'object') ? top1.clase_nombre : undefined
  const confianzaFromTop1 = (top1 && typeof top1 === 'object') ? top1.confianza : undefined
  const claseFromTop1 = (top1 && typeof top1 === 'object') ? top1.clase : undefined
  const tipoFromTop1 = (top1 && typeof top1 === 'object') ? top1.tipo : undefined

  const isUnknownLabel = (v) => v == null || String(v).toLowerCase().trim() === '' || String(v).toLowerCase().trim() === 'desconocido'
  const rawConfidence = typeof raw.confianza === 'number' ? raw.confianza : null
  const looksLikePlaceholderConfidence =
    rawConfidence == null
    || rawConfidence <= 0
    || rawConfidence > 1
    || (rawConfidence === 0.5 && isUnknownLabel(raw.clase_nombre))

  return {
    ...raw,
    top3: normalizedTop3,
    tipo: isUnknownLabel(raw.tipo) ? (tipoFromTop1 ?? raw.tipo) : raw.tipo,
    clase_nombre: (!isUnknownLabel(raw.clase_nombre)) ? raw.clase_nombre : (claseNombreFromTop1 ?? raw.clase_nombre),
    confianza: (!looksLikePlaceholderConfidence) ? raw.confianza : (typeof confianzaFromTop1 === 'number' ? confianzaFromTop1 : raw.confianza),
    clase: (typeof raw.clase === 'number' && raw.clase !== 0) ? raw.clase : (typeof claseFromTop1 === 'number' ? claseFromTop1 : raw.clase),
  }
}

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

  const previewRef = useRef(null)
  useEffect(() => {
    previewRef.current = preview
  }, [preview])
  useEffect(() => {
    return () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current)
        previewRef.current = null
      }
    }
  }, [])

  const isLocalhost = typeof window !== 'undefined' && /^localhost$|^127\.0\.0\.1$/.test((window.location?.hostname || '').toLowerCase())
  const mlUnavailableHint = (mlHint != null && mlHint !== '') ? mlHint : ((mlHosted || !isLocalhost) ? ML_UNAVAILABLE_HINT_PROD : ML_UNAVAILABLE_HINT_LOCAL)
  const showTerminalTip = isLocalhost && !mlHosted

  /** True if health confirms model readiness in any supported payload shape. */
  const mlReportsModelReady = (data) => {
    const hasVitModelLoaded = data?.vit_model_loaded === true
    const hasModelLoaded = data?.model_loaded === true
    const hasStatusAndClasses = data?.status === 'OK' && Number(data?.classes_count) > 0
    return hasVitModelLoaded || hasModelLoaded || hasStatusAndClasses
  }

  const checkMlHealth = () => {
    setMlStatus('checking')
    setMlHint(null)
    setMlHosted(false)
    // Hosted ML (e.g. HF Space) can take 20+ s to wake; backend uses 20s timeout
    axios.get('/api/ml-health', { timeout: 25000 })
      .then((res) => {
        console.log('[UploadModal] ml-health response', res?.data)
        if (res?.data?.available) {
          const ready = mlReportsModelReady(res.data)
          console.log('[UploadModal] computed vitReady', ready)
          setMlStatus('available')
          setVitReady(ready)
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
        console.log('[UploadModal] ml-health response', res?.data)
        if (res?.data?.available) {
          const ready = mlReportsModelReady(res.data)
          console.log('[UploadModal] computed vitReady', ready)
          setMlStatus('available')
          setVitReady(ready)
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
          console.log('[UploadModal] ml-health response', res?.data)
          const ready = Boolean(res?.data?.available) && mlReportsModelReady(res.data)
          console.log('[UploadModal] computed vitReady', ready)
          if (ready) {
            setVitReady(true)
          }
        })
        .catch(() => {})
    }, 15000)
    return () => clearInterval(t)
  }, [mlStatus, vitReady])

  // Allow classify click as soon as there's a file; backend remains source of truth for readiness.
  const isClassifyDisabled = !file || classifyingVit

  useEffect(() => {
    console.log('[UploadModal] classify button disabled', isClassifyDisabled, {
      hasFile: Boolean(file),
      classifyingVit,
      mlStatus,
      vitReady
    })
  }, [isClassifyDisabled, file, classifyingVit, mlStatus, vitReady])

  const occasions = [
    { value: 'casual', label: 'Casual', desc: 'Everyday wear' },
    { value: 'formal', label: 'Formal', desc: 'Important events' },
    { value: 'deportivo', label: 'Sporty', desc: 'Exercise and activity' },
    { value: 'fiesta', label: 'Party', desc: 'Celebrations' },
    { value: 'trabajo', label: 'Work', desc: 'Professional office' }
  ]

  // Convert image to JPEG in the browser when needed. HEIC/HEIF uses heic2any on the client.
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
        // If conversion fails (browser support), keep the original HEIC file.
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
                reject(new Error('Could not convert the image to JPEG'))
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
        reject(new Error('Could not read the image for conversion to JPEG'))
      }
      img.src = URL.createObjectURL(inputFile)
    })
  }

  const handleFileChange = async (e) => {
    const input = e.target
    const selectedFile = input.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setError(null)
    setClassification(null)
    try {
      const jpegForPreview = await ensureJpegFile(selectedFile)
      const previewFile = jpegForPreview || selectedFile
      setPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return URL.createObjectURL(previewFile)
      })
    } catch {
      setPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return URL.createObjectURL(selectedFile)
      })
    } finally {
      input.value = ''
    }
  }

  const handleClassify = async () => {
    console.log('[UploadModal] classify guard state', {
      hasFile: Boolean(file),
      classifyingVit,
      mlStatus,
      vitReady
    })
    if (!file) {
      setError('Please select an image first')
      return
    }

    const classifyUrl = `${API_BASE_URL || ''}/api/classify/vit`
    console.log('[UploadModal] Classify (ViT) clicked', { fileName: file.name, fileSize: file.size, classifyUrl })

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
      // Do not set Content-Type manually: browser must send multipart boundary (multer needs it).
      console.log('[UploadModal] POST', endpoint, 'field imagen →', uploadFile.name)
      const response = await axios.post(endpoint, formData, { timeout: 60000 })
      console.log('[UploadModal] classify response', response.status, response.data)
      setClassification(normalizeVitResponse(response.data))
      setUsedModel('vit')
    } catch (err) {
      console.error('[UploadModal] classify error', err.response?.status, err.response?.data, err.message)
      const res = err.response?.data
      if (typeof res === 'string') {
        setError(`Classification failed: ${res.slice(0, 200)}`)
        return
      }
      if (err.response?.status === 503 && res?.loading) {
        setError('Models still loading. Wait about 1 minute and try again.')
        return
      }
      const msg =
        (res && typeof res === 'object' && res.error) ||
        err.message ||
        'Classification failed. Please try again.'
      setError(msg === 'ML service not available' ? `${msg} ${mlUnavailableHint}` : String(msg))
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
      setPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
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
    <div className="sw-modal-overlay p-4">
      <div className="sw-modal max-w-2xl w-full">
        <div className="p-6 border-b border-[#D0CEC8] flex justify-between items-center">
          <div>
            <p className="sw-label text-[#FF3B00] mb-2" style={{ fontSize: '0.6rem', marginBottom: 6 }}>— UPLOAD</p>
            <h2 className="sw-heading" style={{ fontSize: '1.5rem' }}>Upload Garment</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-lg border border-[#D0CEC8] hover:border-[#0D0D0D] transition-colors bg-white flex items-center justify-center"
            aria-label="Close"
          >
            <FaTimes className="text-[#0D0D0D]" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-sm text-[#888] -mt-2">
            Upload an image, classify it with AI (ViT), then save the garment to your wardrobe.
          </p>

          <div>
            <label className="sw-label-field">Select Image</label>
            <div className="drop-zone rounded-xl p-8 text-center bg-white border border-[#D0CEC8]">
              <input
                type="file"
                accept="image/*,.heic,.heif"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
                id="camera-capture"
                aria-label="Take a photo with the camera"
              />
              <div className="flex flex-col items-center gap-4">
                <FaUpload className="text-4xl text-[#888]" aria-hidden />
                <p className="text-[#0D0D0D] text-sm sm:text-base px-2">
                  {file ? (
                    <span className="font-medium break-all">{file.name}</span>
                  ) : (
                    <>Choose a file or use the camera — the preview appears below.</>
                  )}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 w-full">
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer sw-btn sw-btn-outline sw-btn-sm inline-flex items-center gap-2 justify-center"
                  >
                    <FaUpload className="opacity-80" aria-hidden />
                    Choose image
                  </label>
                  <label
                    htmlFor="camera-capture"
                    className="cursor-pointer sw-btn sw-btn-outline sw-btn-sm inline-flex items-center gap-2 justify-center"
                  >
                    <FaCamera className="opacity-80" aria-hidden />
                    Use camera
                  </label>
                </div>
                <p className="text-xs text-[#888] max-w-md">
                  On mobile, “Use camera” opens the camera (rear camera when the device allows). On desktop, behavior depends on your browser — you may get a file picker or a webcam prompt.
                </p>
              </div>
            </div>
          </div>

          {preview ? (
            <div>
              <label className="sw-label-field">Preview</label>
              <img src={preview} alt="Preview" className="max-w-full h-64 object-contain mx-auto rounded-xl border border-[#D0CEC8] bg-white" />
            </div>
          ) : file && (
            <div>
              <label className="sw-label-field">Selected File</label>
              <div className="border border-[#D0CEC8] bg-white p-4 rounded-xl text-center">
                <p className="text-[#0D0D0D]">{file.name}</p>
                <p className="text-sm text-[#888] mt-2">
                  Preview not available
                </p>
              </div>
            </div>
          )}

          {classification && (
            <>
              <div className="border border-[#D0CEC8] bg-white rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="sw-label" style={{ fontSize: '0.65rem', marginBottom: 0 }}>CLASSIFICATION</h3>
                  {usedModel && (
                    <span className="sw-badge sw-badge-green" style={{ padding: '4px 10px' }}>
                      {usedModel === 'vit' && <><FaBrain className="mr-1" />VIT</>}
                    </span>
                  )}
                </div>
                {classification.model_file && (
                  <p className="text-xs text-[#888] mb-2">
                    Model: {classification.model_file}
                  </p>
                )}
                {classification.yolo_detection && (
                  <div className="mb-3 p-2.5 bg-[#E8E6E0] rounded-lg border border-[#D0CEC8]">
                    <p className="text-xs font-semibold text-[#0D0D0D] uppercase tracking-wide mb-1">YOLO detected</p>
                    <p className="text-sm text-[#0D0D0D]">
                      <span className="font-medium">
                        {typeToEnglish(classification.yolo_detection.tipo ?? classification.yolo_detection.category)}
                      </span>
                      {' '}({(classification.yolo_detection.confidence * 100).toFixed(1)}%)
                    </p>
                  </div>
                )}
                {classification.pipeline_steps && classification.pipeline_steps.length > 0 && (
                  <div className="mb-3 p-2.5 bg-[#E8E6E0] rounded-lg border border-[#D0CEC8]">
                    <p className="text-xs font-semibold text-[#0D0D0D] uppercase tracking-wide mb-2">Pipeline steps</p>
                    <ul className="text-xs text-[#0D0D0D] space-y-1">
                      {classification.pipeline_steps.map((step, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-[#FF3B00] flex-shrink-0">{idx + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="space-y-2 text-sm">
                  <p className="text-[#0D0D0D]"><span className="font-medium text-[#0D0D0D]">Garment:</span> {garmentClassLabel(classification.clase_nombre)}</p>
                  <p className="text-[#0D0D0D]"><span className="font-medium text-[#0D0D0D]">Type:</span> {typeToEnglish(classification.tipo)}</p>
                  <p className="text-[#0D0D0D]"><span className="font-medium text-[#0D0D0D]">Color:</span> {colorToEnglish(classification.color)}</p>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FaCalendar className="text-[#888] w-4 h-4" />
                  <label className="sw-label" style={{ fontSize: '0.65rem', letterSpacing: '0.12em' }}>OCCASIONS (OPTIONAL)</label>
                </div>
                <p className="text-sm text-[#888] mb-3">
                  Select the occasions this garment is suitable for.
                  {selectedOccasions.length > 0 && <span className="ml-1 font-medium text-[#0D0D0D]">({selectedOccasions.length} selected)</span>}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {occasions.map(oc => {
                    const isSelected = selectedOccasions.includes(oc.value)
                    return (
                      <button
                        key={oc.value}
                        type="button"
                        onClick={() => setSelectedOccasions(prev => isSelected ? prev.filter(o => o !== oc.value) : [...prev, oc.value])}
                        className={`py-3 px-4 rounded-xl border-2 text-left transition-all ${
                          isSelected
                            ? 'border-[#0D0D0D] bg-[#0D0D0D] text-white'
                            : 'border-[#D0CEC8] bg-white text-[#0D0D0D] hover:border-[#0D0D0D]'
                        }`}
                      >
                        <span className="font-medium text-sm block">{oc.label}</span>
                        <span className={`text-xs mt-0.5 block ${isSelected ? 'text-white/80' : 'text-[#888]'}`}>{oc.desc}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {/* ML service status */}
          {mlStatus === 'checking' && (
            <div className="border border-[#D0CEC8] rounded-xl px-4 py-2 bg-white text-[#888] text-sm flex items-center gap-2">
              <FaSpinner className="animate-spin flex-shrink-0" />
              <span>Checking ML service…</span>
            </div>
          )}
          {mlStatus === 'unavailable' && (
            <div className="border border-[#FF3B00] rounded-xl p-4 bg-white text-[#0D0D0D] text-sm">
              <p className="font-medium">ML service not available</p>
              <p className="mt-1">{mlUnavailableHint}</p>
              {showTerminalTip && (
                <p className="mt-2 text-xs text-[#888]">To see errors in the terminal: <code className="bg-[#E8E6E0] px-1 rounded border border-[#D0CEC8]">./ml-service/run_ml.sh</code></p>
              )}
              <p className="mt-2 text-xs text-[#888]">If the Space was sleeping, wait ~30s after opening its URL, then click below.</p>
              <button
                type="button"
                onClick={checkMlHealth}
                disabled={mlStatus === 'checking'}
                className="mt-3 sw-btn sw-btn-accent sw-btn-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {mlStatus === 'checking' ? <><FaSpinner className="animate-spin" /> Checking…</> : 'Check again'}
              </button>
            </div>
          )}
          {mlStatus === 'available' && (
            <div className="border border-[#D0CEC8] rounded-xl px-4 py-2 text-[#0D0D0D] text-sm flex flex-wrap items-center gap-2 bg-white">
              <FaBrain className="flex-shrink-0 text-[#00A550]" />
              <span>
                {vitReady
                  ? 'ML service ready — ViT available.'
                  : 'ML service ready — model not reported as ready yet. Click "Check again" in a few seconds.'}
              </span>
              {!vitReady && (
                <button
                  type="button"
                  onClick={checkMlHealth}
                  disabled={mlStatus === 'checking'}
                  className="ml-auto sw-btn sw-btn-outline sw-btn-sm disabled:opacity-70"
                >
                  {mlStatus === 'checking' ? 'Checking…' : 'Check ViT again'}
                </button>
              )}
            </div>
          )}

          {error && <div className="border border-[#FF3B00] rounded-xl p-4 bg-white text-[#0D0D0D] text-sm">{error}</div>}

          <div className="space-y-3">
            {SHOW_CLASSIFY_STEPS && classifyingVit && classifyStep && (
              <p className="text-sm text-[#888] bg-[#E8E6E0] rounded-lg px-3 py-2 flex items-center gap-2 border border-[#D0CEC8]">
                <FaSpinner className="animate-spin flex-shrink-0" />
                <span>{classifyStep}</span>
              </p>
            )}
            <div className="flex flex-col sm:flex-row sm:space-x-3 space-y-3 sm:space-y-0">
              <button
                type="button"
                onClick={handleClassify}
                disabled={isClassifyDisabled}
                className="flex-1 sw-btn sw-btn-outline sw-btn-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                title={
                  !file
                    ? 'Select an image first'
                    : classifyingVit
                      ? 'Classification in progress'
                      : ''
                }
              >
                {classifyingVit ? <><FaSpinner className="animate-spin" /><span>Classifying...</span></> : <><FaBrain /><span>Classify (ViT)</span></>}
              </button>
            </div>
            <button
              onClick={handleSave}
              disabled={!classification || loading}
              className="w-full sw-btn sw-btn-primary sw-btn-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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
