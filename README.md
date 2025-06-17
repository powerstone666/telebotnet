# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

# TeleBotNet: Telegram C2C Control & Command Dashboard

TeleBotNet is a comprehensive Next.js web application designed to provide a centralized dashboard for managing and interacting with multiple Telegram bots. It offers a suite of tools for bot configuration, message handling, and direct bot control, making it an ideal solution for users who manage several bots or require advanced interaction capabilities.

## Key Features

### 1. Centralized Bot Management

*   **Token Management:** Securely add, store, and manage API tokens for multiple Telegram bots. The dashboard fetches and displays essential bot information (username, ID, capabilities) associated with each token.
*   **Webhook Control:** Easily set, unset, and check the status of webhooks for your bots directly from the interface, crucial for receiving real-time updates.
*   **Bot Overview:** Quickly see which bot tokens are active and their current webhook status.

### 2. Comprehensive Message Handling & Logging

*   **Real-time Message Log:** A central log displays incoming and (where applicable) outgoing messages for all managed bots.
*   **Detailed Message View:** Each message card shows:
    *   Sender information (name, username, user ID).
    *   Chat details (title, chat ID, description).
    *   Timestamps (sent and edited dates).
    *   Full message text content.
    *   Previews and information for media (photos, documents, videos).
    *   Indication of the bot that processed/received the message.
*   **Media Support:**
    *   View image previews directly in the log.
    *   Get details for documents and videos.
    *   Download media attachments (photos, documents, videos) if the bot token used to fetch the message is known.
*   **Message Interaction (Contextual):**
    *   **Reply:** Quickly reply to messages from users (sent via a selected bot).
    *   **Edit:** Edit text messages previously sent by your bots.
    *   **Delete:** Delete messages sent by your bots.
*   **Efficient Browsing:**
    *   Virtualized list rendering ensures smooth performance even with thousands of messages.
    *   Search and filter messages by keywords, chat ID, user ID, or bot username.
    *   Skeleton loaders provide a better UX during message loading.

### 3. Interactive Bot Control & Information Retrieval

*   **Send Messages:** Compose and send various types of messages through any of your configured bots:
    *   Text messages (with optional Markdown/HTML formatting).
    *   Photos (with captions).
    *   Documents (with captions).
    *   Videos (with captions).
*   **Bot Command Management:**
    *   View the current list of custom commands registered for a bot.
    *   Set new commands or update existing ones (providing command name and description in JSON format).
    *   Delete all custom commands for a bot.
*   **Chat & User Information Lookup:**
    *   Fetch detailed information about any Telegram user or chat (group/channel) using its ID or username.
    *   Get details about a specific member within a chat.
    *   Retrieve a list of administrators for a given chat.

### 4. User-Friendly Interface & Experience

*   **Intuitive Dashboard:** A clean and organized Next.js interface with server components and actions for a modern, fast experience.
*   **Persistent Bot List:** Bot tokens are stored locally in the browser for convenience.
*   **Persistent Message Cache:** Messages are cached in `localStorage` (with a 1-day expiry) to reduce redundant API calls and improve loading speed on subsequent visits.
*   **Responsive Design:** The interface is designed to be usable across various screen sizes, including mobile devices.
*   **Search & Filtering:** Robust search and filtering options are available for:
    *   **Bots:** On Token Management, Bot Settings, Chat/User Info, and Send Message pages, filter bots by their ID, username, display name, or even parts of their token.
    *   **Messages:** In the Message Log, filter messages by content, user ID, chat ID, or bot username.
*   **Loading States:** Skeleton loaders and spinners are used to indicate data fetching and processing, improving perceived performance.
*   **Toast Notifications:** Clear feedback for actions (success, error, warnings) is provided via toast notifications.

## Getting Started

(Instructions for setup, development, and deployment would typically go here. Since this is a project in progress, this section is a placeholder.)

1.  Clone the repository.
2.  Install dependencies: `npm install`
3.  Set up environment variables (e.g., for Firebase if used, or any other backend services).
4.  Run the development server: `npm run dev`

## Technology Stack

*   **Frontend:** Next.js (React), TypeScript, Tailwind CSS, Shadcn/UI
*   **State Management:** React Hooks, Zustand (implied by `useStoredTokens` and similar patterns for local storage interaction)
*   **Telegram API Interaction:** Direct HTTPS calls via server actions.
*   **Data Persistence (Client-side):** Browser `localStorage` for bot tokens and message cache.

This README provides an overview of TeleBotNet's capabilities as a Telegram bot control and command center. It aims to simplify bot management and enhance interaction possibilities for Telegram bot administrators and developers.
