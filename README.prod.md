# Production Deployment Guide

Complete guide to deploying the Petstore API to production environments.

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Infrastructure Setup](#infrastructure-setup)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Docker Deployment](#docker-deployment)
6. [Reverse Proxy Setup (Nginx)](#reverse-proxy-setup-nginx)
7. [SSL/TLS Configuration](#ssltls-configuration)
8. [Health Checks & Monitoring](#health-checks--monitoring)
9. [Backup & Recovery](#backup--recovery)
10. [Security Hardening](#security-hardening)
11. [CI/CD Pipeline](#cicd-pipeline)
12. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

Before deploying to production, ensure you have:

- [ ] Production server with Docker and Docker Compose installed
- [ ] Domain name configured and DNS pointing to your server
- [ ] SSL certificate (Let's Encrypt recommended)
- [ ] PostgreSQL credentials and connection details
- [ ] Backup strategy defined
- [ ] Monitoring solution in place
- [ ] Firewall configured (ports 80, 443 open)
- [ ] SSH access to production server
- [ ] CI/CD pipeline configured (optional but recommended)

---

## Infrastructure Setup

### 1. Server Requirements

**Minimum Specifications:**
- CPU: 2 cores
- RAM: 4 GB
- Storage: 20 GB SSD
- OS: Ubuntu 22.04 LTS or similar

**Recommended Specifications:**
- CPU: 4 cores
- RAM: 8 GB
- Storage: 50 GB SSD
- OS: Ubuntu 22.04 LTS

### 2. Install Docker

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose V2
sudo apt install docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

### 3. Configure Firewall

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## Environment Configuration

### 1. Clone Repository

```bash
# Create application directory
sudo mkdir -p /opt/petstore-api
sudo chown $USER:$USER /opt/petstore-api
cd /opt/petstore-api

# Clone repository
git clone https://github.com/mirkogolze/petstoreBackend.git .
```

### 2. Create Production Environment File

```bash
# Copy template
cp env.template .env

# Edit with production values
nano .env
```

**Production `.env` configuration:**

```bash
# Application
NODE_ENV=production
# API_PORT controls the HOST port mapping (e.g., 13000 -> container:3000)
# To expose API on different host port, change this value
# Default: 3000 (access via http://localhost:3000)
# Example: 13000 (access via http://localhost:13000)
API_PORT=3000
LOG_LEVEL=info

# Database - Use strong passwords!
DATABASE_URL=postgresql://petstore:YOUR_STRONG_PASSWORD_HERE@postgres:5432/petstore
POSTGRES_USER=petstore
POSTGRES_PASSWORD=YOUR_STRONG_PASSWORD_HERE
POSTGRES_DB=petstore
POSTGRES_PORT=5432

# PostgreSQL Performance (adjust based on your server resources)
POSTGRES_SHARED_BUFFERS=512MB
POSTGRES_EFFECTIVE_CACHE_SIZE=1536MB
POSTGRES_MAX_CONNECTIONS=100
POSTGRES_WORK_MEM=4MB
POSTGRES_MAINTENANCE_WORK_MEM=128MB

# Security
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=15 minutes
```

**🔐 Security Best Practices:**
- Use strong, unique passwords (min 32 characters)
- Generate secure passwords: `openssl rand -base64 32`
- Never use default credentials
- Set proper CORS_ORIGIN (not `*`)

---

## Database Setup

### 1. Start Database Container

```bash
# Start only PostgreSQL first
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d postgres

# Check database health
docker compose ps
docker compose logs postgres
```

### 2. Run Database Migrations

```bash
# Execute migrations inside the container
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm api npm run prisma:migrate:prod

# Verify database structure
docker compose exec postgres psql -U petstore -d petstore -c "\dt"
```

### 3. Seed Database (Optional)

```bash
# Seed with initial data
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm api npm run prisma:seed
```

---

## Docker Deployment

### 1. Build Production Images

```bash
# Build the API image
docker compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache
```

### 2. Start All Services

```bash
# Start all services in production mode
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Verify services are running
docker compose ps
```

### 3. Check Service Health

```bash
# Check API health endpoint
curl http://localhost:3000/health

# Check logs
docker compose logs -f api

# Check container resources
docker stats
```

### 4. Using Makefile Commands

```bash
# View all available commands
make help

# Start production services
make up

# View logs
make logs

# Check health
make health

# Restart services
make restart
```

---

## Reverse Proxy Setup (Nginx)

For production, use Nginx as a reverse proxy to:
- Handle SSL/TLS termination
- Load balancing (if scaling)
- Static file serving
- Security headers
- Rate limiting

### 1. Install Nginx

```bash
sudo apt install nginx -y
sudo systemctl enable nginx
```

### 2. Configure Nginx

Create `/etc/nginx/sites-available/petstore-api`:

```nginx
# Rate limiting zone
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

# Upstream backend
upstream petstore_api {
    server localhost:3000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;

    # Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL configuration (will be added by Certbot)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/petstore-api.access.log;
    error_log /var/log/nginx/petstore-api.error.log;

    # API proxy
    location / {
        # Rate limiting
        limit_req zone=api_limit burst=20 nodelay;

        # Proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Proxy settings
        proxy_pass http://petstore_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }

    # Health check endpoint (no rate limiting)
    location /health {
        proxy_pass http://petstore_api/health;
        access_log off;
    }
}
```

### 3. Enable Site

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/petstore-api /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## SSL/TLS Configuration

### Using Let's Encrypt (Certbot)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run

# Auto-renewal is configured via systemd timer
sudo systemctl status certbot.timer
```

---

## Health Checks & Monitoring

### 1. API Health Endpoint

```bash
# Check API health
curl https://yourdomain.com/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-10-21T10:30:00.000Z",
  "database": "connected"
}
```

### 2. Docker Health Checks

```bash
# Check container health
docker compose ps

# View health check logs
docker inspect petstore-api --format='{{json .State.Health}}' | jq
```

### 3. Monitoring Setup

**Option A: Simple Log Monitoring**

```bash
# Create monitoring script
cat > /opt/petstore-api/monitor.sh << 'EOF'
#!/bin/bash
HEALTH_URL="http://localhost:3000/health"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $STATUS -ne 200 ]; then
    echo "API is down! Status: $STATUS"
    # Send alert (email, Slack, etc.)
    # Restart services
    cd /opt/petstore-api
    docker compose -f docker-compose.yml -f docker-compose.prod.yml restart api
fi
EOF

chmod +x /opt/petstore-api/monitor.sh

# Add to crontab (check every 5 minutes)
crontab -e
# Add: */5 * * * * /opt/petstore-api/monitor.sh
```

**Option B: Professional Monitoring**
- **Prometheus + Grafana**: Metrics and visualization
- **ELK Stack**: Log aggregation
- **Datadog/New Relic**: APM solutions
- **UptimeRobot**: External uptime monitoring

---

## Backup & Recovery

### 1. Database Backup

```bash
# Create backup directory
sudo mkdir -p /opt/backups/petstore
sudo chown $USER:$USER /opt/backups/petstore

# Manual backup
docker compose exec postgres pg_dump -U petstore petstore > /opt/backups/petstore/backup_$(date +%Y%m%d_%H%M%S).sql

# Create automated backup script
cat > /opt/petstore-api/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/petstore"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql"

# Create backup
docker compose exec -T postgres pg_dump -U petstore petstore > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Delete backups older than 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE.gz"
EOF

chmod +x /opt/petstore-api/backup.sh

# Schedule daily backups at 2 AM
crontab -e
# Add: 0 2 * * * /opt/petstore-api/backup.sh
```

### 2. Restore from Backup

```bash
# Stop API service
docker compose stop api

# Restore database
gunzip -c /opt/backups/petstore/backup_YYYYMMDD_HHMMSS.sql.gz | \
  docker compose exec -T postgres psql -U petstore petstore

# Start API service
docker compose start api
```

### 3. Volume Backup

```bash
# Backup Docker volume
docker run --rm \
  -v petstore_postgres_data:/data \
  -v /opt/backups:/backup \
  alpine tar czf /backup/postgres_volume_$(date +%Y%m%d).tar.gz -C /data .
```

---

## Security Hardening

### 1. Server Hardening

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install fail2ban
sudo apt install fail2ban -y
sudo systemctl enable fail2ban

# Disable root SSH login
sudo sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart sshd

# Setup automatic security updates
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 2. Docker Security

```bash
# Scan images for vulnerabilities
docker scan petstore-api:latest

# Remove unused images
docker image prune -a

# Limit Docker privileges
sudo usermod -aG docker $USER
```

### 3. Application Security

- ✅ CORS configured for specific origins
- ✅ Rate limiting enabled
- ✅ Helmet security headers
- ✅ Input validation via OpenAPI
- ✅ Database credentials in environment variables
- ✅ Read-only container filesystem
- ✅ No root user in container
- ✅ Security capabilities dropped

### 4. Database Security

```bash
# Access Docker PostgreSQL shell
docker compose exec postgres psql -U petstore

-- Revoke public access
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO petstore;

-- Check active connections
SELECT * FROM pg_stat_activity;
```

---

## CI/CD Pipeline

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.PROD_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/petstore-api
            git pull origin main
            docker compose -f docker-compose.yml -f docker-compose.prod.yml build
            docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
            docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T api npm run prisma:migrate:prod
```

---

## Troubleshooting

### Common Issues

**1. Port Already in Use**

```bash
# Find process using port 3000
sudo lsof -i :3000
sudo netstat -tulpn | grep :3000

# Kill process
sudo kill -9 <PID>
```

**2. Database Connection Failed**

```bash
# Check database container
docker compose logs postgres

# Check network
docker network inspect petstore-network

# Test connection
docker compose exec api sh
nc -zv postgres 5432
```

**3. Container Won't Start**

```bash
# Check logs
docker compose logs api

# Check disk space
df -h

# Check memory
free -m

# Remove and recreate
docker compose down
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate
```

**4. High Memory Usage**

```bash
# Check container stats
docker stats

# Adjust resource limits in docker-compose.prod.yml
# Restart services
docker compose restart
```

**5. SSL Certificate Issues**

```bash
# Renew certificate
sudo certbot renew

# Check certificate expiry
echo | openssl s_client -servername yourdomain.com -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates
```

### Logging

```bash
# View application logs
docker compose logs -f api

# View database logs
docker compose logs -f postgres

# View Nginx logs
sudo tail -f /var/log/nginx/petstore-api.access.log
sudo tail -f /var/log/nginx/petstore-api.error.log

# Export logs
docker compose logs api > api_logs_$(date +%Y%m%d).log
```

### Performance Tuning

```bash
# Monitor database performance
docker compose exec postgres psql -U petstore -d petstore
SELECT * FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 10;

# Check slow queries
SELECT * FROM pg_stat_activity WHERE state = 'active';
```

---

## Maintenance

### Regular Tasks

**Daily:**
- Monitor error logs
- Check disk space
- Review security alerts

**Weekly:**
- Review performance metrics
- Check backup integrity
- Update dependencies (if needed)

**Monthly:**
- Security updates
- Database optimization
- Capacity planning review

### Updating the Application

```bash
# 1. Backup database
./backup.sh

# 2. Pull latest code
cd /opt/petstore-api
git pull origin main

# 3. Rebuild and restart
docker compose -f docker-compose.yml -f docker-compose.prod.yml build
docker compose -f docker-compose.yml -f docker-compose.prod.yml down
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 4. Run migrations
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec api npm run prisma:migrate:prod

# 5. Verify deployment
curl https://yourdomain.com/health
```

---

## Quick Reference Commands

```bash
# Start services
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Stop services
docker compose down

# View logs
docker compose logs -f

# Restart API only
docker compose restart api

# Check health
curl http://localhost:3000/health

# Backup database
./backup.sh

# Run migrations
docker compose exec api npm run prisma:migrate:prod

# Access database shell
docker compose exec postgres psql -U petstore petstore

# Check container status
docker compose ps

# View resource usage
docker stats
```

---

## Support & Resources

- **OpenAPI Spec**: `openapi/petstore.yml`
- **API Documentation**: `https://yourdomain.com/docs`
- **Repository**: https://github.com/mirkogolze/petstoreBackend
- **Fastify Docs**: https://fastify.dev
- **Prisma Docs**: https://www.prisma.io/docs
- **Docker Docs**: https://docs.docker.com

---

## License

MIT License - see LICENSE file for details.
