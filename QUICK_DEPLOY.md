# Quick Deployment Checklist

## Before You Start

✅ **Server Requirements**
- Ubuntu 20.04+ server with public IP
- 2GB+ RAM, 20GB+ storage
- Root or sudo access
- Domain name pointing to server IP

✅ **Pre-deployment Setup**
1. Purchase/configure domain name
2. Set DNS A record: `yourdomain.com` → `your-server-ip`
3. Ensure SSH access to your server

## Deployment Steps

### 1. Connect to Your Server
```bash
ssh root@your-server-ip
# or
ssh your-username@your-server-ip
```

### 2. Clone and Deploy
```bash
# Clone the repository
git clone https://github.com/eflynch/usufruit.git
cd usufruit

# Run the automated deployment (safe to re-run)
sudo ./deploy.sh
```

**Note:** The deployment script is **idempotent** - you can safely run it multiple times. It will:
- Skip already-installed components (like Docker)
- Backup existing configuration files before replacing them
- Reuse existing SSL certificates and secrets
- Prompt before overwriting existing deployments

### 3. Follow the Prompts
The script will ask for:
- **Domain name**: `library.yourdomain.com`
- **Email**: `your-email@domain.com` (for SSL certificates)
- **Database password**: Create a strong password

### 4. Wait for Completion
The script will:
- Install Docker
- Set up SSL certificates
- Start all services
- Configure firewall
- Set up monitoring

## Post-Deployment

### 1. Test Your Site
Visit `https://yourdomain.com` - you should see the Usufruit homepage

### 2. Create Your First Library
1. Click "create a library"
2. Fill in library details
3. Save your librarian login key

### 3. Set Up Your Account
1. Use the librarian login link
2. Promote yourself to super librarian
3. Configure library settings

## Management Commands

Once deployed, use these commands on your server:

```bash
# Start the system
./start.sh

# Check system status
./monitor.sh

# Create backup
./backup.sh

# Update to new version
git pull
./update.sh

# View logs
docker-compose logs -f
```

## Troubleshooting

### Site Not Loading
1. Check DNS: `dig yourdomain.com`
2. Check services: `docker-compose ps`
3. Check logs: `docker-compose logs nginx`

### SSL Certificate Issues
```bash
# Check certificate status
./monitor.sh

# Manually renew if needed
docker-compose run --rm certbot renew
docker-compose restart nginx
```

### Application Errors
```bash
# Check application logs
docker-compose logs app

# Restart application
docker-compose restart app
```

## Security Notes

- Change default passwords
- Keep system updated: `apt update && apt upgrade`
- Monitor logs regularly: `./monitor.sh`
- Test backups: `./backup.sh`

## Support

- Check `/status` endpoint for system health
- Review deployment logs in `/var/log/`
- Monitor resource usage: `htop` or `free -h`

---

🎉 **Congratulations!** Your Usufruit library management system is now live!
