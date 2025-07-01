// Script to add Batch 1 facts to your database
async function addBatch1Facts() {
  console.log("🚀 Adding Batch 1 facts to database...")

  const facts = [
    // All the facts from the CSV above would be processed here
    // This is a sample of how they'd be structured
  ]

  let successCount = 0
  let errorCount = 0

  for (const factData of facts) {
    try {
      const fact = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        text: factData.text,
        category: factData.category,
        source: factData.source,
        tags: factData.tags.split(";"),
        dateAdded: Date.now(),
        hidden: false,
        verified: true,
      }

      // Add to database via API
      const response = await fetch("https://your-domain.com/api/facts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fact),
      })

      if (response.ok) {
        successCount++
        console.log(`✅ Added: ${fact.text.substring(0, 50)}...`)
      } else {
        errorCount++
        console.log(`❌ Failed: ${fact.text.substring(0, 50)}...`)
      }
    } catch (error) {
      errorCount++
      console.error(`Error adding fact: ${error.message}`)
    }
  }

  console.log(`\n📊 Batch 1 Results:`)
  console.log(`✅ Successfully added: ${successCount} facts`)
  console.log(`❌ Failed to add: ${errorCount} facts`)
  console.log(`📈 Total facts processed: ${successCount + errorCount}`)
}

// Run the import
addBatch1Facts().catch(console.error)
