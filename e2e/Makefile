.PHONY: install test test-ui test-headed setup

# Install dependencies
install:
	npm install
	npx playwright install chromium

# Run setup script only
setup:
	npm run setup

# Run all tests
test:
	npm test

# Run tests with interactive UI
test-ui:
	npm run test:ui

# Run tests with visible browser
test-headed:
	npm run test:headed
