
"use client";

import { useState, useEffect } from 'react';
import type { TelegramChat, TelegramMessage, TelegramChatPermissions } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Users, Link as LinkIcon, Lock, ShieldCheck, MessageSquareDashed, Loader2 } from 'lucide-react';

// Helper hook for sessionStorage to manage groups
function useSessionStorageGroups(key: string, initialValue: TelegramChat[]) {
  const [storedValue, setStoredValue] = useState<TelegramChat[]>(initialValue);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const item = window.sessionStorage.getItem(key);
        if (item) {
           const parsedItem = JSON.parse(item);
           if (Array.isArray(parsedItem)) {
            setStoredValue(parsedItem);
           } else {
            setStoredValue(initialValue);
           }
        } else {
          setStoredValue(initialValue); // Ensure initialValue is set if item is null
        }
      } catch (error) {
        console.error(`Error reading ${key} from sessionStorage:`, error);
        setStoredValue(initialValue);
      }
    }
  }, [key, initialValue]);

  const setValue = (value: TelegramChat[] | ((val: TelegramChat[]) => TelegramChat[])) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      const uniqueGroups = Array.from(new Map(valueToStore.map(chat => [chat.id, chat])).values());
      setStoredValue(uniqueGroups);
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(key, JSON.stringify(uniqueGroups));
      }
    } catch (error) { console.error(`Error setting ${key} in sessionStorage:`, error); }
  };
  return [storedValue, setValue] as const;
}

export default function GroupsPage() {
  const [groups, setGroups] = useSessionStorageGroups('telematrix_groups', []);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return; // Only run storage listener after mount

    const handleNewMessageEvent = (event: StorageEvent) => {
      if (event.key === 'telematrix_new_webhook_message' && event.newValue) {
        try {
          const message = JSON.parse(event.newValue) as TelegramMessage;
          if (message.chat && message.chat.type !== 'private') {
            setGroups(prevGroups => {
              const existingGroup = prevGroups.find(g => g.id === message.chat.id);
              if (!existingGroup) {
                return [...prevGroups, message.chat];
              }
               // Optionally update existing group data if message.chat has newer info
              return prevGroups.map(g => g.id === message.chat.id ? {...g, ...message.chat} : g);
            });
          }
        } catch (e) { console.error("Error processing group from storage event", e); }
      }
    };

    window.addEventListener('storage', handleNewMessageEvent);
    return () => window.removeEventListener('storage', handleNewMessageEvent);
  }, [setGroups, hasMounted]);

  const getPermissionString = (permissions?: TelegramChatPermissions): string => {
    if (!permissions) return 'N/A';
    const activePermissions = Object.entries(permissions)
      .filter(([_, value]) => value === true)
      .map(([key]) => key.replace('can_', '').replace(/_/g, ' '));
    
    if (activePermissions.length === 0) return 'No specific permissions';
    if (activePermissions.length > 3) return `${activePermissions.length} permissions active`;
    return activePermissions.join(', ');
  };

  const ChatTypeIcon = ({type}: {type: TelegramChat['type']}) => {
    switch(type) {
        case 'group': return <Users className="h-4 w-4 text-blue-500" />;
        case 'supergroup': return <ShieldCheck className="h-4 w-4 text-green-500" />;
        case 'channel': return <MessageSquareDashed className="h-4 w-4 text-purple-500" />;
        default: return <Users className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tight">Group & Channel Information</h1>
        <p className="text-muted-foreground">
          Displays unique groups and channels your bots have interacted with. Data is stored in session storage.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Encountered Groups/Channels {hasMounted ? `(${groups.length})` : ''}</CardTitle>
          <CardDescription>List of groups and channels your bots are part of or have received messages from. Updated via "Get Updates" or webhook events.</CardDescription>
        </CardHeader>
        <CardContent>
          {!hasMounted ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Loading groups...</p>
            </div>
          ) : groups.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">No groups or channels recorded yet. Use "Get Updates" or ensure your bots are in groups/channels or receive messages from them.</p>
          ) : (
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Chat ID</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Invite Link</TableHead>
                    <TableHead>Permissions Summary</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map(chat => (
                    <TableRow key={chat.id}>
                      <TableCell className="capitalize flex items-center gap-2">
                        <ChatTypeIcon type={chat.type}/>
                        {chat.type.replace('_', ' ')}
                      </TableCell>
                      <TableCell className="font-medium">{chat.title || 'N/A'}</TableCell>
                      <TableCell>{chat.id}</TableCell>
                      <TableCell>{chat.username ? `@${chat.username}` : 'N/A'}</TableCell>
                      <TableCell>
                        {chat.invite_link ? (
                          <a href={chat.invite_link} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline flex items-center">
                            <LinkIcon className="h-3 w-3 mr-1" /> Link
                          </a>
                        ) : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="whitespace-normal text-xs">
                           {getPermissionString(chat.permissions)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
