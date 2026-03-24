import React, { useRef, useEffect, useCallback } from 'react'

function FilmGrain(width, height) {
  this.width = width
  this.height = height
  this.grainCanvas = document.createElement('canvas')
  this.grainCanvas.width = width
  this.grainCanvas.height = height
  this.grainCtx = this.grainCanvas.getContext('2d')
  this.grainData = null
  this.frame = 0

  this.generateGrainPattern = function () {
    const imageData = this.grainCtx.createImageData(this.width, this.height)
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      const value = Math.random() * 255
      data[i] = data[i + 1] = data[i + 2] = value
      data[i + 3] = 255
    }
    this.grainData = imageData
  }

  this.update = function () {
    this.frame++
    if (this.frame % 2 === 0 && this.grainData) {
      const data = this.grainData.data
      const time = this.frame * 0.01
      for (let i = 0; i < data.length; i += 4) {
        const x = (i / 4) % this.width
        const y = Math.floor((i / 4) / this.width)
        const pattern = Math.sin(x * 0.01 + time) * Math.cos(y * 0.01 - time)
        const value = (Math.random() * 0.8 + pattern * 0.2) * 255
        data[i] = data[i + 1] = data[i + 2] = value
      }
      this.grainCtx.putImageData(this.grainData, 0, 0)
    }
  }

  this.apply = function (ctx, intensity = 0.05, colorize = true, hue = 0) {
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    ctx.globalAlpha = intensity * 0.5
    ctx.drawImage(this.grainCanvas, 0, 0)
    ctx.globalCompositeOperation = 'multiply'
    ctx.globalAlpha = 1 - intensity * 0.3
    ctx.drawImage(this.grainCanvas, 0, 0)
    if (colorize) {
      ctx.globalCompositeOperation = 'overlay'
      ctx.globalAlpha = intensity * 0.3
      ctx.fillStyle = `hsla(${hue}, 50%, 50%, 1)`
      ctx.fillRect(0, 0, this.width, this.height)
    }
    ctx.restore()
  }

  this.resize = function (w, h) {
    this.width = w
    this.height = h
    this.grainCanvas.width = w
    this.grainCanvas.height = h
    this.generateGrainPattern()
  }

  this.generateGrainPattern()
}

export function MusicReactiveHeroSection({
  tagline = 'Classify with AI',
  titleLine1 = 'FASHION',
  titleLine2 = 'AI',
  subtitle = 'Classify your garments and get personalized outfit recommendations.',
  onScrollClick,
}) {
  const canvasRef = useRef(null)
  const animationRef = useRef(null)
  const beamRef = useRef(null)

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return () => {}

    const ctx = canvas.getContext('2d')
    const filmGrain = new FilmGrain(window.innerWidth, window.innerHeight)

    const beam = {
      bassIntensity: 0,
      midIntensity: 0,
      trebleIntensity: 0,
      time: 0,
      filmGrain,
      colorState: {
        hue: 30,
        targetHue: 30,
        saturation: 80,
        targetSaturation: 80,
        lightness: 50,
        targetLightness: 50,
      },
      waves: [
        { amplitude: 30, frequency: 0.003, speed: 0.02, offset: 0, thickness: 1, opacity: 0.9 },
        { amplitude: 25, frequency: 0.004, speed: 0.015, offset: Math.PI * 0.5, thickness: 0.8, opacity: 0.7 },
        { amplitude: 20, frequency: 0.005, speed: 0.025, offset: Math.PI, thickness: 0.6, opacity: 0.5 },
        { amplitude: 35, frequency: 0.002, speed: 0.01, offset: Math.PI * 1.5, thickness: 1.2, opacity: 0.6 },
      ],
      postProcessing: {
        filmGrainIntensity: 0.04,
        vignetteIntensity: 0.4,
        chromaticAberration: 0.8,
        scanlineIntensity: 0.02,
      },
    }
    beamRef.current = beam

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      if (beamRef.current?.filmGrain) {
        beamRef.current.filmGrain.resize(canvas.width, canvas.height)
      }
    }
    resizeCanvas()

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate)
      const b = beamRef.current
      if (!b) return

      ctx.fillStyle = 'rgba(0, 0, 0, 0.92)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      b.bassIntensity = 0.4 + Math.sin(b.time * 0.01) * 0.3
      b.midIntensity = 0.3 + Math.sin(b.time * 0.015) * 0.2
      b.trebleIntensity = 0.2 + Math.sin(b.time * 0.02) * 0.1

      b.colorState.targetHue = 180 + Math.sin(b.time * 0.005) * 180
      b.colorState.targetSaturation = 70 + Math.sin(b.time * 0.01) * 30
      b.colorState.targetLightness = 50 + Math.sin(b.time * 0.008) * 20

      b.colorState.hue += (b.colorState.targetHue - b.colorState.hue) * 0.05
      b.colorState.saturation += (b.colorState.targetSaturation - b.colorState.saturation) * 0.02
      b.colorState.lightness += (b.colorState.targetLightness - b.colorState.lightness) * 0.01

      b.time++
      const centerY = canvas.height / 2

      b.waves.forEach((wave, waveIndex) => {
        wave.offset += wave.speed * (1 + b.bassIntensity * 0.8)
        const freqInfluence = waveIndex < 2 ? b.bassIntensity : b.midIntensity
        const dynamicAmplitude = wave.amplitude * (1 + freqInfluence * 5)
        const waveHue = b.colorState.hue + waveIndex * 15
        const waveSaturation = b.colorState.saturation - waveIndex * 5
        const waveLightness = b.colorState.lightness + waveIndex * 5
        const gradient = ctx.createLinearGradient(0, centerY - dynamicAmplitude, 0, centerY + dynamicAmplitude)
        const alpha = wave.opacity * (0.5 + b.bassIntensity * 0.5)
        gradient.addColorStop(0, `hsla(${waveHue}, ${waveSaturation}%, ${waveLightness}%, 0)`)
        gradient.addColorStop(0.5, `hsla(${waveHue}, ${waveSaturation}%, ${waveLightness + 10}%, ${alpha})`)
        gradient.addColorStop(1, `hsla(${waveHue}, ${waveSaturation}%, ${waveLightness}%, 0)`)
        ctx.beginPath()
        for (let x = -50; x <= canvas.width + 50; x += 2) {
          const y1 = Math.sin(x * wave.frequency + wave.offset) * dynamicAmplitude
          const y2 = Math.sin(x * wave.frequency * 2 + wave.offset * 1.5) * (dynamicAmplitude * 0.3 * b.midIntensity)
          const y3 = Math.sin(x * wave.frequency * 0.5 + wave.offset * 0.7) * (dynamicAmplitude * 0.5)
          const y = centerY + y1 + y2 + y3
          if (x === -50) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.lineTo(canvas.width + 50, canvas.height)
        ctx.lineTo(-50, canvas.height)
        ctx.closePath()
        ctx.fillStyle = gradient
        ctx.fill()
      })

      b.filmGrain.update()
      b.filmGrain.apply(ctx, b.postProcessing.filmGrainIntensity, true, b.colorState.hue)

      ctx.strokeStyle = `rgba(0, 0, 0, ${b.postProcessing.scanlineIntensity})`
      ctx.lineWidth = 1
      for (let y = 0; y < canvas.height; y += 3) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }

      const vignette = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, canvas.width * 0.2,
        canvas.width / 2, canvas.height / 2, canvas.width * 0.9
      )
      vignette.addColorStop(0, 'rgba(0, 0, 0, 0)')
      vignette.addColorStop(0.5, `rgba(0, 0, 0, ${b.postProcessing.vignetteIntensity * 0.3})`)
      vignette.addColorStop(0.8, `rgba(0, 0, 0, ${b.postProcessing.vignetteIntensity * 0.6})`)
      vignette.addColorStop(1, `rgba(0, 0, 0, ${b.postProcessing.vignetteIntensity})`)
      ctx.fillStyle = vignette
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      if (Math.random() < 0.02) {
        for (let i = 0; i < 3; i++) {
          const x = Math.random() * canvas.width
          const y = Math.random() * canvas.height
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.3})`
          ctx.beginPath()
          ctx.arc(x, y, Math.random() * 2 + 0.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      const flicker = Math.sin(b.time * 0.3) * 0.02 + Math.random() * 0.01
      ctx.fillStyle = `rgba(255, 255, 255, ${flicker})`
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.save()
      ctx.globalCompositeOperation = 'overlay'
      ctx.globalAlpha = 0.1
      const colorGradeGradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
      colorGradeGradient.addColorStop(0, 'rgb(255, 240, 220)')
      colorGradeGradient.addColorStop(0.5, 'rgb(255, 255, 255)')
      colorGradeGradient.addColorStop(1, 'rgb(220, 230, 255)')
      ctx.fillStyle = colorGradeGradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.restore()
    }

    animate()
    window.addEventListener('resize', resizeCanvas)
    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [])

  useEffect(() => {
    const cleanup = initCanvas()
    return cleanup
  }, [initCanvas])

  return (
    <div className="music-reactive-hero">
      <canvas ref={canvasRef} className="music-reactive-canvas" aria-hidden />

      <div className="music-reactive-hero-content">
        <p className="music-reactive-tagline">{tagline}</p>
        <h1 className="music-reactive-title">
          <span className="music-reactive-title-line">{titleLine1}</span>
          <span className="music-reactive-title-line">{titleLine2}</span>
        </h1>
        <p className="music-reactive-subtitle">{subtitle}</p>
      </div>

      {onScrollClick && (
        <button
          type="button"
          className="music-reactive-scroll-btn"
          onClick={onScrollClick}
          aria-label="Scroll to content"
        >
          Scroll to explore
          <span className="music-reactive-scroll-arrow">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M11 5V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M6 12L11 17L16 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
        </button>
      )}
    </div>
  )
}

export default MusicReactiveHeroSection
