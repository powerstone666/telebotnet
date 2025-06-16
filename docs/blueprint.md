# **App Name**: TeleMatrix

## Core Features:

- Token Management: Allows the user to input and store Telegram bot tokens locally using the browser's localStorage.
- Navigation Menu: Provides a navigation menu for accessing different sections of the dashboard, such as Token Management, Webhook Operations, Get Updates, Message Log, and File Downloads.
- Webhook Operations: Enables users to set or delete webhooks for multiple selected tokens, using backend routes /api/setWebhook and /api/deleteWebhook with a fixed webhook URL.
- Get Updates Mode: Allows users to fetch updates for selected tokens using the /api/getUpdates route and displays the messages in a session-based log.
- Webhook Message Logging: Logs messages received from Telegram updates via /api/webhook, storing details like username, text, file info, and mentions in sessionStorage, and displays them in the Message Log. Also lets users know from which Telegram bot webhook messages are coming.
- File Handling: Provides a download button for files (documents, photos, videos) included in Telegram messages, fetching the file using getFile and serving it for download.
- Bot Info Lookup: Automatically fetch and display basic bot info like bot username, is_bot, can_join_groups, etc., for each added token.
- Token Status Table: Maintain a dynamic table with: Whether webhook is set, unset, or failed, Timestamp of last webhook setup attempt, Last successful message received or update fetched
- Auto-Refresh Bot Info: Option to auto-refresh token info every X seconds (for active monitoring)
- User Info Extraction: When a message is received, show: Full user profile: user_id, username, first_name, language_code, is_premium, Save to sessionStorage or a tab called “Users”
- Group/Chat Info Extraction: If the bot is in a group or supergroup: Extract and display chat.id, title, type, invite_link, and permissions, Tab: “Groups” – shows all unique groups the bot has interacted with
- Send Message UI: Interface to input chat_id, message, and token, Optional: Markdown toggle or reply_to_message_id
- Reply to Specific Messages: In "Messages Log", each message has a Reply button, Opens a modal to send a reply using reply_to_message_id

## Style Guidelines:

- Primary color: Midnight Blue (#2C3E50) for a professional and calm interface.
- Background color: Light Gray (#F0F4F8), offering a clean, non-distracting backdrop.
- Accent color: Teal (#3498DB), used for interactive elements and call-to-action buttons, providing contrast and signaling interactivity.
- Body text: 'Inter', a sans-serif font for a modern and neutral reading experience.
- Headline font: 'Space Grotesk', a sans-serif font for headlines and short amounts of body text. If longer text is anticipated, use 'Inter' for body
- Use a set of consistent, minimalist icons from a library like FontAwesome or Material Icons.
- Responsive grid layout optimized for both desktop and mobile screens. Utilizes clear section divisions with subtle shadows.