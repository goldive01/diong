import Link from "next/link";
import { LegalPage } from "@/src/components/legal/legal-page";

export const metadata = {
  title: "Privacy Notice",
  description:
    "How Diong handles your account, profile, Daily Prime and Connections data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Notice" updated="10 September 2026">
      <p>
        This notice explains, in plain terms, what information Diong holds when
        you use the product and how it is used. Diong is an early-release
        personal-development web application. This notice will be expanded, and a
        dedicated contact and data-request route added, before general
        availability.
      </p>

      <h2>Information Diong holds</h2>
      <ul>
        <li>
          <strong>Account.</strong> Your email address and authentication
          details, managed by Supabase Authentication.
        </li>
        <li>
          <strong>Profile.</strong> Your username, display name and an optional
          short bio.
        </li>
        <li>
          <strong>Onboarding interests.</strong> The growth areas you select so
          Diong can choose relevant Prime content.
        </li>
        <li>
          <strong>Daily Prime activity.</strong> Which Prime you were assigned
          each day, whether you completed its Action Trigger, and the optional
          reflection you write.
        </li>
        <li>
          <strong>Connections.</strong> The people you choose to track — their
          name, type and purpose as you record them, an optional contact rhythm,
          your optional private notes, and the interactions you log.
        </li>
        <li>
          <strong>Social graph.</strong> The Diong accounts you follow, the
          accounts that follow you, and the accounts you have blocked.
        </li>
      </ul>

      <h2>How your information is used</h2>
      <p>
        Your information is used only to operate Diong for you: to assign your
        Daily Prime, show your history and progress, and surface the connections
        that may be worth revisiting. Diong does not sell your information and
        does not use it for advertising.
      </p>

      <h2>What is private and what is visible</h2>
      <ul>
        <li>
          Your Daily Prime reflections, your Connections and your private
          connection notes are visible only to you. They are never shown
          publicly or to other users.
        </li>
        <li>
          Your profile — display name, username, optional bio and your interest
          names — is visible to other signed-in Diong users on your profile
          page, along with your follower and following counts and lists.
        </li>
        <li>
          The accounts you have blocked are visible only to you. Blocking an
          account removes any follow between you in either direction and prevents
          a new one; a blocked account cannot open your profile.
        </li>
      </ul>

      <h2>Infrastructure</h2>
      <p>
        Diong uses Supabase for authentication, database storage and file
        storage, and Vercel for application hosting. Your data is processed on
        those services in order to run Diong.
      </p>

      <h2>Retention</h2>
      <p>
        Your information is kept for as long as your account exists so the
        product continues to work for you. Account deletion will be available
        from your settings; until then you can ask for your account to be closed
        through the route added before general availability.
      </p>

      <h2>Changes to this notice</h2>
      <p>
        If this notice changes in a material way, the &ldquo;last updated&rdquo;
        date above will change and, where appropriate, you will be told inside
        the app.
      </p>

      <p>
        See also the{" "}
        <Link href="/terms">Terms of Use</Link>.
      </p>
    </LegalPage>
  );
}
