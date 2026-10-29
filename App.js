
import React, { useEffect, useMemo, useRef, useState } from "react";
import "./style.css";

const PAGES = ["Home", "Dashboard", "My Inventory", "Recipes", "Waste Tracker", "Household"];
const KEYS = {
  foods: "foodsaver-items-v3",
  waste: "foodsaver-waste-history-v3",
  household: "foodsaver-household-v3",
};

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function readData(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function daysBetween(date) {
  if (!date) return null;
  const a = new Date(`${date}T00:00:00`);
  const b = new Date(`${today()}T00:00:00`);
  return Number.isNaN(a.getTime()) ? null : Math.round((b - a) / 86400000);
}

function emoji(category) {
  return ({
    Vegetables: "🥦", Fruits: "🍎", Dairy: "🥛",
    Meat: "🍗", Grains: "🌾", Other: "🥫",
  })[category] || "🥗";
}

function statusOf(food) {
  if (food.dateType === "unknown") {
    return { label: "Date unknown", type: "unknown" };
  }

  if (food.dateType === "purchase") {
    const age = daysBetween(food.purchaseDate);
    if (age === null || age < 0) return { label: "Check purchase date", type: "unknown" };
    if (age === 0) return { label: "Purchased today", type: "fresh" };
    if (age <= 2) return { label: `${age} day(s) since purchase`, type: "fresh" };
    return { label: `${age} days since purchase`, type: "warning" };
  }

  const days = daysBetween(food.expiry);
  if (days === null) return { label: "Date unavailable", type: "unknown" };
  if (days < 0) return { label: "Past printed date", type: "expired" };
  if (days === 0) return { label: "Printed date is today", type: "warning" };
  if (days <= 3) return { label: `${days} day(s) to printed date`, type: "warning" };
  return { label: "Before printed date", type: "fresh" };
}

// Planning reminders only; they do not determine food safety.
function useFirstInfo(food) {
  if (food.dateType === "printed" && food.expiry) {
    const days = daysBetween(food.expiry);
    if (days !== null && days >= 0 && days <= 3) {
      return { priority: 1, label: days === 0 ? "Printed date is today" : `${days} day(s) to printed date` };
    }
    if (days !== null && days < 0) {
      return { priority: 4, label: "Past printed date" };
    }
  }

  if (food.dateType === "unknown") {
    return { priority: 2, label: "Needs a check" };
  }

  if (food.dateType === "purchase") {
    const age = daysBetween(food.purchaseDate);
    if (age === null || age < 0) return { priority: 2, label: "Check purchase details" };
    if (age > 2) return { priority: 3, label: `${age} days since purchase` };
  }

  return null;
}

const initialFoods = [
  { id: "seed-milk", name: "Milk", quantity: "1 litre", category: "Dairy", dateType: "printed", expiry: today(), purchaseDate: "", storage: "fridge" },
  { id: "seed-tomato", name: "Tomatoes", quantity: "6 pieces", category: "Vegetables", dateType: "purchase", expiry: "", purchaseDate: today(), storage: "room" },
  { id: "seed-spinach", name: "Spinach", quantity: "1 bunch", category: "Vegetables", dateType: "unknown", expiry: "", purchaseDate: "", storage: "fridge" },
  { id: "seed-rice", name: "Rice", quantity: "2 kg", category: "Grains", dateType: "printed", expiry: `${Number(today().slice(0, 4)) + 1}${today().slice(4)}`, purchaseDate: "", storage: "room" },
];

const RECIPES = [
  {
    id: "tomato-rice", name: "Tomato Rice", emoji: "🍅", cuisine: "South Indian", time: 25,
    ingredients: [
      { name: "Rice", aliases: ["rice", "basmati rice"] },
      { name: "Tomato", aliases: ["tomato", "tomatoes"] },
      { name: "Onion", aliases: ["onion", "onions"] },
      { name: "Green chilli", aliases: ["green chilli", "green chili", "chilli", "chili"] },
    ],
    pantry: ["Oil", "Salt", "Turmeric", "Mustard seeds"],
    steps: ["Wash and cook the rice.", "Heat oil and add mustard seeds and chopped onion.", "Add tomatoes, chilli, turmeric and salt. Cook until soft.", "Mix in the cooked rice and heat through.", "Taste and serve hot."],
  },
  {
    id: "pulao", name: "Vegetable Pulao", emoji: "🍚", cuisine: "Indian", time: 30,
    ingredients: [
      { name: "Rice", aliases: ["rice", "basmati rice"] },
      { name: "Carrot", aliases: ["carrot", "carrots"] },
      { name: "Peas", aliases: ["peas", "green peas"] },
      { name: "Onion", aliases: ["onion", "onions"] },
    ],
    pantry: ["Oil or ghee", "Salt", "Cumin", "Garam masala"],
    steps: ["Wash rice and prepare vegetables.", "Sauté cumin and onion in oil or ghee.", "Add vegetables and spices.", "Add rice, water and salt.", "Cover and cook until rice is tender."],
  },
  {
    id: "palak-dal", name: "Palak Dal", emoji: "🥬", cuisine: "Indian", time: 35,
    ingredients: [
      { name: "Spinach", aliases: ["spinach", "palak"] },
      { name: "Dal", aliases: ["dal", "lentils", "toor dal", "moong dal", "pigeon peas"] },
      { name: "Tomato", aliases: ["tomato", "tomatoes"] },
      { name: "Onion", aliases: ["onion", "onions"] },
    ],
    pantry: ["Salt", "Turmeric", "Cumin", "Garlic"],
    steps: ["Wash and cook dal until soft.", "Wash and chop spinach.", "Sauté onion, tomato, garlic and spices.", "Add spinach and cook until wilted.", "Mix in dal, simmer thoroughly and season."],
  },
  {
    id: "aloo", name: "Aloo Sabzi", emoji: "🥔", cuisine: "North Indian", time: 25,
    ingredients: [
      { name: "Potato", aliases: ["potato", "potatoes", "aloo"] },
      { name: "Tomato", aliases: ["tomato", "tomatoes"] },
      { name: "Onion", aliases: ["onion", "onions"] },
    ],
    pantry: ["Oil", "Salt", "Turmeric", "Cumin", "Chilli powder"],
    steps: ["Wash and cut potatoes.", "Heat oil and add cumin and onion.", "Add tomatoes and spices.", "Add potatoes and a little water.", "Cover and cook until potatoes are tender."],
  },
  {
    id: "poha", name: "Vegetable Poha", emoji: "🍋", cuisine: "Indian", time: 20,
    ingredients: [
      { name: "Poha", aliases: ["poha", "flattened rice", "aval"] },
      { name: "Onion", aliases: ["onion", "onions"] },
      { name: "Peas", aliases: ["peas", "green peas"] },
      { name: "Potato", aliases: ["potato", "potatoes", "aloo"] },
    ],
    pantry: ["Oil", "Salt", "Mustard seeds", "Curry leaves", "Lemon"],
    steps: ["Rinse poha briefly and drain.", "Heat oil and add mustard seeds and curry leaves.", "Add onion, potato and peas; cook until tender.", "Mix in poha and salt and heat gently.", "Finish with lemon juice."],
  },
  {
    id: "pappu", name: "Tomato Pappu", emoji: "🍲", cuisine: "Andhra-style", time: 35,
    ingredients: [
      { name: "Dal", aliases: ["dal", "lentils", "toor dal", "pigeon peas"] },
      { name: "Tomato", aliases: ["tomato", "tomatoes"] },
      { name: "Onion", aliases: ["onion", "onions"] },
    ],
    pantry: ["Salt", "Turmeric", "Garlic", "Cumin", "Chilli"],
    steps: ["Wash and cook dal until soft.", "Cook chopped tomatoes and onion with turmeric and chilli.", "Mix cooked dal into the tomato mixture.", "Simmer and adjust seasoning.", "Serve hot after cooking thoroughly."],
  },
  {
    id: "curd-rice", name: "Curd Rice", emoji: "🥣", cuisine: "South Indian", time: 15,
    ingredients: [
      { name: "Rice", aliases: ["rice", "cooked rice"] },
      { name: "Curd", aliases: ["curd", "yogurt", "yoghurt"] },
    ],
    pantry: ["Salt", "Mustard seeds", "Curry leaves", "Ginger"],
    steps: ["Cook rice until soft and let it cool.", "Mix with fresh curd and salt.", "Temper mustard seeds, curry leaves and ginger in a little oil.", "Mix the tempering into the rice and serve promptly."],
  },
];

function matchesIngredient(foodName, ingredient) {
  const n = foodName.toLowerCase().trim();
  return ingredient.aliases.some((alias) => {
    const a = alias.toLowerCase();
    return n === a || n.includes(a) || a.includes(n);
  });
}

export default function App() {
  const [page, setPage] = useState("Home");
  const [foods, setFoods] = useState(() => readData(KEYS.foods, readData("foodsaver-items", initialFoods)));
  const [history, setHistory] = useState(() => readData(KEYS.waste, []));
  const [household, setHousehold] = useState(() => readData(KEYS.household, { name: "My Household", members: ["You"] }));

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [category, setCategory] = useState("Vegetables");
  const [dateType, setDateType] = useState("purchase");
  const [foodDate, setFoodDate] = useState(today());
  const [storage, setStorage] = useState("fridge");
  const [search, setSearch] = useState("");
  const [inventoryFilter, setInventoryFilter] = useState("All");
  const [recipeSearch, setRecipeSearch] = useState("");
  const [recipeFilter, setRecipeFilter] = useState("All");
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [notice, setNotice] = useState("");
  const [householdName, setHouseholdName] = useState(household.name || "");
  const [memberName, setMemberName] = useState("");
  const [importError, setImportError] = useState("");
  const importRef = useRef(null);

  useEffect(() => { localStorage.setItem(KEYS.foods, JSON.stringify(foods)); }, [foods]);
  useEffect(() => { localStorage.setItem(KEYS.waste, JSON.stringify(history)); }, [history]);
  useEffect(() => { localStorage.setItem(KEYS.household, JSON.stringify(household)); }, [household]);

  function navigate(next) {
    setPage(next);
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function addFood(event) {
    event.preventDefault();
    if (!name.trim() || !quantity.trim()) {
      setNotice("Please enter the ingredient name and quantity.");
      return;
    }
    if (dateType !== "unknown" && !foodDate) {
      setNotice("Please select a date or choose Date unknown.");
      return;
    }
    if (dateType === "purchase" && foodDate > today()) {
      setNotice("Purchase date cannot be in the future.");
      return;
    }
    const item = {
      id: `food-${Date.now()}`, name: name.trim(), quantity: quantity.trim(),
      category, dateType, expiry: dateType === "printed" ? foodDate : "",
      purchaseDate: dateType === "purchase" ? foodDate : "", storage,
    };
    setFoods((old) => [...old, item]);
    setName(""); setQuantity(""); setCategory("Vegetables");
    setDateType("purchase"); setFoodDate(today()); setStorage("fridge");
    setNotice(`${item.name} added to inventory.`);
  }

  function recordFood(id, action) {
    const item = foods.find((food) => food.id === id);
    if (!item) return;
    setHistory((old) => [{
      id: `log-${Date.now()}`, name: item.name, quantity: item.quantity,
      category: item.category, action, date: today(),
    }, ...old]);
    setFoods((old) => old.filter((food) => food.id !== id));
    setNotice(`${item.name} recorded as ${action}.`);
  }

  function removeFood(id) {
    const item = foods.find((food) => food.id === id);
    setFoods((old) => old.filter((food) => food.id !== id));
    setNotice(`${item?.name || "Ingredient"} removed.`);
  }

  const useFirst = useMemo(() => foods
    .map((food) => ({ ...food, reminder: useFirstInfo(food) }))
    .filter((food) => food.reminder)
    .sort((a, b) => a.reminder.priority - b.reminder.priority), [foods]);

  const expiring = foods.filter((food) => {
    if (food.dateType !== "printed" || !food.expiry) return false;
    const d = daysBetween(food.expiry);
    return d !== null && d >= 0 && d <= 3;
  });

  const review = foods.filter((food) => {
    const status = statusOf(food);
    return status.type === "unknown" ||
      (food.dateType === "purchase" && daysBetween(food.purchaseDate) > 2);
  });

  const visibleFoods = foods.filter((food) => {
    const status = statusOf(food);
    const queryMatch = food.name.toLowerCase().includes(search.toLowerCase());
    const filterMatch =
      inventoryFilter === "All" ||
      (inventoryFilter === "Use first" && Boolean(useFirstInfo(food))) ||
      (inventoryFilter === "Expiring soon" && food.dateType === "printed" && status.type === "warning") ||
      (inventoryFilter === "Past printed date" && status.type === "expired") ||
      (inventoryFilter === "Date unknown" && status.type === "unknown") ||
      (inventoryFilter === "Freshly purchased" && food.dateType === "purchase" && daysBetween(food.purchaseDate) <= 2);
    return queryMatch && filterMatch;
  });

  function recipeMatch(recipe) {
    const available = recipe.ingredients.filter((ingredient) =>
      foods.some((food) => matchesIngredient(food.name, ingredient)));
    const missing = recipe.ingredients.filter((ingredient) => !available.includes(ingredient));
    const priorityMatches = useFirst.filter((food) =>
      recipe.ingredients.some((ingredient) => matchesIngredient(food.name, ingredient)));
    return { available, missing, priorityMatches, score: available.length / recipe.ingredients.length };
  }

  const rankedRecipes = RECIPES.map((recipe) => ({
    ...recipe, match: recipeMatch(recipe),
  })).sort((a, b) =>
    b.match.priorityMatches.length - a.match.priorityMatches.length ||
    b.match.score - a.match.score
  );

  const filteredRecipes = rankedRecipes.filter((recipe) => {
    const queryMatch = recipe.name.toLowerCase().includes(recipeSearch.toLowerCase());
    const filterMatch =
      recipeFilter === "All" ||
      (recipeFilter === "Best matches" && recipe.match.score >= 0.5) ||
      (recipeFilter === "Use my ingredients" && recipe.match.available.length > 0) ||
      (recipeFilter === "Use first ingredients" && recipe.match.priorityMatches.length > 0);
    return queryMatch && filterMatch;
  });

  function openRecipe(recipe) {
    setSelectedRecipe(recipe);
    setPage("Recipes");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function saveHousehold(event) {
    event.preventDefault();
    setHousehold((old) => ({ ...old, name: householdName.trim() || "My Household" }));
    setNotice("Household name saved in this browser.");
  }

  function addMember(event) {
    event.preventDefault();
    const clean = memberName.trim();
    if (!clean) return;
    if (household.members.some((m) => m.toLowerCase() === clean.toLowerCase())) {
      setNotice("That member is already listed.");
      return;
    }
    setHousehold((old) => ({ ...old, members: [...old.members, clean] }));
    setMemberName("");
    setNotice(`${clean} added to the household list.`);
  }

  function exportBackup() {
    const data = { app: "FoodSaver", foods, history, household, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "foodsaver-backup.json";
    link.click();
    URL.revokeObjectURL(url);
    setNotice("Backup exported.");
  }

  function importBackup(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (data.app !== "FoodSaver" || !Array.isArray(data.foods)) {
          throw new Error("This is not a valid FoodSaver backup.");
        }
        if (!window.confirm("Import backup? Your current inventory and history will be replaced.")) return;
        setFoods(data.foods);
        setHistory(Array.isArray(data.history) ? data.history : []);
        if (data.household?.members) {
          setHousehold(data.household);
          setHouseholdName(data.household.name || "");
        }
        setNotice("Backup imported successfully.");
        setImportError("");
      } catch (error) {
        setImportError(error.message || "Unable to read backup.");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  }

  function Stat({ icon, label, value, description, tone = "" }) {
    return <article className="stat-card">
      <span className={`stat-icon ${tone}`}>{icon}</span>
      <p>{label}</p><h2>{value}</h2><small>{description}</small>
    </article>;
  }

  function FoodRows({ items, actions = true }) {
    if (!items.length) return <p className="empty-state">No matching ingredients. Add food or change your filter.</p>;
    return <div className="food-list">
      {items.map((food) => {
        const status = statusOf(food);
        const reminder = useFirstInfo(food);
        const dateDescription = food.dateType === "purchase"
          ? `Purchased: ${food.purchaseDate || "Not entered"}`
          : food.dateType === "printed"
            ? `Printed date: ${food.expiry || "Not entered"}`
            : "No date recorded";
        const storageLabel = { room: "Room temperature", fridge: "Refrigerator", freezer: "Freezer" }[food.storage] || "Not specified";
        return <article className="food-row" key={food.id}>
          <div className="food-emoji">{emoji(food.category)}</div>
          <div className="food-details">
            <strong>{food.name}</strong>
            <span>{food.quantity} · {food.category}</span>
            <span>{storageLabel}</span>
          </div>
          <div className="food-status">
            <span className={`status ${status.type}`}>{status.label}</span>
            <small>{dateDescription}</small>
            {reminder && <small className="priority-note">Use First: {reminder.label}</small>}
          </div>
          {actions && <div className="row-actions">
            <button type="button" className="used-button" onClick={() => recordFood(food.id, "used")}>Used</button>
            <button type="button" className="discard-button" onClick={() => recordFood(food.id, "discarded")}>Discard</button>
            <button type="button" className="icon-button" aria-label={`Remove ${food.name}`} onClick={() => removeFood(food.id)}>×</button>
          </div>}
        </article>;
      })}
    </div>;
  }

  function RecipeCard({ recipe }) {
    const match = recipe.match;
    return <article className="recipe-card">
      <div className="recipe-emoji">{recipe.emoji}</div>
      <span className="recipe-meta">{recipe.cuisine} · {recipe.time} min</span>
      <h3>{recipe.name}</h3>
      {match.priorityMatches.length > 0 && <div className="recipe-highlight">♻️ Uses {match.priorityMatches.length} item(s) needing review</div>}
      <div className="match-track"><span style={{ width: `${Math.round(match.score * 100)}%` }} /></div>
      <p className="match-label">{match.available.length} of {recipe.ingredients.length} main ingredients available</p>
      <p className="recipe-ingredients"><strong>You have:</strong> {match.available.length ? match.available.map((i) => i.name).join(", ") : "No main ingredients yet"}</p>
      {match.missing.length > 0 && <p className="recipe-ingredients"><strong>Missing:</strong> {match.missing.map((i) => i.name).join(", ")}</p>}
      <button type="button" className="primary-button full-button" onClick={() => openRecipe(recipe)}>View recipe →</button>
    </article>;
  }

  const usedCount = history.filter((entry) => entry.action === "used").length;
  const discardedCount = history.filter((entry) => entry.action === "discarded").length;
  const useRate = history.length ? Math.round(usedCount / history.length * 100) : 0;

  return <div className="app-shell">
    <aside className="sidebar">
      <button type="button" className="brand" onClick={() => navigate("Home")}>
        <span className="brand-mark">🌿</span>
        <span className="brand-copy">FoodSaver<small>LESS WASTE, MORE TASTE</small></span>
      </button>
      <p className="nav-heading">WORKSPACE</p>
      <div className="sidebar-nav">
        {PAGES.map((item) => <button key={item} type="button" className={`nav-item ${page === item ? "active" : ""}`} onClick={() => navigate(item)}>
          <span className="nav-icon">{({ Home: "⌂", Dashboard: "▦", "My Inventory": "🧺", Recipes: "🍲", "Waste Tracker": "♻", Household: "⌂" })[item]}</span>{item}
        </button>)}
      </div>
      <div className="sidebar-tip"><span>🌎</span><h3>Small steps matter.</h3><p>Every ingredient you save is a step toward a greener planet.</p></div>
      <div className="sidebar-footer">FoodSaver · Student Prototype</div>
    </aside>

    <main className="main-content">
      <nav className="mobile-nav" aria-label="Main navigation">
        {PAGES.map((item) => <button key={item} type="button" className={page === item ? "active" : ""} onClick={() => navigate(item)}>{item}</button>)}
      </nav>

      <header className="topbar">
        <div><span className="eyebrow">YOUR SMART KITCHEN</span><h1>{page === "Home" ? "Good food. Less waste." : page}</h1><p className="subtitle">Know what you have. Use what you buy.</p></div>
        <div className="topbar-right"><span className="household-pill">🏡 {household.name}</span><div className="avatar">FS</div></div>
      </header>

      {notice && <div className="notice" role="status"><span>✓</span>{notice}<button type="button" onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}

      {page === "Home" && <section className="hero-panel">
        <div className="hero-copy">
          <span className="eyebrow">WELCOME TO FOOD SAVER</span>
          <h2>Save food.<br /><span>Save money.</span><br />Save our planet.</h2>
          <p>Organize groceries, review food dates, plan Indian meals and keep track of food waste in one place.</p>
          <div className="hero-actions">
            <button type="button" className="primary-button" onClick={() => navigate("Dashboard")}>Open dashboard →</button>
            <button type="button" className="secondary-button" onClick={() => navigate("My Inventory")}>Add groceries</button>
          </div>
          <div className="hero-metrics"><div><strong>{foods.length}</strong><span>Items in inventory</span></div><div><strong>{RECIPES.length}</strong><span>Indian recipes</span></div><div><strong>{usedCount}</strong><span>Items used</span></div></div>
        </div>
        <div className="hero-art"><div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" /><div className="hero-food">🥬<span>🥕</span><i>🍅</i><b>🍋</b></div><div className="floating-card"><span>♻️</span><div><strong>Every bite counts</strong><small>Plan meals, waste less</small></div></div></div>
        <div className="home-features">
          <article><span>🧺</span><h3>Smart inventory</h3><p>Keep track of ingredients and storage locations.</p></article>
          <article><span>⏳</span><h3>Use-first reminders</h3><p>Review dates and plan what to cook next.</p></article>
          <article><span>🍲</span><h3>Indian recipes</h3><p>Find meal ideas based on your ingredients.</p></article>
          <article><span>📊</span><h3>Waste insights</h3><p>Record food used and discarded.</p></article>
        </div>
      </section>}

      {page === "Dashboard" && <>
        <section className="welcome-banner"><div><span className="welcome-tag">YOUR KITCHEN, ORGANIZED</span><h2>Make every ingredient count.</h2><p>Review dates, plan meals and track your progress.</p></div><div className="banner-illustration">🌱</div></section>
        <section className="stats-grid">
          <Stat icon="🧺" label="Total ingredients" value={foods.length} description="In your inventory" />
          <Stat icon="⏳" label="Near printed date" value={expiring.length} description="Within the next 3 days" tone="orange" />
          <Stat icon="🔎" label="Needs review" value={review.length} description="Check date, storage or condition" tone="purple" />
          <Stat icon="♻️" label="Items used" value={usedCount} description="Saved history" tone="blue" />
        </section>
        <section className="section-panel">
          <div className="section-heading"><div><span className="eyebrow">PLAN YOUR NEXT MEAL</span><h2>Use First</h2><p>Review these items and decide what should be used soon.</p></div><button type="button" className="text-button" onClick={() => navigate("My Inventory")}>View inventory →</button></div>
          {useFirst.length ? <FoodRows items={useFirst.slice(0, 5)} /> : <p className="empty-state">Nothing is flagged for review. Keep your inventory updated.</p>}
          <p className="safety-note">These are planning reminders, not food-safety verdicts. Check the label, storage history and condition.</p>
        </section>
        <section className="section-panel">
          <div className="section-heading"><div><span className="eyebrow">COOK WITH WHAT YOU HAVE</span><h2>Suggested Indian recipes</h2><p>Ranked by ingredient matches and items needing review.</p></div><button type="button" className="text-button" onClick={() => navigate("Recipes")}>All recipes →</button></div>
          <div className="recipe-grid">{rankedRecipes.slice(0, 3).map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} />)}</div>
        </section>
      </>}

      {page === "My Inventory" && <div className="inventory-layout">
        <section className="section-panel">
          <div className="section-heading"><div><span className="eyebrow">YOUR GROCERIES</span><h2>Food inventory</h2><p>Search, filter, use or record ingredients.</p></div><span className="count-pill">{foods.length} items</span></div>
          <div className="toolbar">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ingredients..." aria-label="Search ingredients" />
            <select value={inventoryFilter} onChange={(e) => setInventoryFilter(e.target.value)} aria-label="Filter inventory">
              <option>All</option><option>Use first</option><option>Expiring soon</option><option>Past printed date</option><option>Date unknown</option><option>Freshly purchased</option>
            </select>
          </div>
          <FoodRows items={visibleFoods} />
        </section>

        <section className="section-panel add-food-panel">
          <div className="section-heading"><div><span className="eyebrow">ADD GROCERIES</span><h2>Add an ingredient</h2><p>Enter the details you know.</p></div><span className="add-mark">＋</span></div>
          <form className="form-stack" onSubmit={addFood}>
            <label htmlFor="food-name">Ingredient name</label><input id="food-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Spinach" required />
            <label htmlFor="food-quantity">Quantity</label><input id="food-quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g. 250 g" required />
            <label htmlFor="food-category">Category</label><select id="food-category" value={category} onChange={(e) => setCategory(e.target.value)}><option>Vegetables</option><option>Fruits</option><option>Dairy</option><option>Meat</option><option>Grains</option><option>Other</option></select>
            <label htmlFor="date-type">Date tracking</label><select id="date-type" value={dateType} onChange={(e) => setDateType(e.target.value)}><option value="purchase">Purchase date — fresh food</option><option value="printed">Printed expiry / use-by date</option><option value="unknown">Date unknown</option></select>
            {dateType !== "unknown" && <><label htmlFor="food-date">{dateType === "purchase" ? "Purchase date" : "Date printed on package"}</label><input id="food-date" type="date" value={foodDate} max={dateType === "purchase" ? today() : undefined} onChange={(e) => setFoodDate(e.target.value)} required /></>}
            <label htmlFor="food-storage">Storage location</label><select id="food-storage" value={storage} onChange={(e) => setStorage(e.target.value)}><option value="room">Room temperature</option><option value="fridge">Refrigerator</option><option value="freezer">Freezer</option></select>
            <button className="primary-button full-button" type="submit">＋ Add to inventory</button>
          </form>
          <p className="safety-note">Purchase dates are not expiry dates. Follow storage guidance and package instructions.</p>
        </section>
      </div>}

      {page === "Recipes" && <section className="section-panel">
        <div className="section-heading"><div><span className="eyebrow">INDIAN KITCHEN · SMARTER COOKING</span><h2>Recipes from your inventory</h2><p>Recipe matching does not check food safety.</p></div><span className="add-mark">🍲</span></div>
        <div className="toolbar">
          <input value={recipeSearch} onChange={(e) => setRecipeSearch(e.target.value)} placeholder="Search Indian recipes..." aria-label="Search recipes" />
          <select value={recipeFilter} onChange={(e) => setRecipeFilter(e.target.value)} aria-label="Filter recipes"><option>All</option><option>Best matches</option><option>Use my ingredients</option><option>Use first ingredients</option></select>
        </div>
        {filteredRecipes.length ? <div className="recipe-grid">{filteredRecipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} />)}</div> : <p className="empty-state">No recipes match. Try another filter or add ingredients.</p>}
        {selectedRecipe && <div className="recipe-detail">
          <div className="section-heading"><div><span className="eyebrow">RECIPE DETAILS</span><h2>{selectedRecipe.emoji} {selectedRecipe.name}</h2><p>{selectedRecipe.cuisine} · {selectedRecipe.time} minutes</p></div><button type="button" className="icon-button" onClick={() => setSelectedRecipe(null)} aria-label="Close recipe">×</button></div>
          {selectedRecipe.match.priorityMatches.length > 0 && <div className="callout">♻️ Items needing review: {selectedRecipe.match.priorityMatches.map((food) => food.name).join(", ")}. Check condition and storage first.</div>}
          <h3>Main ingredients</h3>
          <ul className="ingredient-checklist">{selectedRecipe.ingredients.map((ingredient) => {
            const found = selectedRecipe.match.available.some((item) => item.name === ingredient.name);
            return <li key={ingredient.name}><span>{found ? "✓" : "+"}</span>{ingredient.name}{!found && <small>Missing</small>}</li>;
          })}</ul>
          <h3>Pantry essentials</h3><p>{selectedRecipe.pantry.join(", ")}</p>
          <h3>Cooking instructions</h3><ol className="instructions-list">{selectedRecipe.steps.map((step, i) => <li key={i}>{step}</li>)}</ol>
          <p className="safety-note">Only use ingredients that are suitable for use and cook food thoroughly. FoodSaver cannot determine whether food is safe.</p>
        </div>}
      </section>}

      {page === "Waste Tracker" && <>
        <section className="welcome-banner"><div><span className="welcome-tag">YOUR SUSTAINABILITY JOURNEY</span><h2>Every choice adds up.</h2><p>Keep a history of food used and discarded.</p></div><div className="banner-illustration">♻️</div></section>
        <section className="stats-grid">
          <Stat icon="✅" label="Marked as used" value={usedCount} description="Saved history" />
          <Stat icon="🗑️" label="Marked discarded" value={discardedCount} description="Saved history" tone="orange" />
          <Stat icon="📈" label="Use rate" value={`${useRate}%`} description="Of recorded actions" tone="blue" />
          <Stat icon="🧺" label="Still in inventory" value={foods.length} description="Current ingredients" tone="purple" />
        </section>
        <section className="section-panel">
          <div className="section-heading"><div><h2>Record food usage</h2><p>Mark an ingredient as used or discarded from My Inventory.</p></div><button className="secondary-button" type="button" onClick={() => navigate("My Inventory")}>Open inventory</button></div>
          <p className="empty-state">Use the Used or Discard buttons in your inventory. Actions will appear in the history below.</p>
        </section>
        <section className="section-panel">
          <div className="section-heading"><div><h2>Recent history</h2><p>{history.length} recorded actions</p></div>{history.length > 0 && <button type="button" className="text-button danger-text" onClick={() => { if (window.confirm("Clear all history?")) setHistory([]); }}>Clear history</button>}</div>
          {!history.length ? <p className="empty-state">No actions recorded yet.</p> : <div className="history-list">{history.map((entry) => <article className="history-row" key={entry.id}><span className={`history-icon ${entry.action}`}>{entry.action === "used" ? "✓" : "×"}</span><div className="history-main"><strong>{entry.name}</strong><span>{entry.quantity} · {entry.category}</span></div><span className={`history-badge ${entry.action}`}>{entry.action === "used" ? "Used" : "Discarded"}</span><time>{entry.date}</time></article>)}</div>}
          <p className="safety-note">Counts are item records, not food weight, carbon emissions or money saved.</p>
        </section>
      </>}

      {page === "Household" && <section className="section-panel household-panel">
        <div className="section-heading"><div><span className="eyebrow">HOUSEHOLD WORKSPACE</span><h2>Manage your household</h2><p>Keep a household label and transfer data using backups.</p></div><span className="add-mark">🏡</span></div>
        <div className="callout">This prototype saves data in the current browser. Backup import/export transfers a snapshot manually; live multi-device syncing needs a backend such as Firebase or Supabase.</div>
        <form className="form-stack household-form" onSubmit={saveHousehold}><label htmlFor="household-name">Household name</label><input id="household-name" value={householdName} onChange={(e) => setHouseholdName(e.target.value)} placeholder="e.g. My Family" /><button type="submit" className="primary-button">Save household name</button></form>
        <div className="section-heading member-heading"><div><h3>Household members</h3><p>Names listed for this prototype.</p></div><span className="count-pill">{household.members.length} members</span></div>
        <div className="member-list">{household.members.map((member, index) => <div className="member-row" key={`${member}-${index}`}><span className="member-avatar">{member.slice(0, 1).toUpperCase()}</span><span>{member}</span>{index === 0 ? <span className="owner-tag">Owner</span> : <button type="button" className="text-button danger-text" onClick={() => setHousehold((old) => ({ ...old, members: old.members.filter((_, i) => i !== index) }))}>Remove</button>}</div>)}</div>
        <form className="add-member-form" onSubmit={addMember}><label htmlFor="member-name">Add a member name</label><div className="inline-form"><input id="member-name" value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder="e.g. Amma" /><button className="primary-button" type="submit">Add member</button></div></form>
        <div className="backup-grid">
          <article className="backup-card"><span>📤</span><h3>Export household data</h3><p>Download inventory, household details and waste history as a JSON backup.</p><button className="primary-button" type="button" onClick={exportBackup}>Export backup</button></article>
          <article className="backup-card"><span>📥</span><h3>Import a backup</h3><p>Load a FoodSaver backup from another browser. It replaces current data.</p><input ref={importRef} className="visually-hidden" type="file" accept=".json,application/json" onChange={importBackup} /><button className="secondary-button" type="button" onClick={() => importRef.current?.click()}>Choose backup file</button>{importError && <p className="error-text">{importError}</p>}</article>
        </div>
      </section>}

      <footer className="app-footer"><span>🌱 Designed for a more sustainable kitchen</span><span>FoodSaver · Design Thinking Prototype</span></footer>
    </main>
  </div>;
}

