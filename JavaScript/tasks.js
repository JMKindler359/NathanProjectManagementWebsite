const todoList = document.getElementById("todo-list");
const addTaskButton = document.getElementById("add-task-button");

function renderTask(task) {
    const li = document.createElement("li");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = "task" + task.id;
    checkbox.checked = task.is_done;

    const label = document.createElement("label");
    label.htmlFor = checkbox.id;
    label.textContent = task.title; // textContent keeps user input safe

    checkbox.addEventListener("change", async () => {
        try {
            const response = await fetch("/api/tasks/" + task.id, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ is_done: checkbox.checked }),
            });
            if (!response.ok) throw new Error();
        } catch (err) {
            checkbox.checked = !checkbox.checked;
            alert("Could not update the task. Please try again.");
        }
    });

    li.append(checkbox, label);
    todoList.appendChild(li);
}

async function loadTasks() {
    try {
        const response = await fetch("/api/tasks");
        if (!response.ok) throw new Error();
        const tasks = await response.json();
        todoList.innerHTML = "";
        tasks.forEach(renderTask);
    } catch (err) {
        todoList.innerHTML = "<li>Could not load tasks.</li>";
    }
}

addTaskButton.addEventListener("click", async () => {
    const title = prompt("What is the task?");

    // null = Cancel was pressed; empty = nothing typed
    if (title === null || title.trim() === "") return;

    try {
        const response = await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: title.trim() }),
        });
        const data = await response.json();
        if (!response.ok) {
            alert(data.error || "Could not save the task.");
            return;
        }
        renderTask(data);
    } catch (err) {
        alert("Could not reach the server. Is app.py running?");
    }
});

loadTasks();