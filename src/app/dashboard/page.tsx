import { redirect } from 'next/navigation';

export default function DashboardPage() {
  // Redirect to token-management as the default dashboard page
  redirect('/dashboard/token-management');
}
