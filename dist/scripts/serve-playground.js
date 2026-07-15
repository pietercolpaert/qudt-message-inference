"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_http_1 = require("node:http");
const node_path_1 = require("node:path");
const root = (0, node_path_1.resolve)(__dirname, '..', 'playground');
const port = Number(process.env.PORT ?? 4173);
const mimeTypes = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
};
const server = (0, node_http_1.createServer)((request, response) => {
    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
    const relativePath = pathname === '/' ? 'index.html' : (0, node_path_1.normalize)(decodeURIComponent(pathname)).replace(/^[/\\]+/, '');
    const path = (0, node_path_1.resolve)((0, node_path_1.join)(root, relativePath));
    if (path !== root && !path.startsWith(`${root}${node_path_1.sep}`)) {
        response.writeHead(403).end('Forbidden');
        return;
    }
    try {
        if (!(0, node_fs_1.statSync)(path).isFile())
            throw new Error('Not a file');
        response.writeHead(200, {
            'Content-Type': mimeTypes[(0, node_path_1.extname)(path)] ?? 'application/octet-stream',
            'Cache-Control': 'no-store',
        });
        (0, node_fs_1.createReadStream)(path).pipe(response);
    }
    catch {
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
    }
});
server.listen(port, '127.0.0.1', () => {
    console.log(`QUDT playground: http://127.0.0.1:${port}`);
});
//# sourceMappingURL=serve-playground.js.map