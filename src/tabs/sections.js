import { CalendarDays, Users, ClipboardList, MessageCircle } from "lucide-react";

/* What Coach holds. `built` is a part that is here; the rest are placeholders,
   each marked Coming soon, so the shape of the app can be judged before they
   are built. Today lives on Home (TodayCard); the other three have tabs of
   their own. */
export const SECTIONS = {
  today: { icon: CalendarDays, title: "Today", body: "Your sessions for the day, at a glance.", built: true },
  clients: { icon: Users, title: "Clients", body: "Everyone you coach, with their contact details and sessions.", built: true },
  programs: { icon: ClipboardList, title: "Programs", body: "Programs you design for your clients, with Coach IQ beside you.", built: true },
  messages: { icon: MessageCircle, title: "Messages", body: "Messages with your clients: words, pictures, videos and programs.", built: true },
};
