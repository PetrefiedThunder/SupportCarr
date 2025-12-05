FROM node:20-alpine

WORKDIR /app

# 1. Install dependencies for the entire monorepo
COPY package*.json ./
COPY client/package*.json client/
COPY server/package*.json server/

# Install root dependencies
RUN npm install

# Install workspace dependencies
RUN npm install --workspace=client
RUN npm install --workspace=server

# 2. Copy source code
COPY . .

# 3. Build the React Frontend
RUN npm run build --workspace=client

# 4. Setup Environment
ENV NODE_ENV=production
ENV PORT=8080

# Expose the API port
EXPOSE 8080

# 5. Start the Server
CMD ["npm", "start", "--workspace=server"]
