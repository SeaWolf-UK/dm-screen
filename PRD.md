THE COMPREHENSIVE TACTICAL COCKPIT PRD
1. SYSTEM ARCHITECTURE & ENVIRONMENT
Frontend Environment: Standalone, frameless local browser environment rendering a native, zero-latency HTML5 layout shell (index.html).

Backend Environment: A local Node.js application process (server.js) executing on http://localhost:3000. It acts as the local API gateway, file orchestrator, and credential vault.

Communication Protocol: Stateless HTTP POST requests utilizing standardized JSON payloads between the UI and server.js. The backend interfaces with external cloud APIs and local Model Context Protocol (MCP) server endpoints via JSON-RPC over Standard Input/Output (stdio).

UI Performance Constraint: Strict application of zero-transition rules (transition: none !important;). Layout element state updates, visibility changes, and data populations must process as instantaneous, unbuffered visual cuts.

2. APPLICATION LIFECYCLE & INITIALIZATION (THE SPLASH CORE)
Boot State: On initial launch, a full-viewport blocking overlay element (#splash-screen) displays over the main layout, locking down user interaction.

Campaign Enumeration: The backend automatically dispatches an immediate call to the running dndbeyond-mcp:list_campaigns instance. The returned collection of active campaign names and unique IDs is populated directly into the #splash-campaign select element.

AI Orchestration Selector: A dropdown menu (#splash-ai-provider) allows choice between: ollama_local, ollama_cloud, openai, claude, and openrouter. Input fields capture custom endpoint URLs (#splash-ai-endpoint) and authenticating API bearer keys (#splash-ai-key).

Initialization Handshake: Clicking [ CONFIRM & INITIALIZE COCKPIT ] triggers the session configuration:

Transmits the selected D&D Beyond Campaign ID, selected AI provider, target endpoint, and API authorization tokens down to the server.js memory state cache.

Triggers an immediate initialization data pull to populate the workspaces.

Hides the #splash-screen element using an immediate style cut (display: none;).

Initializes the persistent background telemetry sync loops.

3. WORKSPACE HYDRATION & INTERACTION ENGINE (PAGE-BY-PAGE)
PAGE 1: CHARACTERS WORKSPACE [F1]
The 60-Second Telemetry Heartbeat: Upon dashboard entry, an immutable interval timer executes precisely every 60,000 milliseconds. This loop triggers a call to dndbeyond-mcp:get_party using the cached Campaign ID.

Dynamic Card Generation: The logic must read the incoming party array, wipe any temporary placeholder elements in Column 1, and dynamically generate character telemetry templates matching this exact structure:

Name & Class Labels: Injected into the primary text rows.

Armor Class (AC) Display: Fed into the layout's dense tracking blocks.

Hit Point Meter Manipulation: Calculate the percentage of current health vs maximum health. Apply that exact value to the width property of the red health bar indicator (.hp-fill), and update the text layer string (.hp-text) to read exactly ${current} / ${max} HP.

Spell Slot Array Matrix: Render tracking check-boxes (☑︎ for available, ☐ for expended) dynamically matching the character's remaining slot arrays.

Deep Inspection Targeting: Clicking any individual character card catches its specific unique ID attribute. The script executes a targeted query to fetch that profile's full metadata payload, wiping Column 2 and instantly injecting their Saving Throw modifiers, active Status Conditions, Equipped Items, and Passive Senses (Perception, Insight, Investigation).

Shared Inventory Tracking: Column 3 connects directly to a local, persistent data ledger file (party_inventory.json). The server reads this file to update item quantities, item weights, and the currency pool tracking counters (gp, sp, cp).

PAGE 2: ENCOUNTERS WORKSPACE [F2]
The UI Split Lifecycle: This workspace operates in two strict states managed by toggle containers:

STATE A: STAGING MODE (#staging-mode): Houses the text filtering compendium search dock, the active monster setup pool, and a dynamic difficulty meter tracking total encounter experience points (XP).

STATE B: ENGAGEMENT MODE (#engagement-mode): Displays round counts, combat flow buttons, and the active initiative order.

Staging Pool Controllers:

The user can type into #comp-search to instantly filter local /Bestiary folder file matches via a localized regular-expression text pattern script.

Clicking + or – increment buttons adjusts the unit counter values inside the staging list rows.

Clicking the variant tracker button updates the tactical style indicator string, cycling through [ Standard -> Minion -> Boss ]. If Minion is selected, the unit's baseline hit points default to 1.

The Engagement Switch: Clicking [ INITIALIZE ENGAGEMENT MODE ] hides the staging container, unhides the engagement panel, resets the internal turn counter variable to 1, and builds the final sorted list inside the Initiative Ladder view.

Active Turn Architecture:

Clicking #next-round advances the active combat focus marker.

The software must strip the active CSS classes (.active-turn) and remove the visual indicator element (<span class="active-indicator"></span>) from the old row, re-inserting them instantly onto the next combatant row in the queue.

Dynamic Quick-Ref Ingestion: The moment a new creature becomes active in the initiative order, the script reads its text string, executes a rapid background call to filesystem-mcp:read_file for that specific creature's markdown document, parses out its Action/Reaction sections, and injects that text cleanly into Column 3's quick-reference view.

PAGE 3: LORE WORKSPACE [F3]
Vault Directory Tree Navigation: The directory layout lists clickable local folder elements tracking the campaign's markdown vault documentation arrays (/Bestiary, /Factions, /NPCs).

Live Markdown Viewer Loading: Clicking a path button overrides default link activity, isolates the target text string embedded in the data-path attribute, and sends a call to filesystem-mcp:read_file. The returned raw text data streams straight into the inner contents of the #markdown-view viewport block, retaining markdown header indicators, code blocks, and blockquotes.

PAGE 4: ADVENTURES WORKSPACE [F4]
Unstructured File Explorer Extraction: Column 1 features an active file explorer engine using a native HTML file element (#adventure-file-input) disguised behind a system-styled layout block button.

The Zero-Hint AI Parsing Engine Pipeline: When an adventure text document (.md format) is selected, the application reads the entire raw text file. It contains no structured yaml data, tags, or metadata configurations—it is written in pure natural language narrative.

The interface pushes the full raw narrative block down to server.js.

The server packages this text chunk into an automated system query targeting the chosen AI model interface selected during the splash sequence.

Mandatory System Prompt Constraint: The backend must inject this exact instruction to the model:

"You are a data-extraction middleware engine. Analyze this raw, natural language D&D adventure log. Isolate every hostile creature, NPC combatant, or monster group mentioned in the narrative. Calculate their intended numbers based on the sentence context. You must return nothing but a minified, clean JSON array of objects using exactly these keys: [{"name": "Creature Name", "qty": X, "type": "Standard"}]. Do not include markdown code block syntax wrappers, notes, or explanations in your response."

Encounter Ingestion: The backend parses the raw JSON response from the AI and hands the array back to the frontend script. The engine loops through this data, matches the names against the local bestiary database to grab the target base stats, and dynamically adds the rows directly into the Page 2 Encounter Pool queue automatically.

Timeline Metrics, Clocks, & Handouts:

Clicking an extracted sequence beat changes the visibility settings on the Truth Matrix component table rows to instantly show what players believe versus what is real for that scene.

The Environmental Hazard Clock reads its target stage numbers, updating challenge thresholds (DCs) and rule text alerts dynamically.

Clicking the clipboard interaction icon extracts the textual content inside the adjacent player handout blockquote element, dispatching it straight into the user's native operating system copy-paste buffer via the browser's navigator.clipboard.writeText framework.

4. AUDIT logging CODE SYSTEM
Every outgoing command string, data fetch request, state transition, and incoming JSON-RPC confirmation signature must be captured by a global event listener.

The raw string structure must format into a text block (e.g., >> CALL dndbeyond-mcp:get_party {"id": "4029182"} -> SUCCESS) and be appended to the top text row of the #rpc-terminal footer footer strip, keeping an audit log trail scrolling live on-screen.