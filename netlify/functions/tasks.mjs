import { getDatabase } from "@netlify/database";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export default async (req, context) => {
  const rawId = context.params?.id;
  const id = rawId === undefined ? null : Number(rawId);
  if (rawId !== undefined && !Number.isInteger(id)) {
    return json({ error: "Not found." }, 404);
  }

  try {
    const db = getDatabase();

    if (id === null) {
      if (req.method === "GET") {
        const rows = await db.sql`
          SELECT id, title, is_done FROM tasks ORDER BY created_at, id`;
        return json(rows);
      }

      if (req.method === "POST") {
        const data = await req.json().catch(() => ({}));
        const title = String(data.title ?? "").trim();
        if (!title) return json({ error: "Task title is required." }, 400);
        if (title.length > 255)
          return json({ error: "Task title must be 255 characters or fewer." }, 400);

        const [row] = await db.sql`
          INSERT INTO tasks (title) VALUES (${title}) RETURNING id`;
        return json({ id: row.id, title, is_done: false }, 201);
      }
    } else {
      if (req.method === "PATCH") {
        const data = await req.json().catch(() => ({}));
        if (!("is_done" in data)) return json({ error: "is_done is required." }, 400);
        const isDone = Boolean(data.is_done);
        await db.sql`UPDATE tasks SET is_done = ${isDone} WHERE id = ${id}`;
        return json({ id, is_done: isDone });
      }

      if (req.method === "DELETE") {
        await db.sql`DELETE FROM tasks WHERE id = ${id}`;
        return json({ deleted: id });
      }
    }

    return json({ error: "Method not allowed." }, 405);
  } catch (err) {
    console.error(err);
    return json({ error: "Server error." }, 500);
  }
};

export const config = { path: ["/api/tasks", "/api/tasks/:id"] };
