
"use client";

import { useState, useEffect } from 'react';
import type { TelegramUser, TelegramMessage } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

// Helper hook for sessionStorage to manage users
function useSessionStorageUsers(key: string, initialValue: TelegramUser[]) {
  const [storedValue, setStoredValue] = useState<TelegramUser[]>(initialValue);

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

  const setValue = (value: TelegramUser[] | ((val: TelegramUser[]) => TelegramUser[])) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      const uniqueUsers = Array.from(new Map(valueToStore.map(user => [user.id, user])).values());
      setStoredValue(uniqueUsers);
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(key, JSON.stringify(uniqueUsers));
      }
    } catch (error) { console.error(`Error setting ${key} in sessionStorage:`, error); }
  };
  return [storedValue, setValue] as const;
}

function getInitials(name: string = ""): string {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function UsersPage() {
  const [users, setUsers] = useSessionStorageUsers('telematrix_users', []);
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
          if (message.from) {
            setUsers(prevUsers => {
              const existingUser = prevUsers.find(u => u.id === message.from!.id);
              if (!existingUser) {
                return [...prevUsers, message.from!];
              }
              // Optionally update existing user data if message.from has newer info
              return prevUsers.map(u => u.id === message.from!.id ? {...u, ...message.from} : u);
            });
          }
        } catch (e) { console.error("Error processing user from storage event", e); }
      }
    };

    window.addEventListener('storage', handleNewMessageEvent);
    return () => window.removeEventListener('storage', handleNewMessageEvent);
  }, [setUsers, hasMounted]);


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-bold tracking-tight">User Information</h1>
        <p className="text-muted-foreground">
          Displays unique users encountered through bot interactions. Data is stored in session storage.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Encountered Users {hasMounted ? `(${users.length})` : ''}</CardTitle>
          <CardDescription>List of users your bots have interacted with. Updated via "Get Updates" or webhook events.</CardDescription>
        </CardHeader>
        <CardContent>
          {!hasMounted ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">No users recorded yet. Use "Get Updates" or ensure your bots receive messages to populate this list.</p>
          ) : (
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Avatar</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(user => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Avatar className="h-9 w-9">
                          <AvatarFallback>{getInitials(`${user.first_name} ${user.last_name || ''}`)}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">{`${user.first_name} ${user.last_name || ''}`.trim()}</TableCell>
                      <TableCell>{user.username ? `@${user.username}` : 'N/A'}</TableCell>
                      <TableCell>{user.id}</TableCell>
                      <TableCell>{user.language_code || 'N/A'}</TableCell>
                      <TableCell>
                        {user.is_premium && <Badge variant="outline" className="border-yellow-500 text-yellow-600 mr-1">Premium</Badge>}
                        {user.is_bot && <Badge variant="secondary">Bot</Badge>}
                        {!user.is_premium && !user.is_bot && <Badge variant="outline">User</Badge>}
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
