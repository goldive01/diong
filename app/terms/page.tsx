import Link from "next/link";
import { LegalPage } from "@/src/components/legal/legal-page";

export const metadata = {
  title: "Terms of Use",
  description: "The terms that apply when you use Diong.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" updated="10 September 2026">
      <p>
        These terms apply when you use Diong. By creating an account or using the
        product you agree to them. Diong is an early-release product and these
        terms may be updated as it develops.
      </p>

      <h2>Using Diong</h2>
      <p>
        Diong gives you a structured daily practice — a Prime, an Action Trigger,
        a short reflection, a personal history and progress view, and a private
        space for the connections that matter to your growth. You may use it for
        your own personal development.
      </p>

      <h2>Your account</h2>
      <p>
        You are responsible for activity on your account and for keeping your
        sign-in details secure. Accounts are for individual people. Tell us
        promptly if you believe your account has been accessed without your
        permission.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Use Diong lawfully and for its intended purpose.</li>
        <li>
          Do not attempt to access other users&rsquo; accounts or data, probe
          the service&rsquo;s security, or disrupt its operation.
        </li>
        <li>
          Do not upload content into your profile or notes that is unlawful or
          infringes someone else&rsquo;s rights.
        </li>
      </ul>

      <h2>Nature of the service</h2>
      <p>
        Diong is an informational self-development tool. Its Prime Protocols are
        prompts for attention, reflection, motivation, habits and purposeful
        action. Diong does not provide medical, psychological, financial or other
        professional advice, and it does not promise any particular outcome.
        Decisions you make remain your own.
      </p>

      <h2>Your content</h2>
      <p>
        You keep ownership of the text you write — your bio, reflections and
        connection notes. You grant Diong the permission needed to store that
        content and show it back to you so the product can function.
      </p>

      <h2>Diong&rsquo;s content</h2>
      <p>
        The Prime Protocol content, the Diong name, the interface design and the
        application code belong to Diong and are provided for your personal use
        within the product.
      </p>

      <h2>Availability and changes</h2>
      <p>
        Diong is provided on an &ldquo;as is&rdquo; and &ldquo;as
        available&rdquo; basis. Features may be added, changed or removed, and
        the service may be unavailable at times, including for maintenance.
      </p>

      <h2>Suspension and termination</h2>
      <p>
        Diong may suspend or close an account that breaches these terms or that
        is used in a way that harms the service or other users. You may stop
        using Diong and request account closure at any time.
      </p>

      <h2>Limitation</h2>
      <p>
        To the extent permitted by law, Diong is not liable for indirect or
        consequential loss arising from your use of the service, and its total
        liability is limited to what you have paid to use Diong, if anything.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        If these terms change in a material way, the &ldquo;last updated&rdquo;
        date above will change and, where appropriate, you will be told inside
        the app.
      </p>

      <p>
        See also the{" "}
        <Link href="/privacy">Privacy Notice</Link>.
      </p>
    </LegalPage>
  );
}
