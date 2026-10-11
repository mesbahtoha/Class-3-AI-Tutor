import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function ForbiddenPage() {
  return (
    <div className="grid place-items-center py-20 text-center">
      <div>
        <p className="font-display text-6xl font-extrabold">🚫</p>
        <h1 className="mt-2 font-display text-2xl font-extrabold">এই পাতাটা তোমার জন্য নয়</h1>
        <p className="text-mutedfg">অন্য অ্যাকাউন্টে সাইন ইন করে আবার চেষ্টা করো।</p>
        <Link href="/" className="mt-4 inline-block"><Button variant="secondary">হোমে যাও</Button></Link>
      </div>
    </div>
  );
}
