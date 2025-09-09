// import express, { Request, Response } from "express";
// import { createProxyMiddleware } from "http-proxy-middleware";
// import cors from "cors";

// const app = express();
// app.use(cors());

// app.use('/proxy', createProxyMiddleware({
//   target: 'http://50.145.48.92:30082',
//   changeOrigin: true,
//   pathRewrite: { '^/proxy': '/v1/proxy' },
// }));

// const PORT = 4000;
// app.listen(PORT, () => {
//   console.log(`Proxy server running on http://localhost:${PORT}`);
// });

// server.js - Deploy this to Vercel, Railway, or any Node.js hosting
import express from "express";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();
app.use(cors());

app.use(
  "/proxy",
  createProxyMiddleware({
    target: "http://50.145.48.92:30082",
    changeOrigin: true,
    pathRewrite: { "^/proxy": "/v1/proxy" },
  })
);

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
// Health check endpoint
app.get("/health", (req: Request, res: any) => {
  res.status(200).json({ status: "OK" });
});

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/health", (req: any, res: any) => {
  res.status(200).json({ status: "OK" });
});

// Proxy middleware for 0G inference endpoints
app.use(
  "/api/proxy",
  createProxyMiddleware({
    target: "http://inference-endpoint-placeholder", // This will be dynamically set
    changeOrigin: true,
    pathRewrite: {
      "^/api/proxy": "", // Remove /api/proxy from the forwarded request
    },
    router: (req: any) => {
      // Extract the target URL from query params or headers
      const targetUrl = req.query.target || req.headers["x-target-url"];
      if (!targetUrl) {
        throw new Error("Target URL is required");
      }
      return targetUrl;
    },
    on: {
      proxyReq: (proxyReq: any, req: any, res: any) => {
        // Forward all headers from the original request
        Object.keys(req.headers).forEach((key) => {
          if (key !== "host" && key !== "x-target-url") {
            proxyReq.setHeader(key, req.headers[key]);
          }
        });

        console.log(
          `Proxying request to: ${proxyReq.getHeader("host")}${proxyReq.path}`
        );
      },
      proxyRes: (proxyRes: any, req: any, res: any) => {
        // Add CORS headers to the response
        proxyRes.headers["Access-Control-Allow-Origin"] = "*";
        proxyRes.headers["Access-Control-Allow-Methods"] =
          "GET, POST, PUT, DELETE, OPTIONS";
        proxyRes.headers["Access-Control-Allow-Headers"] =
          "Content-Type, Authorization, X-Target-URL";
      },
      error: (err: any, req: any, res: any) => {
        console.error("Proxy error:", err.message);
        res.status(500).json({
          error: "Proxy request failed",
          message: err.message,
          target: req.query.target || req.headers["x-target-url"],
        });
      }
    }
  })
);

// Alternative endpoint for direct URL proxying
app.all("/proxy/*", async (req: any, res: any) => {
  try {
    const targetUrl = req.params[0]; // Everything after /proxy/
    const fullTargetUrl = targetUrl.startsWith("http")
      ? targetUrl
      : `http://${targetUrl}`;

    console.log(`Direct proxy request to: ${fullTargetUrl}`);

    const fetch = (await import("node-fetch")).default;

    const response = await fetch(fullTargetUrl, {
      method: req.method,
      headers: {
        ...req.headers,
        host: undefined, // Remove host header
      },
      body: req.method !== "GET" ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.text();

    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );

    // Forward status and content type
    res.status(response.status);
    res.setHeader(
      "Content-Type",
      response.headers.get("content-type") || "application/json"
    );

    res.send(data);
  } catch (error: unknown) {
    console.error("Direct proxy error:", error);
    res.status(500).json({
      error: "Proxy request failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// Handle preflight OPTIONS requests
app.options("*", (req: any, res: any) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Target-URL"
  );
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`CORS Proxy Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
