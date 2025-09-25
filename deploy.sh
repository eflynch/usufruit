#!/bin/bash

# Usufruit Library Management System - Deployment Script
# This script sets up the production environment with Docker and Nginx

set -e  # Exit on any error

# Configuration
DOMAIN=""
PROJECT_NAME="usufruit"
DB_PASSWORD=""
NODE_ENV="production"
ENABLE_SSL="false"
EMAIL=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to detect and use correct Docker Compose command
get_docker_compose_cmd() {
    if command -v docker-compose >/dev/null 2>&1; then
        echo "docker-compose"
    elif docker compose version >/dev/null 2>&1; then
        echo "docker compose"
    else
        log_error "Neither 'docker-compose' nor 'docker compose' is available"
        exit 1
    fi
}

# Set the Docker Compose command
DOCKER_COMPOSE_CMD=""

# Function to prompt for configuration
configure_deployment() {
    log_info "Configuring deployment settings..."
    
    if [ -z "$DOMAIN" ]; then
        read -p "Enter your domain name (e.g., library.yourdomain.com): " DOMAIN
    fi
    
    if [ -z "$DB_PASSWORD" ]; then
        read -s -p "Enter a secure database password: " DB_PASSWORD
        echo
    fi
    
    # Ask about SSL
    read -p "Enable SSL with Let's Encrypt? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ENABLE_SSL="true"
        if [ -z "$EMAIL" ]; then
            read -p "Enter your email for Let's Encrypt notifications: " EMAIL
        fi
    fi
    
    log_success "Configuration completed!"
}

# Function to check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if running as root or with sudo
    if [ "$EUID" -ne 0 ]; then
        log_error "Please run this script with sudo or as root"
        exit 1
    fi
    
    # Check if domain resolves to this server
    SERVER_IP=$(curl -s ifconfig.me)
    DOMAIN_IP=$(dig +short $DOMAIN)
    
    if [ "$SERVER_IP" != "$DOMAIN_IP" ]; then
        log_warning "Domain $DOMAIN does not resolve to this server IP ($SERVER_IP)"
        log_warning "Please update your DNS records before continuing"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    log_success "Prerequisites check completed!"
}

# Function to install Docker and Docker Compose
install_docker() {
    log_info "Installing Docker and Docker Compose..."
    
    # Check if Docker is already installed
    if command -v docker >/dev/null 2>&1; then
        log_success "Docker is already installed, skipping installation"
        return 0
    fi
    
    # Update package index
    apt-get update
    
    # Install prerequisites
    apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
    
    # Check if Docker GPG key already exists
    if [ ! -f /usr/share/keyrings/docker-archive-keyring.gpg ]; then
        # Add Docker's official GPG key
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    fi
    
    # Check if Docker repository is already added
    if [ ! -f /etc/apt/sources.list.d/docker.list ]; then
        # Add Docker repository
        echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
        # Update package index again
        apt-get update
    fi
    
    # Install Docker
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Start and enable Docker (idempotent)
    systemctl start docker || true
    systemctl enable docker || true
    
    # Add current user to docker group (if not root and not already in group)
    if [ "$SUDO_USER" ]; then
        if ! groups $SUDO_USER | grep -q docker; then
            usermod -aG docker $SUDO_USER
        fi
    fi
    
    log_success "Docker installed successfully!"
}

# Function to create Docker Compose configuration
create_docker_compose() {
    log_info "Creating Docker Compose configuration..."
    
    if [ -f docker-compose.yml ]; then
        log_info "docker-compose.yml already exists, backing up and recreating..."
        cp docker-compose.yml docker-compose.yml.backup.$(date +%s)
    fi
    
    # Determine the NEXTAUTH_URL based on SSL setting
    if [ "$ENABLE_SSL" = "true" ]; then
        NEXTAUTH_URL="https://${DOMAIN}"
        SSL_VOLUMES="      - certbot_certs:/etc/letsencrypt:ro"
        SSL_PORTS="      - \"443:443\""
    else
        NEXTAUTH_URL="http://${DOMAIN}"
        SSL_VOLUMES=""
        SSL_PORTS=""
    fi
    
    cat > docker-compose.yml << EOF
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: usufruit
      POSTGRES_USER: usufruit
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app-network
    restart: unless-stopped

  app:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://usufruit:${DB_PASSWORD}@postgres:5432/usufruit
      - NEXTAUTH_SECRET=\${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
    depends_on:
      - postgres
    networks:
      - app-network
    restart: unless-stopped
    ports:
      - "3000:3000"

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
${SSL_PORTS}
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - /var/www/certbot:/var/www/certbot:ro
${SSL_VOLUMES}
    depends_on:
      - app
    networks:
      - app-network
    restart: unless-stopped

volumes:
  postgres_data:$([ "$ENABLE_SSL" = "true" ] && echo "
  certbot_certs:")

networks:
  app-network:
    driver: bridge
EOF

    log_success "Docker Compose configuration created!"
}

# Function to create Dockerfile
create_dockerfile() {
    log_info "Creating Dockerfile..."
    
    if [ -f Dockerfile ]; then
        log_info "Dockerfile already exists, backing up and recreating..."
        cp Dockerfile Dockerfile.backup.$(date +%s)
    fi
    
    cat > Dockerfile << 'EOF'
# Build stage
FROM node:18-bullseye-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/usufruit/package*.json ./apps/usufruit/
COPY database/package*.json ./database/
COPY models/package*.json ./models/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Debug: Show the project structure
RUN echo "=== Project Structure ===" && \
    ls -la && \
    echo "=== Apps Directory ===" && \
    ls -la apps/ && \
    echo "=== Database Directory ===" && \
    ls -la database/ && \
    echo "=== Models Directory ===" && \
    ls -la models/

# Generate Prisma client
RUN npx prisma generate

RUN echo "=== Building Next.js app ===" && \
    npx nx build usufruit --verbose

# Production stage
FROM node:18-bullseye-slim AS runner

WORKDIR /app

# Create non-root user
RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 --gid nodejs --shell /bin/bash --create-home nextjs

# Copy only what we need for production
COPY --from=builder --chown=nextjs:nodejs /app/apps/usufruit/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/apps/usufruit/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/usufruit/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy Prisma client (needed for database operations)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Start the application
CMD ["npx", "next", "start"]
EOF

    log_success "Dockerfile created!"
    
    # Create .dockerignore for optimized builds
    if [ -f .dockerignore ]; then
        log_info ".dockerignore already exists, backing up and recreating..."
        cp .dockerignore .dockerignore.backup.$(date +%s)
    fi
    
    cat > .dockerignore << 'EOF'
# Dependencies
node_modules
npm-debug.log*

# Production builds
.next
dist

# Environment files
.env
.env.local
.env.production
.env.staging

# Development files
.git
.gitignore
README.md
DEPLOYMENT.md
QUICK_DEPLOY.md

# IDE
.vscode
.idea

# OS generated files
.DS_Store
Thumbs.db

# Logs
logs
*.log

# Coverage
coverage

# Testing
.nyc_output

# Misc
.eslintcache
EOF

    log_success ".dockerignore created!"
}

# Function to create Nginx configuration
create_nginx_config() {
    log_info "Creating Nginx configuration..."
    
    if [ -f nginx.conf ]; then
        log_info "nginx.conf already exists, backing up and recreating..."
        cp nginx.conf nginx.conf.backup.$(date +%s)
    fi
    
    if [ "$ENABLE_SSL" = "true" ]; then
        create_ssl_nginx_config
    else
        create_http_nginx_config
    fi
    
    log_success "Nginx configuration created!"
}

# Function to create HTTP-only Nginx configuration
create_http_nginx_config() {
    cat > nginx.conf << EOF
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;

    # HTTP server
    server {
        listen 80;
        server_name ${DOMAIN};
        
        # Let's Encrypt challenge location - MUST be before other locations
        location ^~ /.well-known/acme-challenge/ {
            root /var/www/certbot;
            try_files \$uri \$uri/ =404;
            allow all;
        }
        
        # Static file caching - specific paths first
        location /_next/static/ {
            proxy_pass http://app;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        # Gzip compression
        gzip on;
        gzip_vary on;
        gzip_min_length 1024;
        gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

        # Client max body size (for file uploads)
        client_max_body_size 10M;
        
        # General proxy - MUST be last
        location / {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_cache_bypass \$http_upgrade;
            
            # Rate limiting
            limit_req zone=api burst=20 nodelay;
        }
    }
}
EOF
}

# Function to create SSL-enabled Nginx configuration
create_ssl_nginx_config() {
    cat > nginx.conf << EOF
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;

    # HTTP server - redirect to HTTPS
    server {
        listen 80;
        server_name ${DOMAIN};
        
        # Let's Encrypt challenge location
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        
        # Redirect all HTTP traffic to HTTPS
        location / {
            return 301 https://\$server_name\$request_uri;
        }
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name ${DOMAIN};
        
        # SSL configuration
        ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
        
        # SSL settings
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;
        
        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Content-Type-Options nosniff;
        add_header X-Frame-Options DENY;
        add_header X-XSS-Protection "1; mode=block";
        
        # Gzip compression
        gzip on;
        gzip_vary on;
        gzip_min_length 1024;
        gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

        # Client max body size (for file uploads)
        client_max_body_size 10M;
        
        location / {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto https;
            proxy_cache_bypass \$http_upgrade;
            
            # Rate limiting
            limit_req zone=api burst=20 nodelay;
        }

        # Static file caching
        location /_next/static/ {
            proxy_pass http://app;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
EOF
}

# Function to generate secure secrets
generate_secrets() {
    log_info "Generating secure secrets..."
    
    if [ -f .env ]; then
        log_info ".env file already exists, backing up and regenerating..."
        cp .env .env.backup.$(date +%s)
    fi
    
    # Generate NEXTAUTH_SECRET (or reuse existing one)
    if [ -f .env.backup.* ] && grep -q "NEXTAUTH_SECRET=" .env.backup.* 2>/dev/null; then
        NEXTAUTH_SECRET=$(grep "NEXTAUTH_SECRET=" .env.backup.* | tail -1 | cut -d'=' -f2)
        log_info "Reusing existing NEXTAUTH_SECRET from backup"
    else
        NEXTAUTH_SECRET=$(openssl rand -base64 32)
        log_info "Generated new NEXTAUTH_SECRET"
    fi
    
    # Determine the NEXTAUTH_URL based on SSL setting
    if [ "$ENABLE_SSL" = "true" ]; then
        NEXTAUTH_URL="https://${DOMAIN}"
    else
        NEXTAUTH_URL="http://${DOMAIN}"
    fi
    
    # Create .env file
    cat > .env << EOF
DATABASE_URL=postgresql://usufruit:${DB_PASSWORD}@postgres:5432/usufruit
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
NEXTAUTH_URL=${NEXTAUTH_URL}
NODE_ENV=production
EOF

    chmod 600 .env
    log_success "Secrets generated and stored in .env file!"
}

# Function to create startup script
create_startup_script() {
    log_info "Creating startup script..."
    
    if [ -f start.sh ]; then
        log_info "start.sh already exists, backing up and recreating..."
        cp start.sh start.sh.backup.$(date +%s)
    fi
    
    cat > start.sh << 'EOF'
#!/bin/bash

# Usufruit startup script
set -e

log_info() {
    echo -e "\033[0;34m[INFO]\033[0m $1"
}

log_success() {
    echo -e "\033[0;32m[SUCCESS]\033[0m $1"
}

log_info "Starting Usufruit Library Management System..."

# Detect Docker Compose command
if command -v docker-compose >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker-compose"
elif docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
else
    echo "Error: Neither 'docker-compose' nor 'docker compose' is available"
    exit 1
fi

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Run database migrations
log_info "Running database migrations..."
$DOCKER_COMPOSE exec -T app npx prisma migrate deploy

# Start all services
log_info "Starting all services..."
$DOCKER_COMPOSE up -d

log_success "Usufruit is now running!"
log_info "Visit http://$(grep NEXTAUTH_URL .env | cut -d'=' -f2 | sed 's|http://||') to access your library system"
EOF

    chmod +x start.sh
    log_success "Startup script created!"
}

# Function to create update script
create_update_script() {
    log_info "Creating update script..."
    
    if [ -f update.sh ]; then
        log_info "update.sh already exists, backing up and recreating..."
        cp update.sh update.sh.backup.$(date +%s)
    fi
    
    cat > update.sh << 'EOF'
#!/bin/bash

# Usufruit update script with memory management
set -e

log_info() {
    echo -e "\033[0;34m[INFO]\033[0m $1"
}

log_success() {
    echo -e "\033[0;32m[SUCCESS]\033[0m $1"
}

log_warning() {
    echo -e "\033[1;33m[WARNING]\033[0m $1"
}

log_info "Updating Usufruit Library Management System..."

# Detect Docker Compose command
if command -v docker-compose >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker-compose"
elif docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
else
    echo "Error: Neither 'docker-compose' nor 'docker compose' is available"
    exit 1
fi

# Show current Docker usage
log_info "Current Docker usage:"
docker system df

# Clean up before building to prevent memory issues
log_info "Cleaning up Docker artifacts to free memory..."
docker image prune -f
docker builder prune -f

# Pull latest changes
log_info "Pulling latest changes..."
git pull origin main

# Rebuild and restart services
log_info "Rebuilding application..."
$DOCKER_COMPOSE build app

log_info "Running database migrations..."
$DOCKER_COMPOSE run --rm app npx prisma migrate deploy

log_info "Restarting services..."
$DOCKER_COMPOSE up -d

# Final cleanup to prevent accumulation
log_info "Final cleanup..."
docker image prune -f

# Show final usage
log_info "Final Docker usage:"
docker system df

log_success "Usufruit has been updated successfully!"
EOF

    chmod +x update.sh
    log_success "Update script created!"
}

# Function to create monitoring script
create_monitoring_script() {
    log_info "Creating monitoring script..."
    
    if [ -f monitor.sh ]; then
        log_info "monitor.sh already exists, backing up and recreating..."
        cp monitor.sh monitor.sh.backup.$(date +%s)
    fi
    
    cat > monitor.sh << 'EOF'
#!/bin/bash

# Usufruit monitoring script

# Detect Docker Compose command
if command -v docker-compose >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker-compose"
elif docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
else
    echo "Error: Neither 'docker-compose' nor 'docker compose' is available"
    exit 1
fi

echo "=== Usufruit System Status ==="
echo

echo "Docker Services:"
$DOCKER_COMPOSE ps

echo
echo "System Resources:"
echo "Memory Usage:"
free -h

echo
echo "Disk Usage:"
df -h

echo
echo "Recent Logs (last 20 lines):"
$DOCKER_COMPOSE logs --tail=20

echo
echo "SSL Certificate Status:"
if docker volume ls | grep -q "certbot_certs"; then
    if $DOCKER_COMPOSE exec -T nginx test -f /etc/letsencrypt/live/*/cert.pem 2>/dev/null; then
        $DOCKER_COMPOSE exec -T nginx openssl x509 -in /etc/letsencrypt/live/*/cert.pem -text -noout | grep -E "(Not After|Subject:)" || echo "SSL certificate files found but could not read details"
    else
        echo "SSL volumes exist but no certificate files found"
    fi
else
    echo "SSL not configured (no certificate volumes found)"
fi
EOF

    chmod +x monitor.sh
    log_success "Monitoring script created!"
}

# Function to install certbot
install_certbot() {
    log_info "Installing Certbot for SSL certificates..."
    
    # Check if certbot is already installed
    if command -v certbot >/dev/null 2>&1; then
        log_success "Certbot is already installed, skipping installation"
        return 0
    fi
    
    # Update package index
    apt-get update
    
    # Install certbot
    apt-get install -y certbot
    
    log_success "Certbot installed successfully!"
}

# Function to obtain SSL certificate
obtain_ssl_certificate() {
    log_info "Obtaining SSL certificate from Let's Encrypt..."
    
    # Get Docker Compose command
    local DOCKER_COMPOSE=$(get_docker_compose_cmd)
    
    # Create directory for webroot challenge
    mkdir -p /var/www/certbot
    chmod 755 /var/www/certbot
    
    # Check if certificate already exists
    if [ -d "/etc/letsencrypt/live/${DOMAIN}" ]; then
        log_success "SSL certificate already exists for ${DOMAIN}, skipping..."
        return 0
    fi
    
    # Make sure we have HTTP-only configuration first
    log_info "Creating temporary HTTP-only nginx configuration for certificate validation..."
    ENABLE_SSL="false"
    create_nginx_config
    
    # Start nginx to serve the challenge
    log_info "Starting nginx for certificate validation..."
    $DOCKER_COMPOSE up -d nginx
    
    # Wait for nginx to be ready and test it
    log_info "Waiting for nginx to be ready..."
    sleep 10
    
    # Test that nginx is serving correctly
    if ! curl -s "http://${DOMAIN}/.well-known/acme-challenge/test" | grep -q "404"; then
        log_warning "Nginx might not be serving challenge files correctly, but continuing..."
    fi
    
    # Obtain certificate using webroot method
    if certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email ${EMAIL} \
        --agree-tos \
        --no-eff-email \
        --domains ${DOMAIN} \
        --non-interactive; then
        
        log_success "SSL certificate obtained successfully!"
        
        # Re-enable SSL now that we have the certificate
        ENABLE_SSL="true"
        
        # Create certificate volume for Docker
        log_info "Setting up certificate volume..."
        docker volume create ${PROJECT_NAME}_certbot_certs 2>/dev/null || true
        
        # Copy certificates to volume
        docker run --rm -v /etc/letsencrypt:/src:ro -v ${PROJECT_NAME}_certbot_certs:/dest alpine sh -c "cp -r /src/* /dest/"
        
    else
        log_error "Failed to obtain SSL certificate"
        log_warning "Continuing with HTTP-only configuration..."
        ENABLE_SSL="false"
        return 1
    fi
}

# Function to setup SSL certificate renewal
setup_ssl_renewal() {
    log_info "Setting up SSL certificate auto-renewal..."
    
    # Create renewal script
    cat > renew_ssl.sh << EOF
#!/bin/bash
# SSL Certificate Renewal Script

set -e

log_info() {
    echo -e "\033[0;34m[INFO]\033[0m \$1"
}

log_success() {
    echo -e "\033[0;32m[SUCCESS]\033[0m \$1"
}

log_error() {
    echo -e "\033[0;31m[ERROR]\033[0m \$1"
}

# Detect Docker Compose command
if command -v docker-compose >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker-compose"
elif docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
else
    log_error "Neither 'docker-compose' nor 'docker compose' is available"
    exit 1
fi

log_info "Renewing SSL certificates..."

# Renew certificates
if certbot renew --webroot --webroot-path=/var/www/certbot --quiet; then
    log_success "SSL certificates renewed successfully!"
    
    # Update Docker volumes with new certificates
    docker run --rm -v /etc/letsencrypt:/src:ro -v usufruit_certbot_certs:/dest alpine sh -c "cp -r /src/* /dest/"
    
    # Reload nginx
    \$DOCKER_COMPOSE exec nginx nginx -s reload
    
    log_success "Nginx reloaded with new certificates!"
else
    log_error "Failed to renew SSL certificates"
    exit 1
fi
EOF

    chmod +x renew_ssl.sh
    
    # Setup cron job for automatic renewal (only if not already exists)
    if [ ! -f /etc/cron.d/usufruit-ssl-renewal ]; then
        cat > /etc/cron.d/usufruit-ssl-renewal << EOF
# Usufruit SSL Certificate Renewal
# Runs twice daily to check for certificate renewal
0 12 * * * cd $(pwd) && ./renew_ssl.sh
0 0 * * * cd $(pwd) && ./renew_ssl.sh
EOF
        log_info "SSL renewal cron job created"
    else
        log_info "SSL renewal cron job already exists, skipping..."
    fi
    
    log_success "SSL auto-renewal configured!"
}

# Function to setup firewall
setup_firewall() {
    log_info "Configuring firewall..."
    
    # Install ufw if not present
    apt-get install -y ufw
    
    # Only reset if not already configured for our service
    if ! ufw status | grep -q "80/tcp"; then
        log_info "Configuring firewall rules..."
        # Reset firewall rules
        ufw --force reset
        
        # Set default policies
        ufw default deny incoming
        ufw default allow outgoing
        
        # Allow SSH
        ufw allow ssh
        
        # Allow HTTP and HTTPS
        ufw allow 80/tcp
        ufw allow 443/tcp
        
        # Enable firewall
        ufw --force enable
    else
        log_info "Firewall already configured, skipping..."
    fi
    
    log_success "Firewall configured!"
}

# Function to create backup script
create_backup_script() {
    log_info "Creating backup script..."
    
    mkdir -p backups
    
    if [ -f backup.sh ]; then
        log_info "backup.sh already exists, backing up and recreating..."
        cp backup.sh backup.sh.backup.$(date +%s)
    fi
    
    cat > backup.sh << 'EOF'
#!/bin/bash

# Usufruit backup script
set -e

BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="usufruit_backup_${DATE}.sql"

log_info() {
    echo -e "\033[0;34m[INFO]\033[0m $1"
}

log_success() {
    echo -e "\033[0;32m[SUCCESS]\033[0m $1"
}

# Detect Docker Compose command
if command -v docker-compose >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker-compose"
elif docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
else
    echo "Error: Neither 'docker-compose' nor 'docker compose' is available"
    exit 1
fi

log_info "Creating database backup..."

# Create database backup
$DOCKER_COMPOSE exec -T postgres pg_dump -U usufruit usufruit > "${BACKUP_DIR}/${BACKUP_FILE}"

# Compress backup
gzip "${BACKUP_DIR}/${BACKUP_FILE}"

# Keep only last 7 backups
cd "${BACKUP_DIR}"
ls -t usufruit_backup_*.sql.gz | tail -n +8 | xargs -r rm

log_success "Backup created: ${BACKUP_FILE}.gz"
log_info "Available backups:"
ls -la usufruit_backup_*.sql.gz
EOF

    chmod +x backup.sh
    
    # Setup daily backups (only if not already exists)
    if [ ! -f /etc/cron.d/usufruit-backup ]; then
        cat > /etc/cron.d/usufruit-backup << EOF
0 2 * * * cd $(pwd) && ./backup.sh
EOF
        log_info "Daily backup cron job created"
    else
        log_info "Daily backup cron job already exists, skipping..."
    fi

    log_success "Backup script created with daily automation!"
}

# Function to add SSL to existing deployment
add_ssl_to_existing() {
    log_info "Adding SSL to existing Usufruit deployment..."
    
    # Get Docker Compose command
    local DOCKER_COMPOSE=$(get_docker_compose_cmd)
    
    if [ ! -f docker-compose.yml ] || [ ! -f .env ]; then
        log_error "No existing deployment found. Please run a full deployment first."
        exit 1
    fi
    
    # Get existing configuration from .env file
    DOMAIN=$(grep "NEXTAUTH_URL=" .env | cut -d'=' -f2 | sed 's|https\?://||')
    
    if [ -z "$DOMAIN" ]; then
        log_error "Could not determine domain from existing configuration"
        exit 1
    fi
    
    # Extract database password from existing DATABASE_URL
    DB_PASSWORD=$(grep "DATABASE_URL=" .env | sed 's/.*:\/\/usufruit:\([^@]*\)@.*/\1/')
    
    if [ -z "$DB_PASSWORD" ]; then
        log_warning "Database password missing from existing configuration"
        read -s -p "Enter the database password: " DB_PASSWORD
        echo
        if [ -z "$DB_PASSWORD" ]; then
            log_error "Database password is required"
            exit 1
        fi
    fi
    
    # Ask for email
    read -p "Enter your email for Let's Encrypt notifications: " EMAIL
    
    ENABLE_SSL="true"
    
    # Install certbot
    install_certbot
    
    # Obtain certificate
    if obtain_ssl_certificate; then
        # Ensure SSL is enabled for config recreation
        ENABLE_SSL="true"
        log_info "Certificate obtained, enabling SSL configuration..."
    else
        log_error "Failed to obtain SSL certificate, aborting SSL setup"
        return 1
    fi
    
    # Recreate configurations with SSL
    create_docker_compose
    create_nginx_config
    generate_secrets
    
    # Restart services
    $DOCKER_COMPOSE down
    $DOCKER_COMPOSE up -d
    
    setup_ssl_renewal
    
    log_success "🎉 SSL has been added to your Usufruit deployment!"
    log_info "Your library management system is now available at: https://${DOMAIN}"
}

# Main deployment function
main() {
    log_info "Starting Usufruit deployment..."
    
    # Check for special flags
    if [[ "$1" == "--add-ssl" ]]; then
        add_ssl_to_existing
        exit 0
    fi
    
    # Check if this appears to be a re-run
    if [ -f docker-compose.yml ] && [ -f .env ]; then
        log_warning "Deployment files already exist. This appears to be a re-run."
        log_info "Existing files will be backed up before being replaced."
        read -p "Continue with deployment? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Deployment cancelled by user."
            exit 0
        fi
    fi
    
    configure_deployment
    check_prerequisites
    install_docker
    
    # Set up Docker Compose command after Docker installation
    DOCKER_COMPOSE_CMD=$(get_docker_compose_cmd)
    log_info "Using Docker Compose command: $DOCKER_COMPOSE_CMD"
    
    # Install certbot if SSL is enabled
    if [ "$ENABLE_SSL" = "true" ]; then
        install_certbot
    fi
    
    create_dockerfile
    create_docker_compose
    create_nginx_config
    generate_secrets
    create_startup_script
    create_update_script
    create_monitoring_script
    create_backup_script
    setup_firewall
    
    log_info "Building and starting services..."
    
    # Build the application
    if ! $DOCKER_COMPOSE_CMD build; then
        log_error "Failed to build application containers"
        exit 1
    fi
    
    # Start database first
    if ! $DOCKER_COMPOSE_CMD up -d postgres; then
        log_error "Failed to start database"
        exit 1
    fi
    
    # Wait for database to be ready
    log_info "Waiting for database to be ready..."
    sleep 10
    
    # Check if database is responsive
    for i in {1..30}; do
        if $DOCKER_COMPOSE_CMD exec -T postgres pg_isready -U usufruit; then
            log_success "Database is ready!"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "Database failed to become ready within 30 attempts"
            exit 1
        fi
        log_info "Waiting for database... (attempt $i/30)"
        sleep 2
    done
    
    # Run database migrations or create initial migration
    log_info "Setting up database schema..."
    
    # Check if we need to force reset (for fresh deployments)
    if [[ "$1" == "--reset-db" ]] || [[ "$1" == "--fresh" ]]; then
        log_warning "Forcing database reset as requested..."
        $DOCKER_COMPOSE_CMD run --rm app npx prisma migrate reset --force --skip-seed || true
    fi
    
    # For initial deployment, just use db push to get the schema in place
    # This avoids migration complexity for the first deployment
    log_info "Syncing database schema..."
    if ! $DOCKER_COMPOSE_CMD run --rm app npx prisma db push --accept-data-loss; then
        log_error "Failed to sync database schema"
        exit 1
    fi
    
    log_success "Database schema synchronized successfully!"
    
    # Setup SSL if enabled
    if [ "$ENABLE_SSL" = "true" ]; then
        log_info "Setting up SSL certificates..."
        obtain_ssl_certificate
        
        # Recreate nginx config with SSL and restart
        create_nginx_config
        $DOCKER_COMPOSE_CMD restart nginx
        
        setup_ssl_renewal
    fi
    
    # Start all services
    if ! $DOCKER_COMPOSE_CMD up -d; then
        log_error "Failed to start all services"
        exit 1
    fi
    
    log_success "🎉 Usufruit deployment completed successfully!"
    echo
    if [ "$ENABLE_SSL" = "true" ]; then
        log_info "Your library management system is now available at: https://${DOMAIN}"
        log_success "SSL certificate installed and auto-renewal configured!"
    else
        log_info "Your library management system is now available at: http://${DOMAIN}"
        log_info "To add SSL later, run: sudo ./deploy.sh --add-ssl"
    fi
    log_info "Management commands:"
    log_info "  ./start.sh      - Start the system"
    log_info "  ./update.sh     - Update to latest version"
    log_info "  ./backup.sh     - Create database backup"
    log_info "  ./monitor.sh    - Check system status"
    if [ "$ENABLE_SSL" = "true" ]; then
        log_info "  ./renew_ssl.sh  - Manually renew SSL certificates"
    else
        log_info "  sudo ./deploy.sh --add-ssl - Add SSL to existing deployment"
    fi
    echo
    log_warning "Don't forget to:"
    log_warning "  1. Set up your first super librarian account"
    log_warning "  2. Configure your library details"
    log_warning "  3. Test the backup and restore process"
    if [ "$ENABLE_SSL" = "true" ]; then
        log_warning "  4. SSL certificates will auto-renew (check logs periodically)"
    fi
}

# Run main function
main "$@"
