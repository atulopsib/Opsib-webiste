# syntax=docker/dockerfile:1

# ──────────────────────────────────────────────────────────────
#  STAGE 1 · Dependency install (cached layer)
# ──────────────────────────────────────────────────────────────
FROM node:18-alpine AS deps

WORKDIR /app

# Copy only the manifests first so Docker can cache this layer
# and skip npm install on subsequent builds when only source changes.
COPY package.json package-lock.json ./

# Install production-only dependencies.
RUN npm ci --omit=dev

# ──────────────────────────────────────────────────────────────
#  STAGE 2 · Final runtime image
# ──────────────────────────────────────────────────────────────
FROM node:18-alpine AS runner

# Security: run as non-root user.
RUN addgroup -S opsib && adduser -S opsib -G opsib

WORKDIR /app

# Copy installed node_modules from the deps stage.
COPY --from=deps /app/node_modules ./node_modules

# Copy application source files.
COPY . .

# Cloud Run injects PORT=8080 at runtime.
# server.js already reads process.env.PORT, so no changes needed.
ENV NODE_ENV=production
ENV PORT=8080

# Drop to non-root user before starting.
USER opsib

EXPOSE 8080

CMD ["node", "server.js"]
