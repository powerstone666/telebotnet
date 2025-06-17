// src/lib/types.ts

export interface BotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username: string;
  can_join_groups: boolean;
  can_read_all_group_messages: boolean;
  supports_inline_queries: boolean;
}

export interface StoredToken {
  id: string;
  token: string;
  botInfo?: BotInfo;
  webhookStatus: 'set' | 'unset' | 'failed' | 'unknown' | 'checking';
  lastWebhookSetAttempt?: string;
  lastActivity?: string;
  isCurrentWebhook?: boolean;
}

export interface TelegramUser {
  id: number; // This is the user_id
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface TelegramChatPermissions {
  can_send_messages?: boolean;
  can_send_media_messages?: boolean; 
  can_send_audios?: boolean;
  can_send_documents?: boolean;
  can_send_photos?: boolean;
  can_send_videos?: boolean;
  can_send_video_notes?: boolean;
  can_send_voice_notes?: boolean;
  can_send_polls?: boolean;
  can_send_other_messages?: boolean;
  can_add_web_page_previews?: boolean;
  can_change_info?: boolean;
  can_invite_users?: boolean;
  can_pin_messages?: boolean;
  can_manage_topics?: boolean;
}

export interface TelegramChat {
  id: number; // This is the chat_id (can be user_id for private, or group/channel id)
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string; 
  last_name?: string; 
  is_forum?: boolean;
  description?: string;
  invite_link?: string;
  permissions?: TelegramChatPermissions;
  photo?: { 
    small_file_id: string;
    small_file_unique_id: string;
    big_file_id: string;
    big_file_unique_id: string;
  };
}


export interface TelegramMessageEntity {
  type:
    | 'mention'
    | 'hashtag'
    | 'cashtag'
    | 'bot_command'
    | 'url'
    | 'email'
    | 'phone_number'
    | 'bold'
    | 'italic'
    | 'underline'
    | 'strikethrough'
    | 'spoiler'
    | 'code'
    | 'pre'
    | 'text_link'
    | 'text_mention'
    | 'custom_emoji';
  offset: number;
  length: number;
  url?: string;
  user?: TelegramUser;
  language?: string;
  custom_emoji_id?: string;
}


export interface TelegramPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

export interface TelegramVideo {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  duration: number;
  thumb?: TelegramPhotoSize;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramDocument {
  file_id: string;
  file_unique_id: string;
  thumb?: TelegramPhotoSize;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser; // Optional: For messages sent by users or bots
  sender_chat?: TelegramChat; // Optional: For messages sent by channels
  date: number; // Unix timestamp
  chat: TelegramChat;
  forward_from?: TelegramUser;
  forward_from_chat?: TelegramChat;
  forward_from_message_id?: number;
  forward_signature?: string;
  forward_sender_name?: string;
  forward_date?: number;
  is_topic_message?: boolean;
  is_automatic_forward?: boolean;
  reply_to_message?: TelegramMessage;
  via_bot?: TelegramUser;
  edit_date?: number;
  has_protected_content?: boolean;
  media_group_id?: string;
  author_signature?: string;
  text?: string;
  entities?: TelegramMessageEntity[];
  // caption_entities?: MessageEntity[]; // Not explicitly used yet
  // audio?: Audio;
  document?: TelegramDocument;
  photo?: TelegramPhotoSize[];
  // sticker?: Sticker;
  video?: TelegramVideo;
  // video_note?: VideoNote;
  // voice?: Voice;
  caption?: string;
  // contact?: Contact;
  // dice?: Dice;
  // game?: Game;
  // poll?: Poll;
  // venue?: Venue;
  // location?: Location;
  // new_chat_members?: User[];
  // left_chat_member?: User;
  // new_chat_title?: string;
  // new_chat_photo?: PhotoSize[];
  // delete_chat_photo?: true;
  // group_chat_created?: true;
  // supergroup_chat_created?: true;
  // channel_chat_created?: true;
  // message_auto_delete_timer_changed?: MessageAutoDeleteTimerChanged;
  // migrate_to_chat_id?: number;
  // migrate_from_chat_id?: number;
  // pinned_message?: Message;
  // invoice?: Invoice;
  // successful_payment?: SuccessfulPayment;
  // connected_website?: string;
  // passport_data?: PassportData;
  // proximity_alert_triggered?: ProximityAlertTriggered;
  // forum_topic_created?: ForumTopicCreated;
  // forum_topic_edited?: ForumTopicEdited;
  // forum_topic_closed?: ForumTopicClosed;
  // forum_topic_reopened?: ForumTopicReopened;
  // general_forum_topic_hidden?: GeneralForumTopicHidden;
  // general_forum_topic_unhidden?: GeneralForumTopicUnhidden;
  // write_access_allowed?: WriteAccessAllowed;
  // reply_markup?: InlineKeyboardMarkup; // For inline keyboards

  // Custom fields for UI state / context, not part of Telegram API for this object directly
  sourceTokenId?: string; // ID of the bot token that received/sent this message
  botUsername?: string;   // Username of the bot associated with sourceTokenId
  userId?: number;        // Extracted User ID from 'from' or other relevant field
  chatId?: number;        // Extracted Chat ID from 'chat'
  isGroupMessage?: boolean;// True if chat.type is group or supergroup
  isLoading?: boolean;      // For UI purposes, e.g., when fetching details
  error?: string;         // For UI purposes, to show errors related to this message
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  channel_post?: TelegramMessage;
  edited_channel_post?: TelegramMessage;
  // Other update types can be added here (inline_query, chosen_inline_result, callback_query, etc.)

  // Custom fields for UI state / context, added during processing (e.g., in webhook or SSE handler)
  sourceTokenId?: string; // ID of the bot token that received this update
  botUsername?: string;   // Username of the bot associated with sourceTokenId
  userId?: number;        // Extracted User ID from the update content (e.g., message.from.id)
  chatId?: number;        // Extracted Chat ID from the update content (e.g., message.chat.id)
  isGroupMessage?: boolean;// True if the message is from a group or supergroup
}

// This specific type is for data coming through SSE, which is essentially a TelegramUpdate with context
// It was previously named UpdateWithContext, but TelegramUpdate now serves this purpose by including optional context fields.
// If a more distinct type is ever needed for SSE that differs significantly, it can be redefined.
// For now, using TelegramUpdate for SSE data is appropriate as it already has the necessary optional fields.

export interface ApiResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export type ChatMemberStatus =
  | 'creator'
  | 'administrator'
  | 'member'
  | 'restricted'
  | 'left'
  | 'kicked';

export interface ChatAdministratorRights {
  is_anonymous: boolean;
  can_manage_chat: boolean;
  can_delete_messages: boolean;
  can_manage_video_chats: boolean;
  can_restrict_members: boolean;
  can_promote_members: boolean;
  can_change_info: boolean;
  can_invite_users: boolean;
  can_post_messages?: boolean;
  can_edit_messages?: boolean;
  can_pin_messages?: boolean;
  can_manage_topics?: boolean;
}

export interface BaseChatMember {
  user: TelegramUser;
  status: ChatMemberStatus;
}

export interface ChatMemberOwner extends BaseChatMember {
  status: 'creator';
  is_anonymous: boolean;
  custom_title?: string;
}

export interface ChatMemberAdministrator extends BaseChatMember {
  status: 'administrator';
  can_be_edited: boolean;
  is_anonymous: boolean;
  can_manage_chat: boolean;
  can_delete_messages: boolean;
  can_manage_video_chats: boolean;
  can_restrict_members: boolean;
  can_promote_members: boolean;
  can_change_info: boolean;
  can_invite_users: boolean;
  can_post_messages?: boolean;
  can_edit_messages?: boolean;
  can_pin_messages?: boolean;
  can_manage_topics?: boolean;
  custom_title?: string;
}

export interface ChatMemberMember extends BaseChatMember {
  status: 'member';
}

export interface ChatMemberRestricted extends BaseChatMember {
  status: 'restricted';
  is_member: boolean;
  can_send_messages: boolean;
  can_send_audios: boolean;
  can_send_documents: boolean;
  can_send_photos: boolean;
  can_send_videos: boolean;
  can_send_video_notes: boolean;
  can_send_voice_notes: boolean;
  can_send_polls: boolean;
  can_send_other_messages: boolean;
  can_add_web_page_previews: boolean;
  can_change_info: boolean;
  can_invite_users: boolean;
  can_pin_messages: boolean;
  can_manage_topics: boolean;
  until_date: number; 
}

export interface ChatMemberLeft extends BaseChatMember {
  status: 'left';
}

export interface ChatMemberBanned extends BaseChatMember {
  status: 'kicked';
  until_date: number; 
}

export type ChatMember =
  | ChatMemberOwner
  | ChatMemberAdministrator
  | ChatMemberMember
  | ChatMemberRestricted
  | ChatMemberLeft
  | ChatMemberBanned;

export interface ChatUserInfoFormData {
  tokenId: string;
  targetId: string;
  secondaryId?: string; 
  operation: 'getChat' | 'getChatMember' | 'getChatAdministrators';
}

export interface BotCommand {
  command: string;
  description: string;
}
