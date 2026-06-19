const MAX_LINES = 500;

/** @type {{ id: number, ts: number, level: string, message: string }[]} */
const lines = [];
let nextId = 0;

function formatArgs(args) {
  return args
    .map((a) => {
      if (typeof a === 'string') return a;
      try {
        return JSON.stringify(a);
      } catch {
        return String(a);
      }
    })
    .join(' ');
}

export function appendLog(level, args) {
  const entry = {
    id: ++nextId,
    ts: Date.now(),
    level,
    message: formatArgs(args),
  };
  lines.push(entry);
  if (lines.length > MAX_LINES) lines.shift();
  return entry;
}

export function getLogs(sinceId = 0) {
  return lines.filter((l) => l.id > sinceId);
}

export function installLogCapture() {
  for (const level of ['log', 'info', 'warn', 'error']) {
    const original = console[level].bind(console);
    console[level] = (...args) => {
      appendLog(level, args);
      original(...args);
    };
  }
}
