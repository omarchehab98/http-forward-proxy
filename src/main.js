#!/usr/bin/env node
const express = require("express");
const request = require("request");

if (process.argv.length <= 2) {
  console.error(`usage: npm start <source> <target>`);
  console.error(
    `example: PORT=8080 npm start https://proxy.com https://censored.com`
  );
  process.exit(1);
}

const [source, target] = process.argv.slice(2);
const { HOST = "127.0.0.1", PORT = 8000 } = process.env;

const app = express();

const targetURL = new URL(target);
const targetHost = targetURL.host;
const targetRegex = new RegExp(target, "g");

app.all("*", (req, res, done) => {
  console.log(`${req.method} ${target}${req.url}`);
  const requestHeaders = {
    ...req.headers,
    host: targetHost,
  };
  delete requestHeaders["accept-encoding"];
  Object.entries(requestHeaders).forEach(([key, value]) => {
    if (typeof value === "string") {
      requestHeaders[key] = value.replace(targetRegex, source);
    }
  });
  request(
    {
      url: `${target}${req.url}`,
      method: req.method,
      headers: requestHeaders,
      encoding: null,
    },
    (error, response, body) => {
      if (error) {
        console.error(error);
        res.end(500);
        return;
      }
      const responseHeaders = {
        ...response.headers,
      };
      delete responseHeaders["content-encoding"];
      Object.entries(responseHeaders).forEach(([key, value]) => {
        if (typeof value === "string") {
          responseHeaders[key] = value.replace(targetRegex, source);
        }
      });
      res.set(responseHeaders);
      res.status(response.statusCode);
      const contentType = responseHeaders["content-type"] || "";
      if (contentType.startsWith("text/")) {
        res.end(body.toString('utf8').replace(targetRegex, source));
      } else {
        res.end(body);
      }
    }
  );
});

app.listen(PORT, HOST, () => {
  console.log(
    `Forward proxy from ${source} to ${target} is listening on http://${HOST}:${PORT}`
  );
});
