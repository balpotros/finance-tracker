import { useState, useEffect, useRef } from 'react';

export default function AutocompleteInput({ value, onChange, suggestions = [], placeholder = '', className = '', ...props }) {
  const [open, setOpen] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const containerRef = useRef(null);

  useEffect(() => {
    if (value && value.length > 0) {
      const lower = value.toLowerCase();
      const matches = suggestions.filter(s =>
        s && s.toLowerCase().startsWith(lower)
      );
      setFiltered(matches);
      setOpen(matches.length > 0);
    } else {
      setFiltered([]);
      setOpen(false);
    }
  }, [value, suggestions]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(s) {
    onChange(s);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
        onFocus={() => {
          if (filtered.length > 0) setOpen(true);
        }}
        autoComplete="off"
        {...props}
      />
      {open && (
        <ul className="absolute z-50 left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
          {filtered.map((s, i) => (
            <li
              key={i}
              onMouseDown={() => handleSelect(s)}
              className="px-3 py-2 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-sm text-gray-800 dark:text-gray-200"
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
