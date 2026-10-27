const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export default async (req, context) => {
  try {
    const { neon } = await import("@netlify/neon");
    const sql = neon();

    const rawId = context.params?.id;
    const id = rawId === undefined ? null : Number(rawId);

    if (id === null) {
      if (req.method === "GET") {
        const rows = await sql`
          SELECT id, title, is_done FROM tasks ORDER BY created_at, id`;
        return json(rows);
      }
      if (req.method === "POST") {
        const data = await req.json().catch(() => ({}));
        const title = String(data.title ?? "").trim();
        if (!title) return json({ error: "Task title is required." }, 400);
        const [row] = await sql`
          INSERT INTO tasks (title) VALUES (${title}) RETURNING id`;
        return json({ id: row.id, title, is_done: false }, 201);
      }
    } else {
      if (req.method === "PATCH") {
        const data = await req.json().catch(() => ({}));
        const isDone = Boolean(data.is_done);
        await sql`UPDATE tasks SET is_done = ${isDone} WHERE id = ${id}`;
        return json({ id, is_done: isDone });
      }
      if (req.method === "DELETE") {
        await sql`DELETE FROM tasks WHERE id = ${id}`;
        return json({ deleted: id });
      }
    }
    return json({ error: "Method not allowed." }, 405);
  } catch (err) {
    console.error(err);
    // TEMPORARY: show the real error so we can see what's wrong
    return json({ error: "DEBUG: " + err.message }, 500);
  }
};

export const config = { path: ["/api/tasks", "/api/tasks/:id"] };