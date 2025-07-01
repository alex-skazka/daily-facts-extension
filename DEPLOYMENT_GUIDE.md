# Daily Facts Extension - Deployment Guide

## 🚀 Quick Start Deployment

### 1. Chrome Web Store Submission

1. **Prepare Extension Package**
   \`\`\`bash
   npm run deploy
   \`\`\`
   This creates `daily-facts-extension.zip`

2. **Chrome Web Store Steps**
   - Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   - Pay $5 one-time developer fee
   - Upload `daily-facts-extension.zip`
   - Fill out store listing details
   - Submit for review (usually 1-3 days)

### 2. Backend API Deployment

#### Option A: Deploy to Vercel (Recommended)
\`\`\`bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables
vercel env add STRIPE_SECRET_KEY
\`\`\`

#### Option B: Deploy to Railway
\`\`\`bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway deploy
\`\`\`

#### Option C: Deploy to DigitalOcean/AWS
\`\`\`bash
# Using Docker
docker build -t daily-facts-api .
docker run -p 3000:3000 -e STRIPE_SECRET_KEY=your_key daily-facts-api
\`\`\`

### 3. Database Management

#### Access Database Manager
Once deployed, access your database manager at:
`https://your-domain.com/database-manager.html`

#### Bulk Upload Facts
1. Prepare CSV file with columns: `text,category,source,tags`
2. Use the bulk upload feature in database manager
3. Facts are automatically validated and imported

### 4. Stripe Setup

1. **Get Stripe Keys**
   - Go to [Stripe Dashboard](https://dashboard.stripe.com)
   - Get publishable and secret keys
   - Update in extension and backend

2. **Create Products**
   \`\`\`bash
   # Premium product
   stripe products create --name="Daily Facts Premium" --description="5 facts per day, choose categories"
   
   # Pro product  
   stripe products create --name="Daily Facts Pro" --description="Unlimited facts, save feature"
   \`\`\`

### 5. Domain Setup

1. **Buy Domain** (recommended: Namecheap, Cloudflare)
2. **SSL Certificate** (free with Cloudflare)
3. **DNS Setup**
   \`\`\`
   A record: your-domain.com -> your-server-ip
   CNAME: api.your-domain.com -> your-domain.com
   \`\`\`

## 📊 Monitoring & Analytics

### Health Checks
- API health: `https://your-domain.com/health`
- Database stats: `https://your-domain.com/api/stats`

### Logs
\`\`\`bash
# View logs (if using Docker)
docker logs daily-facts-api

# View logs (if using PM2)
pm2 logs facts-api
\`\`\`

## 🔧 Maintenance

### Update Facts Database
1. Access database manager
2. Use bulk upload for new facts
3. Edit/hide inappropriate facts
4. Monitor user feedback

### Update Extension
1. Increment version in manifest.json
2. Run `npm run deploy`
3. Upload new package to Chrome Web Store
4. Users get automatic updates

## 💰 Revenue Tracking

### Stripe Dashboard
- Monitor one-time payments
- Track conversion rates
- Analyze user behavior

### Extension Analytics
- User acquisition from Chrome Web Store
- Feature usage statistics
- Retention metrics

## 🛠 Troubleshooting

### Common Issues
1. **CORS Errors**: Update backend CORS settings
2. **Payment Failures**: Check Stripe webhook configuration
3. **Database Errors**: Verify SQLite permissions
4. **Extension Rejected**: Review Chrome Web Store policies

### Support
- Chrome Web Store: developer-support@google.com
- Stripe: support@stripe.com
- Your users: Create support email/form
