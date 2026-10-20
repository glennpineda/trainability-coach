# Prompts for Studio: programs by subscription

Written in Coach (20 Oct 2026) for Glenn to give, one at a time, to a
Trainability Studio session. Each is one piece of work and one pull request
there, in this order: each one leans on the ones before it. The plan they
serve is in Coach's BRAINSTORM.md, Ideas, **Programs by subscription**.

Coach's side of each (the queue, the approval, sending) is built in Coach
once Studio's is in. Nothing here changes Coach's repository.

What every prompt assumes, and Studio's own notes already say (its
BRAINSTORM, Ideas, "Coach app"): Coach is a separate app at
trainabilitycoach.com with its own database. Trainability's trainers sign in
to it with their Studio account (it relays /api/auth to Studio). Trainers
outside the team have **Coach accounts**, kept in Coach, and must never reach
Studio's schedule, clients or money. The two apps link "through an API with
scoped keys, not a shared database".

---

## 1. A key for Coach to call Studio with

> Coach (glennpineda/trainability-coach, trainabilitycoach.com) needs to call
> Studio's API from its server, not only with a signed-in trainer's cookie,
> for what follows: a queue of program requests from members, sending an
> approved program to a member, and crediting the trainer. Its trainers
> outside the team (Coach accounts) have no Studio session at all.
>
> Please add a scoped server-to-server key for Coach: a secret Coach sends in
> a header, set in Studio's environment (DEPLOYMENT.md) and in Coach's, that
> opens only the routes made for Coach (a `/api/coach/…` prefix, say) and
> nothing else, never staff or client routes. Each call says which trainer it
> is for: a Studio user id for a team trainer, or a Coach account's id and
> name for an outside one, which Studio keeps as text and never treats as a
> user of its own. Log every call. Refuse everything when the key isn't set.
>
> While you are there, one of Coach's open questions: every sign-in Coach
> relays arrives from Coach's server, so Studio's per-address limit on failed
> sign-ins is shared by everybody signing in to Coach. With the key, Studio
> could trust `X-Forwarded-For` from Coach alone. Say whether that is worth
> doing now.
>
> Check Studio first for anything like this already. Ask me before choosing
> the header's name or anything that needs a new id prefix.

## 2. A monthly program plan for members

> I want to sell members a monthly subscription: up to 2 workout programs a
> month, written by a trainer in Coach (our coaching app) and delivered to
> them in Studio. Studio sells and bills it; Coach never touches money.
>
> Copy the billing of the business's own memberships (server/own-memberships.js:
> a plan with a price and how often it is charged, the card stored here
> charged on the day, tries again 3, 5 and 7 days after a failed charge with
> the member written to each time, cancelling at the close of the paid
> period, nothing refunded), as its own kind of plan, not a gym membership:
> it must work at places the CRM bills memberships at too, as Studio already
> bills those members for sessions and the Store.
>
> - A master sets the plan: its name, price and how many programs a month
>   (2 to start).
> - A member subscribes and cancels on /me, with their card; the desk can do
>   both for them.
> - Each billing month gives them that many requests; unused ones don't carry
>   over. (Tell me if you think they should.)
> - It shows wherever a member's memberships and payments show, on their
>   profile, and in Payments and Analytics.
>
> Before building, ask me: the price, whether the allowance runs by billing
> month or calendar month, what happens if a program isn't delivered in time
> (a refund, or the request given back), tax, and the id prefix for the new
> records. Test it as master, admin, staff and client, and with the regression
> suite on my Mac before it is merged: it is money.

## 3. Asking for a program on /me, and the queue Coach reads

> With a program plan (the last PR), a member asks for each program on /me:
> a **Request a program** button, which opens a short form, one question at a
> time like the kiosk's sign-up (src/kiosk/Register.jsx). The answers are the
> ones Coach's own steps ask a trainer (Coach's server/programs.js), so Coach
> can build from them; send the keys, show the labels:
>
> - **What should it focus on?** (one) strength "Strength", muscle "Muscle
>   size", power "Power", cardio "Cardio and fat loss", endurance "Strength
>   endurance", balance "Balance and stability", mobility "Mobility", general
>   "General fitness".
> - **Anything else to work on?** (any, optional) legs "Legs and glutes",
>   upper "Upper body", core "Core", balance "Balance and stability", posture
>   "Posture", conditioning "Conditioning".
> - **How many days a week?** 1 to 6.
> - **How long can you train each time?** 30, 45, 60, 75 or 90 minutes.
> - **Where will you train?** One of our places (theirs first), or at home or
>   elsewhere, with what equipment they have there.
> - **Anything your trainer should know?** Injuries, conditions, what they
>   enjoy or don't. Free text, optional.
> - **A trainer you'd like?** Optional, any trainer who does programs;
>   otherwise whoever takes it.
>
> Each request uses one of the month's allowance, and says so; with none left
> it says when the next comes. The member sees their requests and where each
> one is (Asked, Being written, Ready).
>
> For Coach, through the key (prompt 1): list the open requests (oldest
> first, with the member's first name, age, sex as Studio has it, the
> answers, and anything they signed about their health), take one (one
> trainer only; it goes back to the queue if nothing is sent in 5 days, or
> whatever you think right), and give one back. A trainer outside the team
> sees nothing of a member beyond what the request carries.
>
> Which trainers may take requests: a setting per trainer, kept by a master.
> Ask me before anything that needs an id prefix.

## 4. Programs on /me, sent from Coach

> Trainers write programs in Coach. A program for a client they train in
> Studio, or for a member's request (the last PR), needs to reach the person
> in Studio. Please add, through the key (prompt 1):
>
> - **Coach sends a program** for a Studio client or member: its name, who
>   wrote it, who reviewed and approved it and when, and its days as Coach
>   keeps a sent copy (server/messages.js `programAttachment` there: each
>   day's name and notes, its warm-up and cool-down by name and dose, and its
>   exercises with sets, reps, load, effort, tempo, rest, technique, note and
>   the muscles they work). Studio keeps it as sent; a later send is a new
>   version, the old kept. Sending one for a request marks it Ready.
> - **A Programs tab on /me**: their programs, newest first, each opening
>   day by day, printable; *Written by Alex, reviewed Oct 20*. Coach has the
>   printed page's look already (Coach's src/programs/PrintProgram.jsx), to
>   copy.
> - **Telling them**: a text or an email, by their communication choices,
>   when a program is ready, with a link to /me.
>
> Only the person it is for, and staff who may see their profile, ever see
> it. MANUAL-CLIENT.md gets the tab; Billy on /me may answer from it.

## 5. Paying the trainer for each program

> When Coach sends a program written for a member's request (prompt 4), the
> trainer who wrote it earns a fee, set by a master (one fee, or one per
> trainer).
>
> - **A team trainer**: credited on their balance ledger
>   (server/balance-ledger.js), as their other money is, with the request and
>   the member named.
> - **A trainer outside the team** (a Coach account): not yet. Keep what each
>   has earned, and show it to a master to settle by hand, until prompt 6.
>
> Ask me the fee first.

## 6. Later: paying trainers outside the team

> Phase two of programs by subscription. Trainers outside the team (Coach
> accounts) write programs for our members and are owed a fee for each
> (prompt 5 keeps the tally). Pay them through Stripe Connect: each sets up
> their own payout account (Express?) from Coach, linked through the key, and
> is paid on a schedule from what they are owed. Studio's own Connect is
> per place (server/payments-stripe.js, Standard Connect); say whether this
> belongs on the same platform account or another, and what tax forms it
> brings. Don't build until we have talked it through.
