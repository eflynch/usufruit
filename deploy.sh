#!/bin/bash

# Usufruit Library Management System - Deployment Script
# This script sets up the production environment with Docker and Nginx

set -e  # Exit on any error

# Configuration
DOMAIN=""
PROJECT_NAME="usufruit"
DB_PASSWORD=""
NODE_ENV="production"

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
    
    cat > docker-compose.yml << EOF
version: '3.8'

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
      - NEXTAUTH_URL=http://${DOMAIN}
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
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - app
    networks:
      - app-network
    restart: unless-stopped

volumes:
  postgres_data:

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
FROM node:18-alpine AS builder

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
FROM node:18-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

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
CMD ["npm", "run", "start:prod"]
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
            proxy_set_header X-Forwarded-Proto \$scheme;
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

    log_success "Nginx configuration created!"
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
    
    # Create .env file
    cat > .env << EOF
DATABASE_URL=postgresql://usufruit:${DB_PASSWORD}@postgres:5432/usufruit
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
NEXTAUTH_URL=http://${DOMAIN}
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

# Usufruit update script
set -e

log_info() {
    echo -e "\033[0;34m[INFO]\033[0m $1"
}

log_success() {
    echo -e "\033[0;32m[SUCCESS]\033[0m $1"
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

# Pull latest changes
git pull origin main

# Rebuild and restart services
log_info "Rebuilding application..."
$DOCKER_COMPOSE build app

log_info "Running database migrations..."
$DOCKER_COMPOSE run --rm app npx prisma migrate deploy

log_info "Restarting services..."
$DOCKER_COMPOSE up -d

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
$DOCKER_COMPOSE exec nginx openssl x509 -in /etc/letsencrypt/live/*/cert.pem -text -noout | grep -E "(Not After|Subject:)"
EOF

    chmod +x monitor.sh
    log_success "Monitoring script created!"
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

# Main deployment function
main() {
    log_info "Starting Usufruit deployment..."
    
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
    
    # Check if migrations directory exists
    if ! $DOCKER_COMPOSE_CMD run --rm app test -d prisma/migrations; then
        log_info "No migrations found, creating initial migration..."
        if ! $DOCKER_COMPOSE_CMD run --rm app npx prisma migrate dev --name init --skip-seed; then
            log_error "Failed to create initial migration"
            exit 1
        fi
    else
        log_info "Running existing migrations..."
        if ! $DOCKER_COMPOSE_CMD run --rm app npx prisma migrate deploy; then
            log_error "Database migrations failed"
            exit 1
        fi
    fi
    
    # Start all services
    if ! $DOCKER_COMPOSE_CMD up -d; then
        log_error "Failed to start all services"
        exit 1
    fi
    
    log_success "🎉 Usufruit deployment completed successfully!"
    echo
    log_info "Your library management system is now available at: http://${DOMAIN}"
    log_info "Management commands:"
    log_info "  ./start.sh     - Start the system"
    log_info "  ./update.sh    - Update to latest version"
    log_info "  ./backup.sh    - Create database backup"
    log_info "  ./monitor.sh   - Check system status"
    echo
    log_warning "Don't forget to:"
    log_warning "  1. Set up your first super librarian account"
    log_warning "  2. Configure your library details"
    log_warning "  3. Test the backup and restore process"
}

# Run main function
main "$@"
