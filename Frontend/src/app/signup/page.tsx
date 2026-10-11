import Link from "next/link";
import { LoginCard } from "@/components/auth/LoginCard";
import { AuthForm } from "@/components/auth/AuthForm";

export default function SignupPage() {
  return (
    <div className="dot-grid rounded-lg py-10">
      <LoginCard
        title="চলো শুরু করি! 🚀"
        subtitle="অভিভাবকের ইমেইলে অ্যাকাউন্ট খোলো — বাচ্চার নাম-ঠিকানা লাগবে না"
        footer={<Link href="/login" className="font-bold text-accent underline">আগেই অ্যাকাউন্ট আছে? সাইন ইন</Link>}
      >
        <AuthForm mode="signup" />
      </LoginCard>
    </div>
  );
}
