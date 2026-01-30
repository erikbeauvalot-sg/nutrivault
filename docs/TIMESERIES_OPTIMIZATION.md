# Time-Series Data Model Optimization

**Sprint 3 - US-5.3.4**

This document describes the optimization strategy for time-series measure data in NutriVault.

## Table Structure

### `patient_measures`
Stores time-series health measure values for patients.

**Key Fields:**
- `patient_id` (UUID, indexed)
- `measure_definition_id` (UUID, indexed)
- `measured_at` (DATETIME, indexed)
- `numeric_value` / `text_value` / `boolean_value` (polymorphic)
- `visit_id` (UUID, indexed, optional)
- `recorded_by` (UUID)

## Index Strategy

### 1. Patient-Centric Queries
**Index:** `patient_measures_patient_date` (patient_id, measured_at)

**Use Case:** Get all measures for a patient in a date range

```javascript
await PatientMeasure.findAll({
  where: {
    patient_id: patientId,
    measured_at: {
      [Op.between]: [startDate, endDate]
    }
  },
  order: [['measured_at', 'DESC']]
});
```

### 2. Measure Type Queries
**Index:** `patient_measures_definition_date` (measure_definition_id, measured_at)

**Use Case:** Get all values for a specific measure type (e.g., all weight measurements)

```javascript
await PatientMeasure.findAll({
  where: {
    measure_definition_id: measureDefId,
    measured_at: {
      [Op.gte]: startDate
    }
  }
});
```

### 3. Specific Patient + Measure Type
**Index:** `patient_measures_composite` (patient_id, measure_definition_id, measured_at)

**Use Case:** Get specific measure history for a patient (most common query)

```javascript
await PatientMeasure.findAll({
  where: {
    patient_id: patientId,
    measure_definition_id: measureDefId,
    measured_at: {
      [Op.gte]: startDate
    }
  },
  order: [['measured_at', 'ASC']]
});
```

### 4. Visit-Based Queries
**Index:** `patient_measures_visit` (visit_id)

**Use Case:** Get all measures logged during a specific visit

```javascript
await PatientMeasure.findAll({
  where: {
    visit_id: visitId
  },
  include: ['measureDefinition']
});
```

### 5. Global Date Range Queries
**Index:** `patient_measures_measured_at` (measured_at)

**Use Case:** Admin queries for all measures in a date range

```javascript
await PatientMeasure.findAll({
  where: {
    measured_at: {
      [Op.between]: [startDate, endDate]
    }
  },
  limit: 1000
});
```

## Query Optimization Best Practices

### ✅ DO

1. **Always include a date range**
   ```javascript
   where: {
     patient_id: id,
     measured_at: { [Op.gte]: startDate } // Index-friendly
   }
   ```

2. **Order by indexed columns**
   ```javascript
   order: [['measured_at', 'DESC']] // Uses index for sorting
   ```

3. **Use LIMIT for pagination**
   ```javascript
   limit: 100,
   offset: page * 100
   ```

4. **Select only needed fields**
   ```javascript
   attributes: ['id', 'measured_at', 'numeric_value']
   ```

5. **Filter by patient_id or measure_definition_id first**
   ```javascript
   where: {
     patient_id: id, // Most selective filter first
     measured_at: { ... }
   }
   ```

### ❌ DON'T

1. **Avoid unbounded queries**
   ```javascript
   // BAD: No date range, no limit
   await PatientMeasure.findAll({
     where: { patient_id: id }
   });
   ```

2. **Don't query without indexes**
   ```javascript
   // BAD: notes is not indexed
   where: { notes: { [Op.like]: '%keyword%' } }
   ```

3. **Avoid OR conditions across different indexes**
   ```javascript
   // BAD: Can't use both indexes efficiently
   where: {
     [Op.or]: [
       { patient_id: id1 },
       { measure_definition_id: defId }
     ]
   }
   ```

4. **Don't use functions on indexed columns**
   ```javascript
   // BAD: Function prevents index usage
   where: db.sequelize.where(
     db.sequelize.fn('DATE', db.sequelize.col('measured_at')),
     '2024-01-01'
   )
   ```

## Performance Targets

Based on dataset sizes:

| Records      | Query Type           | Target Time |
|--------------|---------------------|-------------|
| < 1,000      | Any indexed query   | < 50ms      |
| 1,000-10,000 | Patient history     | < 200ms     |
| 10,000+      | With date range     | < 500ms     |
| 100,000+     | Aggregations        | < 1s        |

## Monitoring Query Performance

### SQLite EXPLAIN QUERY PLAN

```javascript
// In development, log query plans
const result = await db.sequelize.query(
  `EXPLAIN QUERY PLAN ${yourQuery}`,
  { type: QueryTypes.SELECT }
);
console.log(result);
```

Look for:
- `USING INDEX` - Good! Index is being used
- `SCAN TABLE` - Bad! Full table scan

### Sequelize Logging

Enable query logging in development:

```javascript
// config/database.js
logging: console.log, // Shows SQL queries
benchmark: true       // Shows execution time
```

## Data Volume Considerations

### Current Scale (MVP)
- Patients: ~100-1,000
- Measures per patient: ~10-100
- Total measures: ~10,000-100,000
- **Current indexes are sufficient**

### Future Scale (Production)
- Patients: 10,000+
- Measures per patient: 100-1,000
- Total measures: 1,000,000+

**Optimization strategies for scale:**
1. Consider partitioning by year/month if needed
2. Archive old data (> 5 years)
3. Implement materialized views for common aggregations
4. Consider time-series specific database (TimescaleDB) if SQLite becomes limiting

## Maintenance

### Index Maintenance
SQLite automatically maintains indexes. No manual VACUUM or REINDEX typically needed.

### Archive Strategy
For production with large datasets:

```sql
-- Archive measures older than 5 years
INSERT INTO patient_measures_archive
SELECT * FROM patient_measures
WHERE measured_at < DATE('now', '-5 years');

DELETE FROM patient_measures
WHERE measured_at < DATE('now', '-5 years');
```

## Testing

Performance tests: `backend/tests/performance/measures.performance.test.js`

Run with:
```bash
npm run test:performance
```

## Migration History

- `20260124120000-create-measures-tables.js` - Initial schema with optimized indexes

## References

- [SQLite Query Planning](https://www.sqlite.org/queryplanner.html)
- [Sequelize Performance](https://sequelize.org/docs/v6/other-topics/query-interface/)
- Time-series best practices: Composite indexes on (entity_id, timestamp)
