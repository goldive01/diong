# Diong Repository Instructions

## Project

Diong is a commercial personal-development social web application.

Diong helps users:

- read structured daily Prime Protocols;
- take small actions toward their goals;
- create and track goals;
- build habits and consistency;
- write private journal entries;
- measure streaks and progress;
- share selected progress with a supportive community;
- access planners, trackers, short guides and eBooks;
- receive personalised AI-supported content in a later release.

## Technical Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Supabase PostgreSQL
- Supabase Authentication
- Supabase Storage
- Stripe later
- Resend later
- Vercel deployment

## Development Rules

1. Inspect the existing project before editing files.
2. Create a plan before implementing any substantial feature.
3. Work on only the requested phase.
4. Do not build unrequested future features.
5. Do not introduce mock APIs when a simple local data structure is sufficient.
6. Never expose secrets or service-role keys in browser code.
7. Use TypeScript strict typing.
8. Avoid the `any` type unless clearly justified.
9. Use reusable components rather than oversized page files.
10. Prefer Server Components unless client-side interactivity is required.
11. Add `"use client"` only where necessary.
12. Use semantic and accessible HTML.
13. Build mobile-first responsive interfaces.
14. Avoid unsupported medical, neurological or scientific claims.
15. Do not claim that Diong rewires, reprograms or guarantees changes to the brain.
16. Describe Prime Protocols as tools for attention, reflection, motivation, habits and purposeful action.
17. Do not create fake testimonials, fake reviews, fake user totals or fake success statistics.
18. Run lint and production build after meaningful implementation work.
19. Fix errors before declaring a task complete.
20. Explain the files changed and any manual actions still required.
21. Do not delete working code without explaining why.
22. Preserve existing functionality unless the requested feature requires a deliberate change.
23. Keep commits and feature phases small enough to review.
24. Do not install unnecessary dependencies.
25. Never modify SiteTrack or any project outside this Diong repository.

## Product Identity

Name: Diong

Primary tagline: Prime your mind. Act on your goals. Become more.

Brand personality:

- calm;
- purposeful;
- intelligent;
- encouraging;
- modern;
- trustworthy;
- inclusive;
- action-oriented.

Avoid creating an interface that feels like:

- a generic quote website;
- a medical treatment product;
- a loud motivational poster;
- a clone of Instagram;
- a cryptocurrency project;
- a mystical or supernatural product.

## Prime Protocol Structure

Every Prime Protocol can contain:

- title;
- category;
- purpose;
- best time;
- prime text;
- action trigger;
- tomorrow's expectation;
- reflection prompt.
