'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useSession } from 'next-auth/react';
import { SignOutButton } from '@/components/auth/sign-out-button';

export function NavBar() {
  const { data: session, status } = useSession();

  return (
    <header className="border-b bg-white/80 backdrop-blur-sm">
      <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            PyQuest
          </h1>
        </Link>
        <div className="flex items-center space-x-4">
          <Link href="/quests">
            <Button variant="ghost">Quests</Button>
          </Link>
          <Link href="/map">
            <Button variant="ghost">Map</Button>
          </Link>
          {status === 'loading' ? (
            <div className="w-20 h-10 bg-gray-200 animate-pulse rounded" />
          ) : session ? (
            <>
              <Link href="/dashboard">
                <Button variant="ghost">Dashboard</Button>
              </Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link href="/auth/signin">
                <Button variant="outline">Sign In</Button>
              </Link>
              <Link href="/auth/signup">
                <Button variant="primary">Sign Up</Button>
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
