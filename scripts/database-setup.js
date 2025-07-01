// Database setup and seeding script
class FactDatabase {
  constructor() {
    this.dbName = "FactsDB"
    this.version = 1
    this.db = null
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = event.target.result

        // Create facts store
        const factsStore = db.createObjectStore("facts", { keyPath: "id" })
        factsStore.createIndex("category", "category", { unique: false })
        factsStore.createIndex("dateAdded", "dateAdded", { unique: false })

        // Create user data store
        const userStore = db.createObjectStore("userData", { keyPath: "key" })

        // Seed initial data
        this.seedInitialFacts(factsStore)
      }
    })
  }

  seedInitialFacts(store) {
    const initialFacts = [
      {
        id: "1",
        text: "Octopuses have three hearts and blue blood.",
        category: "animals",
        source: "Marine Biology Research",
        dateAdded: Date.now(),
        tags: ["marine", "biology"],
        verified: true,
      },
      {
        id: "2",
        text: "The Great Wall of China is not visible from space with the naked eye.",
        category: "history",
        source: "NASA",
        dateAdded: Date.now(),
        tags: ["space", "architecture"],
        verified: true,
      },
      {
        id: "3",
        text: "Honey never spoils. Archaeologists have found edible honey in ancient Egyptian tombs.",
        category: "science",
        source: "Archaeological Studies",
        dateAdded: Date.now(),
        tags: ["food", "preservation"],
        verified: true,
      },
      {
        id: "4",
        text: 'A group of flamingos is called a "flamboyance".',
        category: "animals",
        source: "Ornithology Dictionary",
        dateAdded: Date.now(),
        tags: ["birds", "terminology"],
        verified: true,
      },
      {
        id: "5",
        text: "The shortest war in history lasted only 38-45 minutes between Britain and Zanzibar in 1896.",
        category: "history",
        source: "Historical Records",
        dateAdded: Date.now(),
        tags: ["war", "records"],
        verified: true,
      },
      {
        id: "6",
        text: "Bananas are berries, but strawberries are not.",
        category: "science",
        source: "Botanical Classification",
        dateAdded: Date.now(),
        tags: ["botany", "fruits"],
        verified: true,
      },
      {
        id: "7",
        text: "The first computer programmer was Ada Lovelace in 1843.",
        category: "technology",
        source: "Computer History Museum",
        dateAdded: Date.now(),
        tags: ["programming", "history"],
        verified: true,
      },
      {
        id: "8",
        text: "Shakespeare invented over 1,700 words that we still use today.",
        category: "books",
        source: "Oxford English Dictionary",
        dateAdded: Date.now(),
        tags: ["literature", "language"],
        verified: true,
      },
      {
        id: "9",
        text: "Antarctica is the largest desert in the world.",
        category: "geography",
        source: "Geographic Survey",
        dateAdded: Date.now(),
        tags: ["desert", "continent"],
        verified: true,
      },
      {
        id: "10",
        text: "A single cloud can weigh more than a million pounds.",
        category: "science",
        source: "Meteorological Studies",
        dateAdded: Date.now(),
        tags: ["weather", "physics"],
        verified: true,
      },
    ]

    initialFacts.forEach((fact) => {
      store.add(fact)
    })
  }

  async addFact(fact) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["facts"], "readwrite")
      const store = transaction.objectStore("facts")
      const request = store.add(fact)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async getFacts(category = null) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["facts"], "readonly")
      const store = transaction.objectStore("facts")

      let request
      if (category) {
        const index = store.index("category")
        request = index.getAll(category)
      } else {
        request = store.getAll()
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async updateFactDatabase(newFacts) {
    const transaction = this.db.transaction(["facts"], "readwrite")
    const store = transaction.objectStore("facts")

    // Clear existing facts
    await store.clear()

    // Add new facts
    newFacts.forEach((fact) => {
      store.add(fact)
    })

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }
}

// Export for use in other scripts
if (typeof module !== "undefined" && module.exports) {
  module.exports = FactDatabase
}
