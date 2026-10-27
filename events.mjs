import { neon } from "@netlify/neon";

const sql = neon();

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const validDate = (v) =>
  typeof v === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(Date.parse(v + "T00:00:00Z")) &&
  new Date(v + "T00:00:00Z").toISOString().slice(0, 10) === v;

const validTime = (v) =>
  typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

export default async (req, context) => {
  const rawId = context.params?.id;
  const id = rawId === undefined ? null : Number(rawId);
  if (rawId !== undefined && !Number.isInteger(id)) {
    return json({ error: "Not found." }, 404);
  }

  try {
    if (id === null) {
      if (req.method === "GET") {
        const url = new URL(req.url);
        const start = url.searchParams.get("start");
        const end = url.searchParams.get("end");
        if (!validDate(start) || !validDate(end)) {
          return json({ error: "start and end must be dates like 2026-10-24." }, 400);
        }
        const rows = await sql`
          SELECT id, title,
                 to_char(event_date, 'YYYY-MM-DD') AS event_date,
                 to_char(event_time, 'HH24:MI')    AS event_time
          FROM events
          WHERE event_date BETWEEN ${start}::date AND ${end}::date
          ORDER BY event_date, event_time, id`;
        return json(rows);
      }

      if (req.method === "POST") {
        const data = await req.json().catch(() => ({}));
        const title = String(data.title ?? "").trim();
        const eventDate = data.date;
        const eventTime = data.time || null;

        if (!title) return json({ error: "Event title is required." }, 400);
        if (title.length > 255)
          return json({ error: "Event title must be 255 characters or fewer." }, 400);
        if (!validDate(eventDate)) return json({ error: "Please choose a valid date." }, 400);
        if (eventTime !== null && !validTime(eventTime))
          return json({ error: "Please choose a valid time." }, 400);

        const [row] = await sql`
          INSERT INTO events (title, event_date, event_time)
          VALUES (${title}, ${eventDate}::date, ${eventTime}::time)
          RETURNING id`;
        return json(
          { id: row.id, title, event_date: eventDate, event_time: eventTime },
          201
        );
      }
    } else if (req.method === "DELETE") {
      await sql`DELETE FROM events WHERE id = ${id}`;
      return json({ deleted: id });
    }

    return json({ error: "Method not allowed." }, 405);
  } catch (err) {
    console.error(err);
    return json({ error: "Server error." }, 500);
  }
};

export const config = { path: ["/api/events", "/api/events/:id"] };
