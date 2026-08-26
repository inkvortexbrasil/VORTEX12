const path = require('path');

function sanitizeNumericId(raw, fallback = '00') {
  const digitsOnly = String(raw ?? '').replace(/\D/g, '');
  return (digitsOnly || fallback).padStart(2, '0');
}

function safeJoin(root, ...segments) {
  const resolvedRoot = path.resolve(root);
  const target = path.resolve(resolvedRoot, ...segments);
  if (target !== resolvedRoot && !target.startsWith(resolvedRoot + path.sep)) {
    throw new Error('Caminho fora da área permitida.');
  }
  return target;
}

function resolveCampaignDir(root, rawId, fallback, ...extraSegments) {
  const numStr = sanitizeNumericId(rawId, fallback);
  return { numStr, dir: safeJoin(root, 'minisseries', numStr, ...extraSegments) };
}

module.exports = {
  sanitizeNumericId,
  safeJoin,
  resolveCampaignDir
};
