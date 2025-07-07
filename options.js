class FactOptions {
  constructor() {
    this.settings = null
    this.stripe = null
    this.elements = null
    this.selectedPriceId = null
    this.chrome = window.chrome // Declare the chrome variable
    this.init()
  }

  async init() {
    await this.loadSettings()
    this.setupTabs()
    this.setupEventListeners()
    this.populateSettings()
    this.loadHistory()
    this.loadSavedFacts()
    this.initializeStripe()
  }

  async loadSettings() {
    const response = await this.chrome.runtime.sendMessage({ action: "getSettings" })
    this.settings = response.settings
  }

  setupTabs() {
    const tabs = document.querySelectorAll(".tab")
    const tabContents = document.querySelectorAll(".tab-content")

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        // Remove active class from all tabs and contents
        tabs.forEach((t) => t.classList.remove("active"))
        tabContents.forEach((tc) => tc.classList.remove("active"))

        // Add active class to clicked tab and corresponding content
        tab.classList.add("active")
        const targetContent = document.getElementById(tab.dataset.tab)
        targetContent.classList.add("active")
      })
    })

    // Handle hash navigation
    if (window.location.hash === "#payment") {
      document.querySelector('[data-tab="payment"]').click()
    } else if (window.location.hash === "#history") {
      document.querySelector('[data-tab="history"]').click()
    } else if (window.location.hash === "#saved") {
      document.querySelector('[data-tab="saved"]').click()
    }
  }

  setupEventListeners() {
    document.getElementById("saveSettings").addEventListener("click", () => {
      this.saveSettings()
    })

    // Payment buttons
    document.querySelectorAll("[data-price]").forEach((button) => {
      button.addEventListener("click", (e) => {
        this.selectedPriceId = e.target.dataset.price
        this.selectedTier = e.target.dataset.tier
        this.showPaymentForm()
      })
    })

    document.getElementById("submitPayment").addEventListener("click", () => {
      this.processPayment()
    })
  }

  populateSettings() {
    // Only show category selection for premium users
    const categorySection = document.querySelector(".form-group")
    if (this.settings.tier === "free") {
      categorySection.style.opacity = "0.5"
      categorySection.style.pointerEvents = "none"
      const description = categorySection.querySelector(".description")
      description.textContent = "Upgrade to Premium to choose your favorite categories."
    } else {
      // Populate categories for premium users
      this.settings.categories.forEach((category) => {
        const checkbox = document.getElementById(category)
        if (checkbox) checkbox.checked = true
      })
    }

    // Populate frequency (limited for free tier)
    const frequencyRadio = document.querySelector(`input[name="frequency"][value="${this.settings.frequency}"]`)
    if (frequencyRadio) frequencyRadio.checked = true

    // Disable frequency options for free tier
    if (this.settings.tier === "free") {
      document.querySelectorAll('input[name="frequency"]').forEach((radio) => {
        if (!["daily"].includes(radio.value)) {
          radio.disabled = true
          radio.parentElement.style.opacity = "0.5"
        }
      })
    }

    // Populate notifications
    document.getElementById("notifications").checked = this.settings.notifications
  }

  async saveSettings() {
    // Collect categories (only for premium)
    const categories = []
    if (this.settings.tier !== "free") {
      document.querySelectorAll('.checkbox-group input[type="checkbox"]:checked').forEach((checkbox) => {
        categories.push(checkbox.value)
      })
    } else {
      // Free tier gets all categories but limited delivery
      categories.push(
        ...[
          "animals",
          "history",
          "space",
          "biology",
          "languages",
          "food",
          "geography",
          "science",
          "culture",
          "records",
          "inventions",
          "sports",
          "tech",
          "century",
        ],
      )
    }

    // Collect frequency
    const frequency = document.querySelector('input[name="frequency"]:checked')?.value || "daily"

    // Collect notifications
    const notifications = document.getElementById("notifications").checked

    const updatedSettings = {
      ...this.settings,
      categories,
      frequency,
      notifications,
    }

    const response = await this.chrome.runtime.sendMessage({
      action: "updateSettings",
      settings: updatedSettings,
    })

    if (response.success) {
      this.showSuccessMessage("Settings saved successfully!")
    }
  }

  async loadHistory() {
    const response = await this.chrome.runtime.sendMessage({ action: "getFactHistory" })
    const history = response.history

    const historyList = document.getElementById("historyList")
    historyList.innerHTML = ""

    if (history.length === 0) {
      historyList.innerHTML =
        '<p style="color: #666; text-align: center; padding: 40px;">No facts in your history yet.</p>'
      return
    }

    // Sort by timestamp (newest first)
    history.sort((a, b) => b.timestamp - a.timestamp)

    history.slice(0, 50).forEach((item) => {
      // Show last 50 facts
      const historyItem = document.createElement("div")
      historyItem.className = "history-item"

      const date = new Date(item.timestamp)
      const formattedDate = date.toLocaleDateString()
      const formattedTime = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

      historyItem.innerHTML = `
        <div class="history-fact">
          <div style="margin-bottom: 5px;">${item.fact.text}</div>
          <div style="font-size: 12px; color: var(--teal); text-transform: uppercase; font-weight: 500;">
            ${item.fact.category}
          </div>
        </div>
        <div class="history-meta">
          <div>${formattedDate}</div>
          <div>${formattedTime}</div>
        </div>
      `

      historyList.appendChild(historyItem)
    })
  }

  async loadSavedFacts() {
    const response = await this.chrome.runtime.sendMessage({ action: "getSavedFacts" })
    const savedFacts = response.savedFacts

    const savedList = document.getElementById("savedList")
    savedList.innerHTML = ""

    if (savedFacts.length === 0) {
      savedList.innerHTML =
        '<p style="color: #666; text-align: center; padding: 40px;">No saved facts yet. Upgrade to Premium to save facts!</p>'
      return
    }

    // Sort by saved timestamp (newest first)
    savedFacts.sort((a, b) => b.savedAt - a.savedAt)

    savedFacts.forEach((fact) => {
      const savedItem = document.createElement("div")
      savedItem.className = "history-item"

      const date = new Date(fact.savedAt)
      const formattedDate = date.toLocaleDateString()

      savedItem.innerHTML = `
        <div class="history-fact">
          <div style="margin-bottom: 5px;">${fact.text}</div>
          <div style="font-size: 12px; color: var(--pink); text-transform: uppercase; font-weight: 500;">
            ${fact.category}
          </div>
        </div>
        <div class="history-meta">
          <div>Saved: ${formattedDate}</div>
          <button onclick="window.removeSavedFact('${fact.id}')" style="background: var(--pink); color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">Remove</button>
        </div>
      `

      savedList.appendChild(savedItem)
    })
  }

  async removeSavedFact(factId) {
    const response = await this.chrome.runtime.sendMessage({
      action: "removeSavedFact",
      factId: factId,
    })

    if (response.success) {
      this.loadSavedFacts()
      this.showSuccessMessage("Fact removed from saved collection!")
    }
  }

  initializeStripe() {
    // Initialize Stripe (you'll need to replace with your publishable key)
    const Stripe = window.Stripe
    this.stripe = Stripe("pk_test_your_publishable_key_here")
  }

  showPaymentForm() {
    const paymentForm = document.getElementById("paymentForm")
    paymentForm.style.display = "block"

    // Create Stripe Elements
    this.elements = this.stripe.elements()

    const cardElement = this.elements.create("card", {
      style: {
        base: {
          fontSize: "16px",
          color: "#424770",
          "::placeholder": {
            color: "#aab7c4",
          },
        },
      },
    })

    cardElement.mount("#stripeElements")
  }

  async processPayment() {
    if (!this.stripe || !this.elements) {
      console.error("Stripe not initialized")
      return
    }

    const cardElement = this.elements.getElement("card")

    // Create payment method for one-time payment
    const { error, paymentMethod } = await this.stripe.createPaymentMethod({
      type: "card",
      card: cardElement,
    })

    if (error) {
      console.error("Payment method creation failed:", error)
      this.showErrorMessage(error.message)
      return
    }

    // For demo purposes, we'll simulate a successful one-time payment
    setTimeout(async () => {
      const response = await this.chrome.runtime.sendMessage({
        action: "verifyPayment",
        paymentIntentId: "pi_demo_success_onetime",
        tier: this.selectedTier,
      })

      if (response.success) {
        this.showSuccessMessage(
          `Payment successful! Premium features unlocked forever! Enjoy unlimited facts and custom scheduling.`,
        )
        this.settings.tier = this.selectedTier
        this.settings.isPremium = true
        document.getElementById("paymentForm").style.display = "none"
        this.populateSettings() // Refresh the UI
      } else {
        this.showErrorMessage("Payment verification failed. Please try again.")
      }
    }, 2000)
  }

  showSuccessMessage(message) {
    this.showMessage(message, "success")
  }

  showErrorMessage(message) {
    this.showMessage(message, "error")
  }

  showMessage(message, type) {
    const messageDiv = document.createElement("div")
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 8px;
      color: white;
      font-weight: 600;
      z-index: 1000;
      font-family: 'Manrope', sans-serif;
      background: ${type === "success" ? "var(--teal)" : "var(--pink)"};
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `
    messageDiv.textContent = message

    document.body.appendChild(messageDiv)

    setTimeout(() => {
      messageDiv.remove()
    }, 3000)
  }
}

// Initialize options when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new FactOptions()
})
