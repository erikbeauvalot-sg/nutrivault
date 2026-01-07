# Monitoring & Alerting Guide

**Version**: 1.0  
**Last Updated**: 2026-01-07

---

## Table of Contents

1. [Overview](#overview)
2. [Monitoring Stack](#monitoring-stack)
3. [Application Monitoring](#application-monitoring)
4. [Infrastructure Monitoring](#infrastructure-monitoring)
5. [Log Aggregation](#log-aggregation)
6. [Alerting Rules](#alerting-rules)
7. [Dashboards](#dashboards)
8. [Incident Response](#incident-response)

---

## Overview

### Monitoring Objectives

- **Availability**: Ensure 99.9% uptime
- **Performance**: Monitor response times and throughput
- **Errors**: Track and alert on application errors
- **Resources**: Monitor CPU, memory, disk usage
- **Security**: Detect suspicious activities

### Key Metrics

| Category | Metrics | Targets |
|----------|---------|---------|
| **Availability** | Uptime, Health checks | 99.9% uptime |
| **Performance** | Response time, Throughput | API < 200ms p95 |
| **Errors** | Error rate, 5xx responses | < 0.1% error rate |
| **Resources** | CPU, Memory, Disk | < 80% utilization |
| **Database** | Query time, Connection pool | < 50ms p95 |

---

## Monitoring Stack

### Recommended Tools

**Option 1: Self-Hosted (Open Source)**
- **Prometheus**: Metrics collection
- **Grafana**: Visualization and dashboards
- **Loki**: Log aggregation
- **Alertmanager**: Alert routing and management

**Option 2: Cloud-Based (SaaS)**
- **Datadog**: All-in-one monitoring
- **New Relic**: APM and infrastructure
- **Sentry**: Error tracking
- **AWS CloudWatch**: AWS-native monitoring

**Option 3: Hybrid** (Recommended for NutriVault)
- **PM2 Plus**: Application monitoring
- **Sentry**: Error tracking
- **AWS CloudWatch** or **DigitalOcean Monitoring**: Infrastructure
- **ELK Stack** or **Papertrail**: Log aggregation

---

## Application Monitoring

### 1. PM2 Plus Monitoring

**Setup**:
```bash
# Install PM2 Plus
npm install -g pm2

# Link to PM2 Plus (sign up at pm2.io)
pm2 link <secret_key> <public_key>

# Monitor application
pm2 monitor
```

**Features**:
- Real-time CPU and memory usage
- Event loop lag monitoring
- HTTP transaction tracing
- Custom metrics
- Exception tracking

**Dashboard**: https://app.pm2.io/

### 2. Custom Health Check Endpoint

Already implemented in `backend/src/routes/health.routes.js`:

```javascript
GET /health
{
  "status": "healthy",
  "timestamp": "2026-01-07T10:30:00.000Z",
  "uptime": 3600,
  "memory": {
    "used": 150000000,
    "total": 512000000
  },
  "database": "connected"
}
```

**Monitoring Script**:
```bash
#!/bin/bash
# /opt/nutrivault/scripts/health-check-monitor.sh

API_URL="https://api.yourdomain.com/health"
TIMEOUT=5
MAX_FAILURES=3
FAILURE_COUNT=0

while true; do
    response=$(curl -s -w "%{http_code}" -o /tmp/health_response.json --connect-timeout $TIMEOUT "$API_URL")
    http_code="${response: -3}"
    
    if [ "$http_code" -eq 200 ]; then
        echo "[$(date)] ✓ Health check passed"
        FAILURE_COUNT=0
    else
        FAILURE_COUNT=$((FAILURE_COUNT + 1))
        echo "[$(date)] ✗ Health check failed (HTTP $http_code) - Failure $FAILURE_COUNT/$MAX_FAILURES"
        
        if [ $FAILURE_COUNT -ge $MAX_FAILURES ]; then
            echo "[$(date)] ⚠️  SERVICE DOWN - Sending alert"
            # Send alert (email, Slack, PagerDuty, etc.)
            curl -X POST $SLACK_WEBHOOK \
                -H 'Content-Type: application/json' \
                -d '{"text":"🚨 NutriVault API is DOWN!"}'
        fi
    fi
    
    sleep 60  # Check every minute
done
```

### 3. Application Performance Monitoring (APM)

**Sentry Integration**:

```bash
# Install Sentry SDK
cd backend
npm install @sentry/node @sentry/profiling-node
```

```javascript
// backend/src/server.js
const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,  // Adjust for production
  profilesSampleRate: 1.0,
  integrations: [
    new ProfilingIntegration(),
  ],
});

// Error handling middleware
app.use(Sentry.Handlers.errorHandler());
```

---

## Infrastructure Monitoring

### 1. Server Metrics

**Using Node Exporter + Prometheus**:

```bash
# Install Node Exporter
wget https://github.com/prometheus/node_exporter/releases/download/v1.6.1/node_exporter-1.6.1.linux-amd64.tar.gz
tar xvfz node_exporter-1.6.1.linux-amd64.tar.gz
sudo cp node_exporter-1.6.1.linux-amd64/node_exporter /usr/local/bin/
sudo useradd -rs /bin/false node_exporter

# Create systemd service
sudo nano /etc/systemd/system/node_exporter.service
```

```ini
[Unit]
Description=Node Exporter
After=network.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=multi-user.target
```

```bash
# Start service
sudo systemctl daemon-reload
sudo systemctl start node_exporter
sudo systemctl enable node_exporter
```

### 2. Database Monitoring

**PostgreSQL Metrics**:

```sql
-- Active connections
SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active';

-- Long-running queries
SELECT pid, now() - query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - query_start > interval '5 minutes';

-- Database size
SELECT pg_size_pretty(pg_database_size('nutrivault_prod'));

-- Cache hit ratio
SELECT
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) AS cache_hit_ratio
FROM pg_statio_user_tables;
```

**Monitoring Script**:
```bash
#!/bin/bash
# /opt/nutrivault/scripts/monitor-database.sh

source /opt/nutrivault/backend/.env.production

# Check active connections
ACTIVE_CONN=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c \
    "SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active';")

echo "[$(date)] Active connections: $ACTIVE_CONN"

if [ $ACTIVE_CONN -gt 50 ]; then
    echo "⚠️  High connection count!"
fi

# Check database size
DB_SIZE=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c \
    "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));")

echo "[$(date)] Database size: $DB_SIZE"
```

### 3. Nginx Monitoring

**Enable stub_status module**:

```nginx
# /etc/nginx/sites-available/monitoring
server {
    listen 127.0.0.1:8080;
    server_name localhost;

    location /nginx_status {
        stub_status on;
        access_log off;
        allow 127.0.0.1;
        deny all;
    }
}
```

**Monitoring Script**:
```bash
#!/bin/bash
# Monitor Nginx status

curl -s http://127.0.0.1:8080/nginx_status
```

---

## Log Aggregation

### 1. Centralized Logging with Papertrail

**Setup rsyslog forwarding**:

```bash
sudo nano /etc/rsyslog.d/95-papertrail.conf
```

```
*.*          @logs.papertrailapp.com:XXXXX
```

```bash
sudo service rsyslog restart
```

### 2. Application Logs

**Structure**:
```
/var/log/nutrivault/
├── api-access.log     # HTTP access logs
├── api-error.log      # Application errors
├── database.log       # Database queries (dev only)
├── backup.log         # Backup operations
└── security.log       # Security events
```

**Log Rotation** (already configured):
```
/var/log/nutrivault/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
}
```

### 3. Log Analysis

**Common patterns to search**:
```bash
# Errors in last hour
grep "ERROR" /var/log/nutrivault/api-error.log | tail -100

# Failed login attempts
grep "authentication failed" /var/log/nutrivault/security.log

# Slow queries
grep "slow query" /var/log/nutrivault/api-error.log

# 5xx errors
grep "500\|502\|503" /var/log/nginx/nutrivault-api-error.log
```

---

## Alerting Rules

### Critical Alerts (Immediate Response)

| Alert | Condition | Action |
|-------|-----------|--------|
| **Service Down** | Health check fails 3x | Page on-call engineer |
| **Database Down** | Connection failure | Page DBA + engineer |
| **High Error Rate** | > 5% of requests fail | Notify engineering team |
| **Disk Full** | > 95% disk usage | Immediate cleanup |
| **Memory Critical** | > 95% memory usage | Restart service if needed |

### Warning Alerts (Monitor & Plan)

| Alert | Condition | Action |
|-------|-----------|--------|
| **High Response Time** | p95 > 500ms | Review performance |
| **High CPU** | > 80% for 10 min | Scale or optimize |
| **High Memory** | > 80% for 10 min | Monitor for leaks |
| **Disk Space Low** | > 80% disk usage | Plan cleanup/expansion |
| **Failed Backups** | Backup job fails | Check backup system |

### 1. Alertmanager Configuration

```yaml
# /opt/prometheus/alertmanager.yml
global:
  slack_api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'

route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'slack-notifications'
  
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty'
      continue: true
    
    - match:
        severity: warning
      receiver: 'slack-notifications'

receivers:
  - name: 'slack-notifications'
    slack_configs:
      - channel: '#alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: YOUR_PAGERDUTY_SERVICE_KEY
```

### 2. Prometheus Alert Rules

```yaml
# /opt/prometheus/alert.rules.yml
groups:
  - name: nutrivault_alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }}%"

      - alert: HighResponseTime
        expr: http_request_duration_seconds{quantile="0.95"} > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time detected"
          description: "p95 response time is {{ $value }}s"

      - alert: ServiceDown
        expr: up{job="nutrivault-api"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Service is down"
          description: "NutriVault API is not responding"
```

---

## Dashboards

### 1. Grafana Dashboard (Key Metrics)

**Import community dashboards**:
- Node Exporter Full: ID 1860
- PostgreSQL Database: ID 9628
- Nginx: ID 12708

**Custom NutriVault Dashboard** (metrics to include):

```json
{
  "dashboard": {
    "title": "NutriVault Production",
    "panels": [
      {
        "title": "API Response Time",
        "targets": [
          "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
        ]
      },
      {
        "title": "Request Rate",
        "targets": [
          "rate(http_requests_total[5m])"
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          "rate(http_requests_total{status=~\"5..\"}[5m])"
        ]
      },
      {
        "title": "Active Connections",
        "targets": [
          "pg_stat_database_numbackends"
        ]
      }
    ]
  }
}
```

### 2. PM2 Monitoring Dashboard

Access via `pm2 web`:
- CPU usage per process
- Memory usage trends
- Event loop lag
- HTTP metrics
- Error logs

---

## Incident Response

### 1. Incident Severity Levels

| Level | Description | Response Time | Example |
|-------|-------------|---------------|---------|
| **P0** | Complete outage | Immediate | Service down, data loss |
| **P1** | Critical degradation | 15 minutes | Database slow, high error rate |
| **P2** | Partial degradation | 1 hour | Some features broken |
| **P3** | Minor issues | 4 hours | UI glitches, cosmetic issues |

### 2. On-Call Rotation

```
Week 1: Engineer A (primary), Engineer B (backup)
Week 2: Engineer B (primary), Engineer C (backup)
Week 3: Engineer C (primary), Engineer A (backup)
```

### 3. Incident Response Playbook

**Step 1: Acknowledge**
```bash
# Check alert in PagerDuty/Slack
# Acknowledge the incident

# Initial assessment
pm2 status
pm2 logs nutrivault-api --lines 100
curl https://api.nutrivault.com/health
```

**Step 2: Diagnose**
```bash
# Check server resources
htop
df -h

# Check database
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1"

# Check logs
tail -100 /var/log/nutrivault/api-error.log
tail -100 /var/log/nginx/nutrivault-api-error.log
```

**Step 3: Mitigate**
```bash
# If high memory
pm2 restart nutrivault-api

# If database issues
# Check slow queries, kill if needed

# If deployment issue
git checkout <previous-commit>
pm2 restart nutrivault-api
```

**Step 4: Communicate**
- Post to #incidents Slack channel
- Update status page
- Notify affected users if needed

**Step 5: Resolve**
- Fix root cause
- Deploy fix
- Verify resolution
- Update documentation

**Step 6: Post-Mortem**
- Document timeline
- Identify root cause
- List action items
- Update runbooks

---

## Monitoring Checklist

### Daily
- [ ] Check dashboard for anomalies
- [ ] Review error logs
- [ ] Verify backups completed
- [ ] Check disk space

### Weekly
- [ ] Review performance trends
- [ ] Update alert thresholds if needed
- [ ] Test alerting system
- [ ] Review incident responses

### Monthly
- [ ] Review and update monitoring rules
- [ ] Capacity planning review
- [ ] Conduct fire drill
- [ ] Update documentation

---

## Useful Commands

```bash
# Check service status
pm2 status
systemctl status nginx
systemctl status postgresql

# Monitor logs in real-time
pm2 logs nutrivault-api
tail -f /var/log/nutrivault/api-error.log
tail -f /var/log/nginx/nutrivault-api-access.log

# Check resource usage
pm2 monit
htop
df -h
free -h

# Database monitoring
psql -d nutrivault_prod -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# Network monitoring
netstat -tulpn | grep LISTEN
ss -tunlp

# Check API health
curl -i https://api.nutrivault.com/health
```

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-07  
**Maintained By**: DevOps Team
