import { NextRequest, NextResponse } from 'next/server'
import { searchKmart, Product } from '@/lib/kmart-scraper'
import { getCategoryConfig } from '@/lib/category-config'

const WOMENS_TERMS = /\b(women'?s?|ladies|girl'?s?|feminine|womens)\b/i
const MENS_TERMS   = /\b(men'?s?|guy'?s?|boys?|masculine|mens)\b/i

function filterByGender(products: Product[], gender: 'men' | 'women' | null): Product[] {
  if (!gender) return products
  const excludePattern = gender === 'men' ? WOMENS_TERMS : MENS_TERMS
  return products.filter(p => !excludePattern.test(p.name))
}

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
