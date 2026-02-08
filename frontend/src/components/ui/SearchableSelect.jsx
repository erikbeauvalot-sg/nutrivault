/**
 * SearchableSelect Component
 * Lightweight searchable dropdown that replaces Form.Select for large lists.
 * Keyboard accessible, themed for solarpunk design system.
 *
 * Props:
 *  - options        — array of { value, label, subtitle? }
 *  - value          — currently selected value
 *  - onChange        — (value) => void
 *  - placeholder     — placeholder when nothing selected
 *  - searchPlaceholder — placeholder for the search input
 *  - disabled        — disable the component
 *  - required        — for form validation
 *  - name            — input name for form submission
 *  - noResultsText   — text when search yields no results
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import './SearchableSelect.css';

const SearchableSelect = ({
  options = [],
  value,
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  disabled = false,
  required = false,
  name,
  noResultsText = 'No results found',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);

  const selectedOption = options.find(o => String(o.value) === String(value));

  const filtered = search.trim()
    ? options.filter(o => {
        const term = search.toLowerCase();
        return o.label.toLowerCase().includes(term) ||
               (o.subtitle && o.subtitle.toLowerCase().includes(term));
      })
    : options;

  // Reset highlight when filtered list changes
  useEffect(() => {
    setHighlightIndex(0);
  }, [search]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const el = listRef.current.children[highlightIndex];
      if (el) {
        el.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightIndex, isOpen]);

  const handleSelect = useCallback((optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearch('');
  }, [onChange]);

  const handleClear = useCallback((e) => {
    e.stopPropagation();
    onChange('');
    setSearch('');
  }, [onChange]);

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex(prev => Math.min(prev + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filtered[highlightIndex]) {
          handleSelect(filtered[highlightIndex].value);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearch('');
        break;
      default:
        break;
    }
  };

  const toggleOpen = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
    if (!isOpen) setSearch('');
  };

  return (
    <div
      className={`nv-searchable-select ${isOpen ? 'nv-searchable-select--open' : ''} ${disabled ? 'nv-searchable-select--disabled' : ''}`}
      ref={containerRef}
      onKeyDown={handleKeyDown}
    >
      {/* Hidden input for form validation */}
      {name && (
        <input type="hidden" name={name} value={value || ''} required={required} />
      )}

      {/* Trigger */}
      <div
        className="nv-searchable-select__trigger"
        onClick={toggleOpen}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        tabIndex={disabled ? -1 : 0}
      >
        <span className={`nv-searchable-select__value ${!selectedOption ? 'nv-searchable-select__value--placeholder' : ''}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="nv-searchable-select__icons">
          {value && !disabled && (
            <button
              type="button"
              className="nv-searchable-select__clear"
              onClick={handleClear}
              aria-label="Clear selection"
              tabIndex={-1}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M10 4L4 10M4 4l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          )}
          <span className="nv-searchable-select__chevron">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3.5 5.25L7 8.75l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="nv-searchable-select__dropdown">
          <div className="nv-searchable-select__search-wrap">
            <svg className="nv-searchable-select__search-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              className="nv-searchable-select__search"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
            />
          </div>

          <ul className="nv-searchable-select__list" ref={listRef} role="listbox">
            {filtered.length === 0 ? (
              <li className="nv-searchable-select__no-results">{noResultsText}</li>
            ) : (
              filtered.map((option, idx) => (
                <li
                  key={option.value}
                  className={`nv-searchable-select__option ${
                    String(option.value) === String(value) ? 'nv-searchable-select__option--selected' : ''
                  } ${idx === highlightIndex ? 'nv-searchable-select__option--highlighted' : ''}`}
                  onClick={() => handleSelect(option.value)}
                  role="option"
                  aria-selected={String(option.value) === String(value)}
                >
                  <span className="nv-searchable-select__option-label">{option.label}</span>
                  {option.subtitle && (
                    <span className="nv-searchable-select__option-subtitle">{option.subtitle}</span>
                  )}
                  {String(option.value) === String(value) && (
                    <svg className="nv-searchable-select__check" width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 7l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
