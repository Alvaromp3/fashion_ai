import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import axios from 'axios'
import { Loader2, LogOut, MessageCircle, Pencil, ScanLine, Shirt, Sparkles, Volume2, VolumeX } from 'lucide-react'
import { PreferenciasFields, defaultOutfitPreferencias, pickOutfitFromApi } from '../components/PreferenciasFields'
import { getRedirectOrigin } from '../utils/auth0Redirect'
import { saveMirrorContext } from '../lib/mirrorContextStorage'

const VOICE_PREFS_KEY = 'fashion-ai-chat-voice-replies'

function fullDefaultForm() {
  return { ...defaultOutfitPreferencias }
}

function userInitials(user) {
  if (!user) return '?'
  const n = (user.name || user.email || '?').trim()
  const parts = n.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return n.slice(0, 2).toUpperCase()
}

function loginProviderLabel(sub) {
  if (!sub || typeof sub !== 'string') return 'Signed in'
  const s = sub.toLowerCase()
  if (s.includes('google')) return 'Google'
  if (s.includes('github')) return 'GitHub'
  if (s.includes('apple')) return 'Apple'
  if (s.includes('facebook')) return 'Facebook'
  return 'Auth0'
}

function apiToForm(data) {
  if (!data) return fullDefaultForm()
  return pickOutfitFromApi(data)
}

export default function Settings() {
  const { user, isAuthenticated, isLoading: authLoading, loginWithRedirect, logout } = useAuth0()
  const [form, setForm] = useState(fullDefaultForm)
  const [baselineForm, setBaselineForm] = useState(fullDefaultForm)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [savedOk, setSavedOk] = useState(false)
  const [voiceReplies, setVoiceReplies] = useState(() => {
    try {
      const v = localStorage.getItem(VOICE_PREFS_KEY)
      if (v === '0') return false
      if (v === '1') return true
    } catch {
      /* ignore */
    }
    return true
  })

  const outfitSlice = useMemo(() => pickOutfitFromApi(form), [form])

  const setOutfit = useCallback((fn) => {
    setForm((f) => {
      const slice = pickOutfitFromApi(f)
      const next = typeof fn === 'function' ? fn(slice) : { ...slice, ...fn }
      return { ...f, ...next }
    })
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(VOICE_PREFS_KEY, voiceReplies ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [voiceReplies])

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    axios
      .get('/api/me/preferences')
      .then((res) => {
        if (!cancelled) {
          const next = apiToForm(res.data)
          setForm(next)
          setBaselineForm(next)
          setEditing(false)
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.response?.data?.error || e.message || 'Could not load settings.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSavedOk(false)
    try {
      const body = {
        colores: form.colores,
        ocasion: form.ocasion,
        estilo: form.estilo,
        incluirVestido: form.incluirVestido,
        incluirAbrigo: form.incluirAbrigo,
        layeredTop: form.layeredTop,
        topPreference: form.topPreference,
        style_preference: form.style_preference
      }
      await axios.put('/api/me/preferences', body)
      saveMirrorContext({ stylePref: form.style_preference })
      setSavedOk(true)
      setTimeout(() => setSavedOk(false), 3000)
      setBaselineForm(JSON.parse(JSON.stringify(form)))
      setEditing(false)
    } catch (e) {
      const msg = e.response?.data?.error || e.response?.data?.detail || e.message || 'Save failed.'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  const cancelEditing = () => {
    setForm(JSON.parse(JSON.stringify(baselineForm)))
    setEditing(false)
    setError(null)
    setSavedOk(false)
  }

  if (authLoading) {
    return (
      <div className="min-h-dvh sw-light flex items-center justify-center" style={{ background: 'var(--sw-white)' }}>
        <p className="sw-label text-[#888]">Loading…</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-dvh sw-light" style={{ background: 'var(--sw-white)' }}>
        <div className="max-w-2xl mx-auto px-4 sm:px-5 lg:px-8 py-12 sm:py-16">
          <div className="sw-card rounded-2xl border border-[#D0CEC8] p-10 text-center">
            <p className="sw-label text-[#FF3B00] mb-2">— SETTINGS</p>
            <h1 className="sw-display text-2xl sm:text-3xl mb-4">Your account</h1>
            <p className="text-[#555] mb-8">Sign in to save outfit preferences and manage your account.</p>
            <button
              type="button"
              onClick={() => loginWithRedirect({ authorizationParams: { redirect_uri: getRedirectOrigin() } })}
              className="sw-btn sw-btn-primary sw-btn-lg"
            >
              Sign in
            </button>
          </div>
        </div>
      </div>
    )
  }

  const quickNav = (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <Link
        to="/wardrobe"
        className="sw-btn sw-btn-outline sw-btn-sm justify-center gap-2 !normal-case !font-semibold !tracking-normal inline-flex items-center"
      >
        <Shirt className="h-4 w-4 shrink-0 text-[#FF3B00]" aria-hidden />
        Wardrobe
      </Link>
      <Link
        to="/chat"
        className="sw-btn sw-btn-outline sw-btn-sm justify-center gap-2 !normal-case !font-semibold !tracking-normal inline-flex items-center"
      >
        <MessageCircle className="h-4 w-4 shrink-0 text-[#FF3B00]" aria-hidden />
        Chat
      </Link>
      <Link
        to="/generate"
        className="sw-btn sw-btn-outline sw-btn-sm justify-center gap-2 !normal-case !font-semibold !tracking-normal inline-flex items-center"
      >
        <Sparkles className="h-4 w-4 shrink-0 text-[#FF3B00]" aria-hidden />
        Generate
      </Link>
      <Link
        to="/mirror"
        className="sw-btn sw-btn-outline sw-btn-sm justify-center gap-2 !normal-case !font-semibold !tracking-normal inline-flex items-center"
      >
        <ScanLine className="h-4 w-4 shrink-0 text-[#FF3B00]" aria-hidden />
        Mirror
      </Link>
    </div>
  )

  return (
    <div className="min-h-dvh sw-light pb-[max(6.5rem,calc(4.5rem+env(safe-area-inset-bottom,0px)))] lg:pb-12" style={{ background: 'var(--sw-white)' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-5 lg:px-8 py-6 sm:py-10">
        <div className="pb-6 mb-6 border-b border-[#0D0D0D]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="sw-label text-[#FF3B00] mb-2">— SETTINGS</p>
              <h1 className="sw-display" style={{ fontSize: 'clamp(1.8rem, 5vw, 2.4rem)' }}>
                Preferences & profile
              </h1>
              <p className="text-sm sm:text-base text-[#555] mt-2 max-w-2xl leading-relaxed">
                Outfit preferences power Generate and the style assistant.{' '}
                <span className="text-[#888]">Nothing here is medical advice.</span>
              </p>
            </div>
            {!loading && (
              <div className="shrink-0 flex flex-wrap gap-2 sm:pt-1">
                {editing ? (
                  <button type="button" onClick={cancelEditing} className="sw-btn sw-btn-outline sw-btn-lg">
                    Cancel editing
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(true)
                      setError(null)
                      setSavedOk(false)
                    }}
                    className="sw-btn sw-btn-primary sw-btn-lg inline-flex items-center justify-center gap-2"
                  >
                    <Pencil className="h-5 w-5" aria-hidden />
                    Edit preferences
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {isAuthenticated && user && (
          <section className="mb-8 rounded-2xl border-2 border-[#0D0D0D] bg-[#FAFAF8] p-5 sm:p-6 shadow-[4px_4px_0_0_rgba(13,13,13,0.06)]">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="relative shrink-0 mx-auto sm:mx-0">
                <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl overflow-hidden bg-gradient-to-br from-[#E8E6E0] to-[#D0CEC8] ring-2 ring-[#0D0D0D]/10 shadow-inner">
                  {user.picture ? (
                    <img
                      src={user.picture}
                      alt=""
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center sw-display text-3xl text-[#555]">
                      {userInitials(user)}
                    </div>
                  )}
                </div>
                <span className="absolute -bottom-1 -right-1 rounded-lg bg-[#0D0D0D] text-[#fafaf9] text-[0.65rem] font-bold uppercase tracking-wider px-2 py-0.5 border border-[#fafaf9]">
                  {loginProviderLabel(user.sub)}
                </span>
              </div>
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <p className="sw-label text-[#FF3B00] mb-1">Your account</p>
                <h2 className="sw-heading text-xl sm:text-2xl text-[#0D0D0D] truncate">{user.name || 'User'}</h2>
                <p className="text-sm text-[#555] mt-1 truncate">{user.email || user.sub}</p>
                <p className="text-xs text-[#888] mt-3 leading-snug">
                  Profile photo and name come from your login provider (e.g. Google). To change them, update your
                  account with {loginProviderLabel(user.sub)}.
                </p>
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-[#D0CEC8]">
              <p className="sw-label text-[#888] mb-3">Go to</p>
              {quickNav}
            </div>
          </section>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            {error}
          </div>
        )}
        {savedOk && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Saved.
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#888]" aria-label="Loading" />
          </div>
        ) : !editing ? (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditing(true)
                  setError(null)
                  setSavedOk(false)
                }}
                className="sw-btn sw-btn-primary sw-btn-sm inline-flex items-center gap-2"
              >
                <Pencil className="h-4 w-4" aria-hidden />
                Edit all preferences
              </button>
            </div>

            <div className="space-y-6">
              <section className="rounded-2xl border border-[#D0CEC8] bg-white p-5 sm:p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#E8E6E0]">
                  <div className="h-11 w-11 rounded-xl bg-[#0D0D0D] text-[#fafaf9] flex items-center justify-center shrink-0">
                    <Sparkles className="h-5 w-5" aria-hidden />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#0D0D0D] leading-tight">Outfit preferences</h2>
                    <p className="text-xs text-[#888] mt-0.5">Colours, occasion, style, composition</p>
                  </div>
                </div>
                <PreferenciasFields value={outfitSlice} readOnly />
              </section>

              <section className="rounded-2xl border border-[#D0CEC8] bg-white p-5 sm:p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#E8E6E0]">
                  <div className="h-11 w-11 rounded-xl bg-[#0D0D0D] text-[#fafaf9] flex items-center justify-center shrink-0">
                    <MessageCircle className="h-5 w-5" aria-hidden />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#0D0D0D] leading-tight">Chat</h2>
                    <p className="text-xs text-[#888] mt-0.5">Voice replies preference (this device)</p>
                  </div>
                </div>
                <div
                  className={`inline-flex items-center gap-3 rounded-xl border-2 px-4 py-3 ${
                    voiceReplies ? 'border-[#0D0D0D] bg-[#0D0D0D] text-[#fafaf9]' : 'border-[#D0CEC8] bg-[#FAFAF8] text-[#0D0D0D]'
                  }`}
                >
                  {voiceReplies ? <Volume2 className="h-5 w-5 shrink-0" /> : <VolumeX className="h-5 w-5 shrink-0" />}
                  <div>
                    <p className="font-semibold text-sm">{voiceReplies ? 'Spoken replies on' : 'Spoken replies off'}</p>
                    <p className="text-xs opacity-80 mt-0.5">Change in Edit mode below.</p>
                  </div>
                </div>
              </section>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-[#D0CEC8]">
              <button
                type="button"
                onClick={() => logout({ logoutParams: { returnTo: getRedirectOrigin() } })}
                className="sw-btn sw-btn-outline sw-btn-lg inline-flex items-center justify-center gap-2 text-red-700 border-red-200 hover:bg-red-50"
              >
                <LogOut className="h-5 w-5" />
                Log out
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <p className="rounded-xl border border-amber-200 bg-amber-50 text-amber-950 text-sm px-4 py-3">
              You are editing — tap <strong>Save all</strong> at the bottom to persist changes.
            </p>

            <section className="rounded-2xl border-2 border-[#D0CEC8] bg-white p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-[#0D0D0D] text-[#fafaf9] flex items-center justify-center shrink-0">
                  <Sparkles className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#0D0D0D]">Outfit preferences</h2>
                  <p className="text-sm text-[#888]">Same fields as Generate — colours, occasion, style, pieces.</p>
                </div>
              </div>
              <PreferenciasFields value={outfitSlice} onChange={setOutfit} />
            </section>

            <section className="rounded-2xl border-2 border-[#D0CEC8] bg-white p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-[#0D0D0D] text-[#fafaf9] flex items-center justify-center shrink-0">
                  <MessageCircle className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#0D0D0D]">Chat</h2>
                  <p className="text-sm text-[#888]">Spoken replies — stored on this device only.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVoiceReplies((v) => !v)}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                  voiceReplies
                    ? 'border-[#0D0D0D] bg-[#0D0D0D] text-white'
                    : 'border-[#D0CEC8] bg-white text-[#555]'
                }`}
                aria-pressed={voiceReplies}
              >
                {voiceReplies ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                {voiceReplies ? 'Spoken replies on' : 'Spoken replies off'}
              </button>
            </section>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between flex-wrap">
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="sw-btn sw-btn-primary sw-btn-lg disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {saving ? 'Saving…' : 'Save all changes'}
                </button>
                <button type="button" onClick={cancelEditing} className="sw-btn sw-btn-outline sw-btn-lg">
                  Discard changes
                </button>
              </div>
              <button
                type="button"
                onClick={() => logout({ logoutParams: { returnTo: getRedirectOrigin() } })}
                className="sw-btn sw-btn-outline sw-btn-lg inline-flex items-center justify-center gap-2 text-red-700 border-red-200 hover:bg-red-50"
              >
                <LogOut className="h-5 w-5" />
                Log out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
