import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve('out');
const port = Number(process.env.PORT || 3000);
const types: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.ico': 'image/vnd.microsoft.icon',
  '.png': 'image/png',
  '.json': 'application/json',
  '.txt': 'text/plain',
  '.woff2': 'font/woff2'
};
createServer(async (req, res) => {
  try {
    let file = resolve(
      root,
      '.' + decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname)
    );
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    const content = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`draftroom: http://127.0.0.1:${port}`));
