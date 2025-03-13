import Link from "next/link";

export default function Home() {
  return (
    <div className="bg-red-200">
      <Link href="samplePage">
        My URL
      </Link>
    </div>
  );
}
