import { CalendarDays, Users, ClipboardList, MessageCircle } from "lucide-react";

/* What Coach will hold. Placeholders for now, each marked Coming soon, so the
   shape of the app can be judged before any of it is built. Today lives on
   Home; the other three have tabs of their own. */
export const SECTIONS = {
  today: { icon: CalendarDays, title: "Today", body: "Your sessions for the day, at a glance." },
  clients: { icon: Users, title: "Clients", body: "Everyone you coach, with their goals and progress." },
  programs: { icon: ClipboardList, title: "Programs", body: "Workouts and plans you build and assign." },
  messages: { icon: MessageCircle, title: "Messages", body: "Check-ins and notes between you and your clients." },
};
