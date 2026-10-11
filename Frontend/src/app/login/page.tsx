import Link from "next/link";
import { LoginCard } from "@/components/auth/LoginCard";
import { AuthForm } from "@/components/auth/AuthForm";

export default function LoginPage() {
  return (
    <div className="dot-grid rounded-lg py-10">
      <LoginCard
        title="ফিরে এলে! 👋"
        subtitle="সাইন ইন করে শেখা চালিয়ে যাও"
        footer={<Link href="/signup" className="font-bold text-accent underline">অ্যাকাউন্ট নেই? নতুন খোলো</Link>}
      >
        <AuthForm mode="login" />
      </LoginCard>
    </div>
  );
}
