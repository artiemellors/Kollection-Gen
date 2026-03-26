'use client'

import { useState, useEffect, useCallback } from 'react'
import * as XLSX from 'xlsx'

const useKosmos = process.env.NEXT_PUBLIC_SHOW_NEW_FEATURE === 'true'

interface CollectionProduct {
  name: string
  price: string
  dataId?: string
  colour?: string
  productUrl?: string
  imageUrl?: string
  altImageUrl?: string
}

export interface ProductCollection {
  name: string
  products: CollectionProduct[]
}

function exportToExcel(dataIds: string[], filename: string) {
  const ws = XLSX.utils.aoa_to_sheet([['Product ID'], ...dataIds.map(id => [id])])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Products')
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

function SkeletonCard() {
  if (useKosmos) {
    return (
      <div className="flex flex-col">
        <div className="skeleton aspect-[4/5] w-full rounded-[8px] bg-[#F4F5F6]" />
        <div className="pt-2 space-y-1.5">
          <div className="skeleton h-3 w-full rounded" />
          <div className="skeleton h-3 w-2/3 rounded" />
          <div className="skeleton h-4 w-1/3 rounded mt-1" />
        </div>
      </div>
    )
  }
  return (
    <div className="bg-white border border-black/[0.08] rounded overflow-hidden">
      <div className="skeleton aspect-[4/5] w-full" />
      <div className="p-3 space-y-2">
        <div className="skeleton h-3 w-full rounded" />
        <div className="skeleton h-3 w-2/3 rounded" />
        <div className="skeleton h-3 w-1/3 rounded mt-1" />
      </div>
    </div>
  )
}

function KmartProductCard({
  p,
  animDelay,
  isSelected,
  onToggleSelect,
}: {
  p: CollectionProduct
  animDelay: number
  isSelected: boolean
  onToggleSelect: () => void
}) {
  const hasAlt = !!p.altImageUrl
  const [showAlt, setShowAlt] = useState(false)

  useEffect(() => {
    if (!hasAlt) return
    if (!window.matchMedia('(hover: hover)').matches) {
      const id = setInterval(() => setShowAlt(v => !v), 2500)
      return () => clearInterval(id)
    }
  }, [hasAlt])

  return (
    <div
      className={`flex flex-col relative group cursor-pointer transition-all duration-150 rounded-[8px] ${
        isSelected ? 'ring-2 ring-[var(--accent)] ring-offset-4 bg-[rgba(23,104,176,0.03)]' : ''
      }`}
      style={{ animation: `fadeUp 300ms ${animDelay}ms ease both` }}
      onClick={onToggleSelect}
      onMouseEnter={() => hasAlt && setShowAlt(true)}
      onMouseLeave={() => hasAlt && setShowAlt(false)}
    >
      {/* Selection checkbox */}
      <div
        className={`absolute top-2 left-2 z-10 w-6 h-6 rounded border-2 flex items-center justify-center
                    transition-all duration-150 ${
                      isSelected
                        ? 'bg-[var(--accent)] border-[var(--accent)]'
                        : 'bg-white/80 border-black/20 opacity-0 group-hover:opacity-100'
                    }`}
        style={{ backdropFilter: 'blur(4px)' }}
      >
        {isSelected && (
          <i className="fa-solid fa-check text-white text-[11px]" />
        )}
      </div>

      <div className="relative bg-[#F4F5F6] overflow-hidden rounded-[8px]">
        <div className="aspect-[4/5] w-full relative">
          {p.imageUrl && (
            <img
              src={p.imageUrl}
              alt={p.name}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
              style={{
                opacity: showAlt && hasAlt ? 0 : 1,
                animation: 'imgFadeIn 300ms ease-out',
              }}
            />
          )}
          {hasAlt && (
            <img
              src={p.altImageUrl}
              alt={p.name}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
              style={{ opacity: showAlt ? 1 : 0 }}
            />
          )}
        </div>
      </div>
      <div className="pt-3 pb-4 flex flex-col flex-1">
        <p className="text-[16px] font-normal leading-[1.3] line-clamp-2 text-[#1a1a1a] mb-2">
          {p.name}
        </p>
        {p.colour && (
          <p className="text-[11px] text-[rgba(26,26,26,0.5)] mb-2">{p.colour}</p>
        )}
        {p.dataId && (
          <p className="text-[11px] font-mono text-[rgba(26,26,26,0.4)] mb-2">ID: {p.dataId}</p>
        )}
        <div className="mt-auto">
          <p className="font-bold text-[#1a1a1a] leading-none text-[24px]">
            <span className="text-[16px] font-bold align-top" style={{ marginTop: '3px', display: 'inline-block' }}>$</span>
            {p.price.startsWith('$') ? p.price.slice(1) : p.price}
          </p>
          {p.productUrl && (
            <a
              href={p.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block text-[11px] font-semibold transition-colors hover:underline"
              style={{ color: 'var(--accent)' }}
              onClick={e => e.stopPropagation()}
            >
              View ↗
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function OriginalProductCard({
  p,
  animDelay,
  isSelected,
  onToggleSelect,
}: {
  p: CollectionProduct
  animDelay: number
  isSelected: boolean
  onToggleSelect: () => void
}) {
  return (
    <div
      onClick={onToggleSelect}
      className={`bg-white rounded-lg overflow-hidden flex flex-col transition-all duration-150 cursor-pointer ${
        isSelected ? 'ring-2 ring-[var(--accent)] ring-offset-4' : ''
      }`}
      style={{ animation: `fadeUp 300ms ${animDelay}ms ease both` }}
    >
      {/* Selection checkbox */}
      <div
        className={`absolute top-2 left-2 z-10 w-6 h-6 rounded border-2 flex items-center justify-center
                    transition-all duration-150 ${
                      isSelected
                        ? 'bg-[var(--accent)] border-[var(--accent)]'
                        : 'bg-white/80 border-black/20 opacity-0 group-hover:opacity-100'
                    }`}
      >
        {isSelected && (
          <i className="fa-solid fa-check text-white text-[11px]" />
        )}
      </div>

      <div className="relative bg-white rounded-lg">
        {p.imageUrl ? (
          <img
            src={p.imageUrl}
            alt={p.name}
            className="aspect-[4/5] w-full object-contain rounded-lg"
            style={{ animation: `imgFadeIn 180ms ease-out, imgJiggle 350ms ease-out`, mixBlendMode: 'multiply' }}
          />
        ) : (
          <div className="aspect-[4/5] w-full bg-[--surface2] rounded-lg" />
        )}
      </div>
      <div id="ProductCard-content" className="p-3 flex flex-col flex-1">
        <p className="text-[14px] font-normal leading-tight line-clamp-2 text-[--text] mb-2">
          {p.name}
        </p>
        {p.dataId && (
          <p className="text-[11px] font-mono text-[rgba(26,26,26,0.4)] mb-2">ID: {p.dataId}</p>
        )}
        <p className="text-xl font-bold text-[--text] leading-none mb-3">
          <span className="text-xs font-bold align-top">$</span>
          {p.price.startsWith('$') ? p.price.slice(1) : p.price}
        </p>
        {p.productUrl && (
          <a
            href={p.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-semibold mt-auto"
            style={{ color: 'var(--accent)' }}
            onClick={e => e.stopPropagation()}
          >
            View at Kmart ↗
          </a>
        )}
      </div>
    </div>
  )
}

export function ProductCollections({ collections }: { collections: ProductCollection[] | null }) {
  const [activeTab, setActiveTab] = useState(0)
  const [selected, setSelected] = useState<Map<number, Set<number>>>(new Map())
  const isLoading = collections === null

  // Reset active tab when collections change
  if (!isLoading && activeTab >= collections.length && collections.length > 0) {
    setActiveTab(0)
  }

  // Reset selections when collections change
  useEffect(() => {
    setSelected(new Map())
  }, [collections])

  const activeCollection = isLoading ? null : collections[activeTab]
  const activeSelected = selected.get(activeTab) ?? new Set<number>()
  const selectedCount = activeSelected.size

  const toggleSelect = useCallback((productIndex: number) => {
    setSelected(prev => {
      const next = new Map(prev)
      const tabSet = new Set(next.get(activeTab) ?? [])
      if (tabSet.has(productIndex)) {
        tabSet.delete(productIndex)
      } else {
        tabSet.add(productIndex)
      }
      next.set(activeTab, tabSet)
      return next
    })
  }, [activeTab])

  const selectAll = useCallback(() => {
    if (!activeCollection) return
    setSelected(prev => {
      const next = new Map(prev)
      next.set(activeTab, new Set(activeCollection.products.map((_, i) => i)))
      return next
    })
  }, [activeTab, activeCollection])

  const deselectAll = useCallback(() => {
    setSelected(prev => {
      const next = new Map(prev)
      next.set(activeTab, new Set())
      return next
    })
  }, [activeTab])

  const handleExportAll = useCallback(() => {
    if (!activeCollection) return
    const dataIds = activeCollection.products
      .map(p => p.dataId)
      .filter((id): id is string => !!id)
    if (dataIds.length === 0) return
    exportToExcel(dataIds, `${activeCollection.name.replace(/\s+/g, '-').toLowerCase()}-all`)
  }, [activeCollection])

  const handleExportSelected = useCallback(() => {
    if (!activeCollection) return
    const dataIds = activeCollection.products
      .filter((_, i) => activeSelected.has(i))
      .map(p => p.dataId)
      .filter((id): id is string => !!id)
    if (dataIds.length === 0) return
    exportToExcel(dataIds, `${activeCollection.name.replace(/\s+/g, '-').toLowerCase()}-selected`)
  }, [activeCollection, activeSelected])

  if (!isLoading && collections.length === 0) return null

  return (
    <div className="w-full bg-white border-t border-black/[0.06]">
    <div id="ProductCollections" className="max-w-4xl mx-auto px-4 sm:px-8 pb-16">

      {/* Section heading with actions */}
      <div className="flex items-baseline mt-8 mb-5">
        {useKosmos ? (
          <p className="text-2xl font-bold text-[#1a1a1a]">Collections</p>
        ) : (
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-[--text-muted]">Collections</p>
        )}
        {!isLoading && activeCollection && (
          <div className="ml-auto flex items-center gap-4">
            <button
              onClick={selectedCount === activeCollection.products.length ? deselectAll : selectAll}
              className="text-[11px] font-semibold tracking-[0.12em] uppercase
                         transition-all text-[rgba(26,26,26,0.4)] hover:text-[rgba(26,26,26,0.7)]"
            >
              {selectedCount === activeCollection.products.length ? 'Deselect All' : 'Select All'}
            </button>
            <button
              onClick={handleExportAll}
              className="text-[11px] font-semibold tracking-[0.12em] uppercase
                         transition-all flex items-center gap-1.5
                         text-[rgba(26,26,26,0.4)] hover:text-[rgba(26,26,26,0.7)]"
            >
              <i className="fa-solid fa-file-arrow-down text-[10px]" />
              Export All
            </button>
          </div>
        )}
      </div>

      {/* Collection tab bar */}
      <div id="ProductCollections-tabbar" className="sticky top-20 z-10 bg-white -mx-4 sm:-mx-8 px-4 sm:px-8 pt-4 mb-6">
        <div className="flex gap-0 overflow-x-auto scrollbar-hide border-b border-black/[0.08]">
          {isLoading ? (
            <>
              <div className="skeleton h-4 w-20 mx-5 mb-3 rounded" />
              <div className="skeleton h-4 w-16 mx-5 mb-3 rounded" />
              <div className="skeleton h-4 w-24 mx-5 mb-3 rounded" />
            </>
          ) : (
            collections.map((col, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                className={`px-5 pb-3 pt-1 text-[11px] tracking-[0.12em]
                            uppercase transition-all duration-200 whitespace-nowrap shrink-0 border-b-2
                            ${i === activeTab
                              ? `font-semibold ${useKosmos ? 'border-[#1768B0] text-[#1768B0]' : 'border-[--accent] text-[--accent]'}`
                              : 'font-normal border-transparent text-black/30 hover:text-black/50'
                            }`}
              >
                {col.name}
                <span className="ml-1.5 text-[10px] opacity-60">({col.products.length})</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Product grid */}
      <div
        id="ProductCollections-grid"
        className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 ${useKosmos ? 'gap-x-4 gap-y-6' : 'gap-x-4 gap-y-3'}`}
      >
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
        ) : activeCollection ? (
          activeCollection.products.map((p, i) => (
            useKosmos ? (
              <KmartProductCard
                key={`${activeTab}-${i}`}
                p={p}
                animDelay={i * 35}
                isSelected={activeSelected.has(i)}
                onToggleSelect={() => toggleSelect(i)}
              />
            ) : (
              <OriginalProductCard
                key={`${activeTab}-${i}`}
                p={p}
                animDelay={i * 35}
                isSelected={activeSelected.has(i)}
                onToggleSelect={() => toggleSelect(i)}
              />
            )
          ))
        ) : null}
      </div>
    </div>

    {/* Floating selection bar */}
    <div
      className="fixed bottom-0 left-0 right-0 z-30 transition-transform duration-300 ease-out pointer-events-none"
      style={{ transform: selectedCount > 0 ? 'translateY(0)' : 'translateY(100%)' }}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-8 pointer-events-auto">
        <div className="flex items-center gap-4 py-3 px-5 mb-4 bg-white rounded-lg shadow-lg border border-black/[0.08]">
          <span className="text-[12px] text-[rgba(26,26,26,0.5)] mr-auto">
            {selectedCount} selected
          </span>
          <button
            onClick={handleExportSelected}
            className="text-[11px] font-semibold tracking-[0.12em] uppercase
                       transition-all flex items-center gap-1.5 hover:opacity-70"
            style={{ color: 'var(--accent)' }}
          >
            <i className="fa-solid fa-file-arrow-down text-[10px]" />
            Export Selected
          </button>
          <button
            onClick={deselectAll}
            className="text-[11px] font-semibold tracking-[0.12em] uppercase
                       transition-all text-[rgba(26,26,26,0.4)] hover:text-[rgba(26,26,26,0.7)]"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
    </div>
  )
}
