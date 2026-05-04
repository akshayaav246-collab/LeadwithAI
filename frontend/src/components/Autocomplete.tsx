import { useState, useRef, useEffect, ChangeEvent, KeyboardEvent } from 'react';

interface AutocompleteProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  options?: string[]; // Static options
  fetchOptions?: (query: string) => Promise<string[]>; // Async options
  required?: boolean;
}

export function Autocomplete({ id, value, onChange, placeholder, options, fetchOptions, required }: AutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  // Initialize and filter static options if no fetchOptions is provided
  useEffect(() => {
    if (options && !fetchOptions) {
      if (!value) {
        setFilteredOptions(options);
      } else {
        const lowerValue = value.toLowerCase();
        setFilteredOptions(options.filter(opt => opt.toLowerCase().includes(lowerValue)));
      }
    }
  }, [value, options, fetchOptions]);

  // Handle async fetching
  useEffect(() => {
    if (fetchOptions && isOpen) {
      let isMounted = true;
      setLoading(true);
      fetchOptions(value).then(res => {
        if (isMounted) {
          setFilteredOptions(res);
          setLoading(false);
        }
      }).catch(() => {
        if (isMounted) setLoading(false);
      });
      return () => { isMounted = false; };
    }
  }, [value, isOpen, fetchOptions]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setIsOpen(true);
  };

  const handleOptionClick = (opt: string) => {
    onChange(opt);
    setIsOpen(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      setIsOpen(true);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="autocomplete-wrapper" ref={wrapperRef}>
      <input
        id={id}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        className="autocomplete-input"
      />
      <div className="autocomplete-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>

      {isOpen && (
        <ul className="autocomplete-list">
          {loading ? (
            <li className="autocomplete-loading">Loading...</li>
          ) : filteredOptions.length > 0 ? (
            filteredOptions.map((opt, index) => (
              <li 
                key={index} 
                className="autocomplete-item" 
                onClick={() => handleOptionClick(opt)}
              >
                {opt}
              </li>
            ))
          ) : (
            <li className="autocomplete-empty">No matching options found</li>
          )}
        </ul>
      )}
    </div>
  );
}
