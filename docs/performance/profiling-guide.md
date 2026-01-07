# Node.js Performance Profiling Guide

## Overview

This guide explains how to profile the NutriVault backend to identify and fix performance bottlenecks.

## Profiling Tools

### 1. Node.js Built-in Profiler (`--prof`)

**What it profiles**: CPU usage and function call times

**How to use**:
```bash
# Run server with profiling
node --prof src/server.js

# Generate load (in another terminal)
artillery quick --count 10 --num 100 http://localhost:3001/api/health

# Stop server (Ctrl+C)

# Process the profile
node --prof-process isolate-*.log > cpu-profile.txt
```

**How to read results**:
- Look for functions with high percentage (>5% total)
- Focus on functions you wrote (not Node.js internals)
- Identify synchronous operations in async paths

### 2. Clinic.js Doctor

**What it profiles**: Event loop delays, CPU, memory

**How to use**:
```bash
clinic doctor -- node src/server.js
# Generate load in another terminal
# Stop with Ctrl+C
# Opens HTML report automatically
```

**How to read results**:
- **Event Loop Delay**: Spikes indicate blocking operations
- **CPU Usage**: High usage with low RPS = inefficient code
- **Memory**: Growing trend = memory leak

### 3. Clinic.js Heap

**What it profiles**: Memory allocations and leaks

**How to use**:
```bash
clinic heap -- node src/server.js
# Generate load
# Stop with Ctrl+C
# Opens HTML report
```

**How to read results**:
- Look for objects that grow without bound
- Check for closures holding large objects
- Identify cache misconfigurations

### 4. Automated Script

**Run all profiling tools at once**:
```bash
cd backend
./performance/run-profiling.sh
```

Results saved to `performance/results/profiling/{timestamp}/`

---

## Common Performance Issues

### 1. Synchronous File Operations

**Problem**: `fs.readFileSync()`, `fs.writeFileSync()` block the event loop

**Solution**: Use async versions:
```javascript
// Bad
const data = fs.readFileSync('file.txt', 'utf8');

// Good
const data = await fs.promises.readFile('file.txt', 'utf8');
```

### 2. N+1 Database Queries

**Problem**: Loading related records in a loop

**Example**:
```javascript
// Bad - N+1 queries
const patients = await Patient.findAll();
for (const patient of patients) {
  patient.visits = await Visit.findAll({ where: { patient_id: patient.id } });
}

// Good - Single query with JOIN
const patients = await Patient.findAll({
  include: [{ model: Visit, as: 'visits' }]
});
```

**How to detect**: Profile shows many fast database queries instead of few slow ones

### 3. Large Array Operations

**Problem**: Processing large arrays with synchronous operations

**Example**:
```javascript
// Bad - Blocks event loop
const results = bigArray.map(item => expensiveOperation(item));

// Good - Process in chunks
async function processInChunks(array, chunkSize = 100) {
  const results = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    const chunk = array.slice(i, i + chunkSize);
    results.push(...await Promise.all(chunk.map(item => expensiveOperation(item))));
  }
  return results;
}
```

### 4. Missing Indexes

**Problem**: Full table scans on large tables

**Solution**: Add indexes for commonly queried columns (see TASK-037)

### 5. Inefficient Regex

**Problem**: Complex regex on large strings

**Example**:
```javascript
// Bad - Backtracking can be exponential
const regex = /(a+)+b/;

// Good - Simplify or use string methods
const regex = /a+b/;
```

### 6. JSON Parsing in Hot Path

**Problem**: `JSON.parse()`/`JSON.stringify()` on every request

**Solution**: Cache parsed objects or use streaming parser

### 7. Memory Leaks

**Common causes**:
- Event listeners not removed
- Globals holding references
- Cache without TTL or size limit
- Closures capturing large objects

**How to detect**: Memory usage grows over time in clinic heap

---

## NutriVault-Specific Optimization Targets

Based on application analysis, focus profiling on:

### High-Priority Endpoints

1. **Reports Service** (`/api/reports/*`)
   - Complex aggregation queries
   - Multiple database joins
   - Large data transformations
   - **Target**: < 500ms p95

2. **Patient List** (`/api/patients`)
   - Can return 100+ records
   - Multiple related records (dietitian, visits count)
   - Filtering and sorting
   - **Target**: < 200ms p95

3. **Visit List** (`/api/visits`)
   - Frequent access
   - Date range queries
   - Patient and dietitian joins
   - **Target**: < 200ms p95

4. **Billing List** (`/api/billing`)
   - Financial calculations
   - Status aggregations
   - Invoice generation
   - **Target**: < 200ms p95

### Known Hot Paths

1. **QueryBuilder.js**
   - Dynamic query construction
   - Filter and search logic
   - Pagination logic

2. **Report Service**
   - `generateFinancialReport()` - Aggregates billing data
   - `generatePatientReport()` - Aggregates visit/nutrition data
   - `generateVisitReport()` - Aggregates appointment data

3. **Authentication Middleware**
   - Runs on every protected route
   - JWT verification
   - Database lookup for user

---

## Profiling Workflow

### 1. Establish Baseline

Before optimization, capture current performance:

```bash
# Run baseline load test
./performance/run-load-tests.sh

# Save results
cp performance/results/latest performance/results/baseline
```

### 2. Profile Under Load

Generate realistic load while profiling:

```bash
# Run profiling script
./performance/run-profiling.sh

# Or manually:
node --prof src/server.js &
artillery run load-tests/api-crud.yml
kill %1
node --prof-process isolate-*.log > profile.txt
```

### 3. Analyze Results

**Look for**:
- Functions consuming >5% total time
- Synchronous operations in hot paths
- Unexpected function calls
- Deep call stacks

**Focus on**:
- Application code (not Node.js internals)
- Functions called many times (even if individually fast)
- Functions called on every request

### 4. Optimize

**Strategies**:
1. **Cache**: Add caching for expensive operations (see TASK-030)
2. **Indexes**: Add database indexes for slow queries (see TASK-037)
3. **Async**: Convert synchronous operations to async
4. **Batch**: Process operations in batches
5. **Lazy Load**: Defer non-critical operations
6. **Memoize**: Cache function results

### 5. Validate

After optimization, re-run profiling:

```bash
./performance/run-profiling.sh
./performance/run-load-tests.sh
```

**Compare metrics**:
- Response times (p50, p95, p99)
- RPS (requests per second)
- CPU usage
- Memory usage

**Document**:
- What was optimized
- Why it was slow
- What improved
- Any trade-offs

---

## Interpreting CPU Profile Output

### Sample Output

```
Statistical profiling result from isolate-...log, (12345 ticks, 67 unaccounted, 0 excluded).

[Summary]:
   ticks  total  nonlib   name
    234    1.9%    2.1%  JavaScript
  11987   97.0%   99.1%  C++
    123    1.0%    1.1%  GC
      1    0.0%          Shared libraries
     67    0.5%          Unaccounted

[JavaScript]:
   ticks  parent  name
     89   38.0%  LazyCompile: *generateReport /path/to/report.service.js:45:23
     45   19.2%  LazyCompile: *formatData /path/to/utils.js:12:15
     34   14.5%  LazyCompile: *processResults /path/to/query.js:67:23
```

### What to look for:

1. **High percentage in JavaScript section**: Application code is the bottleneck
2. **High percentage in C++ section**: Native operations (I/O, crypto) dominate
3. **High GC ticks**: Too much memory allocation/deallocation

### Red Flags:

- Single function >10% of total time
- Many small functions adding up to >20%
- GC >2% consistently
- Same function appearing multiple times (called from different places)

---

## Memory Profiling Tips

### Using Clinic.js Heap

1. **Run profile**:
   ```bash
   clinic heap -- node src/server.js
   ```

2. **Generate load** (enough to trigger suspected leak)

3. **Analyze HTML report**:
   - Look for "Detached" objects (memory leaks)
   - Check allocation timeline for growing trends
   - Identify objects with high retained size

### Using Chrome DevTools

1. **Start with inspect**:
   ```bash
   node --inspect src/server.js
   ```

2. **Open Chrome**: `chrome://inspect`

3. **Take heap snapshots**:
   - Before load
   - After load
   - After cleanup
   - Compare snapshots to find leaks

---

## Optimization Checklist

Before considering optimization complete:

- [ ] All endpoints < target response times
- [ ] No function consuming >5% CPU
- [ ] GC < 2% of total time
- [ ] Memory usage stable under load
- [ ] No memory leaks detected
- [ ] Event loop delay < 10ms p95
- [ ] RPS improved by >50%
- [ ] Database query times documented
- [ ] Cache hit rates >60%
- [ ] Optimizations documented in code comments

---

## Next Steps

After profiling:

1. **Document findings** in `docs/performance/profiling-report.md`
2. **Prioritize optimizations** by impact (high CPU% = high priority)
3. **Implement optimizations** one at a time
4. **Re-profile** to validate improvements
5. **Update this guide** with project-specific learnings

---

## References

- [Node.js Profiling Guide](https://nodejs.org/en/docs/guides/simple-profiling/)
- [Clinic.js Documentation](https://clinicjs.org/documentation/)
- [Flame Graphs](http://www.brendangregg.com/flamegraphs.html)
- [V8 Profiler](https://v8.dev/docs/profile)

---

**Created**: 2026-01-07  
**Phase**: 5.4 - TASK-031  
**Status**: Ready for use
