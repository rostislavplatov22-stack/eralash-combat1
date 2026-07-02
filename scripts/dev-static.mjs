import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const root = resolve('.');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const filePath = urlPath === '/' ? join(root, 'index.html') : join(root, urlPath);
  if (!existsSync(filePath)) {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }
  res.setHeader('Content-Type', mime[extname(filePath)] || 'application/octet-stream');
  res.end(readFileSync(filePath));
});

const port = process.env.PORT || 5173;
server.listen(port, '0.0.0.0', () => console.log(`Dev server: http://localhost:${port}`));
