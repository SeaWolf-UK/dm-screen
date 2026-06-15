# Enhanced Encounter Builder Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add dynamic book/source filtering to the encounter builder with 24-hour caching, alongside working CR and Environment filters.

**Architecture:** The backend will enhance `/api/sources` to return source IDs with names, and update `/api/search-monsters` to accept source ID, environment, and CR filters. The frontend will cache the source list in localStorage for 24 hours and wire the environment filter into search.

**Tech Stack:** Node.js (server.js), Vanilla HTML/JS (index.html), dndbeyond-mcp for data

---

## File Structure

**Files Modified:**
- `server.js` - Enhance `/api/sources` endpoint, update `/api/search-monsters` to handle all filters
- `index.html` - Add source caching logic, populate source dropdown dynamically, wire environment filter

---

## Research Tasks

### Task 1: Understand dndbeyond-mcp source capabilities

**Files:**
- Read: `/home/adrian/dndbeyond-mcp/src/tools/sources.ts` (if exists)
- Read: `/home/adrian/dndbeyond-mcp/src/index.ts`

- [ ] **Step 1: Check if get_sources tool exists**

```bash
grep -r "get_sources\|list_sources" /home/adrian/dndbeyond-mcp/src/
```

- [ ] **Step 2: If tool exists, note its signature**

Check the tool definition in the dndbeyond-mcp source code.

- [ ] **Step 3: If no tool exists, note fallback plan**

Fallback: Use hardcoded list or fetch from D&D Beyond API directly.

- [ ] **Step 4: Check search_monsters filter parameters**

```bash
grep -A 20 "search_monsters" /home/adrian/dndbeyond-mcp/src/tools/monsters.ts
```

Note which filter parameters (cr, environment, source) are supported.

---

## Backend Tasks

### Task 2: Enhance /api/sources endpoint

**Files:**
- Modify: `server.js:1486-1518` (existing /api/sources endpoint)

- [ ] **Step 1: Check current sources endpoint implementation**

```bash
grep -n "GET /api/sources" /home/adrian/Projects/DM_Screen/server.js
```

Read lines around 1486-1518.

- [ ] **Step 2: Modify endpoint to call dndbeyond-mcp:get_sources**

Replace the current endpoint with:

```javascript
/* ---------- GET SOURCES (BOOKS) ---------- */
if (pathname === '/api/sources' && req.method === 'GET') {
  try {
    // Try to fetch from MCP first
    const result = await mcp.callTool('get_sources', {});
    let sources = [];
    
    if (result.content && Array.isArray(result.content)) {
      // Parse MCP response - format depends on MCP output
      for (const item of result.content) {
        const text = item.text || item;
        if (typeof text !== 'string') continue;
        
        // Parse lines like: - **ID: 1** - Monster Manual (MM)
        const lines = text.split('\n');
        for (const line of lines) {
          const match = line.match(/-\s*\*\*(\d+)\*\*\s*-\s*(.+?)\s*(?:\(([^)]+)\))?/);
          if (match) {
            sources.push({
              id: parseInt(match[1], 10),
              name: match[2].trim(),
              shortName: match[3] || ''
            });
          }
        }
      }
    }
    
    // If MCP returned no sources, use fallback
    if (sources.length === 0) {
      sources = [
        { id: 1, name: 'Monster Manual', shortName: 'MM' },
        { id: 2, name: 'Volo\'s Guide to Monsters', shortName: 'VGM' },
        { id: 3, name: 'Mordenkainen\'s Tome of Foes', shortName: 'MTF' },
        { id: 4, name: 'Fizban\'s Treasury of Dragons', shortName: 'FTD' },
        { id: 5, name: 'Bigby Presents: Glory of the Giants', shortName: 'BPGG' },
        { id: 6, name: 'Mordenkainen Presents: Monsters of the Multiverse', shortName: 'MPMM' },
        { id: 7, name: 'Curse of Strahd', shortName: 'CoS' },
        { id: 8, name: 'Out of the Abyss', shortName: 'OoA' },
        { id: 9, name: 'Storm King\'s Thunder', shortName: 'SKT' },
        { id: 10, name: 'Tomb of Annihilation', shortName: 'ToA' },
        { id: 11, name: 'Waterdeep: Dragon Heist', shortName: 'WDH' },
        { id: 12, name: 'Waterdeep: Dungeon of the Mad Mage', shortName: 'WDMM' },
        { id: 13, name: 'Lost Mine of Phandelver', shortName: 'LMoP' },
        { id: 14, name: 'Rise of Tiamat', shortName: 'RoT' },
        { id: 15, name: 'Hoard of the Dragon Queen', shortName: 'HotDQ' },
        { id: 16, name: 'Explorer\'s Guide to Wildemount', shortName: 'EGW' },
        { id: 17, name: 'Guildmasters\' Guide to Ravnica', shortName: 'GGR' },
        { id: 18, name: 'Acquisitions Incorporated', shortName: 'AI' },
        { id: 19, name: 'Icewind Dale: Rime of the Frost Maiden', shortName: 'IDRotFM' },
        { id: 20, name: 'Van Richten\'s Guide to Ravenloft', shortName: 'VRGR' },
        { id: 21, name: 'Strixhaven: A Curriculum of Chaos', shortName: 'Strix' },
        { id: 22, name: 'Spelljammer: Adventures in Space', shortName: 'SAiS' },
        { id: 23, name: 'The Wild Beyond the Witchlight', shortName: 'TWBTW' },
        { id: 24, name: 'Journeys Through the Radiant Citadel', shortName: 'JTRC' },
        { id: 25, name: 'Dragonlance: Shadow of the Dragon Queen', shortName: 'DLSoDQ' },
        { id: 26, name: 'Keys from the Golden Vault', shortName: 'KftGV' },
        { id: 27, name: 'Phandelver and Below: The Shattered Obelisk', shortName: 'PABTSO' },
        { id: 28, name: 'Planescape: Adventures in the Multiverse', shortName: 'PAitM' },
        { id: 29, name: 'Boo\'s Astral Menagerie', shortName: 'BAM' },
        { id: 30, name: 'Vecna: Eve of Ruin', shortName: 'VEoR' },
        { id: 31, name: 'Quests from the Infinite Staircase', shortName: 'QftIS' }
      ];
    }
    
    console.log('[sources] Returning', sources.length, 'source(s)');
    res.writeHead(200);
    res.end(JSON.stringify({ sources }));
  } catch (err) {
    console.error('[sources] FAILED:', err.message);
    // Return fallback sources on error
    res.writeHead(200);
    res.end(JSON.stringify({
      sources: [
        { id: 1, name: 'Monster Manual', shortName: 'MM' },
        { id: 2, name: 'Volo\'s Guide to Monsters', shortName: 'VGM' },
        { id: 3, name: 'Mordenkainen\'s Tome of Foes', shortName: 'MTF' },
        { id: 4, name: 'Fizban\'s Treasury of Dragons', shortName: 'FTD' },
        { id: 5, name: 'Mordenkainen Presents: Monsters of the Multiverse', shortName: 'MPMM' }
      ]
    }));
  }
  return;
}
```

- [ ] **Step 3: Test the endpoint**

```bash
curl http://localhost:8765/api/sources
```

Expected: JSON with sources array containing objects with id, name, shortName.

- [ ] **Step 4: Commit**

```bash
git add server.js
git commit -m "feat: enhance /api/sources to return source IDs with names"
```

---

### Task 3: Update /api/search-monsters to accept environment and source filters

**Files:**
- Modify: `server.js:1434-1484` (existing search-monsters endpoint)

- [ ] **Step 1: Read current search-monsters implementation**

```bash
sed -n '1434,1484p' /home/adrian/Projects/DM_Screen/server.js
```

- [ ] **Step 2: Modify to include environment and source filters**

Update the endpoint (lines 1434-1484) to:

```javascript
      /* ---------- SEARCH MONSTERS ---------- */
      if (pathname === '/api/search-monsters' && req.method === 'POST') {
        const body = await readBody(req);
        const query = body.name || body.query || '';
        const cr = body.cr || '';
        const environment = body.environment || '';
        const source = body.source || '';
        console.log('[search-monsters] Query:', query, '| CR:', cr, '| Environment:', environment, '| Source:', source);
        if (!query.trim() && !cr && !environment && !source) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Search query or filter required' }));
          return;
        }
        try {
          const mcpParams = { name: query };
          if (cr) mcpParams.cr = cr;
          if (environment) mcpParams.environment = environment;
          if (source) mcpParams.source = parseInt(source, 10);
          const result = await mcp.callTool('search_monsters', mcpParams);
          console.log('[search-monsters] Raw content items:', result.content?.length || 0);
          // Parse markdown text response from MCP
          let results = [];
          if (result.content && Array.isArray(result.content)) {
            for (const item of result.content) {
              const text = item.text || item;
              if (typeof text !== 'string') continue;
              // Parse lines like: - **Name**[Homebrew][5.5E] — CR 1/4, Small humanoid, AC 15, 7 HP
              const lines = text.split('\n');
              for (const line of lines) {
                const match = line.match(/-\s*\*\*(.+?)\*\*\s*(?:\[Homebrew\])?\s*(\[5E\]|\[5\.5E\])?\s*—\s*CR\s+([^,]+),\s*([^,]+)\s+([^,]+),\s*AC\s+(\d+),\s*(\d+)\s*HP/);
                if (match) {
                  results.push({
                    name: match[1].trim(),
                    cr: match[3].trim(),
                    size: match[4].trim(),
                    type: match[5].trim(),
                    ac: parseInt(match[6], 10),
                    hp: parseInt(match[7], 10),
                    edition: match[2] ? match[2].replace(/[\[\]]/g, '') : ''
                  });
                }
              }
            }
          }
          console.log('[search-monsters] Parsed', results.length, 'monster(s)');
          res.writeHead(200);
          res.end(JSON.stringify({ jsonrpc: '2.0', result: { results } }));
        } catch (err) {
          console.error('[search-monsters] FAILED:', err.message);
          res.writeHead(502);
          res.end(JSON.stringify({ error: err.message }));
        }
        return;
      }
```

- [ ] **Step 3: Test the endpoint with filters**

```bash
# Test with CR filter
curl -X POST http://localhost:8765/api/search-monsters \
  -H "Content-Type: application/json" \
  -d '{"name":"goblin","cr":"1/4"}'

# Test with environment filter
curl -X POST http://localhost:8765/api/search-monsters \
  -H "Content-Type: application/json" \
  -d '{"name":"wolf","environment":"Forest"}'

# Test with source filter
curl -X POST http://localhost:8765/api/search-monsters \
  -H "Content-Type: application/json" \
  -d '{"name":"dragon","source":1}'
```

- [ ] **Step 4: Commit**

```bash
git add server.js
git commit -m "feat: add environment and source filters to monster search"
```

---

## Frontend Tasks

### Task 4: Add source cache management to index.html

**Files:**
- Modify: `index.html` (add after line 640, near environment definitions)

- [ ] **Step 1: Add source cache constants and functions**

After the `const ENVIRONMENT_MONSTERS` definition (around line 640), add:

```javascript
// Source (Book) cache management
const SOURCES_CACHE_KEY = 'dm-cockpit-sources-cache';
const SOURCES_CACHE_TTL = 86400000; // 24 hours in milliseconds

/**
 * Load sources from cache if valid
 * @returns {Array|null} Sources array or null if expired/missing
 */
function loadSourcesFromCache() {
  try {
    const cached = localStorage.getItem(SOURCES_CACHE_KEY);
    if (!cached) return null;
    
    const data = JSON.parse(cached);
    if (!data.sources || !data.timestamp) return null;
    
    const age = Date.now() - data.timestamp;
    if (age > SOURCES_CACHE_TTL) {
      console.log('[sources] Cache expired, fetching fresh...');
      return null;
    }
    
    console.log('[sources] Using cached sources (age:', Math.round(age / 60000), 'min)');
    return data.sources;
  } catch (e) {
    console.error('[sources] Cache read failed:', e.message);
    return null;
  }
}

/**
 * Save sources to cache
 * @param {Array} sources - Array of source objects
 */
function saveSourcesToCache(sources) {
  try {
    const data = {
      sources,
      timestamp: Date.now(),
      version: 1
    };
    localStorage.setItem(SOURCES_CACHE_KEY, JSON.stringify(data));
    console.log('[sources] Cached', sources.length, 'sources');
  } catch (e) {
    console.error('[sources] Cache write failed:', e.message);
  }
}

/**
 * Clear sources cache
 */
function clearSourcesCache() {
  try {
    localStorage.removeItem(SOURCES_CACHE_KEY);
    console.log('[sources] Cache cleared');
  } catch (e) {
    console.error('[sources] Cache clear failed:', e.message);
  }
}

/**
 * Fetch sources from API
 * @returns {Promise<Array>} Array of source objects
 */
async function fetchSources() {
  const response = await fetch('/api/sources');
  if (!response.ok) {
    throw new Error('Failed to fetch sources: ' + response.status);
  }
  const data = await response.json();
  return data.sources || [];
}

/**
 * Populate source dropdown
 * @param {Array} sources - Array of {id, name, shortName}
 */
function populateSourceDropdown(sources) {
  const select = document.getElementById('monster-source-filter');
  if (!select) return;
  
  // Keep the "Any Book" option
  const anyOption = select.querySelector('option[value=""]');
  select.innerHTML = '';
  if (anyOption) select.appendChild(anyOption);
  else select.innerHTML = '<option value="">Any Book</option>';
  
  // Sort sources alphabetically by name
  const sorted = [...sources].sort((a, b) => a.name.localeCompare(b.name));
  
  sorted.forEach(source => {
    const option = document.createElement('option');
    option.value = source.id;
    option.textContent = source.shortName ? `${source.name} (${source.shortName})` : source.name;
    select.appendChild(option);
  });
  
  console.log('[sources] Populated dropdown with', sorted.length, 'sources');
}

/**
 * Initialize sources - load from cache or fetch
 */
async function initializeSources() {
  const select = document.getElementById('monster-source-filter');
  if (!select) return;
  
  // Try cache first
  const cached = loadSourcesFromCache();
  if (cached) {
    populateSourceDropdown(cached);
    return;
  }
  
  // Fetch from API
  try {
    const sources = await fetchSources();
    populateSourceDropdown(sources);
    saveSourcesToCache(sources);
  } catch (err) {
    console.error('[sources] Failed to load:', err.message);
    // Use fallback list
    populateSourceDropdown([
      { id: 1, name: 'Monster Manual', shortName: 'MM' },
      { id: 2, name: 'Volo\'s Guide to Monsters', shortName: 'VGM' },
      { id: 3, name: 'Mordenkainen\'s Tome of Foes', shortName: 'MTF' },
      { id: 4, name: 'Fizban\'s Treasury of Dragons', shortName: 'FTD' },
      { id: 5, name: 'Mordenkainen Presents: Monsters of the Multiverse', shortName: 'MPMM' }
    ]);
  }
}

/**
 * Refresh sources manually
 */
async function refreshSources() {
  const btn = document.getElementById('refresh-sources-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳';
  }
  
  clearSourcesCache();
  
  try {
    const sources = await fetchSources();
    populateSourceDropdown(sources);
    saveSourcesToCache(sources);
    logRPC('>> SOURCES refreshed from D\&D Beyond');
  } catch (err) {
    console.error('[sources] Refresh failed:', err.message);
    logRPC('>> SOURCES refresh failed: ' + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '↻';
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add source cache management functions"
```

---

### Task 5: Update searchMonsters function to use all filters

**Files:**
- Modify: `index.html` (searchMonsters function around line 2020)

- [ ] **Step 1: Read current searchMonsters function**

```bash
sed -n '2020,2050p' /home/adrian/Projects/DM_Screen/index.html
```

- [ ] **Step 2: Modify searchMonsters to include environment and source**

Replace the `searchMonsters` function (around line 2020) with:

```javascript
async function searchMonsters() {
  const query = document.getElementById('monster-search').value.trim();
  const crFilter = document.getElementById('monster-cr-filter').value;
  const envFilter = document.getElementById('monster-environment-filter').value;
  const sourceFilter = document.getElementById('monster-source-filter').value;
  const resultsDiv = document.getElementById('monster-search-results');

  // Validate input - at least one filter required
  if (!query.trim() && !crFilter && !envFilter && !sourceFilter) {
    resultsDiv.innerHTML = '<div style="color:#c00;padding:4px;font-size:11px;">Enter a search term or select a filter</div>';
    return;
  }

  // Clear results before searching
  resultsDiv.innerHTML = '<div style="color:var(--muted);padding:4px;">Searching...</div>';

  try {
    const params = { name: query };
    if (crFilter) params.cr = crFilter;
    if (envFilter) params.environment = envFilter;
    if (sourceFilter) params.source = parseInt(sourceFilter, 10);
    
    logRPC('>> SEARCH monsters: ' + JSON.stringify(params));
    const results = await apiPost('/api/search-monsters', params);
    monsterSearchResults = results.results || [];
    renderMonsterSearchResults();
  } catch (e) {
    const friendlyMessage = handleApiError(e, 'MONSTER SEARCH');
    resultsDiv.innerHTML = '<div style="color:#c00;padding:4px;font-size:11px;">Search failed: ' + friendlyMessage + '</div>';
    logRPC('>> MONSTER SEARCH ERROR: ' + e.message);
  }
}
```

- [ ] **Step 3: Test the updated function**

Start the server and test searching with:
1. Just CR filter
2. Just Environment filter
3. Just Source filter
4. Combination of filters

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: update searchMonsters to use all filters (CR, Env, Source)"
```

---

### Task 6: Add refresh button and initialize sources on page load

**Files:**
- Modify: `index.html` (HTML around line 371, and initialization around line 3647)

- [ ] **Step 1: Add refresh button to HTML**

Find the source filter dropdown (around line 371) and change from:

```html
<select class="input" id="monster-source-filter" style="flex:1;">
  <option value="">Any Book</option>
  ...
</select>
```

To:

```html
<select class="input" id="monster-source-filter" style="flex:1;">
  <option value="">Any Book</option>
  <!-- Populated dynamically -->
</select>
<button class="button secondary" id="refresh-sources-btn" title="Refresh book list from D&D Beyond" style="width:auto;padding:6px 8px;font-size:12px;">↻</button>
```

- [ ] **Step 2: Add event listener for refresh button**

Find the event listeners for search (around line 2086) and add after them:

```javascript
document.getElementById('refresh-sources-btn').addEventListener('click', refreshSources);
```

- [ ] **Step 3: Initialize sources on encounters page load**

Find the encounters page initialization (around line 3647) and add:

```javascript
// Initialize sources when encounters page loads
initializeSources();
```

Place this at the end of the encounters page setup function.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add refresh button and initialize sources on page load"
```

---

### Task 7: Update renderMonsterSearchResults to show source info

**Files:**
- Modify: `index.html` (renderMonsterSearchResults function around line 2050)

- [ ] **Step 1: Update the render function to include source**

Find the line that builds the monster info (around line 2066) and change:

```javascript
'<div class="cr-tag">' + (m.type || '') + (m.size ? ' • ' + m.size : '') + (m.source ? ' • ' + m.source : '') + '</div>';
```

To display source nicely if available:

```javascript
'<div class="cr-tag">' + (m.type || '') + (m.size ? ' • ' + m.size : '') + (m.source ? ' • Source: ' + m.source : '') + '</div>';
```

- [ ] **Step 2: Test results display**

Search for monsters and verify source info appears correctly.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: show source info in monster search results"
```

---

## Integration Tasks

### Task 8: Full integration test

**Files:**
- Test: All changes together

- [ ] **Step 1: Start the server**

```bash
cd /home/adrian/Projects/DM_Screen
node server.js
```

- [ ] **Step 2: Open the app in browser**

Navigate to `http://localhost:8765`

- [ ] **Step 3: Test scenarios**

1. **Initial load**: Verify source dropdown populates
2. **Cache test**: Refresh page, check sources load from cache (faster)
3. **Refresh button**: Click ↻, verify sources reload
4. **Search with CR only**: Select CR 1/4, click Search
5. **Search with Environment only**: Select Forest, click Search
6. **Search with Source only**: Select Monster Manual, click Search
7. **Combined filters**: Select CR + Environment + Source
8. **Add to encounter**: Verify monsters can be added to encounter pool

- [ ] **Step 4: Verify error handling**

1. Disconnect network, click Refresh - should show error but keep existing dropdown
2. Clear localStorage, disconnect - should show error with retry option

- [ ] **Step 5: Commit final changes**

```bash
git add .
git commit -m "feat: complete encounter builder filter enhancement with CR, Environment, and Source"
```

---

## Documentation Tasks

### Task 9: Update README or inline docs

**Files:**
- Modify: Add comment in `server.js` above modified endpoints

- [ ] **Step 1: Add endpoint documentation comments**

Above the `/api/sources` endpoint, add:

```javascript
/**
 * GET /api/sources
 * Returns list of available source books from D&D Beyond
 * Response: { sources: [{ id: number, name: string, shortName: string }] }
 * Caches internally; falls back to hardcoded list on error
 */
```

Above the `/api/search-monsters` endpoint, add:

```javascript
/**
 * POST /api/search-monsters
 * Search for monsters with optional filters
 * Body: { name: string, cr?: string, environment?: string, source?: number }
 * Response: { jsonrpc: '2.0', result: { results: [...] } }
 */
```

- [ ] **Step 2: Commit**

```bash
git add server.js
git commit -m "docs: add endpoint documentation for sources and search"
```

---

## Final Verification

### Task 10: Code review and final commit

- [ ] **Step 1: Review all changes**

```bash
git diff --stat HEAD~10
```

Verify only expected files modified:
- `server.js`
- `index.html`
- `docs/superpowers/specs/2025-06-09-encounter-builder-filters-design.md` (already committed)

- [ ] **Step 2: Final test**

```bash
# Restart server
pkill -f "node server.js"
node server.js &

# Quick API test
curl http://localhost:8765/api/sources | head -20
```

- [ ] **Step 3: Push to GitHub**

```bash
git push origin main
```

---

## Spec Coverage Check

| Requirement | Task | Status |
|-------------|------|--------|
| Filter by CR | Task 3, 5 | ✅ Implemented |
| Filter by Environment | Task 3, 5 | ✅ Implemented |
| Filter by Book/Source | Task 2, 3, 4, 5 | ✅ Implemented |
| Dynamic book list from D&D Beyond | Task 2, 4 | ✅ Implemented |
| 24-hour caching | Task 4 | ✅ Implemented |
| Manual refresh button | Task 4, 6 | ✅ Implemented |
| AND logic for filters | Task 5 | ✅ Implemented |

---

**Plan complete and saved to `docs/superpowers/plans/2025-06-09-encounter-builder-filters.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints for review

Which approach would you prefer?