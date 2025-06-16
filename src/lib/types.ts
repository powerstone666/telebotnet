
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
  id: number;
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
  id: number;
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

export interface TelegramDocument {
  file_id: string;
  file_unique_id: string;
  thumbnail?: TelegramPhotoSize;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramVideo {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  duration: number;
  thumbnail?: TelegramPhotoSize;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  sender_chat?: TelegramChat;
  date: number; 
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
  document?: TelegramDocument;
  photo?: TelegramPhotoSize[];
  video?: TelegramVideo;
  caption?: string;
  caption_entities?: TelegramMessageEntity[];
  sourceTokenId?: string; 
  botUsername?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  channel_post?: TelegramMessage;
  edited_channel_post?: TelegramMessage;
}

export interface WebhookInfo {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  ip_address?: string;
  last_error_date?: number;
  last_error_message?: string;
  last_synchronization_error_date?: number;
  max_connections?: number;
  allowed_updates?: string[];
}

export type MessageType = 'Text' | 'Photo' | 'Document' | 'Video';

export interface SendMessageFormData {
  tokenId: string;
  chatId: string;
  messageType: MessageType;
  text?: string; // Used for text message or caption for media
  mediaFile?: File;
  replyToMessageId?: string;
  parseMode?: 'MarkdownV2' | 'HTML' | 'Markdown';
}

export interface WebhookOperationParams {
  tokenIds: string[];
  webhookUrl?: string;
}

export interface GetUpdatesParams {
  tokenIds: string[];
}

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
