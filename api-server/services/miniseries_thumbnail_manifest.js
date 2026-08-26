const fs = require('fs');
const path = require('path');

const SUPPORTED_EXTENSIONS = Object.freeze(['jpg', 'jpeg', 'png', 'webp']);

function existingImage(candidates) {
  for (const candidate of candidates) {
    if (fs.existsSync(candidate.file) && fs.statSync(candidate.file).isFile()) return candidate;
  }
  return null;
}

function buildMiniseriesImageManifest({ root, docNum, campaignNum, limit = 50 }) {
  const minisseriesRoot = path.join(root, 'minisseries');
  const campaignDir = path.join(minisseriesRoot, docNum, `M${campaignNum}`);
  const entries = [];

  for (let sequence = 1; sequence <= limit; sequence += 1) {
    const padded = String(sequence).padStart(3, '0');
    const candidates = [];

    for (const extension of SUPPORTED_EXTENSIONS) {
      candidates.push({
        file: path.join(campaignDir, `img_${padded}.${extension}`),
        url: `/minisseries/${docNum}/M${campaignNum}/img_${padded}.${extension}`
      });
    }
    const found = existingImage(candidates);
    if (!found) continue;

    const stat = fs.statSync(found.file);
    entries.push({
      sequence,
      url: found.url,
      version: `${stat.size}-${Math.trunc(stat.mtimeMs)}`,
      size: stat.size,
      modifiedAt: stat.mtimeMs
    });
  }

  return {
    docNum,
    campaignNum,
    limit,
    count: entries.length,
    entries
  };
}

module.exports = { buildMiniseriesImageManifest };
