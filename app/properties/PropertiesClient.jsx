'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import FilterSidebar from '../components/Properties/FilterSidebar'
import PropertyCard from '../components/Properties/PropertyCard'
import styles from '../components/css/Properties/properties.module.css'
import ReviewPrompt from '../components/Properties/ReviewPrompt'
import { useTrackVisit } from '@/app/hooks/useTrackVisit'
import SearchBar from '../components/Properties/SearchBar'

const PAGE_SIZE = 20

const DEFAULT_CATEGORY_ID = 1

function filtersFromParams(params) {
  return {
    ward_id: params.get('ward_id') ? Number(params.get('ward_id')) : null,
    category_id: params.get('category_id') ? Number(params.get('category_id')) : DEFAULT_CATEGORY_ID,
    type_ids: params.get('type_ids') ? params.get('type_ids').split(',').map(Number) : [],
    price_range: params.get('price_range') || null,
    rent_duration: params.get('rent_duration') || null,
    property_interior: params.get('property_interior') || null,
  }
}

function filtersToParams(filters, page) {
  const params = new URLSearchParams()
  if (filters.ward_id) params.set('ward_id', filters.ward_id)
  if (filters.category_id) params.set('category_id', filters.category_id)
  if (filters.type_ids?.length) params.set('type_ids', filters.type_ids.join(','))
  if (filters.price_range) params.set('price_range', filters.price_range)
  if (filters.rent_duration) params.set('rent_duration', filters.rent_duration)
  if (filters.property_interior) params.set('property_interior', filters.property_interior)
  if (page > 1) params.set('page', page)
  return params
}

async function fetchListings(filters, bufferPage) {
  const params = filtersToParams(filters, bufferPage)
  params.set('prefetch', 'true')
  const res = await fetch(`/api/listings?${params.toString()}`)
  if (!res.ok) throw new Error('Failed to fetch listings')
  return res.json()
}

export default function PropertiesClient() {
  useTrackVisit()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [ filters, setFilters ] = useState(() => filtersFromParams(searchParams))
  const [ currentPage, setCurrentPage ] = useState(() => Number(searchParams.get('page') ?? 1))
  const [ wardPopup, setWardPopup ] = useState(null)
  const [ searchLabel, setSearchLabel ] = useState(null)
  const [ searchResults, setSearchResults ] = useState(null)
  const BUFFER_SIZE = 2  // pages per buffer block

  // which 40-block we're in (pages 1-2 = buffer 1, pages 3-4 = buffer 2, etc.)
  const bufferPage = Math.ceil(currentPage / BUFFER_SIZE)

  // position within the buffer (0 or 1)
  const indexInBuffer = (currentPage - 1) % BUFFER_SIZE

  const { data, isLoading, error, isFetching, failureCount } = useQuery({
    queryKey: [ 'listings', filters, bufferPage ],
    queryFn: () => fetchListings(filters, bufferPage),
  })

  const allData = data?.data ?? []
  const pagination = data?.pagination ?? null
  const totalPages = pagination?.total_pages ?? 1

  const listings = allData.slice(
    indexInBuffer * PAGE_SIZE,
    indexInBuffer * PAGE_SIZE + PAGE_SIZE
  )

  const displayListings = searchResults !== null ? searchResults : listings
  const isSearchActive = searchResults !== null

  // sync URL
  const syncUrl = (f, p) => {
    const params = filtersToParams(f, p)
    const qs = params.toString()
    router.replace(qs ? `?${qs}` : '?', { scroll: false })
  }



  const handleFilterChange = (updated) => {
    setFilters(updated)
    setCurrentPage(1)
    syncUrl(updated, 1)
  }

  const handlePageChange = (page) => {
    setCurrentPage(page)
    syncUrl(filters, page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSearchResults = (results, label) => {
    setSearchResults(results)
    setSearchLabel(label)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSearchClear = () => {
    setSearchResults(null)
    setSearchLabel(null)
  }

  const pageNumbers = () => {
    const pages = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
      return pages
    }
    pages.push(1)
    if (currentPage > 3) pages.push('...')
    const start = Math.max(2, currentPage - 1)
    const end = Math.min(totalPages - 1, currentPage + 1)
    for (let i = start; i <= end; i++) pages.push(i)
    if (currentPage < totalPages - 2) pages.push('...')
    pages.push(totalPages)
    return pages
  }

  return (
    <>
      <ReviewPrompt />
      <div className={styles.pageLayout}>
        <FilterSidebar onFilterChange={handleFilterChange} initialFilters={filters} />

        <main className={styles.mainContent}>
          <SearchBar
            allData={allData}
            onSearchResults={handleSearchResults}
            onClear={handleSearchClear}
          />
          {searchLabel && (
            <p className={styles.searchLabel}>{searchLabel}</p>
          )}

          {/*
          <div className={styles.resultsHeader}>
            {!isLoading && pagination && (
              <p className={styles.resultsCount}>
                {pagination.total_records} properties found
              </p>
            )}
          </div>
          */}
          {isFetching && failureCount > 0 && (
            <div className={styles.retryState}>
              <span className={styles.retrySpinner} />
              Retrying... (attempt {failureCount + 1})
            </div>
          )}

          {error && (
            <div className={styles.errorState}>
              Failed to load listings — {error.message}
            </div>
          )}

          {isLoading && (
            <div className={styles.grid}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={styles.skeleton} />
              ))}
            </div>
          )}

          {!isLoading && !error && displayListings.length === 0 && (
            <div className={styles.emptyState}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path d="M3 10V20M21 10V20M3 10h18M3 10L12 3l9 7" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                <rect x="9" y="14" width="6" height="6" stroke="currentColor" strokeWidth="1.2" />
              </svg>
              <p>{isSearchActive ? 'No properties found for your search.' : 'No properties match your filters.'}</p>
            </div>
          )}

          {!isLoading && displayListings.length > 0 && (
            <div className={styles.grid}>
              {displayListings.map(listing => (
                <PropertyCard
                  key={listing.listing_id}
                  listing={listing}
                  onWardClick={(ward_id, ward_name, property_location) =>
                    setWardPopup({ ward_id, ward_name, property_location })
                  }
                />
              ))}
            </div>
          )}

          {!isLoading && !isSearchActive && totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                aria-label="Previous page"
              >&#8592;</button>

              {pageNumbers().map((p, i) =>
                p === '...' ? (
                  <span key={`ellipsis-${i}`} className={styles.ellipsis}>........</span>
                ) : (
                  <button
                    key={p}
                    className={`${styles.pageBtn} ${p === currentPage ? styles.pageBtnActive : ''}`}
                    onClick={() => handlePageChange(p)}
                  >{p}</button>
                )
              )}

              <button
                className={styles.pageBtn}
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                aria-label="Next page"
              >&#8594;</button>
            </div>
          )}
        </main>

        {wardPopup && (
          <div className={styles.wardOverlay} onClick={() => setWardPopup(null)}>
            <div className={styles.wardModal} onClick={e => e.stopPropagation()}>
              <div className={styles.wardModalHeader}>
                <span>{wardPopup.ward_name}</span>
                <button onClick={() => setWardPopup(null)}>&#x2715;</button>
              </div>
              <div className={styles.wardModalBody}>
                {wardPopup.property_location ? (
                  <iframe
                    src={wardPopup.property_location}
                    width="100%"
                    height="100%"
                    style={{ border: 'none', display: 'block' }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={`Map of ${wardPopup.ward_name}`}
                  />
                ) : (
                  <p style={{ padding: '1rem' }}>No map available for this ward.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}