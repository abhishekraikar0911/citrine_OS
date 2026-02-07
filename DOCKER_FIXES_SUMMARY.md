# Docker Configuration Fixes - Summary

## Issues Resolved

### 1. ✅ Security: Hardcoded Credentials
**Problem:** Database passwords, RabbitMQ credentials, and MinIO keys were hardcoded in docker-compose files.

**Solution:** 
- Created `.env` and `.env.example` files for credential management
- Updated all docker-compose files to use environment variable references: `${VARIABLE_NAME}`
- Files affected:
  - `/opt/csms/.env` (production credentials)
  - `/opt/csms/.env.example` (template for documentation)
  - `/opt/csms/citrineos-core/Server/.env`
  - All docker-compose.yml files now reference env vars

**How to use:**
```bash
# Copy .env.example to .env and update with your secure credentials
cp .env.example .env

# Edit with production credentials
nano .env

# Run containers (they'll load from .env automatically)
docker-compose up -d
```

### 2. ✅ Hasura Admin Secret
**Problem:** Security secrets were commented out or hardcoded.

**Solution:**
- Enabled `HASURA_GRAPHQL_ADMIN_SECRET` in all configs
- Now uses `${HASURA_GRAPHQL_ADMIN_SECRET}` from `.env`
- Changed default to placeholder: `CitrineOS_change_in_production`

### 3. ✅ Port Conflicts
**Problem:** Both root and Server docker-compose had graphql-engine on port 8080, conflicting with citrine API.

**Solution:**
- Root `docker-compose.yml`: GraphQL moved to port **8090**
- Server `docker-compose.yml`: GraphQL kept on **8080** (local dev only)
- This prevents conflicts when both stacks are running

**Port mapping:**
```
8080 → Hasura GraphQL (Server/docker-compose.yml dev)
8090 → Hasura GraphQL (root docker-compose.yml)
8081 → CitrineOS API (root compose)
8082 → OCPP 2.0.1 Profile 1
8443 → OCPP 2.0.1 Profile 2 (TLS)
8444 → OCPP 2.0.1 Profile 3 (mTLS)
```

### 4. ✅ Dockerfile Issues

**entrypoint.sh:**
- ✅ Added proper error handling with `|| { exit 1; }`
- ✅ Added informative logging for each DB strategy
- Fixed potential silent failures

**deploy.Dockerfile:**
- ✅ Removed undefined `${PORT}` variable
- ✅ Added explicit EXPOSE statements: `8080 8082 8443 8444 8092 9229`
- ✅ Added HEALTHCHECK directly in Dockerfile
- Better production readiness

### 5. ✅ Volume Mounts Optimization
**Problem:** 15+ individual module mounts were brittle and verbose.

**Solution:**
- Simplified from individual mounts to parent directory mount:
```yaml
# Before (verbose):
- ../03_Modules/Certificates:/usr/local/apps/citrineos/03_Modules/Certificates
- ../03_Modules/Configuration:/usr/local/apps/citrineos/03_Modules/Configuration
# ... 15 more lines

# After (clean):
- ../03_Modules:/usr/local/apps/citrineos/03_Modules
```

**Benefits:**
- More maintainable
- Reduces docker-compose file size
- Same functionality with cleaner config
- Easier to add new modules

### 6. ✅ Database Health Check
**Problem:** PostgreSQL health check didn't verify database exists.

**Solution:**
Changed from:
```bash
test: 'pg_isready --username=citrine'
```

To:
```bash
test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}']
```

**Benefits:**
- Verifies actual database is accessible (not just server)
- Uses env variables for flexibility
- Better failure detection

### 7. ✅ Resource Limits
**Problem:** No CPU/memory limits defined (could cause system crashes).

**Solution:**
Added `deploy.resources` to all services:

```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 512M
    reservations:
      memory: 256M
```

**Resource allocation:**
- **PostgreSQL:** 2 CPU, 1GB limit
- **CitrineOS Core:** 4 CPU, 2GB limit  
- **RabbitMQ:** 1 CPU, 512MB limit
- **MinIO:** 1 CPU, 512MB limit
- **Hasura GraphQL:** 1 CPU, 512MB limit

**Why it matters:**
Prevents runaway processes from consuming all system resources (like your Amazon Q LSP crash scenario)

## Files Modified

1. `/opt/csms/docker-compose.yml` - Root compose, fixed all issues
2. `/opt/csms/citrineos-core/Server/docker-compose.yml` - Dev/local compose, fixed all issues
3. `/opt/csms/citrineos-core/entrypoint.sh` - Added error handling
4. `/opt/csms/citrineos-core/Server/deploy.Dockerfile` - Fixed EXPOSE and added HEALTHCHECK
5. `/opt/csms/.env` - Created with dev credentials
6. `/opt/csms/.env.example` - Created as template for documentation
7. `/opt/csms/citrineos-core/Server/.env` - Created for Server stack

## Usage Instructions

### For Development (local)
```bash
cd /opt/csms

# Copy environment template
cp .env.example .env

# Edit .env with your local credentials (optional, defaults work)
nano .env

# Start all services
docker-compose up -d

# Check services
docker-compose ps

# View logs
docker-compose logs -f citrine
```

### For Production
```bash
# 1. Create production .env with secure credentials
nano .env

# Required changes in .env:
# POSTGRES_PASSWORD=<strong_random_password>
# RABBITMQ_DEFAULT_PASS=<strong_random_password>
# MINIO_ROOT_PASSWORD=<strong_random_password>
# HASURA_GRAPHQL_ADMIN_SECRET=<strong_random_secret>

# 2. Start services
docker-compose up -d

# 3. Monitor health
docker-compose ps  # All should show healthy
```

### Verify Health Status
```bash
# Check all services are healthy
docker-compose ps

# Check specific service logs
docker-compose logs citrine
docker-compose logs graphql-engine

# Test API endpoints
curl http://localhost:8081/health
curl http://localhost:8090/healthz  # Hasura GraphQL
```

## Security Notes

⚠️ **Important:**
1. Never commit `.env` files to git - they contain secrets
2. Always use `.env.example` as template
3. Use strong passwords in production
4. Rotate `HASURA_GRAPHQL_ADMIN_SECRET` regularly
5. Consider using Docker Secrets or external secret management for production

## Testing the Fixes

```bash
# 1. Start containers
docker-compose up -d

# 2. Verify no port conflicts
docker-compose ps

# 3. Check resource limits are applied
docker stats

# 4. Test health checks
docker-compose ps | grep healthy

# 5. Verify environment variables loaded
docker exec csms-core env | grep POSTGRES_
```

## Rollback Instructions

If you need to revert changes:
```bash
# Stop containers
docker-compose down

# Revert file changes (if using git)
git checkout docker-compose.yml entrypoint.sh deploy.Dockerfile

# Remove .env files
rm .env .env.example
```

## Summary of Benefits

| Issue | Before | After |
|-------|--------|-------|
| Credentials | Hardcoded in git | Protected in .env |
| Hasura Security | No admin secret | Secure token-based |
| Port Conflicts | GraphQL clashes | Mapped to 8090 |
| Error Handling | Silent failures | Explicit error messages |
| Health Checks | Basic connectivity | Database verification |
| Resource Usage | Unlimited | CPU/Memory capped |
| Maintainability | 15 volume mounts | 1 parent mount |
| Production Ready | No | Yes |
