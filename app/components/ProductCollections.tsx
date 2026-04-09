'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import * as XLSX from 'xlsx'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const useKosmos = process.env.NEXT_PUBLIC_SHOW_NEW_FEATURE === 'true'

interface CollectionProduct {
  name: string
  price: string
  dataId?: string
  colour?: string
  seller?: string
  productUrl?: string
  imageUrl?: string
  altImageUrl?: string
}

const SELLERS = ['Kmart', 'Target', 'Marketplace'] as const
type Seller = typeof SELLERS[number]

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
  onRemove,
}: {
  p: CollectionProduct
  animDelay: number
  isSelected: boolean
  onToggleSelect: () => void
  onRemove: () => void
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

      {/* Remove button */}
      <button
        className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-white/80 border border-black/10
                   flex items-center justify-center opacity-0 group-hover:opacity-100
                   transition-all duration-150 hover:bg-red-50 hover:border-red-200 hover:text-red-500"
        style={{ backdropFilter: 'blur(4px)' }}
        onClick={e => { e.stopPropagation(); onRemove() }}
      >
        <i className="fa-solid fa-xmark text-[10px] text-[rgba(26,26,26,0.4)]" />
      </button>

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
  onRemove,
}: {
  p: CollectionProduct
  animDelay: number
  isSelected: boolean
  onToggleSelect: () => void
  onRemove: () => void
}) {
  return (
    <div
      onClick={onToggleSelect}
      className={`bg-white rounded-lg overflow-hidden flex flex-col transition-all duration-150 cursor-pointer relative group ${
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

      {/* Remove button */}
      <button
        className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-white/80 border border-black/10
                   flex items-center justify-center opacity-0 group-hover:opacity-100
                   transition-all duration-150 hover:bg-red-50 hover:border-red-200 hover:text-red-500"
        onClick={e => { e.stopPropagation(); onRemove() }}
      >
        <i className="fa-solid fa-xmark text-[10px] text-[rgba(26,26,26,0.4)]" />
      </button>

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

interface ProductCollectionsProps {
  collections: ProductCollection[] | null
  onRemoveProduct: (collectionIndex: number, productIndex: number) => void
  onRemoveSelected: (collectionIndex: number, productIndices: Set<number>) => void
  onReorder: (collectionIndex: number, fromIndex: number, toIndex: number) => void
  onMoveProduct: (fromCollection: number, fromIndex: number, toCollection: number, toIndex: number) => void
  onAddToCollection: (fromCollectionIndex: number, productIndices: Set<number>, toCollectionIndex: number) => void
}

// Wrapper that makes a product card sortable via dnd-kit
function SortableProductCard({
  id,
  children,
}: {
  id: string
  children: React.ReactNode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 20 : undefined,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  )
}

export function ProductCollections({ collections, onRemoveProduct, onRemoveSelected, onReorder, onMoveProduct, onAddToCollection }: ProductCollectionsProps) {
  const [activeTab, setActiveTab] = useState(-1)  // -1 = "All" tab
  const [selected, setSelected] = useState<Map<number, Set<number>>>(new Map())
  const [activeSellers, setActiveSellers] = useState<Set<Seller>>(new Set(SELLERS))
  const [showAddTo, setShowAddTo] = useState(false)
  const addToRef = useRef<HTMLDivElement>(null)

  // Close "Move to" dropdown on outside click
  useEffect(() => {
    if (!showAddTo) return
    const handler = (e: MouseEvent) => {
      if (addToRef.current && !addToRef.current.contains(e.target as Node)) {
        setShowAddTo(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showAddTo])
  const isLoading = collections === null

  // Reset active tab when collections change
  if (!isLoading && activeTab > 0 && activeTab >= collections.length && collections.length > 0) {
    setActiveTab(-1)
  }

  // Reset selections and seller filters when collections change
  useEffect(() => {
    setSelected(new Map())
    setActiveTab(-1)
    setActiveSellers(new Set(SELLERS))
  }, [collections])

  const toggleSeller = useCallback((seller: Seller) => {
    setActiveSellers(prev => {
      const next = new Set(prev)
      if (next.has(seller)) {
        if (next.size > 1) next.delete(seller)
      } else {
        next.add(seller)
      }
      return next
    })
    setSelected(new Map())
  }, [])

  // Filter products by active sellers
  const filterBySeller = useCallback((products: CollectionProduct[]) => {
    if (activeSellers.size === SELLERS.length) return products
    return products.filter(p => !p.seller || activeSellers.has(p.seller as Seller))
  }, [activeSellers])

  const allCollection = useMemo<ProductCollection | null>(() => {
    if (isLoading) return null
    return { name: 'All', products: collections.flatMap(col => col.products) }
  }, [isLoading, collections])

  const activeCollection = useMemo<ProductCollection | null>(() => {
    const raw = isLoading ? null : activeTab === -1 ? allCollection : collections[activeTab]
    return raw ? { ...raw, products: filterBySeller(raw.products) } : null
  }, [isLoading, collections, activeTab, allCollection, filterBySeller])
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

  const clearTabSelection = useCallback(() => {
    setSelected(prev => { const next = new Map(prev); next.delete(activeTab); return next })
  }, [activeTab])

  const findSourceProduct = useCallback((product: CollectionProduct): { ci: number; pi: number } | null => {
    if (!collections) return null
    for (let ci = 0; ci < collections.length; ci++) {
      const pi = collections[ci].products.indexOf(product)
      if (pi !== -1) return { ci, pi }
    }
    return null
  }, [collections])

  const handleRemove = useCallback((displayIndex: number) => {
    if (!collections || !activeCollection) return
    const product = activeCollection.products[displayIndex]
    if (!product) return
    if (activeTab === -1) {
      const source = findSourceProduct(product)
      if (source) onRemoveProduct(source.ci, source.pi)
    } else {
      const realIndex = collections[activeTab].products.indexOf(product)
      if (realIndex !== -1) onRemoveProduct(activeTab, realIndex)
    }
    clearTabSelection()
  }, [collections, activeCollection, activeTab, findSourceProduct, onRemoveProduct, clearTabSelection])

  // Resolve a set of display indices to { collectionIndex → Set<realIndex> }
  const resolveSelectedToSource = useCallback((displayIndices: Set<number>): Map<number, Set<number>> => {
    if (!collections || !activeCollection) return new Map()
    const filteredProducts = activeCollection.products
    const result = new Map<number, Set<number>>()
    for (const di of displayIndices) {
      const product = filteredProducts[di]
      if (!product) continue
      if (activeTab === -1) {
        const source = findSourceProduct(product)
        if (source) {
          if (!result.has(source.ci)) result.set(source.ci, new Set())
          result.get(source.ci)!.add(source.pi)
        }
      } else {
        const realIndex = collections[activeTab].products.indexOf(product)
        if (realIndex !== -1) {
          if (!result.has(activeTab)) result.set(activeTab, new Set())
          result.get(activeTab)!.add(realIndex)
        }
      }
    }
    return result
  }, [collections, activeCollection, activeTab, findSourceProduct])

  const handleRemoveSelectedProducts = useCallback(() => {
    if (selectedCount === 0) return
    const resolved = resolveSelectedToSource(activeSelected)
    for (const [ci, indices] of resolved) {
      onRemoveSelected(ci, indices)
    }
    clearTabSelection()
  }, [selectedCount, activeSelected, resolveSelectedToSource, onRemoveSelected, clearTabSelection])

  const handleExportAll = useCallback(() => {
    if (!activeCollection) return
    const dataIds = activeCollection.products
      .map(p => p.dataId)
      .filter((id): id is string => !!id)
    if (dataIds.length === 0) return
    const filename = activeCollection.name.replace(/\s+/g, '-').toLowerCase()
    exportToExcel(dataIds, `${filename}-all`)
  }, [activeCollection])

  const handleExportSelected = useCallback(() => {
    if (!activeCollection) return
    const dataIds = activeCollection.products
      .filter((_, i) => activeSelected.has(i))
      .map(p => p.dataId)
      .filter((id): id is string => !!id)
    if (dataIds.length === 0) return
    const filename = activeCollection.name.replace(/\s+/g, '-').toLowerCase()
    exportToExcel(dataIds, `${filename}-selected`)
  }, [activeCollection, activeSelected])

  // Move selected products to a target collection
  const handleAddTo = useCallback((targetCollectionIndex: number) => {
    if (selectedCount === 0) return
    const resolved = resolveSelectedToSource(activeSelected)
    for (const [ci, indices] of resolved) {
      if (ci !== targetCollectionIndex) {
        onAddToCollection(ci, indices, targetCollectionIndex)
      }
    }
    clearTabSelection()
    setShowAddTo(false)
  }, [selectedCount, activeSelected, resolveSelectedToSource, onAddToCollection, clearTabSelection])

  // Drag-and-drop — require 5px movement before starting drag to avoid
  // interfering with click-to-select
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    if (!collections || !activeCollection) return
    const { active, over } = event
    if (!over || active.id === over.id) return

    const filteredProducts = activeCollection.products
    const fromFiltered = filteredProducts.findIndex((_, i) => `product-${i}` === active.id)
    const toFiltered = filteredProducts.findIndex((_, i) => `product-${i}` === over.id)
    if (fromFiltered === -1 || toFiltered === -1) return

    const fromProduct = filteredProducts[fromFiltered]
    const toProduct = filteredProducts[toFiltered]

    if (activeTab === -1) {
      // "All" tab: trace both products to source collections
      const from = findSourceProduct(fromProduct)
      const to = findSourceProduct(toProduct)
      if (!from || !to) return

      if (from.ci === to.ci) {
        // Same collection — simple reorder
        onReorder(from.ci, from.pi, to.pi)
      } else {
        // Different collections — move product
        onMoveProduct(from.ci, from.pi, to.ci, to.pi)
      }
    } else {
      // Specific collection tab
      const realFrom = collections[activeTab].products.indexOf(fromProduct)
      const realTo = collections[activeTab].products.indexOf(toProduct)
      if (realFrom === -1 || realTo === -1) return
      onReorder(activeTab, realFrom, realTo)
    }

    clearTabSelection()
  }, [collections, activeCollection, activeTab, findSourceProduct, onReorder, onMoveProduct])

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
            {selectedCount > 0 && (
              <button
                onClick={handleRemoveSelectedProducts}
                className="text-[11px] font-semibold tracking-[0.12em] uppercase
                           transition-all flex items-center gap-1.5
                           text-red-400 hover:text-red-600"
              >
                <i className="fa-solid fa-trash-can text-[10px]" />
                Remove ({selectedCount})
              </button>
            )}
            {selectedCount > 0 && collections && collections.length > 1 && (
              <div className="relative" ref={addToRef}>
                <button
                  onClick={() => setShowAddTo(prev => !prev)}
                  className="text-[11px] font-semibold tracking-[0.12em] uppercase
                             transition-all flex items-center gap-1.5
                             text-[rgba(26,26,26,0.4)] hover:text-[rgba(26,26,26,0.7)]"
                >
                  <i className="fa-solid fa-arrow-right text-[10px]" />
                  Move to
                </button>
                {showAddTo && (
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-black/[0.08] py-1 z-20 min-w-[160px]">
                    {collections.map((col, ci) => {
                      const isCurrent = ci === activeTab
                      if (isCurrent) return null
                      return (
                        <button
                          key={ci}
                          onClick={() => handleAddTo(ci)}
                          className="w-full text-left px-3 py-2 text-[12px] text-[#1a1a1a]
                                     hover:bg-[rgba(23,104,176,0.06)] transition-colors"
                        >
                          {col.name}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
            {selectedCount > 0 && (
              <button
                onClick={handleExportSelected}
                className="text-[11px] font-semibold tracking-[0.12em] uppercase
                           transition-all flex items-center gap-1.5 hover:opacity-70"
                style={{ color: 'var(--accent)' }}
              >
                <i className="fa-solid fa-file-arrow-down text-[10px]" />
                Export Selected ({selectedCount})
              </button>
            )}
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
            <>
              <button
                onClick={() => setActiveTab(-1)}
                className={`px-5 pb-3 pt-1 text-[11px] tracking-[0.12em]
                            uppercase transition-all duration-200 whitespace-nowrap shrink-0 border-b-2
                            ${activeTab === -1
                              ? `font-semibold ${useKosmos ? 'border-[#1768B0] text-[#1768B0]' : 'border-[--accent] text-[--accent]'}`
                              : 'font-normal border-transparent text-black/30 hover:text-black/50'
                            }`}
              >
                All
                <span className="ml-1.5 text-[10px] opacity-60">({allCollection?.products.length ?? 0})</span>
              </button>
              {collections.map((col, i) => (
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
              ))}
            </>
          )}
        </div>

        {/* Seller filter chips */}
        {!isLoading && (
          <div className="flex gap-2 mt-3">
            {SELLERS.map(seller => {
              const isActive = activeSellers.has(seller)
              return (
                <button
                  key={seller}
                  onClick={() => toggleSeller(seller)}
                  className={`px-3 py-1 text-[11px] font-semibold tracking-wide rounded-full
                              border transition-all duration-150 ${
                                isActive
                                  ? 'border-[var(--accent)] text-[var(--accent)] bg-[rgba(23,104,176,0.06)]'
                                  : 'border-black/[0.1] text-[rgba(26,26,26,0.3)]'
                              }`}
                >
                  {seller}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Product grid */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={activeCollection ? activeCollection.products.map((_, i) => `product-${i}`) : []}
          strategy={rectSortingStrategy}
        >
          <div
            id="ProductCollections-grid"
            className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 ${useKosmos ? 'gap-x-4 gap-y-6' : 'gap-x-4 gap-y-3'}`}
          >
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
            ) : activeCollection ? (
              activeCollection.products.map((p, i) => (
                <SortableProductCard key={`${activeTab}-${p.dataId ?? i}`} id={`product-${i}`} >
                  {useKosmos ? (
                    <KmartProductCard
                      p={p}
                      animDelay={i * 35}
                      isSelected={activeSelected.has(i)}
                      onToggleSelect={() => toggleSelect(i)}
                      onRemove={() => handleRemove(i)}
                    />
                  ) : (
                    <OriginalProductCard
                      p={p}
                      animDelay={i * 35}
                      isSelected={activeSelected.has(i)}
                      onToggleSelect={() => toggleSelect(i)}
                      onRemove={() => handleRemove(i)}
                    />
                  )}
                </SortableProductCard>
              ))
            ) : null}
          </div>
        </SortableContext>
      </DndContext>
    </div>

    </div>
  )
}
