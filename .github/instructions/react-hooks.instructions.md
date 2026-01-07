---
applyTo: '**/frontend/**/*.jsx, **/frontend/**/*.tsx'
description: 'React Hooks Best Practices and Common Patterns'
---

# React Hooks Best Practices

## Core Principles

### 1. Dependency Arrays

**Always include all dependencies used inside the hook:**

```jsx
// ❌ BAD: Missing dependencies
useEffect(() => {
  fetchData(userId);
}, []); // userId is missing!

// ✅ GOOD: All dependencies included
useEffect(() => {
  fetchData(userId);
}, [userId]);
```

**Exception: When using refs or setState callbacks:**

```jsx
// ✅ GOOD: Refs don't need to be in dependencies
const timerRef = useRef(null);
useEffect(() => {
  timerRef.current = setTimeout(() => {}, 1000);
  return () => clearTimeout(timerRef.current);
}, []); // Empty deps is correct here
```

### 2. useCallback and useMemo

**Use useCallback for functions passed to child components:**

```jsx
// ❌ BAD: Function recreated on every render
function Parent() {
  const handleClick = () => {
    // ...
  };
  return <Child onClick={handleClick} />;
}

// ✅ GOOD: Function memoized
function Parent() {
  const handleClick = useCallback(() => {
    // ...
  }, []); // Add dependencies if needed
  return <Child onClick={handleClick} />;
}
```

**Use useMemo for expensive computations:**

```jsx
// ❌ BAD: Expensive calculation on every render
function Component({ items }) {
  const sortedItems = expensiveSort(items);
  return <List items={sortedItems} />;
}

// ✅ GOOD: Memoized calculation
function Component({ items }) {
  const sortedItems = useMemo(() => expensiveSort(items), [items]);
  return <List items={sortedItems} />;
}
```

### 3. useRef for Mutable Values

**Use useRef for values that shouldn't trigger re-renders:**

```jsx
// ❌ BAD: Using state for timer IDs causes unnecessary re-renders
const [timerId, setTimerId] = useState(null);

useEffect(() => {
  const id = setTimeout(() => {}, 1000);
  setTimerId(id); // Triggers re-render!
  return () => clearTimeout(id);
}, []);

// ✅ GOOD: Using ref for timer IDs
const timerRef = useRef(null);

useEffect(() => {
  timerRef.current = setTimeout(() => {}, 1000);
  return () => clearTimeout(timerRef.current);
}, []);
```

### 4. Cleanup Functions

**Always cleanup side effects:**

```jsx
// ❌ BAD: No cleanup for timer
useEffect(() => {
  const timer = setInterval(() => {}, 1000);
}, []);

// ✅ GOOD: Cleanup function provided
useEffect(() => {
  const timer = setInterval(() => {}, 1000);
  return () => clearInterval(timer);
}, []);
```

### 5. Custom Hooks

**Extract reusable logic into custom hooks:**

```jsx
// ✅ GOOD: Reusable custom hook
function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initialValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

// Usage
function Component() {
  const [name, setName] = useLocalStorage('name', '');
  return <input value={name} onChange={(e) => setName(e.target.value)} />;
}
```

## Common Patterns

### 1. Data Fetching

```jsx
function useDataFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        const response = await fetch(url);
        const result = await response.json();
        
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true; // Prevent state updates on unmounted component
    };
  }, [url]);

  return { data, loading, error };
}
```

### 2. Debouncing

```jsx
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Usage
function SearchComponent() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  useEffect(() => {
    if (debouncedSearchTerm) {
      // Perform search
    }
  }, [debouncedSearchTerm]);

  return <input onChange={(e) => setSearchTerm(e.target.value)} />;
}
```

### 3. Previous Value

```jsx
function usePrevious(value) {
  const ref = useRef();
  
  useEffect(() => {
    ref.current = value;
  }, [value]);
  
  return ref.current;
}

// Usage
function Component({ count }) {
  const prevCount = usePrevious(count);
  
  return (
    <div>
      <p>Current: {count}</p>
      <p>Previous: {prevCount}</p>
    </div>
  );
}
```

## Anti-Patterns to Avoid

### 1. Avoid Setting State in Render

```jsx
// ❌ BAD: Setting state during render
function Component({ value }) {
  const [state, setState] = useState(value);
  setState(value); // Causes infinite loop!
  return <div>{state}</div>;
}

// ✅ GOOD: Use useEffect or derived state
function Component({ value }) {
  const [state, setState] = useState(value);
  
  useEffect(() => {
    setState(value);
  }, [value]);
  
  return <div>{state}</div>;
}

// ✅ BETTER: Use derived state if possible
function Component({ value }) {
  const derivedValue = computeDerivedValue(value);
  return <div>{derivedValue}</div>;
}
```

### 2. Avoid Stale Closures

```jsx
// ❌ BAD: Stale closure issue
function Component() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCount(count + 1); // count is always 0!
    }, 1000);
    return () => clearInterval(timer);
  }, []);

// ✅ GOOD: Use functional update
function Component() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCount(prev => prev + 1); // Uses latest value
    }, 1000);
    return () => clearInterval(timer);
  }, []);
}
```

### 3. Avoid Unnecessary useEffect

```jsx
// ❌ BAD: Unnecessary useEffect
function Component({ items }) {
  const [filteredItems, setFilteredItems] = useState([]);
  
  useEffect(() => {
    setFilteredItems(items.filter(item => item.active));
  }, [items]);
  
  return <List items={filteredItems} />;
}

// ✅ GOOD: Calculate during render
function Component({ items }) {
  const filteredItems = items.filter(item => item.active);
  return <List items={filteredItems} />;
}

// ✅ GOOD: Use useMemo if expensive
function Component({ items }) {
  const filteredItems = useMemo(
    () => items.filter(item => item.active),
    [items]
  );
  return <List items={filteredItems} />;
}
```

## Performance Optimization

### 1. Lazy Initialization

```jsx
// ❌ BAD: Expensive operation on every render
const [state, setState] = useState(expensiveOperation());

// ✅ GOOD: Lazy initialization (runs only once)
const [state, setState] = useState(() => expensiveOperation());
```

### 2. Avoid Inline Functions in JSX

```jsx
// ❌ BAD: New function on every render
<button onClick={() => handleClick(id)}>Click</button>

// ✅ GOOD: Use useCallback
const handleClickWithId = useCallback(() => {
  handleClick(id);
}, [id]);

<button onClick={handleClickWithId}>Click</button>

// ✅ ALTERNATIVE: Use event parameter
const handleClick = useCallback((e) => {
  const id = e.target.dataset.id;
  // handle click
}, []);

<button data-id={id} onClick={handleClick}>Click</button>
```

## Testing Hooks

```jsx
import { renderHook, act } from '@testing-library/react';

test('useCounter increments', () => {
  const { result } = renderHook(() => useCounter());
  
  act(() => {
    result.current.increment();
  });
  
  expect(result.current.count).toBe(1);
});
```

## References

- [React Hooks Documentation](https://react.dev/reference/react)
- [Rules of Hooks](https://react.dev/warnings/invalid-hook-call-warning)
- [useEffect Complete Guide](https://overreacted.io/a-complete-guide-to-useeffect/)
