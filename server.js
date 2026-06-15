const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const httpModule = require('http');
const crypto = require('crypto');

const PORT = process.env.PORT || 8765;
const CAMPAIGN_BASE = path.resolve(process.env.CAMPAIGN_BASE || path.join(__dirname, 'campaign'));
const DNDBEYOND_MCP_PATH = '/home/adrian/dndbeyond-mcp';
const PARTY_INVENTORY_PATH = path.join(CAMPAIGN_BASE, 'party_inventory.json');

/* ============================================================
   HTTP HELPERS
   ============================================================ */
function fetchWithTimeout(url, options = {}) {
  const { timeout = 10000, ...rest } = options;
  const client = url.startsWith('https:') ? https : httpModule;
  return new Promise((resolve, reject) => {
    const req = client.request(url, { method: options.method || 'GET', headers: options.headers || {}, ...rest }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        res.ok = res.statusCode >= 200 && res.statusCode < 300;
        res.text = () => Promise.resolve(data);
        res.json = () => { try { return Promise.resolve(JSON.parse(data)); } catch(e) { return Promise.reject(e); } };
        resolve(res);
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('request-timeout')); });
    req.setTimeout(timeout);
    if (rest.body) req.write(rest.body);
    req.end();
  });
}

/* ============================================================
   SESSION STATE CACHE
   ============================================================ */
const STATE = {
  campaignId: null,
  campaignName: null,
  aiProvider: null,
  aiEndpoint: null,
  aiKey: null,
  aiModel: null,
  initialized: false,
  bootTimestamp: Date.now()
};

/* ============================================================
   GLOBAL RATE LIMITER (sliding window)
   ============================================================ */
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60; // Max 60 requests per window
const rateLimitMap = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const key = `${ip}:${Math.floor(now / RATE_LIMIT_WINDOW)}`;
  const count = rateLimitMap.get(key) || 0;

  if (count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  rateLimitMap.set(key, count + 1);

  // Cleanup old entries
  if (count === 0) {
    setTimeout(() => {
      rateLimitMap.delete(key);
    }, RATE_LIMIT_WINDOW);
  }

  return true;
}

/* ============================================================
   SECURE LOCAL CONFIG PERSISTENCE
   ============================================================ */
const CONFIG_DIR = path.join(require('os').homedir(), '.dm-cockpit');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');
const SALT = Buffer.from('tactical-dm-cockpit-salt-v1', 'utf-8');

let derivedKey = null;
function deriveKey() {
  if (!derivedKey) {
    const machineData = require('os').userInfo().username + '@' + require('os').hostname();
    derivedKey = crypto.scryptSync(machineData, SALT, 32);
  }
  return derivedKey;
}

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey(), iv);
  let encrypted = cipher.update(text, 'utf-8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return { iv: iv.toString('hex'), authTag, data: encrypted };
}

function decrypt(encryptedObj) {
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', deriveKey(), Buffer.from(encryptedObj.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(encryptedObj.authTag, 'hex'));
    let decrypted = decipher.update(encryptedObj.data, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');
    return decrypted;
  } catch (e) {
    return null;
  }
}

async function loadConfig() {
  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf-8');
    const cfg = JSON.parse(raw);
    if (cfg.aiKeyEncrypted) {
      cfg.aiKey = decrypt(cfg.aiKeyEncrypted);
    }
    return cfg;
  } catch (e) {
    return null;
  }
}

async function saveConfig() {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  const payload = {
    campaignId: STATE.campaignId,
    campaignName: STATE.campaignName,
    aiProvider: STATE.aiProvider,
    aiEndpoint: STATE.aiEndpoint,
    aiKeyEncrypted: STATE.aiKey ? encrypt(STATE.aiKey) : null,
    aiModel: STATE.aiModel || null
  };
  await fs.writeFile(CONFIG_PATH, JSON.stringify(payload, null, 2), { mode: 0o600 });
}

/* ============================================================
   LAZY-LOADED D&D BEYOND MODULES
   ============================================================ */
let ddbModules = null;
let ddbClient = null;

async function getDdbModules() {
  if (ddbModules) return ddbModules;
  const [
    cacheMod,
    resilienceMod,
    clientMod,
    endpointsMod,
    calcMod
  ] = await Promise.all([
    import(path.join(DNDBEYOND_MCP_PATH, 'build/src/cache/lru.js')),
    import(path.join(DNDBEYOND_MCP_PATH, 'build/src/resilience/index.js')),
    import(path.join(DNDBEYOND_MCP_PATH, 'build/src/api/client.js')),
    import(path.join(DNDBEYOND_MCP_PATH, 'build/src/api/endpoints.js')),
    import(path.join(DNDBEYOND_MCP_PATH, 'build/src/utils/character-calculations.js'))
  ]);
  ddbModules = {
    TtlCache: cacheMod.TtlCache,
    CircuitBreaker: resilienceMod.CircuitBreaker,
    RateLimiter: resilienceMod.RateLimiter,
    DdbClient: clientMod.DdbClient,
    ENDPOINTS: endpointsMod.ENDPOINTS,
    calculateAc: calcMod.calculateAc,
    calculateCurrentHp: calcMod.calculateCurrentHp,
    calculateMaxHp: calcMod.calculateMaxHp,
    computeLevel: calcMod.computeLevel,
    calculatePassiveSkill: calcMod.calculatePassiveSkill
  };
  return ddbModules;
}

async function getDdbClient() {
  if (ddbClient) return ddbClient;
  const mods = await getDdbModules();
  const cache = new mods.TtlCache(60000);
  const circuitBreaker = new mods.CircuitBreaker(5, 30000);
  const rateLimiter = new mods.RateLimiter(2, 1000);
  ddbClient = new mods.DdbClient(cache, circuitBreaker, rateLimiter);
  return ddbClient;
}

/* ============================================================
   FILESYSTEM HELPERS
   ============================================================ */
async function readCampaignFile(relPath) {
  const fullPath = path.resolve(path.join(CAMPAIGN_BASE, relPath));
  const basePath = path.resolve(CAMPAIGN_BASE);
  if (!fullPath.startsWith(basePath + path.sep) && fullPath !== basePath) {
    throw new Error('Path traversal blocked: ' + relPath);
  }
  return await fs.readFile(fullPath, 'utf8');
}

async function searchFiles(searchDir, query) {
  const results = [];
  const fullDir = path.join(CAMPAIGN_BASE, searchDir);
  try {
    const entries = await fs.readdir(fullDir, { withFileTypes: true });
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        const filePath = path.join(fullDir, entry.name);
        const content = await fs.readFile(filePath, 'utf8');
        if (regex.test(entry.name) || regex.test(content)) {
          results.push({
            name: entry.name.replace('.md', ''),
            path: `/${searchDir}/${entry.name}`,
            snippet: content.slice(0, 300).replace(/\s+/g, ' ').trim()
          });
        }
      }
    }
  } catch (e) {
    // Directory doesn't exist or not readable
  }
  return results;
}

async function listBestiary() {
  const results = [];
  const fullDir = path.join(CAMPAIGN_BASE, 'Bestiary');
  try {
    const entries = await fs.readdir(fullDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        const content = await fs.readFile(path.join(fullDir, entry.name), 'utf8');
        const crMatch = content.match(/Challenge:\s*([^\n]+)/i);
        const cr = crMatch ? crMatch[1].trim() : '?';
        results.push({
          name: entry.name.replace('.md', ''),
          path: `/Bestiary/${entry.name}`,
          cr: cr
        });
      }
    }
  } catch (e) {
    // Directory doesn't exist
  }
  return results;
}

async function readPartyInventory() {
  try {
    const raw = await fs.readFile(PARTY_INVENTORY_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return { items: [], currency: { gp: 0, sp: 0, cp: 0 } };
  }
}

async function writePartyInventory(data) {
  await fs.writeFile(PARTY_INVENTORY_PATH, JSON.stringify(data, null, 2));
  return data;
}

/* ============================================================
   MCP STDIO CLIENT
   ============================================================ */
class McpStdioClient {
  constructor() {
    this.process = null;
    this.pending = new Map();
    this.id = 0;
    this.ready = false;
    this.buffer = '';
    this.lock = Promise.resolve();
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.process = spawn('node', ['build/src/index.js'], {
        cwd: DNDBEYOND_MCP_PATH,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const timeout = setTimeout(() => {
        reject(new Error('MCP server failed to initialize within 10s'));
      }, 10000);

      this.process.stdout.on('data', (data) => {
        this.buffer += data.toString();
        const lines = this.buffer.split('\n');
        this.buffer = lines.pop();
        for (const line of lines) {
          if (line.trim()) this.handleMessage(line.trim());
        }
      });

      this.process.stderr.on('data', (data) => {
        const msg = data.toString().trim();
        if (msg) console.error('[dndbeyond-mcp stderr]', msg);
      });

      this.process.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      this.process.on('exit', (code) => {
        if (code !== null && code !== 0) {
          console.error(`dndbeyond-mcp exited with code ${code}`);
        }
      });

      this.call('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'dm-screen-bridge', version: '2.1.0' }
      }).then((result) => {
        this.notify('notifications/initialized', {});
        this.ready = true;
        clearTimeout(timeout);
        resolve(result);
      }).catch((err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  handleMessage(line) {
    try {
      const msg = JSON.parse(line);
      if (msg.id !== undefined && this.pending.has(msg.id)) {
        const cb = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) cb.reject(msg.error);
        else cb.resolve(msg.result);
      }
    } catch (e) {
      console.error('Failed to parse MCP message:', line);
    }
  }

  call(method, params) {
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      this.pending.set(id, { resolve, reject });
      const msg = JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n';
      this.process.stdin.write(msg);
    });
  }

  notify(method, params) {
    const msg = JSON.stringify({ jsonrpc: '2.0', method, params }) + '\n';
    this.process.stdin.write(msg);
  }

  async callTool(name, args) {
    const release = await this.acquireLock();
    try {
      return await this.call('tools/call', { name, arguments: args });
    } finally {
      release();
    }
  }

  acquireLock() {
    let release;
    const promise = new Promise((resolve) => { release = resolve; });
    const previous = this.lock;
    this.lock = previous.then(() => promise);
    return previous.then(() => release);
  }
}

const mcp = new McpStdioClient();

/* ============================================================
   AI PROVIDER DISPATCH
   ============================================================ */
function makeHttpRequest(urlStr, options, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const mod = url.protocol === 'https:' ? https : httpModule;
    const req = mod.request(urlStr, {
      method: options.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      timeout: options.timeout || 120000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
          catch (e) { resolve({ status: res.statusCode, body: data }); }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    if (body) req.write(body);
    req.end();
  });
}

async function callOpenAI(endpoint, key, systemPrompt, userContent) {
  const url = endpoint || 'https://api.openai.com/v1/chat/completions';
  const body = JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ],
    temperature: 0.1
  });
  const res = await makeHttpRequest(url, {
    headers: { 'Authorization': `Bearer ${key}` }
  }, body);
  if (!res.body || !Array.isArray(res.body.choices) || !res.body.choices[0] || !res.body.choices[0].message || typeof res.body.choices[0].message.content !== 'string') {
    console.error('[callOpenAI] Unexpected response shape:', JSON.stringify(res.body).slice(0, 300));
    throw new Error('OpenAI returned unexpected response shape');
  }
  return res.body.choices[0].message.content;
}

async function callClaude(endpoint, key, systemPrompt, userContent) {
  const url = endpoint || 'https://api.anthropic.com/v1/messages';
  const body = JSON.stringify({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userContent }]
  });
  const res = await makeHttpRequest(url, {
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01'
    }
  }, body);
  if (!res.body || !Array.isArray(res.body.content) || !res.body.content[0] || typeof res.body.content[0].text !== 'string') {
    console.error('[callClaude] Unexpected response shape:', JSON.stringify(res.body).slice(0, 300));
    throw new Error('Claude returned unexpected response shape');
  }
  return res.body.content[0].text;
}

async function callOllama(endpoint, key, systemPrompt, userContent) {
  const base = (endpoint || 'http://localhost:11434').replace(/\/$/, '');
  const url = base + '/api/chat';
  const model = (STATE.aiModel || 'llama3.1').toLowerCase().trim();
  console.log('[callOllama] model:', model, '| endpoint:', url);
  const body = JSON.stringify({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ],
    stream: false,
    options: { temperature: 0.1 }
  });
  const res = await makeHttpRequest(url, {}, body);
  if (res.body && res.body.error) {
    const errText = typeof res.body.error === 'string' ? res.body.error : JSON.stringify(res.body.error);
    console.error('[callOllama] Ollama returned error in body:', errText);
    throw new Error('Ollama: ' + errText);
  }
  if (!res.body || !res.body.message || typeof res.body.message.content !== 'string') {
    console.error('[callOllama] Unexpected response shape:', JSON.stringify(res.body).slice(0, 300));
    throw new Error('Ollama returned unexpected response shape. Is model "' + model + '" installed? Run: ollama pull ' + model);
  }
  return res.body.message.content;
}

async function callOpenRouter(endpoint, key, systemPrompt, userContent) {
  const url = endpoint || 'https://openrouter.ai/api/v1/chat/completions';
  const body = JSON.stringify({
    model: 'openrouter/auto',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ],
    temperature: 0.1
  });
  const res = await makeHttpRequest(url, {
    headers: {
      'Authorization': `Bearer ${key}`,
      'HTTP-Referer': 'http://localhost:8765',
      'X-Title': 'Tactical DM Cockpit'
    }
  }, body);
  if (!res.body || !Array.isArray(res.body.choices) || !res.body.choices[0] || !res.body.choices[0].message || typeof res.body.choices[0].message.content !== 'string') {
    console.error('[callOpenRouter] Unexpected response shape:', JSON.stringify(res.body).slice(0, 300));
    throw new Error('OpenRouter returned unexpected response shape');
  }
  return res.body.choices[0].message.content;
}

async function dispatchAI(systemPrompt, userContent) {
  if (!STATE.aiProvider) throw new Error('AI provider not configured');
  console.log('[dispatchAI] Provider:', STATE.aiProvider, '| Endpoint:', STATE.aiEndpoint || '(default)', '| Content length:', userContent.length);
  try {
    let result;
    switch (STATE.aiProvider) {
      case 'openai':
        result = await callOpenAI(STATE.aiEndpoint, STATE.aiKey, systemPrompt, userContent);
        break;
      case 'claude':
        result = await callClaude(STATE.aiEndpoint, STATE.aiKey, systemPrompt, userContent);
        break;
      case 'ollama_local':
      case 'ollama_cloud':
        result = await callOllama(STATE.aiEndpoint, STATE.aiKey, systemPrompt, userContent);
        break;
      case 'openrouter':
        result = await callOpenRouter(STATE.aiEndpoint, STATE.aiKey, systemPrompt, userContent);
        break;
      default:
        throw new Error(`Unknown AI provider: ${STATE.aiProvider}`);
    }
    console.log('[dispatchAI] Success. Response length:', result.length);
    return result;
  } catch (err) {
    console.error('[dispatchAI] FAILED for provider', STATE.aiProvider, ':', err.message);
    throw err;
  }
}

/* ============================================================
   ENCOUNTER DIFFICULTY CALCULATION (DMG p.82)
   ============================================================ */
function getXpThresholds(level) {
  const thresholds = {
    1:  [25, 50, 75, 100],      2:  [50, 100, 150, 200],
    3:  [75, 150, 225, 400],     4:  [125, 250, 375, 500],
    5:  [250, 500, 750, 1100],   6:  [300, 600, 900, 1400],
    7:  [350, 750, 1100, 1700],  8:  [450, 900, 1400, 2100],
    9:  [550, 1100, 1600, 2400], 10: [600, 1200, 1900, 2800],
    11: [800, 1600, 2400, 3600], 12: [1000, 2000, 3000, 4500],
    13: [1100, 2200, 3400, 5100], 14: [1250, 2500, 3800, 5700],
    15: [1400, 2800, 4300, 6400], 16: [1600, 3200, 4800, 7200],
    17: [2000, 3900, 5900, 8800], 18: [2100, 4200, 6300, 9500],
    19: [2400, 4900, 7300, 10900], 20: [2800, 5700, 8500, 12700]
  };
  return thresholds[level] || thresholds[1];
}

function getMonsterXp(cr) {
  const xpTable = {
    '0': 10, '1/8': 25, '1/4': 50, '1/2': 100,
    '1': 200, '2': 450, '3': 700, '4': 1100,
    '5': 1800, '6': 2300, '7': 2900, '8': 3900,
    '9': 5000, '10': 5900, '11': 7200, '12': 8400,
    '13': 10000, '14': 11500, '15': 13000, '16': 15000,
    '17': 18000, '18': 20000, '19': 22000, '20': 25000,
    '21': 33000, '22': 41000, '23': 50000, '24': 62000,
    '25': 75000, '26': 90000, '27': 105000, '28': 120000,
    '29': 135000, '30': 155000
  };
  let key = String(cr).trim();
  if (key === '0.125') key = '1/8';
  if (key === '0.25') key = '1/4';
  if (key === '0.5') key = '1/2';
  return xpTable[key] || 0;
}

function getEncounterMultiplier(monsterCount) {
  if (monsterCount === 1) return 1;
  if (monsterCount === 2) return 1.5;
  if (monsterCount >= 3 && monsterCount <= 6) return 2;
  if (monsterCount >= 7 && monsterCount <= 10) return 2.5;
  if (monsterCount >= 11 && monsterCount <= 14) return 3;
  return 4;
}

function calculateEncounterDifficulty(partyLevels, monsterCrList) {
  const partySize = partyLevels.length;
  const easy = partyLevels.reduce((s, l) => s + getXpThresholds(l)[0], 0);
  const medium = partyLevels.reduce((s, l) => s + getXpThresholds(l)[1], 0);
  const hard = partyLevels.reduce((s, l) => s + getXpThresholds(l)[2], 0);
  const deadly = partyLevels.reduce((s, l) => s + getXpThresholds(l)[3], 0);

  const totalMonsterXp = monsterCrList.reduce((s, cr) => s + getMonsterXp(cr), 0);
  const adjustedXp = Math.floor(totalMonsterXp * getEncounterMultiplier(monsterCrList.length));

  let difficulty = 'Trivial';
  if (adjustedXp >= deadly) difficulty = 'Deadly';
  else if (adjustedXp >= hard) difficulty = 'Hard';
  else if (adjustedXp >= medium) difficulty = 'Medium';
  else if (adjustedXp >= easy) difficulty = 'Easy';

  return { easy, medium, hard, deadly, totalMonsterXp, adjustedXp, difficulty };
}

/* ============================================================
   ZERO-HINT AI PARSING ENGINE
   ============================================================ */
const ZERO_HINT_SYSTEM_PROMPT = 'You are a data-extraction middleware engine. Analyze this raw, natural language D&D adventure log. Isolate every hostile creature, NPC combatant, or monster group mentioned in the narrative. Calculate their intended numbers based on the sentence context. You must return nothing but a minified, clean JSON array of objects using exactly these keys: [{"name": "Creature Name", "qty": X, "type": "Standard"}]. Do not include markdown code block syntax wrappers, notes, or explanations in your response.';

async function parseAdventureNarrative(narrativeText) {
  console.log('[parseAdventureNarrative] Sending', narrativeText.length, 'chars to AI...');
  const raw = await dispatchAI(ZERO_HINT_SYSTEM_PROMPT, narrativeText);
  console.log('[parseAdventureNarrative] Raw AI response length:', raw.length, 'chars');
  console.log('[parseAdventureNarrative] Raw AI response preview:', raw.slice(0, 300));

  let clean = raw.trim();
  if (clean.startsWith('```')) {
    const before = clean.slice(0, 50);
    clean = clean.replace(/```(?:json)?\s*/, '').replace(/\s*```$/, '').trim();
    console.log('[parseAdventureNarrative] Stripped markdown fence. Before:', before, '| After:', clean.slice(0, 50));
  }

  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch (e) {
    console.error('[parseAdventureNarrative] JSON parse FAILED. Cleaned text preview:', clean.slice(0, 300));
    throw new Error('AI response is not valid JSON: ' + e.message);
  }

  if (!Array.isArray(parsed)) {
    console.error('[parseAdventureNarrative] AI response is not an array. Type:', typeof parsed, '| Value preview:', JSON.stringify(parsed).slice(0, 200));
    throw new Error('AI response is not an array');
  }

  console.log('[parseAdventureNarrative] Parsed', parsed.length, 'item(s). First item:', JSON.stringify(parsed[0]));
  return parsed;
}

function parseHomebrewStatBlock(text) {
  const result = { found: false, source: 'homebrew', name: '', hp: 20, maxHp: 20, ac: 10, cr: '?', stats: {}, actions: '', bonusActions: '', legendary: '', mythic: '', reactions: '', special: '', savingThrows: [], damageResistances: [], damageImmunities: [], damageVulnerabilities: [], conditionImmunities: [] };
  if (!text) return result;

  // Try to extract name from first line or header
  const nameMatch = text.match(/^#{0,2}\s*(.+?)(?:\n|\r|$)/);
  if (nameMatch) result.name = nameMatch[1].trim();
  // Table-first-row format: "Name  CR ½  description" — prefer this for table blocks
  const tableNameMatch = text.match(/^([^\n]+?)\s+CR\s+[\d/½¼⅛]+/im);
  if (tableNameMatch) {
    let n = tableNameMatch[1].trim();
    n = n.replace(/^\|?\s*/, '').trim();       // strip leading pipe
    n = n.replace(/\s*\*+.*$/g, '').trim();     // strip trailing markdown emphasis
    if (n) result.name = n;
  }

  // Armor Class patterns — handle both bold-label and table-row formats
  const acPatterns = [
    /\*\*Armor Class\*\*\s*(\d+)/i,
    /\*\*AC\*\*\s*[\|\s]*\s*(\d+)/i,
    /\|\s*\*\*AC\*\*\s*\|\s*(\d+)/i,
    /Armor Class\s*(\d+)/i,
    /AC\s*(\d+)/i
  ];
  for (const p of acPatterns) {
    const m = text.match(p);
    if (m) { result.ac = Number(m[1]); break; }
  }

  // Hit Points patterns
  const hpPatterns = [
    /\*\*Hit Points\*\*\s*(\d+)/i,
    /\*\*HP\*\*\s*[\|\s]*\s*(\d+)/i,
    /\|\s*\*\*HP\*\*\s*\|\s*(\d+)/i,
    /Hit Points\s*(\d+)/i,
    /HP\s*(\d+)/i
  ];
  for (const p of hpPatterns) {
    const m = text.match(p);
    if (m) { result.hp = Number(m[1]); result.maxHp = Number(m[1]); break; }
  }

  // Challenge Rating — support fractions like ½, ¼, ⅛
  const crPatterns = [
    /\*\*Challenge\*\*\s*(\d+\/\d+|\d+)/i,
    /\*\*CR\*\*\s*[\|\s]*\s*([\d/½¼⅛]+)/i,
    /\|\s*\*\*CR\*\*\s*\|\s*([\d/½¼⅛]+)/i,
    /Challenge\s*(\d+\/\d+|\d+)/i,
    /CR\s*([\d/½¼⅛]+)/i
  ];
  for (const p of crPatterns) {
    const m = text.match(p);
    if (m) {
      let cr = m[1].trim();
      cr = cr.replace('½', '1/2').replace('¼', '1/4').replace('⅛', '1/8');
      result.cr = cr;
      break;
    }
  }

  // Ability scores — handle "STR / DEX / CON" lines and individual stats
  const sameLineStatRe = /\*\*(STR|DEX|CON|INT|WIS|CHA)\s*\/\s*(STR|DEX|CON|INT|WIS|CHA)\s*\/\s*(STR|DEX|CON|INT|WIS|CHA)\*\*\s*\|?\s+(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)/gi;
  let slm;
  while ((slm = sameLineStatRe.exec(text)) !== null) {
    const stats = [slm[1], slm[2], slm[3]];
    const vals = [slm[4], slm[5], slm[6]];
    stats.forEach((s, i) => { result.stats[s.toLowerCase()] = Number(vals[i]); });
  }
  const statLineMatch = text.match(/(STR|DEX|CON|INT|WIS|CHA)\s*\/\s*(STR|DEX|CON|INT|WIS|CHA)\s*\/\s*(STR|DEX|CON|INT|WIS|CHA)[\s\|]*\n?\s*(\d+)\s*[\|\/]?\s*(\d+)\s*[\|\/]?\s*(\d+)/i);
  if (statLineMatch) {
    const stats = [statLineMatch[1], statLineMatch[2], statLineMatch[3]];
    const vals = [statLineMatch[4], statLineMatch[5], statLineMatch[6]];
    stats.forEach((s, i) => { result.stats[s.toLowerCase()] = Number(vals[i]); });
  }
  const statNames = { STR: 'str', DEX: 'dex', CON: 'con', INT: 'int', WIS: 'wis', CHA: 'cha' };
  for (const [abbr, key] of Object.entries(statNames)) {
    if (result.stats[key]) continue;
    const pattern = new RegExp(abbr + '\\s*[\\|\\s]*\\s*(\\d+)', 'i');
    const m = text.match(pattern);
    if (m) result.stats[key] = Number(m[1]);
  }

  // Extract special abilities and traits section
  const abilitiesMatch = text.match(/ABILITIES & SPECIAL TRAITS.*?(?:(?:\*\*ACTIONS\*\*)|(?:\*\*LEGENDARY ACTIONS\*\*)|(?:\*\*REACTIONS\*\*)|(?:\*\*MYTHIC ACTIONS\*\*)|$)/is);
  if (abilitiesMatch) {
    let abilities = abilitiesMatch[0].replace(/ABILITIES & SPECIAL TRAITS/i, '').trim();
    if (abilities) result.special = abilities.replace(/\*\*/g, '').replace(/\|/g, ' ').trim();
  }

  // Extract Actions section
  const actionsMatch = text.match(/ACTIONS.*?(?:(?:\*\*BONUS ACTIONS\*\*)|(?:\*\*LEGENDARY ACTIONS\*\*)|(?:\*\*REACTIONS\*\*)|(?:\*\*MYTHIC ACTIONS\*\*)|$)/is);
  if (actionsMatch) {
    let actions = actionsMatch[0].replace(/ACTIONS/i, '').trim();
    if (actions) result.actions = actions.replace(/\*\*/g, '').replace(/\|/g, ' ').trim();
  }

  // Extract Bonus Actions
  const bonusMatch = text.match(/BONUS ACTIONS.*?(?:(?:\*\*LEGENDARY ACTIONS\*\*)|(?:\*\*REACTIONS\*\*)|(?:\*\*MYTHIC ACTIONS\*\*)|$)/is);
  if (bonusMatch) {
    let bonus = bonusMatch[0].replace(/BONUS ACTIONS/i, '').trim();
    if (bonus) result.bonusActions = bonus.replace(/\*\*/g, '').replace(/\|/g, ' ').trim();
  }

  // Extract Legendary Actions
  const legendaryMatch = text.match(/LEGENDARY ACTIONS.*?(?:(?:\*\*REACTIONS\*\*)|(?:\*\*MYTHIC ACTIONS\*\*)|$)/is);
  if (legendaryMatch) {
    let leg = legendaryMatch[0].replace(/LEGENDARY ACTIONS/i, '').trim();
    if (leg) result.legendary = leg.replace(/\*\*/g, '').replace(/\|/g, ' ').trim();
  }

  // Extract Reactions
  const reactionMatch = text.match(/REACTIONS.*?(?:(?:\*\*MYTHIC ACTIONS\*\*)|$)/is);
  if (reactionMatch) {
    let react = reactionMatch[0].replace(/REACTIONS/i, '').trim();
    if (react) result.reactions = react.replace(/\*\*/g, '').replace(/\|/g, ' ').trim();
  }

  // Extract Condition Immunities
  const condImmMatch = text.match(/CONDITION IMMUNITIES.*?\|/is);
  if (condImmMatch) {
    let cond = condImmMatch[0].replace(/CONDITION IMMUNITIES.*?\|/i, '').trim();
    if (cond) result.conditionImmunities = cond.split(',').map(s => s.trim());
  }

  // Extract Damage Resistances/Immunities/Vulnerabilities
  const resistMatch = text.match(/DAMAGE RESISTANCES.*?\|/is);
  if (resistMatch) {
    let res = resistMatch[0].replace(/DAMAGE RESISTANCES.*?\|/i, '').trim();
    if (res) result.damageResistances = res.split(',').map(s => s.trim());
  }

  const immMatch = text.match(/DAMAGE IMMUNITIES.*?\|/is);
  if (immMatch) {
    let imm = immMatch[0].replace(/DAMAGE IMMUNITIES.*?\|/i, '').trim();
    if (imm) result.damageImmunities = imm.split(',').map(s => s.trim());
  }

  const vulnMatch = text.match(/DAMAGE VULNERABILITIES.*?\|/is);
  if (vulnMatch) {
    let vul = vulnMatch[0].replace(/DAMAGE VULNERABILITIES.*?\|/i, '').trim();
    if (vul) result.damageVulnerabilities = vul.split(',').map(s => s.trim());
  }

  // Extract Saving Throws
  const saveMatch = text.match(/SAVING THROWS.*?\|/is);
  if (saveMatch) {
    let saves = saveMatch[0].replace(/SAVING THROWS.*?\|/i, '').trim();
    if (saves) {
      result.savingThrows = saves.split(/, ?/).map(s => {
        const m = s.match(/(\w+)\s*[+\-]\d+/);
        if (m) {
          const bonus = s.match(/[+\-](\d+)/) ? parseInt(s.match(/[+\-](\d+)/)[1]) : 0;
          return { stat: m[1], bonus: bonus };
        }
        return null;
      }).filter(Boolean);
    }
  }

  result.found = result.hp !== 20 || result.ac !== 10 || result.name !== '';
  return result;
}


/* ============================================================
   HTTP SERVER
   ============================================================ */
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => {
      if (!data.trim()) {
        console.warn('[readBody] Empty request body');
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        console.error('[readBody] JSON parse error:', e.message, '| data preview:', data.slice(0, 200));
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

async function start() {
  const cfg = await loadConfig();
  if (cfg) {
    STATE.campaignId = cfg.campaignId || null;
    STATE.campaignName = cfg.campaignName || null;
    STATE.aiProvider = cfg.aiProvider || null;
    STATE.aiEndpoint = cfg.aiEndpoint || null;
    STATE.aiKey = cfg.aiKey || null;
    STATE.aiModel = cfg.aiModel || null;
    if (STATE.campaignId && STATE.aiProvider) STATE.initialized = true;
  }

  await mcp.start();
  console.log('Connected to dndbeyond-mcp');

  try {
    await fs.access(PARTY_INVENTORY_PATH);
  } catch {
    await fs.writeFile(PARTY_INVENTORY_PATH, JSON.stringify({
      items: [],
      currency: { gp: 0, sp: 0, cp: 0 }
    }, null, 2));
  }

  // Get client IP for rate limiting (ignore untrusted X-Forwarded-For)
  function getClientIp(req) {
    return req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           '127.0.0.1';
  }

  const ALLOWED_ORIGINS = new Set([
    `http://localhost:${PORT}`,
    `http://127.0.0.1:${PORT}`,
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ]);

  const server = http.createServer(async (req, res) => {
    // CORS - Restricted for security (exact localhost origins only)
    const origin = req.headers.origin || '';
    if (!origin || ALLOWED_ORIGINS.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Rate limiting
    const clientIp = getClientIp(req);
    if (!checkRateLimit(clientIp)) {
      res.writeHead(429);
      res.end(JSON.stringify({ error: 'Too many requests. Please wait before trying again.' }));
      return;
    }

    const url = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = url.pathname;

    try {
      /* ---------- INIT SESSION ---------- */
      if (pathname === '/api/init' && req.method === 'POST') {
        const body = await readBody(req);
        STATE.campaignId = body.campaignId || null;
        STATE.campaignName = body.campaignName || null;
        STATE.aiProvider = body.aiProvider || null;
        STATE.aiEndpoint = body.aiEndpoint || null;
        STATE.aiKey = body.aiKey || null;
        STATE.aiModel = body.aiModel || null;
        STATE.initialized = true;
        if (body.remember !== false) {
          await saveConfig();
        }
        res.writeHead(200);
        res.end(JSON.stringify({ jsonrpc: '2.0', result: { success: true, state: { campaignId: STATE.campaignId, aiProvider: STATE.aiProvider, aiModel: STATE.aiModel } }, id: body.id || 0 }));
        return;
      }

      /* ---------- SESSION STATUS ---------- */
      if (pathname === '/api/session' && req.method === 'GET') {
        res.writeHead(200);
        res.end(JSON.stringify({ jsonrpc: '2.0', result: { initialized: STATE.initialized, campaignId: STATE.campaignId, campaignName: STATE.campaignName, aiProvider: STATE.aiProvider, aiEndpoint: STATE.aiEndpoint, aiModel: STATE.aiModel } }));
        return;
      }

      /* ---------- CLEAR SESSION ---------- */
      if (pathname === '/api/clear-session' && req.method === 'POST') {
        STATE.campaignId = null;
        STATE.campaignName = null;
        STATE.aiProvider = null;
        STATE.aiEndpoint = null;
        STATE.aiKey = null;
        STATE.initialized = false;
        try {
          await fs.unlink(CONFIG_PATH);
        } catch (e) {
          // File may not exist
        }
        res.writeHead(200);
        res.end(JSON.stringify({ jsonrpc: '2.0', result: { success: true } }));
        return;
      }

      /* ---------- MCP PROXY ---------- */
      if (pathname === '/api/mcp' && req.method === 'POST') {
        const body = await readBody(req);
        const { method, params, id } = body;
        let result;

        switch (method) {
          case 'dndbeyond-mcp.list_campaigns': {
            const client = await getDdbClient();
            const mods = await getDdbModules();
            const campaigns = await client.get(
              mods.ENDPOINTS.campaign.list(),
              'campaigns',
              300000
            );
            result = campaigns.map(c => ({
              id: c.id,
              name: c.name,
              dmUsername: c.dmUsername,
              playerCount: c.playerCount
            }));
            break;
          }

          case 'dndbeyond-mcp.get_party': {
            const campaignId = params?.campaignId || STATE.campaignId;
            if (!campaignId) throw new Error('campaignId required');
            const client = await getDdbClient();
            const mods = await getDdbModules();
            const characters = await client.get(
              mods.ENDPOINTS.campaign.characters(campaignId),
              `campaign:${campaignId}:characters`,
              300000
            );
            const party = [];
            for (const c of characters) {
              try {
                const char = await client.get(
                  `https://character-service.dndbeyond.com/character/v5/character/${c.id}?includeCustomItems=true`,
                  `character:${c.id}`,
                  60000
                );
                console.log('CHARACTER DATA:', char.name, 'classes:', char.classes?.length, 'stats:', char.stats?.length, 'skills:', char.skills?.length, 'feats:', char.feats?.length);
                const level = mods.computeLevel(char);
                const ac = mods.calculateAc(char);
                let currentHp = mods.calculateCurrentHp(char);
                const maxHp = mods.calculateMaxHp(char);
                // Defensive: D&D Beyond can return removedHitPoints > maxHp; clamp display to 0
                if (currentHp < 0) {
                  console.warn(`HP clamp for ${char.name}: raw=${currentHp}/${maxHp}, removed=${char.removedHitPoints}, base=${char.baseHitPoints}, bonus=${char.bonusHitPoints}, override=${char.overrideHitPoints}`);
                  currentHp = 0;
                }
                const slots = (char.spellSlots || []).map(s => ({
                  level: s.level,
                  used: s.used,
                  available: s.available
                }));
                const conditions = (char.conditions || []).map(cond => cond.definition?.name || String(cond));
                const equipped = char.inventory.filter(i => i.equipped).map(i => i.definition?.name || 'Unknown');
                const senses = {
                  per: mods.calculatePassiveSkill(char, 5, 'perception'),
                  ins: mods.calculatePassiveSkill(char, 5, 'insight'),
                  inv: mods.calculatePassiveSkill(char, 4, 'investigation')
                };
                // Calculate proficiency bonus
                const proficiencyBonus = Math.ceil(level / 4) + 1;

                // Calculate saving throws with proficiency
                const savingThrows = {};
                const abilityAbbrev = { 1: 'STR', 2: 'DEX', 3: 'CON', 4: 'INT', 5: 'WIS', 6: 'CHA' };
                if (char.stats) {
                  for (const stat of char.stats) {
                    const abbr = abilityAbbrev[stat.stat?.id] || stat.stat?.abbreviation;
                    if (abbr) {
                      const abilityMod = Math.floor((stat.value - 10) / 2);
                      const isProficient = char.classes?.some(cls =>
                        cls.definition?.savingThrows?.some(st => st.statId === stat.stat?.id)
                      );
                      const totalMod = abilityMod + (isProficient ? proficiencyBonus : 0);
                      savingThrows[abbr] = {
                        abilityMod,
                        proficient: isProficient,
                        totalMod,
                        display: `${totalMod >= 0 ? '+' : ''}${totalMod}${isProficient ? '★' : ''}`
                      };
                    }
                  }
                }

                // Extract skills with modifiers
                const skillAbilityMap = {
                  'Acrobatics': 'DEX', 'Animal Handling': 'WIS', 'Arcana': 'INT', 'Athletics': 'STR',
                  'Deception': 'CHA', 'History': 'INT', 'Insight': 'WIS', 'Intimidation': 'CHA',
                  'Investigation': 'INT', 'Medicine': 'WIS', 'Nature': 'INT', 'Perception': 'WIS',
                  'Performance': 'CHA', 'Persuasion': 'CHA', 'Religion': 'INT', 'Sleight of Hand': 'DEX',
                  'Stealth': 'DEX', 'Survival': 'WIS'
                };
                const skills = {};
                if (char.skills) {
                  char.skills.forEach(skill => {
                    const ability = skillAbilityMap[skill.definition?.name] || 'WIS';
                    const proficient = skill.proficient || skill.expertise;
                    const totalMod = skill.bonus || 0;
                    skills[skill.definition?.name] = {
                      ability,
                      proficient,
                      expertise: skill.expertise,
                      bonus: totalMod,
                      display: `${totalMod >= 0 ? '+' : ''}${totalMod}${skill.expertise ? 'E' : skill.proficient ? 'P' : ''}`
                    };
                  });
                }

                // Extract class features
                const classFeatures = [];
                if (char.classes) {
                  char.classes.forEach(cls => {
                    if (cls.definition?.classFeatures) {
                      cls.definition.classFeatures.forEach(f => {
                        classFeatures.push({
                          name: f.name,
                          source: cls.definition?.name,
                          level: f.level
                        });
                      });
                    }
                  });
                }
                const racialFeatures = [];
                // Extract racial/species features - use racialTraits from race object
                if (char.race?.racialTraits) {
                  char.race.racialTraits.forEach(f => {
                    if (f.definition) {
                      racialFeatures.push({
                        name: f.definition.name,
                        source: char.race?.fullName || "Race"
                      });
                    }
                  });
                }
                // Extract feats
                const feats = [];
                if (char.feats) {
                  char.feats.forEach(f => {
                    if (f.definition) {
                      feats.push({
                        name: f.definition.name,
                        source: 'Feats'
                      });
                    }
                  });
                }

                party.push({
                  id: char.id,
                  name: char.name,
                  cls: char.classes.map(cl => `${cl.definition?.name || 'Class'} ${cl.level}`).join(' / '),
                  level: level,
                  ac: ac,
                  hp: currentHp,
                  maxHp: maxHp,
                  tempHp: char.temporaryHitPoints || 0,
                  slots: slots,
                  conditions: conditions,
                  items: equipped,
                  senses: senses,
                  saves: '—',  // replaced with savingThrows
                  savingThrows: savingThrows,
                  skills: skills,
                  classFeatures: classFeatures,
                  racialFeatures: racialFeatures,
                  feats: feats,
                  avatarUrl: c.avatarUrl
                });
              } catch (innerErr) {
                console.error(`Failed to fetch character ${c.id}:`, innerErr.message);
                party.push({
                  id: c.id,
                  name: c.name,
                  cls: 'Unknown',
                  level: 0,
                  ac: 10,
                  hp: 1,
                  maxHp: 1,
                  tempHp: 0,
                  slots: [],
                  conditions: [],
                  items: [],
                  senses: { per: 10, ins: 10, inv: 10 },
                  saves: '—',
                  avatarUrl: c.avatarUrl
                });
              }
            }
            result = party;
            break;
          }

          case 'dndbeyond-mcp.get_campaign_characters': {
            const campaignId = params?.campaignId || STATE.campaignId;
            if (!campaignId) throw new Error('campaignId required');
            const client = await getDdbClient();
            const mods = await getDdbModules();
            const characters = await client.get(
              mods.ENDPOINTS.campaign.characters(campaignId),
              `campaign:${campaignId}:characters`,
              300000
            );
            result = characters.map(c => ({
              id: c.id,
              name: c.name,
              userId: c.userId,
              userName: c.userName,
              avatarUrl: c.avatarUrl,
              isAssigned: c.isAssigned
            }));
            break;
          }

          case 'dndbeyond-mcp.get_character': {
            const characterId = params?.characterId;
            if (!characterId) throw new Error('characterId required');
            const client = await getDdbClient();
            const char = await client.get(
              `https://character-service.dndbeyond.com/character/v5/character/${characterId}?includeCustomItems=true`,
              `character:${characterId}`,
              60000
            );
            const mods = await getDdbModules();
            const level = mods.computeLevel(char);
            const ac = mods.calculateAc(char);
            let currentHp = mods.calculateCurrentHp(char);
            const maxHp = mods.calculateMaxHp(char);
            if (currentHp < 0) {
              console.warn(`HP clamp for ${char.name}: raw=${currentHp}/${maxHp}, removed=${char.removedHitPoints}, base=${char.baseHitPoints}, bonus=${char.bonusHitPoints}, override=${char.overrideHitPoints}`);
              currentHp = 0;
            }
            const slots = (char.spellSlots || []).map(s => ({
              level: s.level,
              used: s.used,
              available: s.available
            }));
            const conditions = (char.conditions || []).map(cond => cond.definition?.name || String(cond));
            const equipped = char.inventory.filter(i => i.equipped).map(i => i.definition?.name || 'Unknown');
            const senses = {
              per: mods.calculatePassiveSkill(char, 5, 'perception'),
              ins: mods.calculatePassiveSkill(char, 5, 'insight'),
              inv: mods.calculatePassiveSkill(char, 4, 'investigation')
            };
            const saves = [];
            if (char.stats) {
              for (const stat of char.stats) {
                if (stat.stat?.abbreviation) {
                  const bonus = Math.floor((stat.value - 10) / 2);
                  saves.push(`${stat.stat.abbreviation} ${bonus >= 0 ? '+' : ''}${bonus}`);
                }
              }
            }
            result = {
              id: char.id,
              name: char.name,
              level: level,
              ac: ac,
              hp: currentHp,
              maxHp: maxHp,
              tempHp: char.temporaryHitPoints || 0,
              spellSlots: slots,
              classes: char.classes.map(c => ({
                name: c.definition?.name || 'Unknown',
                level: c.level
              })),
              race: char.race?.fullName || 'Unknown',
              conditions: conditions,
              inventory: equipped,
              senses: senses,
              saves: saves.join(', ') || '—'
            };
            break;
          }

          case 'dndbeyond-mcp.update_hp': {
            const characterId = params?.characterId;
            const hpChange = params?.hpChange;
            if (!characterId || hpChange === undefined) throw new Error('characterId and hpChange required');
            const client = await getDdbClient();
            const mods = await getDdbModules();
            const char = await client.get(
              `https://character-service.dndbeyond.com/character/v5/character/${characterId}?includeCustomItems=true`,
              `character:${characterId}`,
              60000
            );
            const maxHp = mods.calculateMaxHp(char);
            const newRemovedHp = Math.max(0, Math.min(maxHp, char.removedHitPoints - hpChange));
            const putBody = { characterId, removedHitPoints: newRemovedHp };
            if (params.tempHp !== undefined) {
              putBody.temporaryHitPoints = params.tempHp;
            }
            await client.put(
              'https://character-service.dndbeyond.com/character/v5/life/hp/damage-taken',
              putBody,
              [`character:${characterId}`]
            );
            client.invalidateCache(`character:${characterId}`);
            const newHp = Math.max(0, maxHp - newRemovedHp);
            result = {
              success: true,
              newHp: newHp,
              maxHp,
              name: char.name
            };
            break;
          }

          case 'dndbeyond-mcp.search_monsters': {
            result = await mcp.callTool('search_monsters', params || {});
            break;
          }

          case 'dndbeyond-mcp.get_monster': {
            result = await mcp.callTool('get_monster', {
              monsterName: params?.monsterName
            });
            break;
          }

          case 'filesystem-mcp.read_file': {
            const filePath = params?.path;
            if (!filePath) throw new Error('path required');
            const content = await readCampaignFile(filePath);
            result = { content, path: filePath };
            break;
          }

          case 'filesystem-mcp.search_files': {
            const query = params?.query || '';
            const dir = params?.dir || '';
            result = await searchFiles(dir, query);
            break;
          }

          case 'filesystem-mcp.list_bestiary': {
            result = await listBestiary();
            break;
          }

          default:
            throw new Error(`Unknown method: ${method}`);
        }

        res.writeHead(200);
        res.end(JSON.stringify({ jsonrpc: '2.0', result, id: id || 0 }));
        return;
      }

      /* ---------- INVENTORY ---------- */
      if (pathname === '/api/inventory') {
        if (req.method === 'GET') {
          const data = await readPartyInventory();
          res.writeHead(200);
          res.end(JSON.stringify({ jsonrpc: '2.0', result: data }));
          return;
        }
        if (req.method === 'POST') {
          const body = await readBody(req);
          const data = await writePartyInventory(body);
          res.writeHead(200);
          res.end(JSON.stringify({ jsonrpc: '2.0', result: data }));
          return;
        }
      }

      /* ---------- BESTIARY ---------- */
      if (pathname === '/api/bestiary' && req.method === 'GET') {
        const data = await listBestiary();
        res.writeHead(200);
        res.end(JSON.stringify({ jsonrpc: '2.0', result: data }));
        return;
      }

      /* ---------- ADVENTURE PARSE ---------- */
      if (pathname === '/api/parse-adventure' && req.method === 'POST') {
        console.log('[parse-adventure] Endpoint hit');
        const body = await readBody(req);
        const narrative = body.narrative || '';
        console.log('[parse-adventure] Narrative length:', narrative.length, 'chars | AI provider:', STATE.aiProvider || 'NOT CONFIGURED');
        if (!STATE.aiProvider) {
          console.error('[parse-adventure] AI provider not configured. Adventure parsing unavailable.');
          res.writeHead(503);
          res.end(JSON.stringify({ error: 'AI provider not configured. Go to Settings > AI Provider and configure an endpoint.' }));
          return;
        }
        if (!narrative.trim()) {
          console.warn('[parse-adventure] Empty narrative received');
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Empty narrative' }));
          return;
        }
        try {
          const monsters = await parseAdventureNarrative(narrative);
          console.log('[parse-adventure] Success. Extracted', monsters.length, 'creature group(s)');
          res.writeHead(200);
          res.end(JSON.stringify({ jsonrpc: '2.0', result: monsters }));
        } catch (err) {
          console.error('[parse-adventure] FAILED:', err.message);
          res.writeHead(502);
          res.end(JSON.stringify({ error: err.message }));
        }
        return;
      }

      /* ---------- RESOLVE MONSTER ---------- */
      if (pathname === '/api/resolve-monster' && req.method === 'POST') {
        const body = await readBody(req);
        const monsterName = body.name || '';
        const statBlock = body.statBlock || '';
        console.log('[resolve-monster] Resolving:', monsterName, '| Has stat block:', !!statBlock);

        if (!monsterName) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Monster name required' }));
          return;
        }

        try {
          // 1) If a stat block is explicitly provided in the document, trust it first
          if (statBlock) {
            const parsed = parseHomebrewStatBlock(statBlock);
            if (parsed.found) {
              console.log('[resolve-monster] Homebrew parsed (document stats):', parsed.name, 'HP:', parsed.hp, 'AC:', parsed.ac);
              res.writeHead(200);
              res.end(JSON.stringify({ jsonrpc: '2.0', result: parsed }));
              return;
            }
          }

          const client = await getDdbClient();
          const mods = await getDdbModules();

          // 2) Fallback to D&D Beyond lookup
          const searchUrl = mods.ENDPOINTS.monster.search(monsterName, 0, 5);
          const searchResponse = await client.getRaw(searchUrl, `monsters:search:${monsterName.toLowerCase()}`, 86400000);

          let ddbMonster = null;
          if (searchResponse.data && searchResponse.data.length > 0) {
            const searchName = monsterName.toLowerCase();
            ddbMonster = searchResponse.data.find(m => m.name.toLowerCase() === searchName);
            if (!ddbMonster) ddbMonster = searchResponse.data[0];
          }

          if (ddbMonster) {
            // Fetch full details
            const detailUrl = mods.ENDPOINTS.monster.get(ddbMonster.id);
            const detailResponse = await client.getRaw(detailUrl, `monster:${ddbMonster.id}`, 86400000);
            const m = detailResponse.data;
            if (m) {
              const config = await client.getRaw(mods.ENDPOINTS.config.json(), 'game-config', 86400000);
              const crMap = new Map((config.challengeRatings || []).map(cr => [cr.id, cr]));
              const typeMap = new Map((config.monsterTypes || []).map(t => [t.id, t.name]));
              const alignMap = new Map((config.alignments || []).map(a => [a.id, a.name]));
              const senseMap = new Map((config.senses || []).map(s => [s.id, s.name]));
              const cr = crMap.get(m.challengeRatingId);
              const sizeNames = { 2:'Tiny', 3:'Small', 4:'Medium', 5:'Large', 6:'Huge', 7:'Gargantuan' };
              const statNames = { 1:'STR', 2:'DEX', 3:'CON', 4:'INT', 5:'WIS', 6:'CHA' };
              const moveNames = { 1:'walk', 2:'burrow', 3:'climb', 4:'fly', 5:'swim' };
              const stats = {};
              if (m.stats) {
                m.stats.forEach(s => { stats[statNames[s.statId] || s.statId] = s.value; });
              }
              const result = {
                found: true,
                source: 'ddb',
                name: m.name,
                hp: m.averageHitPoints,
                maxHp: m.averageHitPoints,
                ac: m.armorClass,
                acDesc: m.armorClassDescription || '',
                hpDice: m.hitPointDice ? m.hitPointDice.diceString : '',
                cr: cr ? `${cr.value}` : (m.challengeRatingId || '?'),
                xp: cr ? cr.xp : 0,
                edition: m.isLegacy ? '5E' : '5.5E',
                size: sizeNames[m.sizeId] || 'Unknown',
                type: typeMap.get(m.typeId) || 'Unknown',
                alignment: alignMap.get(m.alignmentId) || 'Unaligned',
                stats,
                movements: (m.movements || []).map(mv => ({ name: moveNames[mv.movementId] || 'walk', speed: mv.speed })),
                savingThrows: (m.savingThrows || []).map(s => ({ stat: statNames[s.statId] || s.statId, bonus: s.bonusModifier })),
                skillsHtml: m.skillsHtml || '',
                senses: (m.senses || []).map(s => ({ name: senseMap.get(s.senseId) || 'Unknown', notes: s.notes || '' })),
                passivePerception: m.passivePerception || 0,
                languages: m.languageDescription || '',
                actions: m.actionsDescription || '',
                bonusActions: m.bonusActionsDescription || '',
                legendary: m.legendaryActionsDescription || '',
                mythic: m.mythicActionsDescription || '',
                reactions: m.reactionsDescription || '',
                special: m.specialTraitsDescription || '',
                avatarUrl: m.avatarUrl || m.portraitAvatarUrl || '',
                damageResistances: (m.damageResistances || []).map(dr => dr.name || dr),
                damageImmunities: (m.damageImmunities || []).map(di => di.name || di),
                damageVulnerabilities: (m.damageVulnerabilities || []).map(dv => dv.name || dv),
                conditionImmunities: (m.conditionImmunities || []).map(ci => ci.name || ci),
                lairActions: m.lairActionsDescription || '',
                regionalEffects: m.regionalEffectsDescription || ''
              };
              console.log('[resolve-monster] D&D Beyond hit:', m.name, 'HP:', m.averageHitPoints, 'AC:', m.armorClass);
              res.writeHead(200);
              res.end(JSON.stringify({ jsonrpc: '2.0', result }));
              return;
            }
          }

          // 3) Not found anywhere
          console.warn('[resolve-monster] Not found:', monsterName);
          res.writeHead(200);
          res.end(JSON.stringify({ jsonrpc: '2.0', result: { found: false, name: monsterName } }));
        } catch (err) {
          console.error('[resolve-monster] FAILED:', err.message);
          res.writeHead(502);
          res.end(JSON.stringify({ error: err.message }));
        }
        return;
      }

      /**
       * POST /api/search-monsters
       * Search for monsters with optional filters
       * Body: { name: string, cr?: string, environment?: string, source?: number }
       * Response: { jsonrpc: '2.0', result: { results: [...] } }
       */
      /* ---------- SEARCH MONSTERS ---------- */
      if (pathname === '/api/search-monsters' && req.method === 'POST') {
        const body = await readBody(req);
        const query = body.name || body.query || '';
        const cr = body.cr || '';
        const environment = body.environment || '';
        const source = body.source || '';
        console.log('[search-monsters] Query:', query, '| CR:', cr, '| Environment:', environment, '| Source:', source);

        // Allow search with just filters (no name query required)
        if (!query.trim() && !cr && !environment && !source) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Search query or filter required' }));
          return;
        }

        try {
          const mcpParams = { name: query };
          if (cr) mcpParams.cr = cr;
          if (environment) mcpParams.environment = environment; // Note: MCP may ignore this

          // Map source ID to source name for MCP
          if (source) {
            const sourceId = parseInt(source, 10);
            const sourceMap = {
              1: 'Monster Manual',
              2: "Volo's Guide to Monsters",
              3: "Mordenkainen's Tome of Foes",
              4: "Fizban's Treasury of Dragons",
              5: 'Bigby Presents: Glory of the Giants',
              6: 'Mordenkainen Presents: Monsters of the Multiverse',
              7: 'Curse of Strahd',
              8: 'Out of the Abyss',
              9: "Storm King's Thunder",
              10: 'Tomb of Annihilation',
              11: 'Waterdeep: Dragon Heist',
              12: 'Waterdeep: Dungeon of the Mad Mage',
              13: 'Lost Mine of Phandelver',
              14: 'Rise of Tiamat',
              15: 'Hoard of the Dragon Queen',
              16: "Explorer's Guide to Wildemount",
              17: "Guildmasters' Guide to Ravnica",
              18: 'Acquisitions Incorporated',
              19: 'Icewind Dale: Rime of the Frost Maiden',
              20: "Van Richten's Guide to Ravenloft",
              21: 'Strixhaven: A Curriculum of Chaos',
              22: 'Spelljammer: Adventures in Space',
              23: 'The Wild Beyond the Witchlight',
              24: 'Journeys Through the Radiant Citadel',
              25: 'Dragonlance: Shadow of the Dragon Queen',
              26: 'Keys from the Golden Vault',
              27: 'Phandelver and Below: The Shattered Obelisk',
              28: 'Planescape: Adventures in the Multiverse',
              29: "Boo's Astral Menagerie",
              30: 'Vecna: Eve of Ruin',
              31: 'Quests from the Infinite Staircase'
            };
            mcpParams.source = sourceMap[sourceId] || '';
          }

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

      /**
       * GET /api/sources
       * Returns list of available source books from D&D Beyond
       * Response: { sources: [{ id: number, name: string, shortName: string }] }
       * Caches internally; falls back to hardcoded list on error
       */
      /* ---------- GET SOURCES (BOOKS) ---------- */
      if (pathname === '/api/sources' && req.method === 'GET') {
        try {
          // Use comprehensive fallback list (MCP doesn't have get_sources tool)
          const sources = [
            { id: 1, name: 'Monster Manual', shortName: 'MM' },
            { id: 2, name: "Volo's Guide to Monsters", shortName: 'VGM' },
            { id: 3, name: "Mordenkainen's Tome of Foes", shortName: 'MTF' },
            { id: 4, name: "Fizban's Treasury of Dragons", shortName: 'FTD' },
            { id: 5, name: 'Bigby Presents: Glory of the Giants', shortName: 'BPGG' },
            { id: 6, name: 'Mordenkainen Presents: Monsters of the Multiverse', shortName: 'MPMM' },
            { id: 7, name: 'Curse of Strahd', shortName: 'CoS' },
            { id: 8, name: 'Out of the Abyss', shortName: 'OoA' },
            { id: 9, name: "Storm King's Thunder", shortName: 'SKT' },
            { id: 10, name: 'Tomb of Annihilation', shortName: 'ToA' },
            { id: 11, name: 'Waterdeep: Dragon Heist', shortName: 'WDH' },
            { id: 12, name: 'Waterdeep: Dungeon of the Mad Mage', shortName: 'WDMM' },
            { id: 13, name: 'Lost Mine of Phandelver', shortName: 'LMoP' },
            { id: 14, name: 'Rise of Tiamat', shortName: 'RoT' },
            { id: 15, name: 'Hoard of the Dragon Queen', shortName: 'HotDQ' },
            { id: 16, name: "Explorer's Guide to Wildemount", shortName: 'EGW' },
            { id: 17, name: "Guildmasters' Guide to Ravnica", shortName: 'GGR' },
            { id: 18, name: 'Acquisitions Incorporated', shortName: 'AI' },
            { id: 19, name: 'Icewind Dale: Rime of the Frost Maiden', shortName: 'IDRotFM' },
            { id: 20, name: "Van Richten's Guide to Ravenloft", shortName: 'VRGR' },
            { id: 21, name: 'Strixhaven: A Curriculum of Chaos', shortName: 'Strix' },
            { id: 22, name: 'Spelljammer: Adventures in Space', shortName: 'SAiS' },
            { id: 23, name: 'The Wild Beyond the Witchlight', shortName: 'TWBTW' },
            { id: 24, name: 'Journeys Through the Radiant Citadel', shortName: 'JTRC' },
            { id: 25, name: 'Dragonlance: Shadow of the Dragon Queen', shortName: 'DLSoDQ' },
            { id: 26, name: 'Keys from the Golden Vault', shortName: 'KftGV' },
            { id: 27, name: 'Phandelver and Below: The Shattered Obelisk', shortName: 'PABTSO' },
            { id: 28, name: 'Planescape: Adventures in the Multiverse', shortName: 'PAitM' },
            { id: 29, name: "Boo's Astral Menagerie", shortName: 'BAM' },
            { id: 30, name: 'Vecna: Eve of Ruin', shortName: 'VEoR' },
            { id: 31, name: 'Quests from the Infinite Staircase', shortName: 'QftIS' }
          ];

          console.log('[sources] Returning', sources.length, 'source(s)');
          res.writeHead(200);
          res.end(JSON.stringify({ sources }));
        } catch (err) {
          console.error('[sources] FAILED:', err.message);
          // Minimal fallback on error
          res.writeHead(200);
          res.end(JSON.stringify({
            sources: [
              { id: 1, name: 'Monster Manual', shortName: 'MM' },
              { id: 2, name: "Volo's Guide to Monsters", shortName: 'VGM' },
              { id: 3, name: "Mordenkainen's Tome of Foes", shortName: 'MTF' }
            ]
          }));
        }
        return;
      }

      /* ---------- ENCOUNTER DIFFICULTY ---------- */
      if (pathname === '/api/encounter-difficulty' && req.method === 'POST') {
        const body = await readBody(req);
        const partyLevels = body.partyLevels || [];
        const monsterCrList = body.monsterCrList || [];
        try {
          const calc = calculateEncounterDifficulty(partyLevels, monsterCrList);
          res.writeHead(200);
          res.end(JSON.stringify({ jsonrpc: '2.0', result: calc }));
        } catch (err) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: err.message }));
        }
        return;
      }

      /* ---------- TEST LLM CONNECTION ---------- */
      if (pathname === '/api/test-llm' && req.method === 'POST') {
        const body = await readBody(req);
        const { provider, endpoint, model, key } = body;
        const missing = [];
        if (!provider) missing.push('provider');
        if (!endpoint) missing.push('endpoint');
        if (!model) missing.push('model');
        if (missing.length) {
          res.writeHead(200);
          res.end(JSON.stringify({ jsonrpc: '2.0', result: { ok: false, error: 'Missing: ' + missing.join(', ') } }));
          return;
        }
        try {
          let testUrl, headers = {}, testBody;
          const needsKey = provider !== 'ollama_local' && provider !== 'ollama_cloud';
          if (needsKey && !key) {
            res.writeHead(200);
            res.end(JSON.stringify({ jsonrpc: '2.0', result: { ok: false, error: 'API key required for ' + provider } }));
            return;
          }
          if (provider === 'ollama_local' || provider === 'ollama_cloud') {
            testUrl = (endpoint || 'http://localhost:11434').replace(/\/$/, '') + '/api/tags';
            const response = await fetchWithTimeout(testUrl, { method: 'GET', timeout: 8000 });
            const data = await response.json();
            if (!data.models || !Array.isArray(data.models)) {
              res.writeHead(200);
              res.end(JSON.stringify({ jsonrpc: '2.0', result: { ok: false, error: 'Ollama responded but no models list found. Is Ollama running?' } }));
              return;
            }
            const searchModel = model.toLowerCase();
            const found = data.models.find(m => {
              const mName = (m.name || '').toLowerCase();
              const mModel = (m.model || '').toLowerCase();
              return mName === searchModel || mModel === searchModel || mName.startsWith(searchModel);
            });
            if (found) {
              res.writeHead(200);
              res.end(JSON.stringify({ jsonrpc: '2.0', result: { ok: true, message: '✅ Ollama reachable — model "' + found.name + '" available (' + data.models.length + ' total models)' } }));
            } else {
              const names = data.models.slice(0, 5).map(m => m.name || m.model).join(', ');
              res.writeHead(200);
              res.end(JSON.stringify({ jsonrpc: '2.0', result: { ok: false, error: '❌ Model "' + model + '" not found. Available: ' + names + (data.models.length > 5 ? '…' : '') + '. Run: ollama pull ' + model } }));
            }
            return;
          } else if (provider === 'openai') {
            testUrl = 'https://api.openai.com/v1/models';
            headers = { 'Authorization': 'Bearer ' + key };
            const response = await fetchWithTimeout(testUrl, { method: 'GET', headers, timeout: 10000 });
            if (!response.ok) {
              const errText = await response.text().catch(() => '');
              res.writeHead(200);
              res.end(JSON.stringify({ jsonrpc: '2.0', result: { ok: false, error: '❌ OpenAI rejected key (HTTP ' + response.status + '). Check your API key is valid and has credit.' } }));
              return;
            }
            const data = await response.json();
            const found = (data.data || []).find(m => m.id === model);
            if (found) {
              res.writeHead(200);
              res.end(JSON.stringify({ jsonrpc: '2.0', result: { ok: true, message: '✅ OpenAI key valid — model "' + model + '" accessible' } }));
            } else {
              res.writeHead(200);
              res.end(JSON.stringify({ jsonrpc: '2.0', result: { ok: false, error: '❌ Model "' + model + '" not found in your OpenAI account. Check spelling or subscription tier.' } }));
            }
            return;
          } else if (provider === 'claude') {
            testUrl = 'https://api.anthropic.com/v1/models';
            headers = { 'x-api-key': key, 'anthropic-version': '2023-06-01' };
            const response = await fetchWithTimeout(testUrl, { method: 'GET', headers, timeout: 10000 });
            if (!response.ok) {
              res.writeHead(200);
              res.end(JSON.stringify({ jsonrpc: '2.0', result: { ok: false, error: '❌ Anthropic rejected key (HTTP ' + response.status + '). Check your API key is valid and has credit.' } }));
              return;
            }
            const data = await response.json();
            const found = (data.models || []).find(m => m.id === model || m.display_name === model);
            if (found) {
              res.writeHead(200);
              res.end(JSON.stringify({ jsonrpc: '2.0', result: { ok: true, message: '✅ Anthropic key valid — model "' + model + '" accessible' } }));
            } else {
              res.writeHead(200);
              res.end(JSON.stringify({ jsonrpc: '2.0', result: { ok: false, error: '❌ Model "' + model + '" not found. Check spelling against Anthropic model IDs.' } }));
            }
            return;
          } else if (provider === 'openrouter') {
            testUrl = 'https://openrouter.ai/api/v1/models';
            headers = { 'Authorization': 'Bearer ' + key };
            const response = await fetchWithTimeout(testUrl, { method: 'GET', headers, timeout: 10000 });
            if (!response.ok) {
              res.writeHead(200);
              res.end(JSON.stringify({ jsonrpc: '2.0', result: { ok: false, error: '❌ OpenRouter rejected key (HTTP ' + response.status + '). Check your API key is valid.' } }));
              return;
            }
            res.writeHead(200);
            res.end(JSON.stringify({ jsonrpc: '2.0', result: { ok: true, message: '✅ OpenRouter key valid — endpoint reachable' } }));
            return;
          } else {
            res.writeHead(200);
            res.end(JSON.stringify({ jsonrpc: '2.0', result: { ok: false, error: 'Unknown provider: ' + provider } }));
            return;
          }
        } catch (err) {
          let friendly = err.message;
          if (err.code === 'ECONNREFUSED') friendly = '❌ Cannot connect — server refused connection. Check the endpoint URL and that the service is running.';
          else if (err.code === 'ENOTFOUND') friendly = '❌ Cannot connect — host not found. Check the endpoint URL.';
          else if (err.code === 'ETIMEDOUT' || err.type === 'request-timeout') friendly = '❌ Connection timed out. Check the endpoint URL and network.';
          res.writeHead(200);
          res.end(JSON.stringify({ jsonrpc: '2.0', result: { ok: false, error: friendly } }));
        }
        return;
      }

      /* ---------- VAULT TREE ---------- */
      if (pathname === '/api/vault' && req.method === 'GET') {
        const dir = url.searchParams.get('dir') || '';
        const fullDir = path.resolve(path.join(CAMPAIGN_BASE, dir));
        const basePath = path.resolve(CAMPAIGN_BASE);
        if (!fullDir.startsWith(basePath + path.sep) && fullDir !== basePath) {
          res.writeHead(403);
          res.end(JSON.stringify({ error: 'Access denied' }));
          return;
        }
        const results = [];
        try {
          const entries = await fs.readdir(fullDir, { withFileTypes: true });
          for (const entry of entries) {
            results.push({
              name: entry.name,
              path: path.join('/', dir, entry.name).replace(/\\/g, '/'),
              isDirectory: entry.isDirectory()
            });
          }
        } catch (e) {
          // Directory missing
        }
        res.writeHead(200);
        res.end(JSON.stringify({ jsonrpc: '2.0', result: results }));
        return;
      }

      /* ---------- STATIC FILES ---------- */
      if (req.method === 'GET' && pathname === '/') {
        const indexPath = path.join(__dirname, 'index.html');
        const html = await fs.readFile(indexPath, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
        return;
      }

      if (req.method === 'GET' && (pathname === '/soundboard' || pathname === '/soundboard.html')) {
        const sbPath = path.join(__dirname, 'soundboard.html');
        const html = await fs.readFile(sbPath, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
        return;
      }

      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    } catch (err) {
      console.error('Server error:', err);
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message, stack: err.stack }));
    }
  });

  server.listen(PORT, () => {
    console.log(`Tactical DM Cockpit bridge listening on http://localhost:${PORT}`);
  });
}

start().catch(console.error);
