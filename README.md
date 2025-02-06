# Firefly III AI categorization

This project allows you to automatically categorize your expenses in [Firefly III](https://www.firefly-iii.org/) using AI technology, with support for multiple AI providers and intelligent caching.

## Features

- 🤖 Multiple AI Provider Support (OpenAI, DeepSeek)
- 📊 Real-time Statistics Dashboard
- 🌙 Dark Mode Support
- 💾 Database Caching System
- 🔄 Automatic Transaction Categorization
- 🏷️ Custom Tag Support
- 📝 Detailed Transaction Logs
- 🔒 Privacy-Focused Design

## How it works

The application provides a webhook that is triggered whenever a new expense is added to Firefly III. It generates an AI prompt including your existing categories, recipient, and transaction description.

The AI service will analyze the transaction and suggest an appropriate category. If the suggested category matches one of your existing categories, the tool will:
1. Set the category on the transaction
2. Add a configurable tag to the transaction
3. Cache the result for future similar transactions

If it cannot detect a suitable category, no changes will be made to the transaction.

## Privacy

The following transaction details are sent to the AI service for category prediction:

- Transaction description
- Name of transaction destination account
- Names of all categories

To enhance privacy and reduce API calls, the application includes a caching system that stores previous categorizations locally.

## Installation

### 1. Get a Firefly Personal Access Token

You can generate your own Personal Access Token on the Profile page. Login to your Firefly III instance, go to
"Options" > "Profile" > "OAuth" and find "Personal Access Tokens". Create a new Personal Access Token by clicking on
"Create New Token". Give it a recognizable name and press "Create".

![Step 1](docs/img/pat1.png)
![Step 2](docs/img/pat2.png)
![Step 3](docs/img/pat3.png)

### 2. Get an AI Provider API Key

The project supports multiple AI providers. You'll need an API key from one of the supported providers:

#### OpenAI
- Sign up at [OpenAI Platform](https://platform.openai.com)
- Visit [API Keys](https://platform.openai.com/account/api-keys)
- Create a new key

![OpenAI screenshot](docs/img/openai-key.png)

Note: OpenAI provides $5 free credits for 3 months. After that, you'll need to enable billing.
Tip: Set budget limits to prevent unexpected charges.

#### DeepSeek
- Sign up at [DeepSeek](https://platform.deepseek.com)
- Generate an API key from your account settings

### 3. Start the application via Docker

#### 3.1 Docker Compose

Create a new file `docker-compose.yml` with this content:

```yaml
version: '3.3'

services:
  categorizer:
    image: ghcr.io/ameeno/firefly-iii-ai-categorize:latest
    restart: always
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data  # For persistent cache storage
    environment:
      FIREFLY_URL: "https://firefly.example.com"
      FIREFLY_PERSONAL_TOKEN: "eyabc123..."
      OPENAI_API_KEY: "sk-abc123..."  # Optional if using DeepSeek
      DEEPSEEK_API_KEY: "sk-abc123..."  # Optional if using OpenAI
      AI_PROVIDER: "openai"  # or "deepseek"
      ENABLE_UI: "true"
```

Run `docker-compose up -d`.

#### 3.2 Manually via Docker

```shell
docker run -d \
-p 3000:3000 \
-v "$(pwd)/data:/app/data" \
-e FIREFLY_URL=https://firefly.example.com \
-e FIREFLY_PERSONAL_TOKEN=eyabc123... \
-e OPENAI_API_KEY=sk-abc123... \
-e AI_PROVIDER=openai \
-e ENABLE_UI=true \
ghcr.io/ameeno/firefly-iii-ai-categorize:latest
```

### 4. Set up the webhook

After starting your container:
1. Login to Firefly III
2. Go to "Automation" > "Webhooks"
3. Click "Create new webhook"
4. Configure:
   - Title: "AI Categorizer"
   - Trigger: "After transaction creation"
   - Response: "Transaction details"
   - Delivery: "JSON"
   - URL: `http://categorizer:3000/webhook` (adjust based on your setup)

![Step 1](docs/img/webhook1.png)
![Step 2](docs/img/webhook2.png)
![Step 3](docs/img/webhook3.png)

## User Interface

The application includes a modern UI with:
- Real-time transaction queue monitoring
- Dark/Light mode toggle
- Statistics dashboard showing:
  - Total transactions processed
  - Average AI confidence
  - Database cache hits
  - Current AI provider
- Detailed transaction logs with expandable AI prompts and responses

Enable the UI by setting `ENABLE_UI=true` in your environment variables.

## Environment Variables

### Required
- `FIREFLY_URL`: Your Firefly III instance URL
- `FIREFLY_PERSONAL_TOKEN`: Firefly III Personal Access Token
- Either `OPENAI_API_KEY` or `DEEPSEEK_API_KEY`: API key for chosen AI provider

### Optional
- `AI_PROVIDER`: Choose AI provider (`openai` or `deepseek`, default: `openai`)
- `ENABLE_UI`: Enable web interface (default: `false`)
- `FIREFLY_TAG`: Custom tag for processed transactions (default: `AI categorized`)
- `PORT`: Application port (default: `3000`)
