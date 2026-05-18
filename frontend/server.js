const http = require("http");
const fs = require("fs");
const path = require("path");

const base = process.env.TARGET_DIR;
const port = 3000;

if (!base) {
  console.error("TARGET_DIR manquant.");
  process.exit(1);
}
const baseDir = path.resolve(base);

const typeByExt = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".map": "application/json; charset=utf-8",
};

http
  .createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    const requestedPath = urlPath.replace(/^\//, "");
    if (!/^[a-zA-Z0-9._/-]*$/.test(requestedPath)) {
      res.writeHead(400);
      res.end("Bad request");
      return;
    }
    const normalizedPath = path.posix.normalize(`/${requestedPath}`).replace(
      /^\//,
      ""
    );
    if (normalizedPath.startsWith("..")) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    let filePath = path.resolve(baseDir, normalizedPath);

    if (urlPath === "/" || urlPath.endsWith("/")) {
      filePath = path.resolve(baseDir, normalizedPath, "index.html");
    }

    if (filePath !== baseDir && !filePath.startsWith(`${baseDir}${path.sep}`)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        fs.readFile(path.resolve(baseDir, "index.html"), (fallbackErr, fallbackData) => {
          if (fallbackErr) {
            res.writeHead(404);
            res.end("Not found");
            return;
          }

          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.writeHead(200);
          res.end(fallbackData);
        });
        return;
      }

      res.setHeader(
        "Content-Type",
        typeByExt[path.extname(filePath)] || "application/octet-stream"
      );
      res.writeHead(200);
      res.end(data);
    });
  })
  .listen(port, "0.0.0.0", () => {
    console.log(`Frontend server listening on ${port}`);
  });
