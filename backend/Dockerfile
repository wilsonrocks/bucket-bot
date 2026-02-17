FROM node:24-alpine

# Set working directory
WORKDIR /app

# Copy only the built dist folder
COPY dist .

# Expose port (adjust if different)
EXPOSE 9999

# Start the app (adjust entrypoint as needed)
CMD ["node", "index.js"]
