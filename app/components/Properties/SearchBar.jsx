'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import styles from '../css/Properties/properties.module.css'

function debounce(fn, delay) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export default function SearchBar({ allData = [], onSearchResults, onClear }) {
  const [query, setQuery] = useState('')
  const [dropdown, setDropdown] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [memoryMiss, setMemoryMiss] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchLabel, setSearchLabel] = useState(null)
  const inputRef = useRef(null)
  const containerRef = useRef(null)

  // close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const searchMemory = useCallback(
    debounce((q) => {
      if (!q || q.length < 2) {
        setDropdown([])
        setShowDropdown(false)
        setMemoryMiss(false)
        return
      }

      const lower = q.toLowerCase()
      const matches = allData.filter(l =>
        l.property_name?.toLowerCase().includes(lower)
      ).slice(0, 5)

      if (matches.length > 0) {
        setDropdown(matches)
        setMemoryMiss(false)
      } else {
        setDropdown([])
        setMemoryMiss(true)
      }
      setShowDropdown(true)
    }, 300),
    [allData]
  )

  const handleInput = (e) => {
    const val = e.target.value
    setQuery(val)
    setSearchLabel(null)

    if (!val.trim()) {
      setDropdown([])
      setShowDropdown(false)
      setMemoryMiss(false)
      onClear?.()
      return
    }

    searchMemory(val)
  }

  const handleSearch = async () => {
    const q = query.trim()
    if (!q) return

    // memory had results — filter grid directly
    if (dropdown.length > 0) {
      onSearchResults(dropdown, null)
      setShowDropdown(false)
      return
    }

    // memory miss — hit API
    setLoading(true)
    setShowDropdown(false)

    try {
      // exact first
      const exactRes = await fetch(`/api/search?q=${encodeURIComponent(q)}&mode=exact`)
      const exactData = await exactRes.json()

      if (exactData.data?.length > 0) {
        onSearchResults(exactData.data, `Results for "${q}"`)
        setSearchLabel(`Results for "${q}"`)
        setLoading(false)
        return
      }

      // fuzzy fallback
      const fuzzyRes = await fetch(`/api/search?q=${encodeURIComponent(q)}&mode=fuzzy`)
      const fuzzyData = await fuzzyRes.json()

      if (fuzzyData.data?.length > 0) {
        onSearchResults(fuzzyData.data, `Closest matches for "${q}"`)
        setSearchLabel(`Closest matches for "${q}"`)
      } else {
        onSearchResults([], `No results found for "${q}"`)
        setSearchLabel(`No results found for "${q}"`)
      }
    } catch {
      onSearchResults([], 'Search failed. Try again.')
      setSearchLabel('Search failed. Try again.')
    }

    setLoading(false)
  }

  const handleDropdownSelect = (listing) => {
    setQuery(listing.property_name)
    setShowDropdown(false)
    onSearchResults([listing], null)
  }

  const handleClear = () => {
    setQuery('')
    setDropdown([])
    setShowDropdown(false)
    setMemoryMiss(false)
    setSearchLabel(null)
    onClear?.()
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch()
    if (e.key === 'Escape') {
      setShowDropdown(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div className={styles.searchWrapper} ref={containerRef}>
      <div className={styles.searchBar}>
        {/* search icon */}
        <svg className={styles.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          className={styles.searchInput}
          placeholder="Find Your Next Home..."
          value={query}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (dropdown.length > 0 || memoryMiss) setShowDropdown(true) }}
          autoComplete="off"
          spellCheck={false}
        />

        {query && (
          <button className={styles.searchClear} onClick={handleClear} aria-label="Clear search">
            &#x2715;
          </button>
        )}

        <button
          className={styles.searchButton}
          onClick={handleSearch}
          disabled={loading || !query.trim()}
        >
          {loading ? (
            <span className={styles.searchSpinner} />
          ) : (
            'Search'
          )}
        </button>
      </div>

      {/* dropdown */}
      {showDropdown && (
        <div className={styles.searchDropdown}>
          {dropdown.length > 0 && dropdown.map(item => (
            <button
              key={item.listing_id}
              className={styles.searchDropdownItem}
              onClick={() => handleDropdownSelect(item)}
            >
              <div className={styles.searchDropdownThumb}>
                {item.media?.[0]?.image_url || item.image_url ? (
                  <img
                    src={item.media?.[0]?.image_url ?? item.image_url}
                    alt={item.property_name}
                  />
                ) : (
                  <div className={styles.searchDropdownThumbFallback}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M3 10V20M21 10V20M3 10h18M3 10L12 3l9 7" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </div>
              <div className={styles.searchDropdownInfo}>
                <span className={styles.searchDropdownName}>{item.property_name}</span>
                <span className={styles.searchDropdownMeta}>
                  {item.ward_name}{item.property_price ? ` · KSH ${Number(item.property_price).toLocaleString()}` : ''}
                </span>
              </div>
            </button>
          ))}

          {memoryMiss && dropdown.length === 0 && (
            <div className={styles.searchDropdownHint}>
              No instant results — press Search for similar matches
            </div>
          )}
        </div>
      )}
    </div>
  )
}