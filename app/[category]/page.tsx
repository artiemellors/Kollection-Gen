'use client'

import { use, useState, useEffect, useRef, useCallback } from 'react'
import { ProductCollections, type ProductCollection } from '../components/ProductCollections'
import RefinementChips from '../components/RefinementChips'
import Image from 'next/image'
import {
  getCategoryConfig,
  CATEGORY_SLUGS,
  type Tile,
  type CategoryConfig,
} from '@/lib/category-config'

// ─── Saved collection types ──────────────────────────────────────────────────

interface SavedSession {
  id: string
  name: string
  query: string
  category: string
  collections: ProductCollection[]
  savedAt: number
}

const STORAGE_KEY = 'kollection-gen-saved'

function loadSavedSessions(): SavedSession[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) as SavedSession[] : []
  } catch { return [] }
}

function saveSessions(sessions: SavedSession[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

// ─── Typewriter placeholder ───────────────────────────────────────────────────

function useTypewriterPlaceholder(examples: string[], paused: boolean) {
  const [text, setText] = useState('')
  const pausedRef = useRef(paused)
  useEffect(() => { pausedRef.current = paused }, [paused])

  useEffect(() => {
    let cancelled = false
    const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

    async function run() {
      await sleep(600)
      const queries = shuffle([...examples])
      let qi = 0
      while (!cancelled) {
        if (pausedRef.current) { await sleep(200); continue }
        const q = queries[qi++ % queries.length]
        for (let i = 1; i <= q.length; i++) {
          if (cancelled || pausedRef.current) break
          setText(q.slice(0, i))
          await sleep(52)
        }
        if (cancelled) break
        await sleep(2400)
        for (let i = q.length - 1; i >= 0; i--) {
          if (cancelled || pausedRef.current) break
          setText(q.slice(0, i))
          await sleep(22)
        }
        if (cancelled) break
        await sleep(380)
        if (qi >= queries.length) {
          queries.splice(0, queries.length, ...shuffle([...examples]))
          qi = 0
        }
      }
    }
    run()
    return () => { cancelled = true; setText('') }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return text
}

// ─── Loading state ────────────────────────────────────────────────────────────

type PhaseCopy = CategoryConfig['loadingCopy']
type Phase = keyof PhaseCopy

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function useRotatingCopy(phase: Phase, phaseCopy: PhaseCopy) {
  const [copy, setCopy] = useState(() => phaseCopy[phase][0])
  const [visible, setVisible] = useState(true)
  const queueRef = useRef<string[]>([])
  const idxRef   = useRef(1)

  useEffect(() => {
    const phrases = phaseCopy[phase]
    queueRef.current = shuffle(phrases)
    idxRef.current = 1
    setCopy(queueRef.current[0])
    setVisible(true)
  }, [phase, phaseCopy])

  useEffect(() => {
    const phrases = phaseCopy[phase]
    if (phrases.length <= 1) return
    const id = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        if (idxRef.current >= queueRef.current.length) {
          queueRef.current = shuffle(phrases)
          idxRef.current = 0
        }
        setCopy(queueRef.current[idxRef.current++])
        setVisible(true)
      }, 350)
    }, 3200)
    return () => clearInterval(id)
  }, [phase, phaseCopy])

  return { copy, visible }
}

function LoadingState({ statuses, phaseCopy }: { statuses: string[]; phaseCopy: PhaseCopy }) {
  const hasFound     = statuses.some(s => s.startsWith('Found'))
  const hasSearching = statuses.some(s => s.startsWith('Searching'))
  const phase: Phase = hasFound ? 'curating' : hasSearching ? 'searching' : 'thinking'
  const searchCount  = statuses.filter(s => s.startsWith('Searching')).length

  const { copy, visible } = useRotatingCopy(phase, phaseCopy)

  const subLabel = {
    thinking:  'One moment…',
    searching: `Across ${searchCount} categor${searchCount === 1 ? 'y' : 'ies'}`,
    curating:  'Grouping products into collections',
  }[phase]

  return (
    <div className="mt-10" style={{ animation: 'fadeUp 0.4s ease both' }}>
      <div className="flex items-baseline gap-3 mb-4">
        <span
          className="font-sans text-xl font-semibold text-[#1a1a1a] transition-opacity duration-[400ms]"
          style={{ opacity: visible ? 1 : 0 }}
        >
          {copy}
        </span>
        <span className="text-sm text-[rgba(26,26,26,0.4)] hidden sm:block">{subLabel}</span>
      </div>

      <div className="relative h-px bg-black/[0.06] overflow-hidden mb-10">
        <div
          className="absolute inset-y-0 left-0 w-1/3 bg-[var(--accent)]"
          style={{ animation: 'progressSweep 1.8s ease-in-out infinite' }}
        />
      </div>

      {/* Skeleton grid matching collections layout */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col">
            <div className="skeleton aspect-[4/5] w-full rounded-[8px] bg-[#F4F5F6]" />
            <div className="pt-2 space-y-1.5">
              <div className="skeleton h-3 w-full rounded" />
              <div className="skeleton h-3 w-2/3 rounded" />
              <div className="skeleton h-4 w-1/3 rounded mt-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Gender = 'men' | 'women' | null

const useKosmos = process.env.NEXT_PUBLIC_SHOW_NEW_FEATURE === 'true'

export default function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: categorySlug } = use(params)
  const config = getCategoryConfig(categorySlug)

  const tiles: Tile[] = config.showGenderFilter
    ? [] // replaced by gender-keyed tiles below
    : config.occasionTiles as Tile[]

  const [query, setQuery]         = useState('')
  const [statuses, setStatuses]   = useState<string[]>([])
  const [collections, setCollections] = useState<ProductCollection[] | null>(null)
  const [refinements, setRefinements] = useState<string[] | null>(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [gender, setGender]       = useState<Gender>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [focused, setFocused]     = useState(false)
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load saved sessions on mount
  useEffect(() => {
    setSavedSessions(loadSavedSessions())
  }, [])

  // Auto-save: debounce 2s after any collection mutation
  const activeSessionIdRef = useRef(activeSessionId)
  activeSessionIdRef.current = activeSessionId
  const queryRef = useRef(query)
  queryRef.current = query

  useEffect(() => {
    if (!collections || collections.length === 0) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      const currentQuery = queryRef.current
      if (!currentQuery) return
      const sessionId = activeSessionIdRef.current ?? crypto.randomUUID()
      if (!activeSessionIdRef.current) setActiveSessionId(sessionId)
      const session: SavedSession = {
        id: sessionId,
        name: currentQuery,
        query: currentQuery,
        category: categorySlug,
        collections,
        savedAt: Date.now(),
      }
      setSavedSessions(prev => {
        const next = [session, ...prev.filter(s => s.id !== sessionId)].slice(0, 20)
        saveSessions(next)
        return next
      })
    }, 2000)
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }
  }, [collections, categorySlug])

  const typewriter = useTypewriterPlaceholder(
    config.exampleQueries,
    loading || focused || query.length > 0,
  )

  // Outfit category: gender-keyed tiles; others: flat tile list
  const genderedTileMap = config.showGenderFilter
    ? (config.occasionTiles as Record<'men' | 'women' | 'all', Tile[]>)
    : null

  const [shuffledOccasions, setShuffledOccasions] = useState<Tile[]>(() =>
    shuffle([...(genderedTileMap ? genderedTileMap['all'] : tiles)])
  )

  useEffect(() => {
    if (genderedTileMap) {
      setShuffledOccasions(shuffle([...genderedTileMap[gender ?? 'all']]))
    }
  }, [gender]) // eslint-disable-line react-hooks/exhaustive-deps

  async function runSearch(q: string) {
    if (!q.trim()) return
    setQuery(q)

    // If collections already exist, run a fast follow-up search (no Claude)
    if (collections && collections.length > 0) {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q, gender, category: categorySlug }),
        })
        const { products } = await res.json() as { products: ProductCollection['products'] }
        if (products.length > 0) {
          // Deduplicate: exclude products already in existing collections
          const existingIds = new Set(
            collections.flatMap(col => col.products.map(p => p.dataId).filter(Boolean))
          )
          const newProducts = products.filter(p => !p.dataId || !existingIds.has(p.dataId))
          if (newProducts.length > 0) {
            setCollections(prev => {
              if (!prev) return prev
              // Append to existing Ungrouped or create new one
              const ungroupedIdx = prev.findIndex(c => c.name === 'Ungrouped')
              if (ungroupedIdx !== -1) {
                return prev.map((col, i) =>
                  i === ungroupedIdx
                    ? { ...col, products: [...col.products, ...newProducts] }
                    : col
                )
              }
              return [...prev, { name: 'Ungrouped', products: newProducts }]
            })
          }
        }
      } catch (err) {
        setError(String(err))
      } finally {
        setLoading(false)
      }
      return
    }

    // First search: full Claude-powered collection generation
    setLoading(true)
    setStatuses([])
    setCollections(null)
    setRefinements(null)
    setError(null)

    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q, gender, category: categorySlug }),
    })

    const reader  = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()!
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const event = JSON.parse(line.slice(6)) as { type: string; message?: string; result?: unknown }
        if (event.type === 'status')           setStatuses(s => [...s, event.message!])
        else if (event.type === 'collections') setCollections(event.result as ProductCollection[])
        else if (event.type === 'refinements') setRefinements(event.result as string[])
        else if (event.type === 'done')        setLoading(false)
        else if (event.type === 'error')       { setError(event.message!); setLoading(false) }
      }
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    runSearch(query)
  }

  // ─── Collection mutation handlers ─────────────────────────────────────────

  const handleRemoveProduct = useCallback((collectionIndex: number, productIndex: number) => {
    setCollections(prev => {
      if (!prev) return prev
      return prev.map((col, ci) => {
        if (ci !== collectionIndex) return col
        return { ...col, products: col.products.filter((_, pi) => pi !== productIndex) }
      }).filter(col => col.products.length > 0)
    })
  }, [])

  const handleRemoveSelected = useCallback((collectionIndex: number, productIndices: Set<number>) => {
    setCollections(prev => {
      if (!prev) return prev
      return prev.map((col, ci) => {
        if (ci !== collectionIndex) return col
        return { ...col, products: col.products.filter((_, pi) => !productIndices.has(pi)) }
      }).filter(col => col.products.length > 0)
    })
  }, [])

  const handleReorder = useCallback((collectionIndex: number, fromIndex: number, toIndex: number) => {
    setCollections(prev => {
      if (!prev) return prev
      return prev.map((col, ci) => {
        if (ci !== collectionIndex) return col
        const products = [...col.products]
        const [moved] = products.splice(fromIndex, 1)
        products.splice(toIndex, 0, moved)
        return { ...col, products }
      })
    })
  }, [])

  // Move a product from one collection to another (used by All tab reorder)
  const handleMoveProduct = useCallback((
    fromCollection: number, fromIndex: number,
    toCollection: number, toIndex: number
  ) => {
    setCollections(prev => {
      if (!prev) return prev
      const next = prev.map(col => ({ ...col, products: [...col.products] }))
      const [moved] = next[fromCollection].products.splice(fromIndex, 1)
      next[toCollection].products.splice(toIndex, 0, moved)
      return next.filter(col => col.products.length > 0)
    })
  }, [])

  // Move selected products from one collection into a target collection
  const handleAddToCollection = useCallback((
    fromCollectionIndex: number,
    productIndices: Set<number>,
    toCollectionIndex: number
  ) => {
    setCollections(prev => {
      if (!prev) return prev
      const next = prev.map(col => ({ ...col, products: [...col.products] }))
      // Extract selected products from source
      const moving = next[fromCollectionIndex].products.filter((_, i) => productIndices.has(i))
      next[fromCollectionIndex].products = next[fromCollectionIndex].products.filter((_, i) => !productIndices.has(i))
      // Append to target
      next[toCollectionIndex].products.push(...moving)
      return next.filter(col => col.products.length > 0)
    })
  }, [])

  // Load a saved session
  const handleLoadSession = useCallback((session: SavedSession) => {
    setQuery(session.query)
    setCollections(session.collections)
    setActiveSessionId(session.id)
    setRefinements(null)
    setError(null)
  }, [])

  // Delete a saved session
  const handleDeleteSession = useCallback((sessionId: string) => {
    setSavedSessions(prev => {
      const next = prev.filter(s => s.id !== sessionId)
      saveSessions(next)
      return next
    })
    if (activeSessionId === sessionId) setActiveSessionId(null)
  }, [activeSessionId])

  // Start fresh (clear current session)
  const handleNewSession = useCallback(() => {
    setQuery('')
    setCollections(null)
    setRefinements(null)
    setActiveSessionId(null)
    setError(null)
    setStatuses([])
  }, [])

  const hasResults = collections !== null && collections.length > 0

  return (
    <div className="min-h-screen bg-[--bg]">
      {/* Sticky header */}
      <header
        className="sticky top-0 z-20 bg-white border-b border-black/[0.06]"
        style={{ animation: 'fadeDown 0.6s ease both' }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-8 h-20 flex items-center gap-6">
          {/* Logo */}
          <a href="/outfits" className="flex items-center shrink-0">
            <Image src="/Logo.svg" alt="Kmart" width={130} height={41} priority />
          </a>

          {/* Desktop nav links */}
          <nav className="hidden sm:flex items-center gap-1 ml-auto">
            {CATEGORY_SLUGS.map(slug => {
              const cfg = getCategoryConfig(slug)
              const isActive = slug === categorySlug
              return (
                <a
                  key={slug}
                  href={`/${slug}`}
                  className="px-4 py-2 rounded text-[11px] font-semibold tracking-[0.12em] uppercase transition-all"
                  style={isActive
                    ? { color: 'var(--accent)' }
                    : { color: 'rgba(26,26,26,0.45)' }
                  }
                >
                  {cfg.label}
                </a>
              )
            })}
          </nav>

          {/* Hamburger — mobile only */}
          <button
            className="sm:hidden ml-auto p-2 text-[#1a1a1a]"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
          >
            <i className="fa-solid fa-bars text-lg" />
          </button>
        </div>
      </header>

      {/* Mobile nav drawer — backdrop */}
      <div
        className="fixed inset-0 z-30 bg-black/40 transition-opacity duration-300 sm:hidden"
        style={{ opacity: drawerOpen ? 1 : 0, pointerEvents: drawerOpen ? 'auto' : 'none' }}
        onClick={() => setDrawerOpen(false)}
      />

      {/* Mobile nav drawer — panel */}
      <div
        className="fixed top-0 right-0 z-40 h-full w-64 bg-white shadow-xl flex flex-col sm:hidden
                   transition-transform duration-300 ease-out"
        style={{ transform: drawerOpen ? 'translateX(0)' : 'translateX(100%)' }}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-6 h-20 border-b border-black/[0.06]">
          <a href="/outfits" className="flex items-center shrink-0">
            <Image src="/Logo.svg" alt="Kmart" width={70} height={22} />
          </a>
          <button onClick={() => setDrawerOpen(false)} aria-label="Close menu" className="p-2">
            <i className="fa-solid fa-xmark text-lg text-[rgba(26,26,26,0.5)]" />
          </button>
        </div>

        {/* Drawer nav links */}
        <nav className="flex flex-col p-4 gap-1">
          {CATEGORY_SLUGS.map(slug => {
            const cfg = getCategoryConfig(slug)
            const isActive = slug === categorySlug
            return (
              <a
                key={slug}
                href={`/${slug}`}
                className="px-4 py-3 rounded text-sm font-semibold tracking-wide transition-all"
                style={isActive
                  ? { background: 'rgba(23,104,176,0.08)', color: 'var(--accent)' }
                  : { color: '#1a1a1a' }
                }
              >
                {cfg.label}
              </a>
            )
          })}
        </nav>
      </div>

      {/* Hero + search */}
      <section
        className="max-w-4xl mx-auto px-4 sm:px-8 pt-14 pb-10"
        style={{ animation: 'fadeUp 0.7s 0.1s ease both' }}
      >
        <div className="flex items-center gap-2.5 mb-4">
          {!useKosmos && <span className="block w-6 h-px" style={{ background: 'var(--accent)' }} />}
          <span className="text-[10px] font-semibold tracking-[0.25em] uppercase" style={{ color: 'var(--accent)' }}>
            {config.heroSubline}
          </span>
        </div>

        <h1 className="font-sans font-bold leading-[1.1] mb-10 max-w-[640px] text-[#1a1a1a]"
            style={{ fontSize: useKosmos ? 'clamp(24px, 4vw, 40px)' : 'clamp(28px, 5vw, 48px)' }}>
          {hasResults ? "Here are your collections. Search to add more." : config.heroHeadline}
        </h1>

        <form
          onSubmit={handleSubmit}
          className={`flex w-full bg-white border overflow-hidden transition-all duration-200
                      focus-within:shadow-[0_0_0_3px_rgba(23,104,176,0.1)]
                      ${useKosmos
                        ? 'border-black/[0.2] rounded-[10px] focus-within:border-[#1768B0]'
                        : 'border-black/[0.08] rounded-[8px] focus-within:border-[#1768B0]'
                      }`}
        >
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={hasResults
              ? 'Search to add more products...'
              : focused ? config.searchPlaceholder : typewriter}
            disabled={loading}
            className="flex-1 min-w-0 bg-transparent border-none outline-none px-6 py-[18px]
                       text-[#1a1a1a] placeholder:text-[rgba(26,26,26,0.35)]
                       disabled:opacity-50"
            style={{ fontSize: '16px', zoom: 0.875 }}
          />

          {/* Gender segmented control — desktop, outfits only */}
          {config.showGenderFilter && (
            <>
              <div className="hidden sm:block w-px self-stretch my-3 bg-black/[0.08] shrink-0" />
              <div className="hidden sm:flex items-center px-4 shrink-0 gap-4">
                {(['men', 'women'] as const).map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(prev => prev === g ? null : g)}
                    disabled={loading}
                    className="text-[11px] font-semibold tracking-[0.18em] uppercase
                               transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={gender === g
                      ? { color: 'var(--accent)' }
                      : { color: 'rgba(26,26,26,0.4)' }
                    }
                  >
                    {g === 'men' ? 'Men' : 'Women'}
                  </button>
                ))}
              </div>
            </>
          )}

          {useKosmos ? (
            <button
              type="submit"
              disabled={loading}
              className="shrink-0 px-7 text-white flex items-center justify-center
                         border-none cursor-pointer transition-all
                         hover:brightness-90 active:scale-[0.98]
                         disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: '#1768B0' }}
            >
              <i className={`fa-solid ${hasResults ? 'fa-plus' : 'fa-wand-magic-sparkles'} text-[15px]${loading ? ' animate-search-rock' : ''}`} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="shrink-0 px-7 py-[18px] text-sm font-semibold
                         text-white border-none cursor-pointer transition-all
                         hover:brightness-90 active:scale-[0.98]
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center gap-2"
              style={{ background: 'var(--accent)' }}
            >
              <i className={`fa-solid ${hasResults ? 'fa-plus' : 'fa-wand-magic-sparkles'}${loading ? ' animate-search-rock' : ''}`} />
              <span className="hidden sm:inline">{hasResults ? 'Add' : 'Search'}</span>
            </button>
          )}
        </form>

        {/* Gender toggle — mobile, outfits only */}
        {config.showGenderFilter && (
          <div className="sm:hidden flex gap-2 mt-3">
            {(['men', 'women'] as const).map(g => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(prev => prev === g ? null : g)}
                disabled={loading}
                className="px-4 py-1.5 text-[10px] font-semibold tracking-[0.18em] uppercase rounded-[4px]
                           border transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                style={gender === g
                  ? { borderColor: 'var(--accent)', color: 'var(--accent)', background: 'rgba(23,104,176,0.06)' }
                  : { borderColor: 'rgba(26,26,26,0.12)', color: 'rgba(26,26,26,0.45)', background: 'transparent' }
                }
              >
                {g === 'men' ? 'Men' : 'Women'}
              </button>
            ))}
          </div>
        )}

        {/* Occasion / theme tiles — empty state only */}
        {!loading && !hasResults && (
          <div className="mt-8" style={{ animation: 'fadeUp 0.5s 0.25s ease both', opacity: 0 }}>
            <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-[rgba(26,26,26,0.35)] mb-3">
              {config.occasionSectionLabel}
            </p>
            <div className="flex flex-nowrap overflow-x-auto sm:flex-wrap sm:overflow-x-visible scrollbar-hide gap-2 pb-1">
              {shuffledOccasions.map(tile => (
                <button
                  key={tile.label}
                  type="button"
                  onClick={() => runSearch(tile.query)}
                  className={`flex-shrink-0 px-4 py-2 bg-white transition-all duration-150 cursor-pointer active:scale-[0.98]
                             ${useKosmos
                               ? 'border border-[#1768B0] rounded-full text-sm font-normal text-[#1768B0] hover:bg-[#1768B0] hover:text-white'
                               : 'border border-black/[0.08] rounded-full text-sm font-light text-[#1a1a1a] hover:border-[#1768B0] hover:text-[#1768B0]'
                             }`}
                >
                  {tile.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent Collections — empty state only */}
        {!loading && !hasResults && savedSessions.length > 0 && (
          <div className="mt-10" style={{ animation: 'fadeUp 0.5s 0.35s ease both', opacity: 0 }}>
            <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-[rgba(26,26,26,0.35)] mb-3">
              Recent Collections
            </p>
            <div className="flex flex-col gap-2">
              {savedSessions
                .filter(s => s.category === categorySlug)
                .slice(0, 5)
                .map(session => {
                  const productCount = session.collections.reduce((sum, c) => sum + c.products.length, 0)
                  const date = new Date(session.savedAt)
                  const timeAgo = formatTimeAgo(date)
                  return (
                    <div
                      key={session.id}
                      className="flex items-center gap-3 px-4 py-3 bg-white rounded-lg border border-black/[0.06]
                                 hover:border-black/[0.12] transition-all cursor-pointer group"
                      onClick={() => handleLoadSession(session)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] text-[#1a1a1a] truncate">{session.name}</p>
                        <p className="text-[11px] text-[rgba(26,26,26,0.4)]">
                          {session.collections.length} collection{session.collections.length !== 1 ? 's' : ''}
                          {' · '}{productCount} product{productCount !== 1 ? 's' : ''}
                          {' · '}{timeAgo}
                        </p>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteSession(session.id) }}
                        className="text-[rgba(26,26,26,0.2)] hover:text-red-400 transition-colors
                                   opacity-0 group-hover:opacity-100 shrink-0 p-1"
                      >
                        <i className="fa-solid fa-trash-can text-[11px]" />
                      </button>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* New Collection button — shown when results exist */}
        {hasResults && (
          <div className="mt-4">
            <button
              onClick={handleNewSession}
              className="text-[11px] font-semibold tracking-[0.12em] uppercase
                         text-[rgba(26,26,26,0.4)] hover:text-[rgba(26,26,26,0.7)] transition-all
                         flex items-center gap-1.5"
            >
              <i className="fa-solid fa-plus text-[10px]" />
              New Collection
            </button>
          </div>
        )}

        {loading && <LoadingState statuses={statuses} phaseCopy={config.loadingCopy} />}

        {error && (
          <p className="mt-6 text-sm text-red-600 bg-white border border-red-200 rounded px-4 py-3">
            {error}
          </p>
        )}
      </section>

      {hasResults && refinements && (
        <RefinementChips
          chips={refinements}
          onRefine={chip => runSearch(`${query} — ${chip}`)}
        />
      )}
      {(hasResults || loading) && (
        <ProductCollections
          collections={collections}
          onRemoveProduct={handleRemoveProduct}
          onRemoveSelected={handleRemoveSelected}
          onReorder={handleReorder}
          onMoveProduct={handleMoveProduct}
          onAddToCollection={handleAddToCollection}
        />
      )}
    </div>
  )
}
