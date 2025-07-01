// Deployment setup script for production
const fs = require("fs")
const path = require("path")
const archiver = require("archiver")

class DeploymentManager {
  constructor() {
    this.productionConfig = {
      apiEndpoint: "https://your-domain.com/api",
      stripePublishableKey: "pk_live_your_stripe_key",
      environment: "production",
    }
  }

  async prepareForDeployment() {
    console.log("🚀 Preparing extension for deployment...")

    // 1. Update manifest with production URLs
    await this.updateManifest()

    // 2. Update API endpoints in background script
    await this.updateBackgroundScript()

    // 3. Update Stripe keys in options
    await this.updateStripeConfig()

    // 4. Create icons
    await this.createIcons()

    // 5. Create deployment package
    await this.createDeploymentPackage()

    console.log("✅ Extension ready for Chrome Web Store!")
  }

  async updateManifest() {
    const manifestPath = path.join(__dirname, "../manifest.json")
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"))

    // Update host permissions for production
    manifest.host_permissions = ["https://your-domain.com/*", "https://api.stripe.com/*"]

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
    console.log("📝 Updated manifest.json")
  }

  async updateBackgroundScript() {
    const backgroundPath = path.join(__dirname, "../background.js")
    let content = fs.readFileSync(backgroundPath, "utf8")

    // Replace API endpoints
    content = content.replace("https://your-api-endpoint.com/facts", "https://your-domain.com/api/facts")

    content = content.replace("https://your-backend.com/verify-payment", "https://your-domain.com/api/verify-payment")

    fs.writeFileSync(backgroundPath, content)
    console.log("🔧 Updated background.js")
  }

  async updateStripeConfig() {
    const optionsPath = path.join(__dirname, "../options.js")
    let content = fs.readFileSync(optionsPath, "utf8")

    // Replace Stripe key
    content = content.replace("pk_test_your_publishable_key_here", this.productionConfig.stripePublishableKey)

    fs.writeFileSync(optionsPath, content)
    console.log("💳 Updated Stripe configuration")
  }

  async createIcons() {
    // Create icon files (you'll need to replace these with actual icons)
    const iconSizes = [16, 48, 128]
    const iconsDir = path.join(__dirname, "../icons")

    if (!fs.existsSync(iconsDir)) {
      fs.mkdirSync(iconsDir)
    }

    // For now, create placeholder files
    iconSizes.forEach((size) => {
      const iconPath = path.join(iconsDir, `icon${size}.png`)
      if (!fs.existsSync(iconPath)) {
        // Create a simple SVG that can be converted to PNG
        const svgContent = `
          <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
            <rect width="${size}" height="${size}" fill="#1A5244"/>
            <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-family="Arial" font-size="${size / 3}">F</text>
          </svg>
        `
        fs.writeFileSync(iconPath.replace(".png", ".svg"), svgContent)
      }
    })

    console.log("🎨 Created icon files")
  }

  async createDeploymentPackage() {
    const output = fs.createWriteStream("daily-facts-extension.zip")
    const archive = archiver("zip", { zlib: { level: 9 } })

    output.on("close", () => {
      console.log(`📦 Created deployment package: ${archive.pointer()} bytes`)
    })

    archive.on("error", (err) => {
      throw err
    })

    archive.pipe(output)

    // Add all extension files except development files
    archive.glob("**/*", {
      cwd: path.join(__dirname, ".."),
      ignore: ["node_modules/**", "scripts/**", "*.zip", ".git/**", "README.md", "package.json", "package-lock.json"],
    })

    await archive.finalize()
  }
}

// Run deployment preparation
if (require.main === module) {
  const deployer = new DeploymentManager()
  deployer.prepareForDeployment().catch(console.error)
}

module.exports = DeploymentManager
