import { notFound } from "next/navigation";
import LeaderboardPage from "@/components/LeaderboardPage";

interface CategoryPageProps {
  params: Promise<{
    category: string;
  }>;
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;
  
  // Validate category parameter
  if (category !== "junior" && category !== "open") {
    notFound();
  }

  return <LeaderboardPage category={category} />;
}

// Generate static params for the categories
export function generateStaticParams() {
  return [
    { category: "junior" },
    { category: "open" }
  ];
}
