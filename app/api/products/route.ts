import { NextRequest, NextResponse } from 'next/server'
import { searchKmart } from '@/lib/kmart-scraper'
import { getCategoryConfig } from '@/lib/category-config'
import { filterByGender } from '@/lib/gender-filter'

export async function POST(req: NextRequest) {
  const { query, gender, category } = await req.json() as {
    query: string
    gender: 'men' | 'women' | null
    category?: string
  }

  const config = getCategoryConfig(category ?? 'outfits')
  console.log(`[Products] query="${query}" gender=${gender ?? 'none'} category=${category ?? 'outfits'}`)

  const products = await searchKmart(query, config.categoryFilter)
  const filtered = config.showGenderFilter ? filterByGender(products, gender) : products

  return NextResponse.json({ products: filtered })
}
