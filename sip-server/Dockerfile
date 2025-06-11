# Use official Node.js LTS base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install production dependencies
RUN npm install --production

# Copy the rest of the project files
COPY . .

# Expose the port your app runs on (adjust if needed)
EXPOSE 3000

# Start the app using npm
CMD ["npm", "start"]
