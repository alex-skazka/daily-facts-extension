// Script to add new facts to your database
async function addFactsToDatabase(facts) {
  const factsToAdd = facts.map((fact) => ({
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    text: fact.text,
    category: fact.category,
    source: fact.source || null,
    tags: fact.tags || [],
    dateAdded: Date.now(),
    hidden: false,
    verified: true,
  }))

  // Add to your database via API
  for (const fact of factsToAdd) {
    await fetch("https://your-domain.com/api/facts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fact),
    })
  }
}
