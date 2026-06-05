// DM Cockpit - Helper Functions
// Shared utility functions for frontend

/* ============================================================
   GLOBAL ERROR HANDLING
   ============================================================ */

/**
 * Unified error handler for API calls
 * @param {Error} err - The error object
 * @param {string} [context=''] - Context where error occurred
 * @returns {string} User-friendly error message
 */
export function handleApiError(err, context = '') {
  let message = err.message || 'An unknown error occurred';
  let friendlyMessage = message;

  // Context prefix for debugging
  const prefix = context ? `[${context}] ` : '';

  // Try to parse response errors
  if (err.response && err.response.body) {
    const body = err.response.body;
    if (body.error) {
      friendlyMessage = body.error;
    } else if (body.message) {
      friendlyMessage = body.message;
    }
  }

  // Specific error patterns for user-friendly messages
  if (err.code === 'ECONNREFUSED') {
    friendlyMessage = 'Cannot connect to server. Is it running on localhost?';
  } else if (err.code === 'ENOTFOUND') {
    friendlyMessage = 'Server not found. Check the URL.';
  } else if (err.code === 'ETIMEDOUT' || err.type === 'request-timeout') {
    friendlyMessage = 'Connection timed out. Check your connection.';
  } else if (err.status === 503) {
    friendlyMessage = 'Service unavailable - AI provider not configured';
  } else if (err.status === 400) {
    friendlyMessage = 'Bad request - please check your input';
  } else if (err.status === 401) {
    friendlyMessage = 'Unauthorized - check your API credentials';
  } else if (err.status === 500) {
    friendlyMessage = 'Server error - please try again';
  }

  console.error(`${prefix}${message}`);
  return friendlyMessage;
}

/**
 * Debounce function to limit rate of function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Format bytes to human readable string
 * @param {number} bytes - Byte count
 * @param {number} [decimals=2] - Decimal places
 * @returns {string} Formatted string
 */
export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Generate a unique ID
 * @returns {string} Unique ID string
 */
export function generateId() {
  return 'enc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Parse dice expression (e.g., "3d6+2")
 * @param {string} expr - Dice expression
 * @returns {{count: number, sides: number, bonus: number}} Parsed dice info
 */
export function parseDiceExpression(expr) {
  const match = expr.match(/(\d+)d(\d+)([+-]\d+)?/);
  if (!match) return { count: 0, sides: 0, bonus: 0 };
  return {
    count: parseInt(match[1]),
    sides: parseInt(match[2]),
    bonus: match[3] ? parseInt(match[3]) : 0
  };
}

/**
 * Roll dice (e.g., rollDice(3, 6) = 3d6)
 * @param {number} count - Number of dice
 * @param {number} sides - Number of sides
 * @param {number} [bonus=0] - Bonus to add
 * @returns {number} Total roll result
 */
export function rollDice(count, sides, bonus = 0) {
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += Math.floor(Math.random() * sides) + 1;
  }
  return total + bonus;
}

/**
 * Extract numeric CR value from string (handles fractions)
 * @param {string} cr - Challenge rating string
 * @returns {number} Numeric CR value
 */
export function crToNumber(cr) {
  if (!cr) return 0;
  const s = String(cr).trim();
  if (s === '1/8') return 0.125;
  if (s === '1/4') return 0.25;
  if (s === '1/2') return 0.5;
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/**
 * Parse DMG XP thresholds for party levels
 * @param {number[]} levels - Array of party levels
 * @returns {{easy: number, medium: number, hard: number, deadly: number}} Thresholds
 */
export function getPartyThresholds(levels) {
  const thresholds = {
    1:  [25, 50, 75, 100], 2:  [50, 100, 150, 200],
    3:  [75, 150, 225, 400], 4:  [125, 250, 375, 500],
    5:  [250, 500, 750, 1100], 6:  [300, 600, 900, 1400],
    7:  [350, 750, 1100, 1700], 8:  [450, 900, 1400, 2100],
    9:  [550, 1100, 1600, 2400], 10: [600, 1200, 1900, 2800],
    11: [800, 1600, 2400, 3600], 12: [1000, 2000, 3000, 4500],
    13: [1100, 2200, 3400, 5100], 14: [1250, 2500, 3800, 5700],
    15: [1400, 2800, 4300, 6400], 16: [1600, 3200, 4800, 7200],
    17: [2000, 3900, 5900, 8800], 18: [2100, 4200, 6300, 9500],
    19: [2400, 4900, 7300, 10900], 20: [2800, 5700, 8500, 12700]
  };

  let easy = 0, medium = 0, hard = 0, deadly = 0;
  levels.forEach(lvl => {
    const t = thresholds[lvl] || thresholds[1];
    easy += t[0]; medium += t[1]; hard += t[2]; deadly += t[3];
  });
  return { easy, medium, hard, deadly };
}

/**
 * Calculate encounter difficulty using DMG guidelines
 * @param {number[]} partyLevels - Array of party levels
 * @param {string[]} monsterCrList - Array of monster CRs
 * @returns {{difficulty: string, totalXp: number, baseXp: number, multiplier: number, thresholds: Object, color: string}}
 */
export function calculateEncounterDifficulty(partyLevels, monsterCrList) {
  const thresholds = getPartyThresholds(partyLevels);
  const monsterCount = monsterCrList.length;

  const xpTable = {
    '0': 10, '1/8': 25, '1/4': 50, '1/2': 100, '1': 200, '2': 450, '3': 700,
    '4': 1100, '5': 1800, '6': 2300, '7': 2900, '8': 3900, '9': 5000, '10': 5900,
    '11': 7200, '12': 8400, '13': 10000, '14': 11500, '15': 13000, '16': 15000,
    '17': 18000, '18': 20000, '19': 22000, '20': 25000, '21': 33000, '22': 41000,
    '23': 50000, '24': 62000, '25': 75000, '26': 90000, '27': 105000, '28': 120000,
    '29': 135000, '30': 155000
  };

  // Get monster count multiplier
  let multiplier = 1;
  if (monsterCount === 2) multiplier = 1.5;
  else if (monsterCount <= 6) multiplier = 2;
  else if (monsterCount <= 10) multiplier = 2.5;
  else if (monsterCount <= 14) multiplier = 3;
  else multiplier = 4;

  // Calculate total XP
  let baseXp = 0;
  monsterCrList.forEach(cr => {
    let key = String(cr).trim();
    if (key === '0.125') key = '1/8';
    if (key === '0.25') key = '1/4';
    if (key === '0.5') key = '1/2';
    baseXp += xpTable[key] || 10;
  });
  const totalXp = Math.floor(baseXp * multiplier);

  // Determine difficulty
  let difficulty = 'Trivial';
  let color = '#555';
  if (totalXp >= thresholds.deadly) {
    difficulty = 'Deadly';
    color = '#ff4000';
  } else if (totalXp >= thresholds.hard) {
    difficulty = 'Hard';
    color = '#d52';
  } else if (totalXp >= thresholds.medium) {
    difficulty = 'Medium';
    color = '#ca3';
  } else if (totalXp >= thresholds.easy) {
    difficulty = 'Easy';
    color = '#3a7';
  }

  return { difficulty, totalXp, baseXp, multiplier, thresholds, color };
}

/**
 * Validate API request body against schema
 * @param {object} body - Request body to validate
 * @param {object} schema - Validation schema
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
export function validateRequestBody(body, schema) {
  const errors = [];
  for (const [key, rules] of Object.entries(schema)) {
    const value = body[key];
    if (rules.required && (value === undefined || value === '')) {
      errors.push(`${key} is required`);
    } else if (rules.minLength && value && value.length < rules.minLength) {
      errors.push(`${key} must be at least ${rules.minLength} characters`);
    } else if (rules.maxLength && value && value.length > rules.maxLength) {
      errors.push(`${key} must be at most ${rules.maxLength} characters`);
    } else if (rules.pattern && value && !rules.pattern.test(value)) {
      errors.push(`${key} format is invalid`);
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Store an error in localStorage for debugging
 * @param {string} key - Storage key
 * @param {string} message - Error message
 */
export function logError(key, message) {
  try {
    const errorLog = JSON.parse(localStorage.getItem('errorLog') || '[]');
    errorLog.push({
      key,
      message,
      timestamp: new Date().toISOString(),
      stack: new Error().stack
    });
    // Keep only last 100 errors
    localStorage.setItem('errorLog', JSON.stringify(errorLog.slice(-100)));
  } catch (e) {
    console.error('Failed to log error:', e);
  }
}

/**
 * Toast notification system
 * @param {string} message - Message to display
 * @param {string} [type='success'] - Notification type: 'success', 'error', 'warning', 'info'
 * @param {number} [duration=3000] - Duration in milliseconds
 */
export function showToast(message, type = 'success', duration = 3000) {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = 'dm-toast';
  toast.textContent = message;

  // Style based on type
  const colors = {
    success: { bg: '#1a3a1a', color: '#4f4', border: '#2a5' },
    error: { bg: '#3a1a1a', color: '#f44', border: '#a22' },
    warning: { bg: '#3a3a1a', color: '#ff4', border: '#aa2' },
    info: { bg: '#1a1a3a', color: '#88f', border: '#44a' }
  };
  const style = colors[type] || colors.info;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 24px;
    background: ${style.bg};
    color: ${style.color};
    border: 1px solid ${style.border};
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    z-index: 10000;
    font-family: 'JetBrains Mono', monospace;
    animation: fadeIn 0.3s ease-out;
  `;

  // Add toast to body
  document.body.appendChild(toast);

  // Remove after duration
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Add global CSS for toast animation if not already present
if (typeof document !== 'undefined') {
  const styleId = 'dm-toast-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }
}
