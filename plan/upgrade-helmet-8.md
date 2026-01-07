---
goal: 'Helmet 8.x Migration Plan'
version: '1.0'
date_created: '2026-01-07'
owner: 'Backend Team'
status: 'Planned'
tags: ['upgrade', 'helmet', 'security']
related_task: 'TASK-022'
---

# Helmet 8.x Migration Plan

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

**Current**: Helmet 7.1.0  
**Target**: Helmet 8.x  
**Complexity**: Low  
**Effort**: 2-4 hours  
**Risk**: Low  

## Key Changes

- Stricter default CSP
- COEP enabled by default (may need to disable)
- Removed IE-specific headers
- Requires Node.js 16+ (we're on 18+ ✅)

## Migration Steps

1. Update: `npm install helmet@^8.0.0`
2. Test CSP configuration
3. Adjust COEP if needed
4. Validate security headers

## Recommendation

**When**: Q2 2026 (after Express 5)  
**Priority**: Low  
**Risk**: Low

Full analysis available in this document.
