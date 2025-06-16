"use client";

import { useState, useEffect } from 'react';
import type { TelegramChat, TelegramMessage } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Users, Link as LinkIcon, Lock, ShieldCheck, MessageSquareDashed } from 'lucide-react';

// Helper hook for sessionStorage to manage groups
function useSessionStorageGroups(key: string, initialValue: TelegramChat[]) {
  const [storedValue, setStoredValue] = useState<TelegramChat[]>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.sessionStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) { console.error(error); return initialValue; }
  });

  const setValue = (value: TelegramChat[] | ((val: TelegramChat[]) => TelegramChat[])) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      const uniqueGroups = Array.from(new Map(valueToStore.map(chat => [chat.id, chat])).values());
      setStoredValue(uniqueGroups);
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(key, JSON.stringify(uniqueGroups));
      }
    } catch (error) { console.error(error); }
  };
  return [storedValue, setValue] as const;
}

export default function GroupsPage() {
  const [groups, setGroups] = useSessionStorageGroups('telematrix_groups', []);

  useEffect(() => {
    const handleNewMessageEvent = (event: StorageEvent) => {
      if (event.key === 'telematrix_new_webhook_message' && event.newValue) {
        try {
          const message = JSON.parse(event.newValue) as TelegramMessage;
          if (message.chat && message.chat.type !== 'private') { // Only add groups/channels
            setGroups(prevGroups => {
              const existingGroup = prevGroups.find(g => g.id === message.chat.id);
              if (!existingGroup) {
                return [...prevGroups, message.chat];
              }
              // Optionally update existing group if new data is more complete
              return prevGroups;
            });
          }
        } catch (e) { console.error("Error processing group from storage event", e); }
      }
    };

    window.addEventListener('storage', handleNewMessageEvent);
    return () => window.removeEventListener('storage', handleNewMessageEvent);
  }, [setGroups]);

  const getPermissionString = (permissions?: TelegramChatPermissions): string => {
    if (!permissions) return 'N/A';
    const count = Object.values(permissions).filter(p => p === true).length;
    return `${count} permissions active`; // Simple count, can be more detailed
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
          <CardTitle>Encountered Groups/Channels ({groups.length})</CardTitle>
          <CardDescription>List of groups and channels your bots are part of or have received messages from.</CardDescription>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">No groups or channels recorded yet. Ensure your bots are in groups/channels or receive messages from them.</p>
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
                    <TableHead>Permissions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map(chat => (
                    <TableRow key={chat.id}>
                      <TableCell className="capitalize flex items-center gap-2">
                        <ChatTypeIcon type={chat.type}/>
                        {chat.type}
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
                        <Badge variant="outline">{getPermissionString(chat.permissions)}</Badge>
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
