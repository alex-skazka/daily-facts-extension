// Background service worker for Chrome/Safari extension
const chrome = window.chrome // Declare the chrome variable

class FactExtension {
  constructor() {
    this.initializeExtension()
  }

  async initializeExtension() {
    // Set up alarm for fact delivery
    chrome.runtime.onInstalled.addListener(() => {
      this.setupFactAlarms()
      this.initializeDefaultSettings()
    })

    // Handle alarm events
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === "deliverFact") {
        this.deliverRandomFact()
      } else if (alarm.name === "updateDatabase") {
        this.updateFactDatabase()
      }
    })

    // Handle messages from popup/options
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse)
      return true // Keep message channel open for async response
    })
  }

  async initializeDefaultSettings() {
    const settings = await chrome.storage.sync.get("userSettings")
    if (!settings.userSettings) {
      const defaultSettings = {
        categories: [
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
        ], // Free tier gets all categories but limited facts
        frequency: "daily", // Free tier: 5 facts/day at random times
        notifications: true,
        tier: "free", // free, premium (removed pro)
        isPremium: false,
        lastFactTime: 0,
        factHistory: [],
        savedFacts: [], // New: saved facts collection
        dailyFactCount: 0,
        lastResetDate: new Date().toDateString(),
      }
      await chrome.storage.sync.set({ userSettings: defaultSettings })
    }
  }

  async setupFactAlarms() {
    const { userSettings } = await chrome.storage.sync.get("userSettings")
    const frequency = userSettings?.frequency || "daily"

    chrome.alarms.clear("deliverFact")

    // Time-based intervals in minutes
    const intervals = {
      "30min": 30, // Every 30 minutes
      "1hour": 60, // Every hour
      "2hours": 120, // Every 2 hours
      daily: 1440, // Once a day
      manual: 0, // Only when clicked (no automatic delivery)
    }

    if (intervals[frequency] > 0) {
      chrome.alarms.create("deliverFact", {
        delayInMinutes: 1,
        periodInMinutes: intervals[frequency],
      })
    }

    chrome.alarms.create("updateDatabase", {
      delayInMinutes: 60,
      periodInMinutes: 1440,
    })
  }

  async deliverRandomFact() {
    const { userSettings } = await chrome.storage.sync.get("userSettings")
    if (!userSettings.notifications) return

    // Check if notifications are paused
    const pauseStatus = await chrome.storage.local.get("notificationsPaused")
    if (pauseStatus.notificationsPaused && pauseStatus.notificationsPaused.until > Date.now()) {
      return // Skip delivery if paused
    }

    // Remove daily limits - now it's time-based
    const fact = await this.getRandomFact(userSettings)
    if (fact) {
      await this.showFactNotification(fact)
    }
  }

  async getRandomFact(settings) {
    const facts = await this.loadFacts()
    let availableFacts = facts

    // For free tier, don't filter by categories (they get random facts from all categories)
    if (settings.tier !== "free") {
      availableFacts = facts.filter((fact) => settings.categories.includes(fact.category))
    }

    // Check if fact was shown in last 6 months
    const sixMonthsAgo = Date.now() - 6 * 30 * 24 * 60 * 60 * 1000
    availableFacts = availableFacts.filter((fact) => {
      const wasRecentlyShown = settings.factHistory.some(
        (historyItem) => historyItem.factId === fact.id && historyItem.timestamp > sixMonthsAgo,
      )
      return !wasRecentlyShown
    })

    if (availableFacts.length === 0) {
      // Show special notification about no new facts
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon48.png",
        title: "Daily Facts - No New Facts",
        message: "You've seen all our current facts! We're adding new ones daily. Check back soon! 🤓",
        priority: 1,
      })
      return null
    }

    return availableFacts[Math.floor(Math.random() * availableFacts.length)]
  }

  async loadFacts() {
    // Load facts from local storage or fetch from server
    const { factsDatabase } = await chrome.storage.local.get("factsDatabase")

    if (!factsDatabase || this.isDatabaseStale(factsDatabase.lastUpdated)) {
      return await this.updateFactDatabase()
    }

    return factsDatabase.facts.filter((fact) => !fact.hidden) // Filter out hidden facts
  }

  async updateFactDatabase() {
    try {
      // In a real implementation, this would fetch from your API
      const response = await fetch("https://your-api-endpoint.com/facts")
      const newFacts = await response.json()

      const factsDatabase = {
        facts: newFacts,
        lastUpdated: Date.now(),
      }

      await chrome.storage.local.set({ factsDatabase })
      return newFacts
    } catch (error) {
      console.error("Failed to update facts database:", error)
      // Return default facts if update fails
      return this.getDefaultFacts()
    }
  }

  getDefaultFacts() {
    return [
      {
        id: "1",
        text: "Octopuses have three hearts and blue blood.",
        category: "animals",
        source: "Marine Biology Research",
        dateAdded: Date.now(),
        tags: ["marine", "biology"],
        hidden: false,
      },
      {
        id: "2",
        text: "The Great Wall of China is not visible from space with the naked eye.",
        category: "history",
        source: "NASA",
        dateAdded: Date.now(),
        tags: ["space", "architecture"],
        hidden: false,
      },
      {
        id: "3",
        text: "Honey never spoils. Archaeologists have found edible honey in ancient Egyptian tombs.",
        category: "science",
        source: "Archaeological Studies",
        dateAdded: Date.now(),
        tags: ["food", "preservation"],
        hidden: false,
      },
      {
        id: "4",
        text: 'A group of flamingos is called a "flamboyance".',
        category: "animals",
        source: "Ornithology Dictionary",
        dateAdded: Date.now(),
        tags: ["birds", "terminology"],
        hidden: false,
      },
      {
        id: "5",
        text: "The shortest war in history lasted only 38-45 minutes between Britain and Zanzibar in 1896.",
        category: "history",
        source: "Historical Records",
        dateAdded: Date.now(),
        tags: ["war", "records"],
        hidden: false,
      },
    ]
  }

  isDatabaseStale(lastUpdated) {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000
    return !lastUpdated || lastUpdated < oneDayAgo
  }

  async showFactNotification(fact) {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon48.png",
      title: "Daily Fact",
      message: fact.text,
      contextMessage: `Category: ${fact.category}`,
      priority: 1,
      buttons: [{ title: "Save" }, { title: "Dismiss" }],
    })

    // Store current fact for button handling
    await chrome.storage.local.set({ currentFact: fact })
  }

  async addToHistory(fact) {
    const { userSettings } = await chrome.storage.sync.get("userSettings")
    userSettings.factHistory.push({
      factId: fact.id,
      timestamp: Date.now(),
      fact: fact,
    })

    // Keep only last 1000 facts in history
    if (userSettings.factHistory.length > 1000) {
      userSettings.factHistory = userSettings.factHistory.slice(-1000)
    }

    await chrome.storage.sync.set({ userSettings })
  }

  async handleMessage(request, sender, sendResponse) {
    switch (request.action) {
      case "getSettings":
        const { userSettings } = await chrome.storage.sync.get("userSettings")
        sendResponse({ settings: userSettings })
        break

      case "updateSettings":
        await chrome.storage.sync.set({ userSettings: request.settings })
        await this.setupFactAlarms()
        sendResponse({ success: true })
        break

      case "getFactHistory":
        const { userSettings: settings } = await chrome.storage.sync.get("userSettings")
        sendResponse({ history: settings.factHistory || [] })
        break

      case "getSavedFacts":
        const { userSettings: userSet } = await chrome.storage.sync.get("userSettings")
        sendResponse({ savedFacts: userSet.savedFacts || [] })
        break

      case "saveFact":
        await this.saveFactToCollection(request.fact)
        sendResponse({ success: true })
        break

      case "removeSavedFact":
        await this.removeSavedFact(request.factId)
        sendResponse({ success: true })
        break

      case "getFactsDatabase":
        const { factsDatabase } = await chrome.storage.local.get("factsDatabase")
        sendResponse({ facts: factsDatabase?.facts || [] })
        break

      case "updateFactsDatabase":
        await chrome.storage.local.set({ factsDatabase: request.database })
        sendResponse({ success: true })
        break

      case "verifyPayment":
        const isValid = await this.verifyStripePayment(request.paymentIntentId, request.tier)
        if (isValid) {
          const { userSettings: currentSettings } = await chrome.storage.sync.get("userSettings")
          currentSettings.tier = request.tier
          currentSettings.isPremium = request.tier !== "free"
          await chrome.storage.sync.set({ userSettings: currentSettings })
          await this.setupFactAlarms()
        }
        sendResponse({ success: isValid })
        break

      case "addToHistory":
        await this.addToHistory(request.fact)
        sendResponse({ success: true })
        break
    }
  }

  async saveFactToCollection(fact) {
    const { userSettings } = await chrome.storage.sync.get("userSettings")
    if (userSettings.tier !== "premium") return // Only premium users can save facts

    if (!userSettings.savedFacts.some((saved) => saved.id === fact.id)) {
      userSettings.savedFacts.push({
        ...fact,
        savedAt: Date.now(),
      })
      await chrome.storage.sync.set({ userSettings })
    }
  }

  async removeSavedFact(factId) {
    const { userSettings } = await chrome.storage.sync.get("userSettings")
    userSettings.savedFacts = userSettings.savedFacts.filter((fact) => fact.id !== factId)
    await chrome.storage.sync.set({ userSettings })
  }

  async verifyStripePayment(paymentIntentId, tier) {
    try {
      // In production, verify one-time payment with your backend
      const response = await fetch("https://your-backend.com/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIntentId, tier, paymentType: "one-time" }),
      })
      const result = await response.json()
      return result.verified
    } catch (error) {
      console.error("Payment verification failed:", error)
      return false
    }
  }
}

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  const { currentFact } = await chrome.storage.local.get("currentFact")
  const { userSettings } = await chrome.storage.sync.get("userSettings")

  if (buttonIndex === 0) {
    // Save button clicked
    if (userSettings.tier === "pro" && currentFact) {
      await chrome.runtime.sendMessage({ action: "saveFact", fact: currentFact })
    }
  }

  // Add to history regardless of button clicked
  if (currentFact) {
    const extension = new FactExtension()
    await extension.addToHistory(currentFact)
  }

  chrome.notifications.clear(notificationId)
})

// Initialize the extension
new FactExtension()
