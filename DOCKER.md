# Docker Setup for Petstore API

This guide explains how to run the Petstore API with PostgreSQL using Docker Compose, following modern Docker best practices and security standards.

## Prerequisites

- Docker Engine 24.0+ (with BuildKit enabled)
- Docker Compose V2 (2.20+)
- At least 2GB RAM available for containers

## Quick Start

### Option 1: Using Docker Compose (Recommended)

1. **Start the services** (production mode):
   ```bash
   docker compose up -d
   ```

2. **Check status**:
   ```bash
   docker compose ps
   ```

3. **View logs**:
   ```bash
   docker compose logs -f api
   ```

4. **Access the API**:
   - API: http://localhost:3000
   - Swagger UI: http://localhost:3000/docs
   - Health Check: http://localhost:3000/health

### Option 2: Using Makefile (Easier)

This project includes a Makefile with convenient commands:

```bash
# View all available commands
make help

# Start services
make up

# View logs
make logs

# Check health
make health

# Stop services
make down
```

### Development Mode

For development with hot-reload and debugging tools:

```bash
# Start with development configuration
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Or use Makefile
make up-dev
```

Development mode includes:
- Hot-reload with source code mounted
- pgAdmin at http://localhost:5050 (default credentials: admin@petstore.local / admin)
- Debug logging enabled
- Relaxed security settings

## Default Configuration

- **PostgreSQL**:
  - Host: `postgres` (internal) / `localhost` (external)
  - Port: `5432`
  - User: `petstore`
  - Password: `petstore_password`
  - Database: `petstore`

- **API**:
  - Port: `3000`
  - Environment: `production`

## Environment Variables

You can customize the following variables in your `.env` file:

```bash
# Database Configuration
POSTGRES_USER=petstore
POSTGRES_PASSWORD=petstore_password
POSTGRES_DB=petstore
POSTGRES_PORT=5432

# API Configuration
API_PORT=3000
NODE_ENV=production

# CORS Configuration
CORS_ORIGIN=*

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=15 minutes
```

## Docker Compose Commands

### Start services
```bash
docker-compose up -d
```

### Stop services
```bash
docker-compose down
```

### Stop services and remove volumes (deletes database data)
```bash
docker-compose down -v
```

### View logs
```bash
# All services
docker-compose logs -f

# API only
docker-compose logs -f api

# PostgreSQL only
docker-compose logs -f postgres
```

### Restart services
```bash
docker-compose restart
```

### Rebuild containers
```bash
docker-compose up -d --build
```

## Database Management

### Run Prisma migrations
```bash
docker-compose exec api npx prisma migrate deploy
```

### Access Prisma Studio
```bash
docker-compose exec api npx prisma studio
```

### Seed the database
```bash
docker-compose exec api npm run prisma:seed
```

### Connect to PostgreSQL
```bash
docker-compose exec postgres psql -U petstore -d petstore
```

## Persistent Data

PostgreSQL data is stored in a Docker volume named `postgres_data`. This ensures data persists across container restarts.

### Backup database
```bash
docker-compose exec postgres pg_dump -U petstore petstore > backup.sql
```

### Restore database
```bash
cat backup.sql | docker-compose exec -T postgres psql -U petstore petstore
```

## Troubleshooting

### Check service health
```bash
docker-compose ps
```

### View container resource usage
```bash
docker stats
```

### Clean up unused Docker resources
```bash
docker system prune -a --volumes
```

### Reset everything
```bash
docker-compose down -v
docker-compose up -d --build
```

## Network

Services communicate via a dedicated bridge network named `petstore-network`. The API connects to PostgreSQL using the service name `postgres` as the hostname.

## Security Features

This Docker setup implements modern security best practices:

### Container Security
- ✅ **Non-root user**: API runs as unprivileged `nodejs` user (UID 1001)
- ✅ **Read-only root filesystem**: Prevents runtime modifications
- ✅ **Dropped capabilities**: Minimal Linux capabilities (CAP_DROP: ALL)
- ✅ **No new privileges**: Prevents privilege escalation
- ✅ **Multi-stage builds**: Minimal attack surface in final image
- ✅ **Specific base image versions**: Pinned Node.js and PostgreSQL versions

### Network Security
- ✅ **Isolated bridge network**: Services communicate via dedicated network
- ✅ **Health checks**: Both API and database have health checks
- ✅ **Dependency management**: API waits for database to be healthy

### Build Optimization
- ✅ **Build cache mounts**: Faster rebuilds with npm cache
- ✅ **Layer optimization**: Dependencies cached separately from code
- ✅ **Minimal final image**: Alpine-based, production-only dependencies
- ✅ **dumb-init**: Proper signal handling for Node.js process

## Production Considerations

For production deployment:

### Essential Security
1. **Change default credentials** - Never use default passwords
   ```bash
   # Generate strong passwords
   openssl rand -base64 32
   ```

2. **Use Docker secrets** instead of environment variables
   ```yaml
   secrets:
     db_password:
       file: ./secrets/db_password.txt
   ```

3. **Configure proper CORS_ORIGIN** - Never use `*` in production
   ```bash
   CORS_ORIGIN=https://yourdomain.com
   ```

4. **Set up SSL/TLS** using a reverse proxy (Traefik, Nginx, Caddy)
   - Enable HTTPS
   - Use Let's Encrypt for certificates
   - Implement HTTP/2

### Reliability & Performance
5. **Implement comprehensive backup strategy**
   ```bash
   # Automated daily backups
   docker compose exec postgres pg_dump -U petstore petstore | \
     gzip > backup-$(date +%Y%m%d).sql.gz
   ```

6. **Monitor resource usage** and set resource limits
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '1.0'
         memory: 512M
       reservations:
         cpus: '0.5'
         memory: 256M
   ```

7. **Use specific image tags** and digests
   ```dockerfile
   FROM node:22-alpine@sha256:abc123...
   ```

8. **Set up centralized logging** (ELK, Loki, CloudWatch)
   ```yaml
   logging:
     driver: "json-file"
     options:
       max-size: "10m"
       max-file: "3"
   ```

9. **Use PostgreSQL connection pooling** (PgBouncer)
   - Reduces connection overhead
   - Better resource utilization
   - Improved scalability

10. **Implement monitoring** (Prometheus, Grafana, DataDog)
    - Container metrics
    - Application metrics
    - Database performance

### Additional Best Practices
11. **Enable Docker Content Trust** for image verification
    ```bash
    export DOCKER_CONTENT_TRUST=1
    ```

12. **Regular security scanning** with Docker Scout or Trivy
    ```bash
    docker scout cves petstore-api
    ```

13. **Use container restart policies** appropriately
    ```yaml
    restart: on-failure:3  # Max 3 restart attempts
    ```

14. **Implement rate limiting** at the reverse proxy level

15. **Set up database replication** for high availability
