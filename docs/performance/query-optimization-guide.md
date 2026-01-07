# Database Query Optimization Guide

## Overview

This guide provides strategies and patterns for optimizing Sequelize queries in the NutriVault application.

## Phase 5.4 - TASK-028: Database Query Optimization

**Goal**: Reduce database query time by 50-80% through:
- Eliminating N+1 queries
- Adding proper eager loading
- Using selective field fetching
- Implementing query result caching
- Optimizing complex aggregations

---

## Quick Wins

### 1. Enable Query Logging

Always log queries during development to spot N+1 problems:

```javascript
// config/database.js
development: {
  dialect: 'sqlite',
  logging: console.log,  // Enable to see all queries
  benchmark: true,       // Show query execution time
}
```

### 2. Use EXPLAIN ANALYZE

Before optimizing, understand query execution:

```javascript
// Run query with explain
const result = await Patient.findAll({
  ...options,
  logging: (sql, timing) => {
    console.log('Query:', sql);
    console.log('Time:', timing, 'ms');
  },
  benchmark: true
});

// Or manually in SQLite
db.query('EXPLAIN QUERY PLAN SELECT * FROM patients WHERE assigned_dietitian_id = ?');
```

---

## N+1 Query Problems

### Problem: Sequential Database Calls

**Bad Example** (N+1 queries):
```javascript
// 1 query to get patients
const patients = await Patient.findAll();

// N queries (one per patient) to get visits
for (const patient of patients) {
  patient.visits = await Visit.findAll({ 
    where: { patient_id: patient.id } 
  });
}
// Total: 1 + N queries
```

### Solution: Eager Loading with `include`

**Good Example** (2 queries):
```javascript
const patients = await Patient.findAll({
  include: [{
    model: Visit,
    as: 'visits',
    required: false  // LEFT JOIN (includes patients with no visits)
  }]
});
// Total: 1-2 queries (1 for patients, 1 for all visits via JOIN)
```

### Solution: Separate Queries

**Alternative** (2 queries, more control):
```javascript
// Get all patients
const patients = await Patient.findAll();
const patientIds = patients.map(p => p.id);

// Get all visits for these patients in one query
const visits = await Visit.findAll({
  where: { patient_id: { [Op.in]: patientIds } }
});

// Group visits by patient
const visitsByPatient = visits.reduce((acc, visit) => {
  if (!acc[visit.patient_id]) acc[visit.patient_id] = [];
  acc[visit.patient_id].push(visit);
  return acc;
}, {});

// Attach visits to patients
patients.forEach(patient => {
  patient.visits = visitsByPatient[patient.id] || [];
});

// Total: 2 queries
```

---

## Eager Loading Patterns

### Basic Eager Loading

```javascript
// Load patient with related records
const patient = await Patient.findByPk(id, {
  include: [
    { model: User, as: 'dietitian' },
    { model: Visit, as: 'visits' },
    { model: Billing, as: 'billingRecords' }
  ]
});
```

### Nested Eager Loading

```javascript
// Load patient with visits AND each visit's notes
const patient = await Patient.findByPk(id, {
  include: [{
    model: Visit,
    as: 'visits',
    include: [{
      model: VisitNote,
      as: 'notes'
    }]
  }]
});
```

### Conditional Eager Loading

```javascript
// Only load visits from last 30 days
const patient = await Patient.findByPk(id, {
  include: [{
    model: Visit,
    as: 'visits',
    where: {
      visit_date: {
        [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      }
    },
    required: false  // IMPORTANT: don't filter out patients without recent visits
  }]
});
```

### Selective Field Loading

**Only load fields you need**:

```javascript
// Bad - loads all fields
const patients = await Patient.findAll();

// Good - only loads needed fields
const patients = await Patient.findAll({
  attributes: ['id', 'first_name', 'last_name', 'email']
});

// Good - exclude large fields
const patients = await Patient.findAll({
  attributes: { exclude: ['notes', 'medical_history'] }
});
```

### Aggregate with Eager Loading

```javascript
// Get patients with visit count
const patients = await Patient.findAll({
  attributes: {
    include: [
      [
        sequelize.fn('COUNT', sequelize.col('visits.id')),
        'visit_count'
      ]
    ]
  },
  include: [{
    model: Visit,
    as: 'visits',
    attributes: [],  // Don't include visit data, just count
    required: false
  }],
  group: ['Patient.id']
});
```

---

## QueryBuilder Optimization

### Current Implementation Analysis

The `QueryBuilder` class in `src/services/query-builder.js` handles dynamic filtering and search. Potential optimizations:

#### 1. Limit Default Page Size

```javascript
// Bad - no default limit
buildQuery(filters) {
  const query = { where: {}, limit: filters.limit };
  // ...
}

// Good - reasonable default
buildQuery(filters) {
  const query = { 
    where: {}, 
    limit: Math.min(filters.limit || 50, 100)  // Default 50, max 100
  };
  // ...
}
```

#### 2. Use Proper Indexes

Ensure filters use indexed columns (see TASK-037):

```javascript
// If filtering by these fields, they should be indexed:
- patient_id
- dietitian_id
- visit_date
- invoice_date
- created_at
```

#### 3. Optimize Text Search

```javascript
// Bad - slow LIKE on large text fields
where: {
  notes: { [Op.like]: `%${search}%` }
}

// Better - use full-text search or limit to indexed fields
where: {
  [Op.or]: [
    { first_name: { [Op.like]: `${search}%` } },  // Prefix search can use index
    { last_name: { [Op.like]: `${search}%` } },
    { email: { [Op.like]: `${search}%` } }
  ]
}

// Best - full-text search (PostgreSQL)
where: {
  [Op.and]: [
    sequelize.literal(`to_tsvector('english', first_name || ' ' || last_name) @@ plainto_tsquery('english', '${search}')`)
  ]
}
```

---

## Report Service Optimization

### Problem: Complex Aggregations

Report generation involves multiple aggregations and calculations. Optimize by:

#### 1. Use Database Aggregations

**Bad** (fetch all records, aggregate in JS):
```javascript
async generateFinancialReport(startDate, endDate) {
  const billings = await Billing.findAll({
    where: {
      invoice_date: { [Op.between]: [startDate, endDate] }
    }
  });
  
  const totalRevenue = billings.reduce((sum, b) => sum + b.amount, 0);
  const paidCount = billings.filter(b => b.status === 'paid').length;
  // ...
}
```

**Good** (aggregate in database):
```javascript
async generateFinancialReport(startDate, endDate) {
  const stats = await Billing.findOne({
    where: {
      invoice_date: { [Op.between]: [startDate, endDate] }
    },
    attributes: [
      [sequelize.fn('SUM', sequelize.col('amount')), 'total_revenue'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'total_count'],
      [
        sequelize.fn('SUM', 
          sequelize.literal("CASE WHEN status = 'paid' THEN 1 ELSE 0 END")
        ),
        'paid_count'
      ]
    ],
    raw: true
  });
  
  return stats;
}
```

#### 2. Cache Report Results

```javascript
const { cacheMiddleware } = require('../middleware/cache');

// Reports are slow but don't change often
router.get('/reports/financial', 
  authenticate,
  cacheMiddleware('long'),  // 5 min cache
  reportController.getFinancialReport
);
```

#### 3. Paginate Large Result Sets

```javascript
// Bad - returns all records
async generatePatientReport() {
  const patients = await Patient.findAll({
    include: ['visits', 'billingRecords']
  });
  return patients;
}

// Good - paginated
async generatePatientReport(page = 1, limit = 50) {
  const offset = (page - 1) * limit;
  const result = await Patient.findAndCountAll({
    include: ['visits', 'billingRecords'],
    limit,
    offset
  });
  
  return {
    patients: result.rows,
    total: result.count,
    pages: Math.ceil(result.count / limit),
    currentPage: page
  };
}
```

---

## Batch Operations

### Problem: Multiple Individual Writes

**Bad**:
```javascript
for (const patient of patients) {
  await Patient.update({ status: 'active' }, { 
    where: { id: patient.id } 
  });
}
// N database queries
```

**Good**:
```javascript
const patientIds = patients.map(p => p.id);
await Patient.update(
  { status: 'active' },
  { where: { id: { [Op.in]: patientIds } } }
);
// 1 database query
```

### Bulk Create

**Good**:
```javascript
await Visit.bulkCreate([
  { patient_id: 1, visit_date: '2026-01-01', ... },
  { patient_id: 2, visit_date: '2026-01-02', ... },
  // ...
], {
  validate: true,  // Still validate each record
  individualHooks: false  // Skip hooks for performance
});
```

---

## Transaction Optimization

### Use Transactions for Consistency

```javascript
await sequelize.transaction(async (t) => {
  const billing = await Billing.create({
    patient_id: patientId,
    amount: 100
  }, { transaction: t });
  
  await Payment.create({
    billing_id: billing.id,
    amount: 100,
    method: 'credit_card'
  }, { transaction: t });
  
  await Patient.increment('balance', { 
    by: 100,
    where: { id: patientId },
    transaction: t
  });
});
```

### Avoid Long Transactions

```javascript
// Bad - holds transaction open during external API call
await sequelize.transaction(async (t) => {
  const billing = await Billing.create({ ... }, { transaction: t });
  await sendInvoiceEmail(billing);  // External API - slow!
  await Billing.update({ sent: true }, { where: { id: billing.id }, transaction: t });
});

// Good - release transaction before external call
const billing = await sequelize.transaction(async (t) => {
  return await Billing.create({ ... }, { transaction: t });
});

await sendInvoiceEmail(billing);  // No transaction held

await Billing.update({ sent: true }, { where: { id: billing.id } });
```

---

## Connection Pooling (TASK-038)

Already optimized in `config/database.optimized.js`. Key settings:

```javascript
pool: {
  max: 10,        // Max connections
  min: 2,         // Min idle connections
  acquire: 30000, // Timeout to acquire connection
  idle: 10000     // Max idle time before release
}
```

**Monitor pool usage**:
```javascript
const pool = sequelize.connectionManager.pool;
console.log({
  size: pool.size,      // Total connections
  available: pool.available,  // Available connections
  using: pool.using,    // In-use connections
  waiting: pool.waiting // Queued requests
});
```

---

## Caching Strategy (TASK-030)

Cache results of expensive queries. See `CACHING_IMPLEMENTATION_GUIDE.md`.

**Example**:
```javascript
// Expensive aggregation - cache for 5 minutes
router.get('/reports/monthly-summary',
  authenticate,
  cacheMiddleware('long'),
  async (req, res) => {
    const summary = await generateMonthlySummary();
    res.json(summary);
  }
);

// Invalidate cache when data changes
async function createBilling(data) {
  const billing = await Billing.create(data);
  await invalidateBillingCache(billing.id, billing.patient_id);
  return billing;
}
```

---

## Optimization Checklist

Before considering query optimization complete:

- [ ] All list endpoints use pagination (max 100 records)
- [ ] No N+1 queries (check with query logging)
- [ ] Eager loading used for all related records
- [ ] Only necessary fields selected (`attributes`)
- [ ] Indexes exist for all WHERE/JOIN clauses
- [ ] Aggregations done in database, not in JavaScript
- [ ] Large text searches use indexed fields or full-text search
- [ ] Report endpoints cached for 1-5 minutes
- [ ] Batch operations used instead of loops
- [ ] Transactions kept short (< 100ms)
- [ ] Connection pool properly configured
- [ ] Query times logged for slow query detection

---

## Monitoring Slow Queries

### Add Query Time Logging

```javascript
// middleware/query-logger.js
module.exports = (sequelize) => {
  sequelize.addHook('afterQuery', (options, query) => {
    if (options.benchmark) {
      const time = query.executionTime || 0;
      if (time > 100) {  // Log queries > 100ms
        console.warn(`Slow query (${time}ms):`, options.sql);
      }
    }
  });
};
```

### Create Slow Query Dashboard

```javascript
// Track slow queries
const slowQueries = [];

router.get('/api/admin/slow-queries', authenticate, requireRole('ADMIN'), (req, res) => {
  res.json({
    count: slowQueries.length,
    queries: slowQueries.slice(-50)  // Last 50 slow queries
  });
});
```

---

## Testing Query Performance

### Unit Test with Query Counting

```javascript
describe('Patient List', () => {
  it('should use eager loading (max 2 queries)', async () => {
    let queryCount = 0;
    
    const originalQuery = sequelize.query;
    sequelize.query = function(...args) {
      queryCount++;
      return originalQuery.apply(this, args);
    };
    
    await PatientService.getList({ include: ['visits'] });
    
    expect(queryCount).toBeLessThanOrEqual(2);
    
    sequelize.query = originalQuery;
  });
});
```

### Integration Test with Timing

```javascript
describe('Report Generation', () => {
  it('should generate financial report in < 500ms', async () => {
    const start = Date.now();
    await ReportService.generateFinancialReport();
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(500);
  });
});
```

---

## Next Steps

After implementing optimizations:

1. **Run baseline tests** to measure current performance
2. **Apply optimizations** one endpoint at a time
3. **Re-test** to validate improvements
4. **Document** query patterns in code comments
5. **Monitor** slow queries in production

---

## References

- [Sequelize Eager Loading](https://sequelize.org/docs/v6/advanced-association-concepts/eager-loading/)
- [SQL Performance Explained](https://sql-performance-explained.com/)
- [Database Indexing Basics](https://use-the-index-luke.com/)

---

**Created**: 2026-01-07  
**Phase**: 5.4 - TASK-028  
**Status**: Ready for implementation
