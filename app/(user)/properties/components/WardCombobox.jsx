'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import styles from '../css/wardCombobox.module.css';

export default function WardCombobox({ wards, selectedWardId, onSelect }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => setMounted(true), []);

  const selectedWard = wards.find(w => w.ward_id === selectedWardId);
  const selectedName = selectedWard?.ward_name ?? '';

  const filtered = useMemo(() => {
    if (!query) return wards;
    const lower = query.toLowerCase();
    return wards.filter(w => w.ward_name.toLowerCase().includes(lower));
  }, [wards, query]);

  const allOptions = [{ ward_id: null, ward_name: 'All Wards' }, ...filtered];

  const updateCoords = () => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setCoords({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  };

  useEffect(() => {
    if (!open) return;
    updateCoords();
    window.addEventListener('scroll', updateCoords, true);
    window.addEventListener('resize', updateCoords);
    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [open]);

  // Close on outside click — checks both the input container and the portaled dropdown
  useEffect(() => {
    const handler = (e) => {
      const inInput = containerRef.current?.contains(e.target);
      const inDropdown = dropdownRef.current?.contains(e.target);
      if (!inInput && !inDropdown) {
        setOpen(false);
        setQuery('');
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [filtered]);

  useEffect(() => {
    if (highlightedIndex < 0 || !open || !dropdownRef.current) return;
    const option = dropdownRef.current.children[highlightedIndex];
    if (option) option.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, open]);

  const handleSelect = (wardId) => {
    onSelect?.(wardId);
    setOpen(false);
    setQuery('');
    setHighlightedIndex(-1);
    inputRef.current?.blur();
  };

  const handleFocus = () => {
    setOpen(true);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      setHighlightedIndex(prev => Math.min(prev + 1, allOptions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < allOptions.length) {
        handleSelect(allOptions[highlightedIndex].ward_id);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
      setHighlightedIndex(-1);
      inputRef.current?.blur();
    }
  };

  const displayValue = open ? query : selectedName;
  const placeholder = selectedWardId ? selectedName : 'All Wards';

  const dropdownEl = open && (
    <div
      ref={dropdownRef}
      className={styles.dropdown}
      style={{ position: 'fixed', top: coords.top, left: coords.left, width: coords.width }}
    >
      {allOptions.map((option, index) => (
        <button
          key={option.ward_id ?? 'all'}
          className={`${styles.option} ${option.ward_id === selectedWardId ? styles.optionActive : ''} ${index === highlightedIndex ? styles.optionHover : ''}`}
          onClick={() => handleSelect(option.ward_id)}
        >
          {option.ward_name}
        </button>
      ))}
      {filtered.length === 0 && (
        <div className={styles.emptyState}>No wards found</div>
      )}
    </div>
  );

  return (
    <div className={styles.combobox} ref={containerRef}>
      <input
        ref={inputRef}
        type="text"
        className={styles.input}
        placeholder={placeholder}
        value={displayValue}
        onChange={e => {
          setQuery(e.target.value);
          setOpen(true);
          setHighlightedIndex(-1);
        }}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        spellCheck={false}
      />
      {selectedWardId && !open && (
        <button
          className={styles.clearBtn}
          onClick={() => handleSelect(null)}
          aria-label="Clear ward filter"
        >
          &#x2715;
        </button>
      )}
      {mounted && dropdownEl && createPortal(dropdownEl, document.body)}
    </div>
  );
}