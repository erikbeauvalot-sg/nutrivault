# ADR-001: ORM Selection for NutriVault

## Status
**ACCEPTED** - January 3, 2026

## Context
NutriVault requires a robust Object-Relational Mapping (ORM) solution to manage database interactions across both development (SQLite) and production (PostgreSQL) environments. The ORM must support:

- Multi-database compatibility (SQLite for development, PostgreSQL for production)
- Schema migrations with version control
- Model definitions with associations and validations
- Query building with safety against SQL injection
- Transaction management
- Seeding capabilities for development and testing
- TypeScript support (optional, for future enhancement)

### Evaluated Options

#### 1. Sequelize
**Pros:**
- Mature ORM with extensive community support (since 2011)
- Native support for multiple dialects (SQLite, PostgreSQL, MySQL, MariaDB, MSSQL)
- Built-in migration system with CLI tools
- Comprehensive documentation and examples
- Strong association support (hasOne, hasMany, belongsTo, belongsToMany)
- Hooks system for lifecycle events
- Transaction support with isolation levels
- Extensive validation capabilities
- Large ecosystem of plugins and tools

**Cons:**
- Slightly verbose syntax compared to modern alternatives
- TypeScript support requires @types/sequelize (but well-maintained)
- Performance can be slower than raw queries for complex operations
- Migration system can be complex for advanced scenarios

#### 2. Prisma
**Pros:**
- Modern, type-safe ORM with excellent TypeScript support
- Schema-first approach with intuitive syntax
- Auto-generated and type-safe query client
- Excellent migration tooling with Prisma Migrate
- Built-in connection pooling
- Great developer experience with Prisma Studio (GUI)
- Strong performance optimizations

**Cons:**
- Relatively newer (2019) with smaller community
- Less flexible for complex queries
- Schema language (Prisma Schema) is a learning curve
- Migration preview features can be unstable
- Smaller ecosystem compared to Sequelize

#### 3. TypeORM
**Pros:**
- TypeScript-first ORM with decorators
- Active Record and Data Mapper patterns support
- Migration system with CLI
- Multi-database support
- Good documentation

**Cons:**
- More complex configuration
- Decorator-based syntax may not fit JavaScript-first projects
- Some community concerns about maintenance
- Steeper learning curve

#### 4. Knex.js (Query Builder, not ORM)
**Pros:**
- Lightweight and fast
- Excellent for complex queries
- Migration support
- Multi-database compatibility

**Cons:**
- Not a full ORM (no models, associations)
- Requires more manual work for relationships
- Less abstraction means more boilerplate code

## Decision
**We will use Sequelize as the ORM for NutriVault.**

## Rationale

### Primary Reasons for Selecting Sequelize:

1. **Multi-Database Compatibility**
   - Sequelize has excellent support for both SQLite (development) and PostgreSQL (production)
   - Dialect-specific features are well-documented and easy to manage
   - Proven track record of handling database migrations between dialects

2. **Maturity and Stability**
   - 12+ years of active development
   - Large community with extensive Stack Overflow answers and tutorials
   - Battle-tested in production environments
   - Fewer breaking changes compared to newer ORMs

3. **Feature Completeness**
   - Comprehensive association system for our complex relationships (users, patients, visits, billing)
   - Built-in validation for our data integrity requirements
   - Transaction support essential for billing operations
   - Hook system for audit logging (before/after hooks)
   - Soft delete support for patient records

4. **Migration System**
   - Robust CLI for generating and running migrations
   - Version-controlled schema changes
   - Supports both up and down migrations
   - Easy to write cross-database compatible migrations

5. **Developer Experience**
   - Familiar syntax for developers with SQL knowledge
   - Clear error messages and debugging information
   - Works seamlessly with JavaScript (ES6+)
   - Can add TypeScript later if needed

6. **Project Requirements Alignment**
   - Our team is more familiar with JavaScript than TypeScript (Prisma would require TypeScript)
   - Need for complex associations (patients → visits → measurements, users → roles → permissions)
   - Audit logging hooks fit perfectly with Sequelize lifecycle events
   - Multi-tenancy patterns well-documented with Sequelize

### Why Not Other Options:

- **Prisma**: While excellent, it strongly favors TypeScript. Our specification targets JavaScript/Node.js, and the team's current skillset aligns better with Sequelize. Additionally, Prisma's schema language adds learning overhead.

- **TypeORM**: Requires TypeScript and decorators, which adds complexity for a JavaScript-focused project. The decorator syntax may be unfamiliar to some team members.

- **Knex.js**: Too low-level for our needs. We need associations and model definitions, not just query building. The manual work required would increase development time significantly.

## Implementation Plan

### Phase 1: Setup (Week 1)
```bash
# Install Sequelize and dependencies
npm install sequelize
npm install sqlite3        # Development database
npm install pg pg-hstore   # Production database (PostgreSQL)

# Install CLI for migrations
npm install --save-dev sequelize-cli
```

### Phase 2: Configuration (Week 1)
- Create `backend/src/config/database.js` with environment-specific configurations
- Set up Sequelize instance in `backend/src/config/sequelize.js`
- Configure `.sequelizerc` for custom paths

### Phase 3: Models (Week 2)
- Define models in `backend/src/models/` following naming conventions
- Implement associations between models
- Add validations and default values
- Set up model indexes for performance

### Phase 4: Migrations (Week 2)
- Create initial migration for each table
- Ensure SQLite and PostgreSQL compatibility
- Test migrations on both databases
- Document migration best practices

### Phase 5: Seeders (Week 2)
- Create seed files for roles and permissions
- Add development test data
- Document seeding process

## Consequences

### Positive:
- Rapid development with well-documented patterns
- Strong community support for troubleshooting
- Excellent fit for our multi-database requirement
- Built-in features reduce custom code (validations, associations, transactions)
- Easy onboarding for new developers familiar with SQL
- Audit logging integration via hooks

### Negative:
- Some queries may need raw SQL for complex reporting
- Performance optimization requires understanding of Sequelize internals
- Verbose syntax compared to more modern ORMs
- TypeScript integration is possible but not first-class

### Mitigation Strategies:
1. **Performance**: Use eager loading, proper indexes, and raw queries for complex reports
2. **Complexity**: Follow consistent patterns and document common queries
3. **TypeScript**: Can add @types/sequelize later if TypeScript adoption is desired
4. **Query Optimization**: Use `sequelize.query()` for raw SQL when needed

## Validation Criteria
The decision will be validated by:
- [ ] Successfully running migrations on both SQLite and PostgreSQL
- [ ] Implementing all models with associations
- [ ] Achieving <200ms query response times for common operations
- [ ] Successfully implementing audit logging via hooks
- [ ] Team feedback after Week 2 of implementation

## References
- [Sequelize Documentation](https://sequelize.org/)
- [Sequelize GitHub](https://github.com/sequelize/sequelize)
- [SQLite Dialect Guide](https://sequelize.org/docs/v6/other-topics/dialect-specific-things/#sqlite)
- [PostgreSQL Dialect Guide](https://sequelize.org/docs/v6/other-topics/dialect-specific-things/#postgresql)
- [Migration Best Practices](https://sequelize.org/docs/v6/other-topics/migrations/)

## Related ADRs
- ADR-002: Database Migration Strategy (To be created)
- ADR-003: Model Validation Approach (To be created)

## Notes
- This decision was made during Phase 1: Foundation
- Review this decision after 3 months of development or if TypeScript adoption becomes a requirement
- Monitor Sequelize v7 release for potential breaking changes

---
**Author**: Agent 1 - Project Architect
**Date**: January 3, 2026
**Stakeholders**: All Development Agents
**Review Date**: April 3, 2026
