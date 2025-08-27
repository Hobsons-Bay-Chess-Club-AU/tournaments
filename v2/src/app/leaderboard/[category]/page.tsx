"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import LeaderboardTable from "@/components/LeaderboardTable";

export default function CategoryLeaderboardPage() {
  const params = useParams();
  const category = params?.category as string;

  // Validate category parameter
  if (category !== 'open' && category !== 'junior') {
    return (
      <div className="font-sans min-h-screen bg-gradient-to-br from-blue-50 to-blue-200 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <p className="text-red-600 mb-4">Invalid leaderboard category</p>
          <p className="text-gray-600 mb-4">Please use &apos;open&apos; or &apos;junior&apos;</p>
          <Link href="/leaderboard" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Back to Leaderboards
          </Link>
        </div>
      </div>
    );
  }

  return <LeaderboardTable type={category as 'open' | 'junior'} />;
}
