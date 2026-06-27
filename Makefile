# Makefile for Raft - Bitcoin Operating System

# Configuration
PROJECT_ID = raft-btc-app
BUILD_DIR = dist/raft-app/browser

.PHONY: all build deploy clean setup

all: build deploy

# Install dependencies if they're missing
setup:
	@echo "Installing dependencies..."
	npm install
	@echo "Installing Firebase CLI locally if missing..."
	npm install firebase-tools --save-dev

# Build the Angular application
build:
	@echo "Building Raft application for production..."
	npx ng build --configuration production

# Deploy to Firebase
# Note: Requires 'firebase login' to be performed once in the terminal
deploy:
	@echo "Deploying to Firebase Hosting..."
	npx firebase deploy --only hosting --project $(PROJECT_ID)

# Combined build and deploy
release: build deploy

# Clean build artifacts
clean:
	@echo "Cleaning dist directory..."
	rm -rf dist/
