import dotenv from "dotenv";
import path from "path";
import express from "express";
import { createServer as createViteServer } from "vite";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
// Securely load environment variables from .env
dotenv.config({ path: path.resolve(process.cwd(), "backend/.env"), override: true });
dotenv.config({ path: path.resolve(process.cwd(), ".env"), override: true });

const { PrismaClient } = require("@prisma/client");

const app = express();
const PORT = 3000;

app.use(express.json());

// Prisma client initialization with securely injected DATABASE_URL
const defaultDbUrl =
  "postgresql://postgres.pxfbbiyytmeuvovnuuhv:vrPsCXEyciGF3Uhx@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
const dbUrl = process.env.DATABASE_URL || defaultDbUrl;

let prisma: any = null;
try {
  prisma = new PrismaClient({
    datasources: {
      db: { url: dbUrl },
    },
  });
} catch (e: any) {
  console.error("Failed to initialize Prisma Client:", e?.message || e);
}

function getPrisma() {
  if (!prisma) {
    try {
      prisma = new PrismaClient({
        datasources: {
          db: { url: dbUrl },
        },
      });
    } catch (e: any) {
      console.error("Prisma re-init error:", e?.message || e);
    }
  }
  return prisma;
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Database status & metrics endpoint
app.get("/api/db/status", async (_req, res) => {
  const start = Date.now();
  const client = getPrisma();
  if (!client) {
    return res.status(200).json({
      connected: false,
      provider: "Supabase PostgreSQL",
      host: "aws-1-eu-west-1.pooler.supabase.com",
      port: 6543,
      mode: "Transaction Pooler (PgBouncer)",
      latencyMs: 0,
      error: "Prisma client initializing. Please wait a few seconds and refresh.",
    });
  }

  try {
    const rawResult = await client.$queryRaw`SELECT version(), current_database(), current_user;`;
    const latencyMs = Date.now() - start;

    const [userCount, postCount, tagCount, profileCount] = await Promise.all([
      client.user.count(),
      client.post.count(),
      client.tag.count(),
      client.profile.count(),
    ]);

    const recentUsers = await client.user.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { profile: true, posts: { take: 3 } },
    });

    res.json({
      connected: true,
      provider: "Supabase PostgreSQL",
      host: "aws-1-eu-west-1.pooler.supabase.com",
      port: 6543,
      mode: "Transaction Pooler (PgBouncer)",
      latencyMs,
      info: rawResult[0] || null,
      counts: {
        users: userCount,
        posts: postCount,
        tags: tagCount,
        profiles: profileCount,
      },
      recentUsers,
    });
  } catch (error: any) {
    res.status(200).json({
      connected: false,
      provider: "Supabase PostgreSQL",
      host: "aws-1-eu-west-1.pooler.supabase.com",
      port: 6543,
      mode: "Transaction Pooler (PgBouncer)",
      latencyMs: Date.now() - start,
      error: error.message || "Failed to query database",
    });
  }
});

// Get all users
app.get("/api/users", async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: { profile: true, posts: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ users });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new user
app.post("/api/users", async (req, res) => {
  try {
    const { name, email, role, bio } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const newUser = await prisma.user.create({
      data: {
        email,
        name: name || null,
        role: role || "USER",
        ...(bio ? { profile: { create: { bio } } } : {}),
      },
      include: { profile: true },
    });

    res.status(201).json({ user: newUser });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Seed sample data
app.post("/api/seed", async (_req, res) => {
  try {
    const timestamp = Date.now().toString().slice(-4);
    const demoEmail = `dev_${timestamp}@example.com`;

    const user = await prisma.user.create({
      data: {
        email: demoEmail,
        name: `Developer ${timestamp}`,
        role: "ADMIN",
        profile: {
          create: {
            bio: "Fullstack engineer building on Supabase & Prisma ORM",
            avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${demoEmail}`,
          },
        },
        posts: {
          create: [
            {
              title: `Connecting Prisma to Supabase #${timestamp}`,
              slug: `connecting-prisma-supabase-${timestamp}`,
              content: "Supabase transaction pooler with Prisma client enables scalable connection handling on serverless and container architectures.",
              published: true,
            },
          ],
        },
      },
      include: { profile: true, posts: true },
    });

    res.json({ success: true, message: "Sample record created in Supabase!", user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Vite middleware / static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
