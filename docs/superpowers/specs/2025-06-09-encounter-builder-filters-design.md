# Enhanced Encounter Builder Filters Design

## Overview
Add dynamic book/source filtering to the encounter builder alongside existing CR and Environment filters, with 24-hour caching of the source list from D&D Beyond.

## Requirements
- Filter by CR, Environment, and Book (source) simultaneously (AND logic)
- Dynamically fetch book list from D&D Beyond API via dndbeyond-mcp
- Cache book list for 24 hours in localStorage
- Provide manual refresh button for book list
- Wire Environment filter into search (currently UI-only)

## Architecture

### Backend Changes (server.js)

#### 1. Enhanced `/api/sources` Endpoint
```javascript
GET /api/sources
Response: {
  sources: [
    { id: 1, name: "Monster Manual", shortName: "MM" },
    { id: 2, name: "Volo's Guide to Monsters", shortName: "VGM" },
    ...
  ]
}
```

**Implementation:**
- Call `dndbeyond-mcp:get_sources` tool
- Map response to `{ id, name, shortName }` format
- Fallback to hardcoded common sources if MCP unavailable

#### 2. Updated `/api/search-monsters` Endpoint
```javascript
POST /api/search-monsters
Body: {
  name: string,      // search query
  cr?: string,       // optional CR filter
  environment?: string, // optional environment filter
  source?: number    // optional source ID (not name)
}
```

**Implementation:**
- Pass all filters to `dndbeyond-mcp:search_monsters`
- MCP handles the actual filtering logic
- Parse and return standardized results

### Frontend Changes (index.html)

#### 1. Source Cache Management
```javascript
// Cache structure
const CACHE_KEY = 'dm-cockpit-sources-cache';
const CACHE_TTL = 86400000; // 24 hours

{
  sources: [...],
  timestamp: 1718888888888,
  version: 1
}
```

**Functions:**
- `loadSourcesFromCache()` - Check cache validity, return sources or null
- `fetchSources()` - Call /api/sources, populate dropdown, update cache
- `refreshSources()` - Clear cache, fetch fresh, update UI

#### 2. Book Dropdown Population
- Default option: "Any Book" (value: "")
- Sorted alphabetically by name
- Display: Full name (e.g., "Monster Manual")
- Value: Source ID for API calls

#### 3. Filter Integration
**Search function:**
```javascript
async function searchMonsters() {
  const query = document.getElementById('monster-search').value.trim();
  const crFilter = document.getElementById('monster-cr-filter').value;
  const envFilter = document.getElementById('monster-environment-filter').value;
  const sourceFilter = document.getElementById('monster-source-filter').value; // ID

  const params = { name: query };
  if (crFilter) params.cr = crFilter;
  if (envFilter) params.environment = envFilter;
  if (sourceFilter) params.source = parseInt(sourceFilter, 10);

  // Call API with all filters
}
```

#### 4. UI Changes

**Filter row layout:**
```html
<div style="display:flex;gap:4px;margin-bottom:4px;align-items:center;">
  <select id="monster-cr-filter">...</select>
  <select id="monster-environment-filter">...</select>
  <select id="monster-source-filter">
    <option value="">Any Book</option>
    <!-- Populated dynamically -->
  </select>
  <button id="refresh-sources-btn" title="Refresh book list">↻</button>
</div>
```

**Refresh button:**
- Small circular button next to source dropdown
- Tooltip: "Refresh book list from D&D Beyond"
- On click: Clear cache, fetch fresh, show loading state

#### 5. Error Handling

| Scenario | Behavior |
|----------|----------|
| Cache valid | Use cached sources |
| Cache expired | Fetch new, update cache |
| Fetch succeeds | Update cache, populate dropdown |
| Fetch fails (has cache) | Use cached, show toast "Using cached book list" |
| Fetch fails (no cache) | Show error, disable dropdown, show retry button |

## Data Flow

### Initial Load
1. User navigates to Encounters page (F2)
2. `initEncounterPage()` called
3. Check `localStorage` for cached sources
4. If valid: Populate dropdown from cache
5. If expired/missing: Call `fetchSources()`
6. On success: Populate dropdown, cache results
7. On failure: Show error, use fallback hardcoded list

### Search Flow
1. User enters query and/or selects filters
2. Click SEARCH or press Enter
3. Collect all filter values (name, cr, environment, source)
4. POST to `/api/search-monsters`
5. Backend calls `dndbeyond-mcp:search_monsters` with filters
6. Return parsed results
7. Display in results list

### Refresh Flow
1. User clicks ↻ button
2. Clear `localStorage` cache
3. Show loading state on button
4. Call `fetchSources()`
5. On success: Populate dropdown, cache results
6. On failure: Show error, keep existing dropdown (if any)

## API Contract

### GET /api/sources
Returns list of available source books from D&D Beyond.

**Response:**
```json
{
  "sources": [
    { "id": 1, "name": "Monster Manual", "shortName": "MM" },
    { "id": 2, "name": "Volo's Guide to Monsters", "shortName": "VGM" },
    { "id": 3, "name": "Mordenkainen's Tome of Foes", "shortName": "MTF" }
  ]
}
```

### POST /api/search-monsters
Search for monsters with optional filters.

**Request:**
```json
{
  "name": "goblin",
  "cr": "1/4",
  "environment": "Forest",
  "source": 1
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "results": [
      {
        "name": "Goblin",
        "cr": "1/4",
        "size": "Small",
        "type": "humanoid",
        "ac": 15,
        "hp": 7,
        "edition": "5E",
        "source": "Monster Manual"
      }
    ]
  }
}
```

## Testing Considerations

1. **Cache expiry**: Set TTL to 1ms to test expiry behavior
2. **Network failure**: Disconnect to test offline behavior
3. **Empty results**: Search with impossible filter combination
4. **Large source list**: Verify dropdown handles 50+ books
5. **Filter combinations**: Test all permutations of filter selections

## Files Modified

- `server.js`: Add/enhance `/api/sources` and `/api/search-monsters`
- `index.html`: Add source cache logic, wire environment filter, update UI

## Future Enhancements (Out of Scope)

- Multi-select for sources (select multiple books)
- Filter by monster type (humanoid, beast, etc.)
- Save filter presets
- Search within selected book only (toggle)
