# Use Node for development
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy everything
COPY . .

# Install dependencies (use legacy peer deps if needed)
RUN npm install --legacy-peer-deps

# Expose Vite dev server port
EXPOSE 5173

# Run Vite dev server and bind to 0.0.0.0 to allow external access
CMD ["npm", "run", "dev", "--", "--host"]
