const assert = require('assert');
const fs = require('fs');
const path = require('path');

const serverSource = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

assert(serverSource.includes("'.mp4': 'video/mp4'"));
assert(serverSource.includes("staticHeaders['Accept-Ranges'] = 'bytes'"));
assert(serverSource.includes("staticHeaders['Content-Range'] = `bytes ${start}-${end}/${fileSize}`"));
assert(serverSource.includes("fs.createReadStream(file, { start, end }).pipe(res)"));
assert(serverSource.includes("res.writeHead(206, staticHeaders)"));
assert(serverSource.includes("'Content-Range': `bytes */${fileSize}`"));

console.log('static-video-delivery-ok');
