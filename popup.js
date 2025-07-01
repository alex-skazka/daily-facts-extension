class FactPopup {
  constructor() {
    this.settings = null
    this.currentFact = null
    this.chrome = window.chrome // Declare the chrome variable
    this.init()
  }

  async init() {
    await this.loadSettings()
    await this.loadCurrentFact()
    this.setupEventListeners()
    this.setupPauseControls() // Add this line
    this.updateUI()
  }

  async loadSettings() {
    const response = await this.chrome.runtime.sendMessage({ action: "getSettings" })
    this.settings = response.settings
  }

  async loadCurrentFact() {
    // Always load a new random fact when popup opens
    const facts = await this.getAvailableFacts()
    if (facts.length > 0) {
      // Check if we've run out of new facts
      const sixMonthsAgo = Date.now() - 6 * 30 * 24 * 60 * 60 * 1000
      const unseenFacts = facts.filter((fact) => {
        const wasRecentlyShown = this.settings.factHistory.some(
          (historyItem) => historyItem.factId === fact.id && historyItem.timestamp > sixMonthsAgo,
        )
        return !wasRecentlyShown
      })

      if (unseenFacts.length === 0) {
        this.showNoNewFactsWarning()
        return
      }

      this.currentFact = unseenFacts[Math.floor(Math.random() * unseenFacts.length)]
      this.displayFact(this.currentFact)

      // Add to history when shown proactively
      await this.addToHistory(this.currentFact)
    }
  }

  async getAvailableFacts() {
    // Get facts from background script
    const response = await this.chrome.runtime.sendMessage({ action: "getFactsDatabase" })
    const allFacts = response.facts || []

    // Filter based on user tier and preferences
    let availableFacts = allFacts.filter((fact) => !fact.hidden)

    if (this.settings.tier !== "free") {
      availableFacts = availableFacts.filter((fact) => this.settings.categories.includes(fact.category))
    }

    return availableFacts
  }

  displayFact(fact) {
    if (!fact) return

    document.getElementById("factText").textContent = fact.text
    document.getElementById("factCategory").textContent = fact.category

    // Enable/disable save button based on tier
    const saveBtn = document.getElementById("saveFactBtn")
    if (this.settings.tier === "pro") {
      saveBtn.disabled = false
      saveBtn.textContent = "Save"
    } else {
      saveBtn.disabled = true
      saveBtn.textContent = "Pro Only"
    }
  }

  setupEventListeners() {
    document.getElementById("newFactBtn").addEventListener("click", () => {
      this.loadCurrentFact()
    })

    document.getElementById("saveFactBtn").addEventListener("click", () => {
      this.saveFact()
    })

    document.getElementById("settingsBtn").addEventListener("click", () => {
      this.chrome.runtime.openOptionsPage()
    })

    document.getElementById("upgradeBtn").addEventListener("click", () => {
      this.openUpgradeModal()
    })

    document.getElementById("historyBtn").addEventListener("click", () => {
      this.chrome.tabs.create({ url: this.chrome.runtime.getURL("options.html#history") })
    })

    document.getElementById("savedBtn").addEventListener("click", () => {
      this.chrome.tabs.create({ url: this.chrome.runtime.getURL("options.html#saved") })
    })

    document.getElementById("manageBtn").addEventListener("click", () => {
      this.chrome.tabs.create({ url: this.chrome.runtime.getURL("database-manager.html") })
    })
  }

  async saveFact() {
    if (!this.currentFact) return

    if (this.settings.tier !== "pro") {
      this.showUpgradePrompt()
      return
    }

    const response = await this.chrome.runtime.sendMessage({
      action: "saveFact",
      fact: this.currentFact,
    })

    if (response.success) {
      const saveBtn = document.getElementById("saveFactBtn")
      saveBtn.textContent = "Saved!"
      saveBtn.style.background = "#28a745"

      setTimeout(() => {
        saveBtn.textContent = "Save"
        saveBtn.style.background = ""
      }, 2000)

      this.updateStats()
    }
  }

  // Add upgrade prompt method
  showUpgradePrompt() {
    const modal = document.createElement("div")
    modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
  `

    modal.innerHTML = `
    <div style="
      background: white;
      padding: 30px;
      border-radius: 12px;
      max-width: 400px;
      width: 90%;
      text-align: center;
      font-family: 'Manrope', sans-serif;
    ">
      <div style="font-size: 48px; margin-bottom: 15px;">🔒</div>
      <h3 style="color: var(--teal); margin-bottom: 15px; font-weight: 700;">Pro Feature</h3>
      <p style="color: var(--text-secondary); margin-bottom: 25px; line-height: 1.5;">
        Saving facts is a Pro feature. Upgrade to Pro for just <strong>$4.99</strong> to save unlimited facts and unlock all premium features!
      </p>
      <div style="display: flex; gap: 10px; justify-content: center;">
        <button onclick="this.parentElement.parentElement.parentElement.remove()" style="
          padding: 10px 20px;
          background: #e9ecef;
          color: #6c757d;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-family: 'Manrope', sans-serif;
          font-weight: 600;
        ">Maybe Later</button>
        <button onclick="window.chrome.tabs.create({url: window.chrome.runtime.getURL('options.html#payment')}); this.parentElement.parentElement.parentElement.remove();" style="
          padding: 10px 20px;
          background: var(--pink);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-family: 'Manrope', sans-serif;
          font-weight: 600;
        ">Upgrade to Pro</button>
      </div>
    </div>
  `

    document.body.appendChild(modal)

    // Close on outside click
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.remove()
      }
    })
  }

  updateUI() {
    // Update tier badge
    const tierBadge = document.getElementById("tierBadge")
    const tierNames = {
      free: "Free Tier",
      pro: "Pro", // Changed from premium
      premium: "Premium", // Changed from pro
    }

    tierBadge.textContent = tierNames[this.settings.tier]
    tierBadge.className = `tier-badge tier-${this.settings.tier}`

    // Show/hide premium banner
    const premiumBanner = document.getElementById("premiumBanner")
    if (this.settings.tier === "free") {
      premiumBanner.classList.remove("hidden")
    } else {
      premiumBanner.classList.add("hidden")
    }

    this.updateStats()
  }

  async updateStats() {
    const historyResponse = await this.chrome.runtime.sendMessage({ action: "getFactHistory" })
    const savedResponse = await this.chrome.runtime.sendMessage({ action: "getSavedFacts" })

    const history = historyResponse.history || []
    const savedFacts = savedResponse.savedFacts || []

    const today = new Date().toDateString()
    const todayFacts = history.filter((item) => new Date(item.timestamp).toDateString() === today)

    document.getElementById("todayCount").textContent = todayFacts.length
    document.getElementById("savedCount").textContent = savedFacts.length
    document.getElementById("totalCount").textContent = history.length
  }

  openUpgradeModal() {
    this.chrome.tabs.create({ url: this.chrome.runtime.getURL("options.html#payment") })
  }

  async setupPauseControls() {
    // Check if notifications are currently paused
    const pauseStatus = await this.chrome.storage.local.get("notificationsPaused")
    if (pauseStatus.notificationsPaused && pauseStatus.notificationsPaused.until > Date.now()) {
      this.showPauseStatus(pauseStatus.notificationsPaused)
    }

    // Add event listeners for pause buttons
    document.querySelectorAll(".pause-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.pauseNotifications(e.target.dataset.duration)
      })
    })

    document.getElementById("resumeBtn").addEventListener("click", () => {
      this.resumeNotifications()
    })
  }

  async pauseNotifications(duration) {
    let until

    if (duration === "tomorrow") {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(9, 0, 0, 0) // Resume at 9 AM tomorrow
      until = tomorrow.getTime()
    } else if (duration === "manual") {
      until = Number.MAX_SAFE_INTEGER // Pause indefinitely
    } else {
      until = Date.now() + Number.parseInt(duration)
    }

    const pauseData = {
      until,
      pausedAt: Date.now(),
      duration: duration,
    }

    await this.chrome.storage.local.set({ notificationsPaused: pauseData })
    this.showPauseStatus(pauseData)
  }

  async resumeNotifications() {
    await this.chrome.storage.local.remove("notificationsPaused")
    document.getElementById("pauseStatus").style.display = "none"
    document.querySelector(".pause-buttons").style.display = "grid"
  }

  showPauseStatus(pauseData) {
    const pauseStatus = document.getElementById("pauseStatus")
    const pauseText = document.getElementById("pauseText")

    let statusText = "Notifications paused"

    if (pauseData.until === Number.MAX_SAFE_INTEGER) {
      statusText += " until you turn them back on"
    } else if (pauseData.duration === "tomorrow") {
      statusText += " until tomorrow at 9 AM"
    } else {
      const remainingTime = pauseData.until - Date.now()
      const hours = Math.floor(remainingTime / (1000 * 60 * 60))
      const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60))

      if (hours > 0) {
        statusText += ` for ${hours}h ${minutes}m`
      } else {
        statusText += ` for ${minutes}m`
      }
    }

    pauseText.textContent = statusText
    pauseStatus.style.display = "block"
    document.querySelector(".pause-buttons").style.display = "none"
  }

  showNoNewFactsWarning() {
    const factDisplay = document.getElementById("factDisplay")
    factDisplay.innerHTML = `
    <div style="text-align: center; padding: 20px;">
      <div style="font-size: 32px; margin-bottom: 15px;">🤓</div>
      <h4 style="color: var(--teal); margin-bottom: 10px;">You're a Knowledge Champion!</h4>
      <p style="font-size: 13px; line-height: 1.4; margin-bottom: 20px; color: var(--text-secondary);">
        We're constantly adding new interesting facts for you, but your thirst for knowledge runs ahead of us! 
        We don't have any new facts to show you yet but you can choose to get shown the facts you've already seen.
      </p>
      <div style="display: flex; gap: 8px;">
        <button onclick="this.parentElement.parentElement.parentElement.innerHTML='<div class=\\'fact-text\\'>We\\'ll notify you when new facts arrive! 📚</div>'" 
                style="flex: 1; padding: 10px; font-size: 11px; background: var(--gold); color: white; border: none; border-radius: 6px; cursor: pointer;">
          No, tell me when you have new facts
        </button>
        <button onclick="window.recycleOldFacts()" 
                style="flex: 1; padding: 10px; font-size: 11px; background: var(--teal); color: white; border: none; border-radius: 6px; cursor: pointer;">
          Sure, recycle old facts
        </button>
      </div>
    </div>
  `
  }

  async addToHistory(fact) {
    const response = await this.chrome.runtime.sendMessage({
      action: "addToHistory",
      fact: fact,
    })
  }
}

// Add global function for recycling facts
window.recycleOldFacts = async () => {
  const popup = new FactPopup()
  await popup.loadSettings()
  const facts = await popup.getAvailableFacts()
  if (facts.length > 0) {
    const randomFact = facts[Math.floor(Math.random() * facts.length)]
    popup.displayFact(randomFact)
    popup.currentFact = randomFact
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new FactPopup()
})
