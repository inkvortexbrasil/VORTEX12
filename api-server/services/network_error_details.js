'use strict';

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function describeNetworkError(error) {
  const queue = [error];
  const seen = new Set();
  const leafDetails = [];
  let primaryCode = '';

  while (queue.length) {
    const current = queue.shift();
    if (!current || (typeof current !== 'object' && typeof current !== 'function')) continue;
    if (seen.has(current)) continue;
    seen.add(current);

    const code = cleanText(current.code);
    if (!primaryCode && code) primaryCode = code;

    const children = [];
    if (current.cause) children.push(current.cause);
    if (Array.isArray(current.errors)) children.push(...current.errors);

    if (children.length) {
      queue.push(...children);
      continue;
    }

    const message = cleanText(current.message);
    const address = cleanText(current.address);
    const port = cleanText(current.port);
    let detail = message;

    if (!detail || /^(fetch failed|aggregateerror)$/i.test(detail)) {
      detail = [code, address && port ? `${address}:${port}` : address].filter(Boolean).join(' ');
    } else if (code && !detail.toUpperCase().includes(code.toUpperCase())) {
      detail = `${code}: ${detail}`;
    }

    if (detail) leafDetails.push(detail);
  }

  const details = [...new Set(leafDetails)];
  const fallback = cleanText(error && (error.message || error.name)) || 'falha de rede sem detalhe';

  return {
    code: primaryCode,
    details,
    message: details.length ? details.join('; ') : fallback
  };
}

module.exports = { describeNetworkError };
