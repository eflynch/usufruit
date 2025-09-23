# Usufruit Deployment Guide

This guide will help you deploy Usufruit library management system to a production server with Docker, Nginx reverse proxy, and SSL certificates.

## Quick Start

1. **Get a server**: Any Ubuntu 20.04+ server (DigitalOcean, AWS, etc.)
2. **Point your domain**: Set up DNS A record pointing to your server's IP
3. **Run the deployment script**: 

```bash
# On your server, clone the repository
git clone <your-repo-url> usufruit
cd usufruit

# Make the deployment script executable and run it
chmod +x deploy.sh
sudo ./deploy.sh
```

The script will prompt you for:
- Domain name (e.g., library.yourdomain.com)
- Email address (for SSL certificates)
- Database password

## What the deployment script does

1. **Installs Docker & Docker Compose**
2. **Creates production configuration files**:
   - `docker-compose.yml` - Container orchestration
   - `Dockerfile` - Application container build
   - `nginx.conf` - Reverse proxy configuration
   - `.env` - Environment variables
3. **Sets up SSL certificates** with Let's Encrypt
4. **Configures firewall** (UFW)
5. **Creates management scripts**:
   - `start.sh` - Start the system
   - `update.sh` - Update to latest version
   - `backup.sh` - Database backup
   - `monitor.sh` - System status
6. **Sets up automated backups** (daily at 2 AM)
7. **Configures SSL certificate renewal**

## Server Requirements

- **OS**: Ubuntu 20.04+ (or compatible Linux distribution)
- **RAM**: 2GB minimum, 4GB recommended
- **Storage**: 20GB minimum
- **Network**: Public IP address with domain pointing to it

## Manual Setup (Alternative to Script)

If you prefer to set up manually or customize the deployment:

### 1. Install Docker

```bash
sudo apt update
sudo apt install -y docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

### 2. Configure Environment

Create `.env` file:
```bash
DATABASE_URL=postgresql://usufruit:YOUR_DB_PASSWORD@postgres:5432/usufruit
NEXTAUTH_SECRET=YOUR_SECURE_RANDOM_STRING
NEXTAUTH_URL=https://yourdomain.com
NODE_ENV=production
```

### 3. Build and Deploy

```bash
docker-compose build
docker-compose up -d postgres
sleep 10  # Wait for database
docker-compose run --rm app npx prisma migrate deploy
docker-compose up -d
```

## Management Commands

After deployment, use these commands to manage your system:

```bash
# Start the system
./start.sh

# Update to latest version (after git pull)
./update.sh

# Create database backup
./backup.sh

# Check system status
./monitor.sh

# View logs
docker-compose logs -f

# Stop system
docker-compose down

# Full restart
docker-compose restart
```

## Security Features

- **Firewall**: Only ports 22 (SSH), 80 (HTTP), and 443 (HTTPS) are open
- **SSL/TLS**: Automatic HTTPS with Let's Encrypt certificates
- **Rate limiting**: API endpoints are rate-limited to prevent abuse
- **Security headers**: HSTS, X-Frame-Options, etc.
- **Database**: PostgreSQL with isolated network access

## Monitoring & Maintenance

### Check System Health
```bash
./monitor.sh
```

### View Application Logs
```bash
docker-compose logs app
```

### Database Access
```bash
docker-compose exec postgres psql -U usufruit usufruit
```

### SSL Certificate Status
```bash
docker-compose exec nginx openssl x509 -in /etc/letsencrypt/live/*/cert.pem -text -noout | grep "Not After"
```

## Backup & Restore

### Automatic Backups
- Daily backups at 2 AM
- Stored in `./backups/` directory
- Last 7 backups are kept

### Manual Backup
```bash
./backup.sh
```

### Restore from Backup
```bash
# Stop the application
docker-compose stop app

# Restore database
gunzip -c backups/usufruit_backup_YYYYMMDD_HHMMSS.sql.gz | docker-compose exec -T postgres psql -U usufruit usufruit

# Start the application
docker-compose start app
```

## Troubleshooting

### Application won't start
```bash
# Check logs
docker-compose logs app

# Restart services
docker-compose restart
```

### Database connection issues
```bash
# Check database status
docker-compose ps postgres

# View database logs
docker-compose logs postgres
```

### SSL certificate issues
```bash
# Check certificate status
docker-compose exec nginx openssl x509 -in /etc/letsencrypt/live/*/cert.pem -text -noout

# Renew certificate manually
docker-compose run --rm certbot renew
docker-compose restart nginx
```

### Domain not accessible
1. Check DNS: `dig yourdomain.com`
2. Check firewall: `sudo ufw status`
3. Check nginx: `docker-compose logs nginx`

## Updating

To update to a newer version:

```bash
git pull origin main
./update.sh
```

## Performance Tuning

For high-traffic deployments, consider:

1. **Increase container resources** in `docker-compose.yml`
2. **Add database connection pooling**
3. **Configure nginx caching**
4. **Set up multiple app instances** with load balancing
5. **Use external database** (managed PostgreSQL)

## Support

If you encounter issues:

1. Check the logs: `docker-compose logs`
2. Review this documentation
3. Check server resources: `./monitor.sh`
4. Verify DNS and SSL setup

## Post-Deployment Setup

After successful deployment:

1. **Visit your domain** (https://yourdomain.com)
2. **Create your first library**
3. **Add yourself as a super librarian**
4. **Configure library settings**
5. **Test the system** with a few books and users
6. **Set up regular monitoring**
