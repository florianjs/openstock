#!/bin/bash

# ==============================================================================
# OpenStock v2 - Installation & Deployment Script
# ==============================================================================
# This script automates the complete setup process for new users.
# It handles prerequisites, Cloudflare resources, database migrations,
# and deployment to Cloudflare Pages.
#
# Usage:
#   ./install.sh              Full installation and deployment
#   ./install.sh --dev        Development setup only (no deployment)
#   ./install.sh --deploy     Skip setup, deploy only
#   ./install.sh --help       Show this help message
# ==============================================================================

set -e  # Exit on error

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
PROJECT_NAME="openstock-v2"
DB_NAME="openstock-db"
KV_NAME="openstock_kv"
MIGRATIONS_DIR="migrations"

# -----------------------------------------------------------------------------
# Colors & Formatting
# -----------------------------------------------------------------------------
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------
print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}${BOLD}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_step() {
    echo -e "\n${CYAN}[$1/$TOTAL_STEPS]${NC} ${BOLD}$2${NC}"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

show_help() {
    echo "Usage: ./install.sh [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --dev       Development setup only (installs deps, creates .env, skips deploy)"
    echo "  --deploy    Skip setup steps, build and deploy only"
    echo "  --no-deploy Full setup without deployment"
    echo "  --help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./install.sh              # Full installation and deployment"
    echo "  ./install.sh --dev        # Local development setup"
    echo "  ./install.sh --deploy     # Deploy existing setup"
    exit 0
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        return 1
    fi
    return 0
}

# -----------------------------------------------------------------------------
# Parse Arguments
# -----------------------------------------------------------------------------
MODE="full"
while [[ $# -gt 0 ]]; do
    case $1 in
        --dev)
            MODE="dev"
            shift
            ;;
        --deploy)
            MODE="deploy"
            shift
            ;;
        --no-deploy)
            MODE="no-deploy"
            shift
            ;;
        --help|-h)
            show_help
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information."
            exit 1
            ;;
    esac
done

# Set total steps based on mode
case $MODE in
    "dev")
        TOTAL_STEPS=4
        ;;
    "deploy")
        TOTAL_STEPS=2
        ;;
    "no-deploy")
        TOTAL_STEPS=6
        ;;
    *)
        TOTAL_STEPS=7
        ;;
esac

# -----------------------------------------------------------------------------
# Banner
# -----------------------------------------------------------------------------
print_header "OpenStock v2 - Installer & Deployer"
echo -e "  ${CYAN}Mode:${NC} $MODE"
echo -e "  ${CYAN}Project:${NC} $PROJECT_NAME"

# -----------------------------------------------------------------------------
# Step 1: Prerequisites Check
# -----------------------------------------------------------------------------
STEP=1
print_step $STEP "Checking prerequisites"

# Check for Node.js
if ! check_command node; then
    print_error "Node.js is not installed."
    echo -e "  ${YELLOW}Please install Node.js (v18 or later) from https://nodejs.org/${NC}"
    echo -e "  ${YELLOW}Or use a version manager like nvm: https://github.com/nvm-sh/nvm${NC}"
    exit 1
fi

NODE_VERSION=$(node -v)
NODE_MAJOR=$(echo "$NODE_VERSION" | sed 's/v//' | cut -d. -f1)

if [ "$NODE_MAJOR" -lt 18 ]; then
    print_error "Node.js version $NODE_VERSION is not supported."
    echo -e "  ${YELLOW}Please upgrade to Node.js v18 or later.${NC}"
    exit 1
fi
print_success "Node.js $NODE_VERSION detected"

# Check for npm
if ! check_command npm; then
    print_error "npm is not installed."
    exit 1
fi
NPM_VERSION=$(npm -v)
print_success "npm v$NPM_VERSION detected"

# Check for git (optional but recommended)
if check_command git; then
    GIT_VERSION=$(git --version | cut -d' ' -f3)
    print_success "git v$GIT_VERSION detected"
else
    print_warning "git is not installed (optional but recommended)"
fi

# If deploy mode, skip to deployment
if [ "$MODE" = "deploy" ]; then
    STEP=$((STEP + 1))
    print_step $STEP "Building and deploying"
    
    echo "Building project..."
    npm run build
    
    echo "Deploying to Cloudflare Pages..."
    npx wrangler pages deploy .output/public --project-name "$PROJECT_NAME" --branch main --commit-dirty=true
    
    print_header "Deployment Complete!"
    echo -e "  ${GREEN}Your app is being deployed to Cloudflare Pages.${NC}"
    echo -e "  ${CYAN}Check your Cloudflare dashboard for the live URL.${NC}"
    exit 0
fi

# -----------------------------------------------------------------------------
# Step 2: Install Dependencies
# -----------------------------------------------------------------------------
STEP=$((STEP + 1))
print_step $STEP "Installing dependencies"

echo "Running npm install..."
if npm install; then
    print_success "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# -----------------------------------------------------------------------------
# Step 3: Environment Setup
# -----------------------------------------------------------------------------
STEP=$((STEP + 1))
print_step $STEP "Setting up environment"

if [ -f .env ]; then
    print_warning ".env file already exists, skipping creation"
    print_info "Delete .env and re-run if you want to regenerate it"
else
    if [ -f .env.example ]; then
        cp .env.example .env
        
        # Generate a secure random password (32 characters)
        PASS=$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')
        
        # Update the password in .env (cross-platform compatible)
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/randomly-generated-password-here-32-characters-minimum/$PASS/" .env
        else
            sed -i "s/randomly-generated-password-here-32-characters-minimum/$PASS/" .env
        fi
        
        print_success ".env file created with secure session password"
    else
        print_warning ".env.example not found, creating minimal .env"
        PASS=$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')
        echo "NUXT_SESSION_PASSWORD=$PASS" > .env
        print_success ".env file created"
    fi
fi

# If dev mode, stop here
if [ "$MODE" = "dev" ]; then
    STEP=$((STEP + 1))
    print_step $STEP "Development setup complete"
    
    print_header "Development Setup Complete!"
    echo ""
    echo -e "  ${CYAN}Start the development server:${NC}"
    echo -e "    ${BOLD}npm run dev${NC}"
    echo ""
    echo -e "  ${CYAN}The app will be available at:${NC}"
    echo -e "    ${BOLD}http://localhost:3000${NC}"
    echo ""
    echo -e "  ${CYAN}To deploy later, run:${NC}"
    echo -e "    ${BOLD}./install.sh --deploy${NC}"
    exit 0
fi

# -----------------------------------------------------------------------------
# Step 4: Cloudflare Authentication
# -----------------------------------------------------------------------------
STEP=$((STEP + 1))
print_step $STEP "Authenticating with Cloudflare"

print_info "A browser window will open to authorize Cloudflare"
echo "If already logged in, this will be quick."

if npx wrangler whoami &> /dev/null; then
    ACCOUNT=$(npx wrangler whoami 2>&1 | grep -oE "account.*" | head -1 || echo "authenticated")
    print_success "Already authenticated with Cloudflare"
else
    if npx wrangler login; then
        print_success "Cloudflare authentication successful"
    else
        print_error "Cloudflare authentication failed"
        echo -e "  ${YELLOW}Try running 'npx wrangler login' manually${NC}"
        exit 1
    fi
fi

# -----------------------------------------------------------------------------
# Step 5: Resource Creation (D1 & KV)
# -----------------------------------------------------------------------------
STEP=$((STEP + 1))
print_step $STEP "Setting up Cloudflare resources"

# --- D1 Database ---
echo ""
echo "Setting up D1 Database '$DB_NAME'..."

# Check if database exists, create if not
DB_EXISTS=$(npx wrangler d1 list --json 2>/dev/null | node -e "
    const data = require('fs').readFileSync(0, 'utf8');
    try {
        const dbs = JSON.parse(data);
        const exists = dbs.some(d => d.name === '$DB_NAME');
        console.log(exists ? 'true' : 'false');
    } catch(e) { console.log('false'); }
" 2>/dev/null || echo "false")

if [ "$DB_EXISTS" = "false" ]; then
    echo "Creating D1 database..."
    npx wrangler d1 create "$DB_NAME" 2>/dev/null || true
    sleep 2  # Wait for propagation
fi

# Get the Database ID
DB_ID=$(npx wrangler d1 list --json 2>/dev/null | node -e "
    const data = require('fs').readFileSync(0, 'utf8');
    try {
        const dbs = JSON.parse(data);
        const db = dbs.find(d => d.name === '$DB_NAME');
        if(db) console.log(db.uuid);
    } catch(e) {}
" 2>/dev/null)

if [ -z "$DB_ID" ]; then
    print_error "Could not retrieve D1 Database ID"
    echo -e "  ${YELLOW}Try creating it manually: npx wrangler d1 create $DB_NAME${NC}"
    exit 1
fi
print_success "D1 Database ready (ID: ${DB_ID:0:8}...)"

# --- KV Namespace ---
echo ""
echo "Setting up KV Namespace '$KV_NAME'..."

# Check if KV exists, create if not
KV_EXISTS=$(npx wrangler kv:namespace list --json 2>/dev/null | node -e "
    const data = require('fs').readFileSync(0, 'utf8');
    try {
        const kvs = JSON.parse(data);
        const exists = kvs.some(k => k.title === '$KV_NAME');
        console.log(exists ? 'true' : 'false');
    } catch(e) { console.log('false'); }
" 2>/dev/null || echo "false")

if [ "$KV_EXISTS" = "false" ]; then
    echo "Creating KV namespace..."
    npx wrangler kv:namespace create "$KV_NAME" 2>/dev/null || true
    sleep 2  # Wait for propagation
fi

# Get the KV ID
KV_ID=$(npx wrangler kv:namespace list --json 2>/dev/null | node -e "
    const data = require('fs').readFileSync(0, 'utf8');
    try {
        const kvs = JSON.parse(data);
        const kv = kvs.find(k => k.title === '$KV_NAME');
        if(kv) console.log(kv.id);
    } catch(e) {}
" 2>/dev/null)

if [ -z "$KV_ID" ]; then
    print_error "Could not retrieve KV Namespace ID"
    echo -e "  ${YELLOW}Try creating it manually: npx wrangler kv:namespace create $KV_NAME${NC}"
    exit 1
fi
print_success "KV Namespace ready (ID: ${KV_ID:0:8}...)"

# --- Update wrangler.toml ---
echo ""
echo "Updating wrangler.toml..."

# Backup existing file
cp wrangler.toml wrangler.toml.bak

# Update Database ID (cross-platform compatible)
if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/database_id = \".*\"/database_id = \"$DB_ID\"/" wrangler.toml
    # Update KV ID (find the line under [[kv_namespaces]] section)
    sed -i '' "/^\[\[kv_namespaces\]\]/,/^id = / s/^id = \".*\"/id = \"$KV_ID\"/" wrangler.toml
else
    sed -i "s/database_id = \".*\"/database_id = \"$DB_ID\"/" wrangler.toml
    sed -i "/^\[\[kv_namespaces\]\]/,/^id = / s/^id = \".*\"/id = \"$KV_ID\"/" wrangler.toml
fi

print_success "wrangler.toml updated (backup saved as wrangler.toml.bak)"

# -----------------------------------------------------------------------------
# Step 6: Database Migrations
# -----------------------------------------------------------------------------
STEP=$((STEP + 1))
print_step $STEP "Running database migrations"

# Check if migrations directory exists and has files
if [ -d "$MIGRATIONS_DIR" ] && [ "$(ls -A $MIGRATIONS_DIR/*.sql 2>/dev/null)" ]; then
    echo "Found existing migrations, applying to remote database..."
    
    for file in "$MIGRATIONS_DIR"/*.sql; do
        filename=$(basename "$file")
        echo "  Applying $filename..."
        if npx wrangler d1 execute "$DB_NAME" --remote --file="$file" --yes 2>/dev/null; then
            print_success "Applied $filename"
        else
            print_warning "Migration $filename may have already been applied"
        fi
    done
else
    echo "No migrations found in $MIGRATIONS_DIR/"
    print_info "Generate migrations with: npm run db:generate"
fi

# If no-deploy mode, stop here
if [ "$MODE" = "no-deploy" ]; then
    print_header "Setup Complete (No Deploy)"
    echo ""
    echo -e "  ${CYAN}To deploy manually:${NC}"
    echo -e "    ${BOLD}npm run build${NC}"
    echo -e "    ${BOLD}npx wrangler pages deploy .output/public --project-name $PROJECT_NAME${NC}"
    echo ""
    echo -e "  ${CYAN}Or use the script:${NC}"
    echo -e "    ${BOLD}./install.sh --deploy${NC}"
    exit 0
fi

# -----------------------------------------------------------------------------
# Step 7: Build and Deploy
# -----------------------------------------------------------------------------
STEP=$((STEP + 1))
print_step $STEP "Building and deploying"

echo "Building project..."
if npm run build; then
    print_success "Build completed successfully"
else
    print_error "Build failed"
    exit 1
fi

echo ""
echo "Deploying to Cloudflare Pages..."
if npx wrangler pages deploy .output/public --project-name "$PROJECT_NAME" --branch main --commit-dirty=true; then
    print_success "Deployment initiated"
else
    print_error "Deployment failed"
    echo -e "  ${YELLOW}Try deploying manually: npm run deploy:cf${NC}"
    exit 1
fi

# -----------------------------------------------------------------------------
# Complete
# -----------------------------------------------------------------------------
print_header "Installation & Deployment Complete! 🎉"
echo ""
echo -e "  ${GREEN}Your app is being deployed to Cloudflare Pages.${NC}"
echo ""
echo -e "  ${YELLOW}⚠️  IMPORTANT: Configure environment variable in Cloudflare Pages:${NC}"
echo -e "     1. Go to Workers & Pages → $PROJECT_NAME → Settings → Environment variables"
echo -e "     2. Add: ${BOLD}NUXT_SESSION_PASSWORD${NC} = (copy from .env or generate new)"
echo -e "     3. Check 'Encrypt' and save"
echo -e "     4. Redeploy for changes to take effect"
echo ""
echo -e "  ${CYAN}Useful commands:${NC}"
echo -e "    ${BOLD}npm run dev${NC}         Start development server"
echo -e "    ${BOLD}npm run build${NC}       Build for production"
echo -e "    ${BOLD}npm run deploy:cf${NC}   Deploy to Cloudflare"
echo -e "    ${BOLD}npm run db:generate${NC} Generate new migrations"
echo ""
echo -e "  ${CYAN}Resources created:${NC}"
echo -e "    D1 Database:   $DB_NAME"
echo -e "    KV Namespace:  $KV_NAME"
echo ""
echo -e "  ${CYAN}Check your Cloudflare dashboard for the live URL.${NC}"
echo ""
