---
description: 'Performance optimization for frontend, backend, database queries, caching strategies, algorithm efficiency, and memory management'
applyTo: '**/*.{py,js,ts,jsx,tsx,java,cs,go,sql}'
---

# Performance Best Practices

## Overview
Performance optimization is crucial for user experience and system scalability. This document outlines key performance practices across different areas, following Clean Code principles of writing efficient, maintainable code.

## Frontend Performance

### Loading Performance

#### Code Splitting
```javascript
// Good: Lazy load routes
const Home = lazy(() => import('./pages/Home'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </Suspense>
  );
}

// Bad: Import everything upfront
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
```

#### Bundle Optimization
```javascript
// webpack.config.js
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10
        },
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true
        }
      }
    }
  }
};
```

#### Image Optimization
```javascript
// Good: Responsive images
<img
  src="image-800.jpg"
  srcSet="
    image-400.jpg 400w,
    image-800.jpg 800w,
    image-1200.jpg 1200w
  "
  sizes="(max-width: 600px) 400px, (max-width: 900px) 800px, 1200px"
  alt="Description"
  loading="lazy"
/>

// Good: Next.js Image component
import Image from 'next/image';

<Image
  src="/image.jpg"
  alt="Description"
  width={800}
  height={600}
  placeholder="blur"
/>
```

### Rendering Performance

#### React Performance Optimization
```javascript
// Good: Memoization
const ExpensiveComponent = memo(({ data }) => {
  return <div>{/* Complex rendering */}</div>;
});

// Good: useMemo for expensive calculations
function ProductList({ products, filters }) {
  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      filters.every(f => f.check(p))
    );
  }, [products, filters]);
  
  return <div>{/* Render filtered products */}</div>;
}

// Good: useCallback for stable function references
function Parent() {
  const handleClick = useCallback((id) => {
    // Handle click
  }, []); // Stable reference
  
  return <Child onClick={handleClick} />;
}

// Bad: Creating new functions on every render
function Parent() {
  return <Child onClick={(id) => handleClick(id)} />; // New function each render
}
```

#### Virtual Scrolling
```javascript
// Good: Virtualize long lists
import { FixedSizeList } from 'react-window';

function LargeList({ items }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      {items[index].name}
    </div>
  );
  
  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={50}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
}

// Bad: Rendering all items
function LargeList({ items }) {
  return (
    <div>
      {items.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
}
```

### Network Performance

#### API Request Optimization
```javascript
// Good: Batch requests
async function loadDashboardData() {
  const [users, posts, comments] = await Promise.all([
    fetch('/api/users'),
    fetch('/api/posts'),
    fetch('/api/comments')
  ]);
  
  return { users, posts, comments };
}

// Bad: Sequential requests
async function loadDashboardData() {
  const users = await fetch('/api/users');
  const posts = await fetch('/api/posts');
  const comments = await fetch('/api/comments');
  
  return { users, posts, comments };
}
```

#### Caching Strategies
```javascript
// Good: Cache API responses
const cache = new Map();

async function fetchWithCache(url, ttl = 60000) {
  const cached = cache.get(url);
  
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }
  
  const data = await fetch(url).then(r => r.json());
  cache.set(url, { data, timestamp: Date.now() });
  
  return data;
}

// Good: HTTP caching headers
res.set({
  'Cache-Control': 'public, max-age=3600',
  'ETag': generateETag(data)
});
```

#### Compression
```javascript
// Good: Enable compression
const compression = require('compression');

app.use(compression({
  level: 6, // Balance between compression and CPU
  threshold: 1024, // Only compress if > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));
```

## Backend Performance

### Database Optimization

#### Query Optimization
```javascript
// Good: Selective fields
const users = await User.find()
  .select('id name email')
  .limit(100);

// Good: Proper indexing
db.users.createIndex({ email: 1 }, { unique: true });
db.orders.createIndex({ userId: 1, createdAt: -1 });

// Good: Eager loading (avoid N+1)
const users = await User.findAll({
  include: [{
    model: Order,
    where: { status: 'pending' }
  }]
});

// Bad: N+1 queries
const users = await User.findAll();
for (const user of users) {
  user.orders = await Order.findAll({
    where: { userId: user.id }
  });
}
```

#### Database Connection Pooling
```javascript
// Good: Connection pooling
const pool = new Pool({
  host: 'localhost',
  database: 'mydb',
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Use pool for queries
const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
```

#### Pagination
```javascript
// Good: Cursor-based pagination (scalable)
async function getUsers(cursor, limit = 20) {
  const query = {
    limit: limit + 1, // Fetch one extra to check if there's more
  };
  
  if (cursor) {
    query.where = { id: { $gt: cursor } };
  }
  
  const users = await User.find(query).sort({ id: 1 });
  
  const hasMore = users.length > limit;
  const items = hasMore ? users.slice(0, limit) : users;
  const nextCursor = hasMore ? items[items.length - 1].id : null;
  
  return { items, nextCursor, hasMore };
}

// Acceptable: Offset pagination (for small datasets)
async function getUsers(page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  
  const [users, total] = await Promise.all([
    User.find().skip(offset).limit(limit),
    User.countDocuments()
  ]);
  
  return {
    users,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
}
```

### Caching

#### Application-Level Caching
```javascript
// Good: Redis caching
const redis = require('redis');
const client = redis.createClient();

async function getCachedUser(userId) {
  const cacheKey = `user:${userId}`;
  
  // Try cache first
  const cached = await client.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Cache miss - fetch from database
  const user = await User.findById(userId);
  
  // Cache for 1 hour
  await client.setex(cacheKey, 3600, JSON.stringify(user));
  
  return user;
}

// Cache invalidation
async function updateUser(userId, data) {
  const user = await User.findByIdAndUpdate(userId, data);
  
  // Invalidate cache
  await client.del(`user:${userId}`);
  
  return user;
}
```

#### HTTP Caching
```javascript
// Good: ETag-based caching
app.get('/api/data', async (req, res) => {
  const data = await getData();
  const etag = generateETag(data);
  
  // Check if client has current version
  if (req.headers['if-none-match'] === etag) {
    return res.status(304).end();
  }
  
  res.set('ETag', etag);
  res.set('Cache-Control', 'public, max-age=300');
  res.json(data);
});
```

### Asynchronous Processing

#### Background Jobs
```javascript
// Good: Move heavy processing to background
const Queue = require('bull');
const emailQueue = new Queue('email');

// Add job to queue
app.post('/api/register', async (req, res) => {
  const user = await User.create(req.body);
  
  // Don't wait for email to send
  await emailQueue.add({
    to: user.email,
    subject: 'Welcome!',
    template: 'welcome'
  });
  
  res.json({ success: true, userId: user.id });
});

// Process jobs asynchronously
emailQueue.process(async (job) => {
  await sendEmail(job.data);
});
```

#### Streaming
```javascript
// Good: Stream large responses
app.get('/api/large-data', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.write('[');
  
  const stream = User.find().cursor();
  let first = true;
  
  stream.on('data', (user) => {
    if (!first) res.write(',');
    res.write(JSON.stringify(user));
    first = false;
  });
  
  stream.on('end', () => {
    res.write(']');
    res.end();
  });
});

// Bad: Load everything into memory
app.get('/api/large-data', async (req, res) => {
  const users = await User.find(); // Loads all users into memory
  res.json(users);
});
```

## Algorithm Optimization

### Time Complexity
```javascript
// Good: O(1) lookup with Map
const userMap = new Map(users.map(u => [u.id, u]));
const user = userMap.get(userId); // O(1)

// Bad: O(n) lookup with Array
const user = users.find(u => u.id === userId); // O(n)

// Good: O(n log n) sort when necessary
const sorted = [...items].sort((a, b) => a.value - b.value);

// Bad: Sorting inside loops
for (let i = 0; i < data.length; i++) {
  const sorted = data.sort(); // O(n² log n) overall
  // Process sorted
}
```

### Space Complexity
```javascript
// Good: In-place operations
function reverseArray(arr) {
  let left = 0;
  let right = arr.length - 1;
  
  while (left < right) {
    [arr[left], arr[right]] = [arr[right], arr[left]];
    left++;
    right--;
  }
  
  return arr; // O(1) space
}

// Bad: Creating new arrays
function reverseArray(arr) {
  return arr.slice().reverse(); // O(n) space
}
```

## Memory Management

### Avoid Memory Leaks
```javascript
// Good: Cleanup event listeners
class Component {
  constructor() {
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);
  }
  
  destroy() {
    window.removeEventListener('resize', this.handleResize);
  }
}

// Good: Clear timers
const timerId = setInterval(() => {
  // Do something
}, 1000);

// Later...
clearInterval(timerId);

// Good: Close database connections
const connection = await database.connect();
try {
  // Use connection
} finally {
  await connection.close();
}
```

### Efficient Data Structures
```javascript
// Good: Use Set for uniqueness checks
const uniqueIds = new Set(users.map(u => u.id));
if (uniqueIds.has(newId)) {
  // Handle duplicate
}

// Bad: Array includes
const uniqueIds = users.map(u => u.id);
if (uniqueIds.includes(newId)) { // O(n) lookup
  // Handle duplicate
}

// Good: Use WeakMap for metadata
const metadata = new WeakMap();
metadata.set(object, { created: Date.now() });
// Automatically cleaned when object is garbage collected

// Bad: Regular Map (prevents garbage collection)
const metadata = new Map();
metadata.set(object, { created: Date.now() });
```

## Monitoring & Profiling

### Performance Monitoring
```javascript
// Good: Measure performance
const startTime = performance.now();
await expensiveOperation();
const duration = performance.now() - startTime;

logger.info('Operation completed', {
  operation: 'expensiveOperation',
  duration: `${duration.toFixed(2)}ms`
});

// Good: APM integration
const apm = require('elastic-apm-node').start({
  serviceName: 'my-service',
  serverUrl: process.env.APM_SERVER_URL
});

app.get('/api/endpoint', async (req, res) => {
  const span = apm.startSpan('database-query');
  const result = await database.query();
  span.end();
  
  res.json(result);
});
```

### Performance Budgets
```javascript
// Set performance budgets in testing
describe('Performance', () => {
  it('should load page in under 2 seconds', async () => {
    const start = Date.now();
    await loadPage();
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(2000);
  });
  
  it('should handle 100 items efficiently', () => {
    const start = performance.now();
    processItems(100);
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(100); // 1ms per item
  });
});
```

## Performance Checklist

### Frontend
- [ ] Code splitting implemented
- [ ] Images optimized and lazy loaded
- [ ] Bundle size monitored
- [ ] Unnecessary re-renders eliminated
- [ ] Virtual scrolling for long lists
- [ ] HTTP caching configured
- [ ] Compression enabled

### Backend
- [ ] Database queries optimized
- [ ] Proper indexes in place
- [ ] N+1 queries eliminated
- [ ] Connection pooling configured
- [ ] Caching strategy implemented
- [ ] Background jobs for heavy tasks
- [ ] Rate limiting in place

### Database
- [ ] Queries analyzed with EXPLAIN
- [ ] Indexes on foreign keys
- [ ] Pagination implemented
- [ ] Query result caching
- [ ] Connection pooling

### General
- [ ] Performance monitoring in place
- [ ] Regular performance audits
- [ ] Performance budgets set
- [ ] Bottlenecks identified and addressed

## Resources

- [Web Vitals](https://web.dev/vitals/)
- [Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance)
- [Database Performance](https://use-the-index-luke.com/)
- [React Performance](https://react.dev/learn/render-and-commit)
