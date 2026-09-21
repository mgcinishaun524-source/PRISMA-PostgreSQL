# Database Control Center — Full-Stack Learning Lab

> 🎓 **Educational & Learning Project**  
> This application was built as a hands-on learning project to explore and master modern relational database architectures, Object-Relational Mapping (ORM) with Prisma, cloud database pooling with Supabase PostgreSQL, and end-to-end full-stack web development with React and TypeScript.

---

## 📖 About This Project

This project represents a personal learning journey into how production-grade web applications connect to and manage cloud databases. The goal was to move beyond theory and build an interactive system that connects a client-side interface to a live PostgreSQL database through a dedicated backend API.

### What I Learned & Practiced:

1. **Relational Database Design with PostgreSQL**:
   - Designing relational schemas with primary keys, foreign keys, and indexes.
   - Establishing one-to-one relationships (`User` ↔ `Profile`).
   - Establishing one-to-many relationships (`User` ↔ `Post`).
   - Establishing many-to-many relationships with join tables (`Post` ↔ `Tag`).
   - Configuring cascading delete behaviors (`onDelete: Cascade`).

2. **Prisma ORM Workflow**:
   - Defining declarative schemas in `schema.prisma`.
   - Managing database schema migrations (`prisma migrate dev` / `prisma migrate deploy`).
   - Generating type-safe database client queries.
   - Writing raw queries (`$queryRaw`) alongside fluent ORM lookups.

3. **Cloud Connection Pooling & Topology (Supabase)**:
   - Understanding the difference between session-based pooling (port `5432` for schema migrations and advisory locks) and transaction-based pooling (port `6543` with PgBouncer for high-concurrency serverless/container runtimes).
   - Managing dual-URL configurations (`DATABASE_URL` vs `DIRECT_URL`).

4. **Full-Stack API Engineering (Express + TypeScript)**:
   - Building REST endpoints (`/api/health`, `/api/db/status`, `/api/users`, `/api/seed`).
   - Measuring round-trip query latency and diagnosing database connection errors.
   - Handling async operations and graceful error handling.

5. **Frontend State & Dashboard UI (React + Tailwind CSS)**:
   - Creating a live control center to inspect database health in real time.
   - Displaying table record counters and dynamic user listings.
   - Building interactive test actions to seed and create records on the fly.

6. **Environment Security & Credential Hygiene**:
   - Isolating sensitive connection strings and passwords strictly in `.env` files.
   - Preventing secret leaks by securing repository files under `.gitignore`.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Motion
- **Backend**: Node.js, Express, tsx
- **ORM & Database**: Prisma ORM (v6), PostgreSQL 17 (Supabase)
- **Tooling**: Vite, esbuild

---

## 🏗️ Data Schema Overview

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  posts     Post[]
  profile   Profile?
}

model Profile {
  id        String   @id @default(cuid())
  bio       String?
  avatarUrl String?
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Post {
  id        String   @id @default(cuid())
  title     String
  slug      String   @unique
  content   String?
  published Boolean  @default(false)
  authorId  String
  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  tags      Tag[]
}

model Tag {
  id    String @id @default(cuid())
  name  String @unique
  posts Post[]
}
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18 or higher)
- A PostgreSQL database (e.g. Supabase, Neon, or local PostgreSQL instance)

### 2. Setup Environment Variables
Create a `.env` file in the root directory:

```env
# Runtime pooler connection (port 6543)
DATABASE_URL="postgresql://user:password@host:6543/postgres?pgbouncer=true"

# Direct connection for migrations (port 5432)
DIRECT_URL="postgresql://user:password@host:5432/postgres"
```

### 3. Install Dependencies & Generate Prisma Client
```bash
npm install
npx prisma generate --schema=backend/prisma/schema.prisma
```

### 4. Run Migrations
```bash
npx prisma migrate deploy --schema=backend/prisma/schema.prisma
```

### 5. Start Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` to interact with the database control center.

---

## 👤 Author & Acknowledgments

- **Author**: mgcinishaun524@gmail.com
- **Purpose**: Learning, experimentation, and educational skill building in full-stack engineering and cloud database systems.
