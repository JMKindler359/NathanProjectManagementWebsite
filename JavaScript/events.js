const DAY_ABBREVIATIONS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function pad(n) {
    return String(n).padStart(2, "0");
}

// Local date -> "2026-10-24" (avoids timezone shifts from toISOString)
function toDateString(date) {
    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
}

function parseDateString(str) {
    const [y, m, d] = str.split("-").map(Number);
    return new Date(y, m - 1, d);
}

// "14:30" -> "2:30 PM" (empty string if no time was set)
function formatTime(time) {
    if (!time) return "";
    let [h, m] = time.split(":").map(Number);
    const suffix = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return h + ":" + pad(m) + " " + suffix;
}

// ---------- API helpers ----------

async function fetchEvents(startStr, endStr) {
    const response = await fetch("/api/events?start=" + startStr + "&end=" + endStr);
    if (!response.ok) throw new Error("Could not load events");
    return response.json();
}

async function removeEvent(id) {
    const response = await fetch("/api/events/" + id, { method: "DELETE" });
    if (!response.ok) throw new Error("Could not delete event");
}

// ---------- Add-event popup (same markup on both pages) ----------

const eventDialog = document.getElementById("event-dialog");
const eventForm = document.getElementById("event-form");
const eventTitleInput = document.getElementById("event-title");
const eventDateInput = document.getElementById("event-date");
const eventTimeInput = document.getElementById("event-time");
const eventError = document.getElementById("event-error");
const eventCancel = document.getElementById("event-cancel");

let afterEventSaved = () => {};

function openEventDialog(dateStr) {
    eventForm.reset();
    eventError.textContent = "";
    eventDateInput.value = dateStr || toDateString(new Date());
    eventDialog.showModal();
    eventTitleInput.focus();
}

eventCancel.addEventListener("click", () => eventDialog.close());

// Clicking the dark area outside the box closes it
eventDialog.addEventListener("click", (event) => {
    if (event.target === eventDialog) eventDialog.close();
});

eventForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const title = eventTitleInput.value.trim();
    const date = eventDateInput.value;
    const time = eventTimeInput.value; // "" if left blank

    if (title === "") {
        eventError.textContent = "Please enter a title.";
        return;
    }
    if (date === "") {
        eventError.textContent = "Please choose a date.";
        return;
    }

    try {
        const response = await fetch("/api/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: title, date: date, time: time || null }),
        });
        const data = await response.json();
        if (!response.ok) {
            eventError.textContent = data.error || "Could not save the event.";
            return;
        }
        eventDialog.close();
        afterEventSaved();
    } catch (err) {
        eventError.textContent = "Could not reach the server. Is app.py running?";
    }
});

document.getElementById("add-event-button").addEventListener("click", () => {
    openEventDialog();
});

// ---------- Dashboard: "Coming up this week" (index.html) ----------

const upcomingList = document.getElementById("upcoming-list");

async function loadWeek() {
    const today = new Date();
    // Week runs Sunday through Saturday, matching the calendar
    const sunday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
    const saturday = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + 6);

    try {
        const events = await fetchEvents(toDateString(sunday), toDateString(saturday));
        upcomingList.innerHTML = "";

        if (events.length === 0) {
            const empty = document.createElement("li");
            empty.className = "upcoming-empty";
            empty.textContent = "Nothing scheduled this week.";
            upcomingList.appendChild(empty);
            return;
        }

        events.forEach((ev) => {
            const date = parseDateString(ev.event_date);

            const li = document.createElement("li");

            const dateBox = document.createElement("div");
            dateBox.className = "upcoming-date";
            const dayName = document.createElement("span");
            dayName.textContent = DAY_ABBREVIATIONS[date.getDay()];
            const dayNumber = document.createElement("strong");
            dayNumber.textContent = date.getDate();
            dateBox.append(dayName, dayNumber);

            const details = document.createElement("div");
            details.className = "upcoming-details";
            const heading = document.createElement("h3");
            heading.textContent = ev.title;
            const time = document.createElement("p");
            time.textContent = ev.event_time ? formatTime(ev.event_time) : "All day";
            details.append(heading, time);

            const del = document.createElement("button");
            del.type = "button";
            del.className = "event-delete";
            del.setAttribute("aria-label", "Delete " + ev.title);
            del.textContent = "\u00D7";
            del.addEventListener("click", async () => {
                if (!confirm('Delete "' + ev.title + '"?')) return;
                try {
                    await removeEvent(ev.id);
                    loadWeek();
                } catch (err) {
                    alert("Could not delete the event. Please try again.");
                }
            });

            li.append(dateBox, details, del);
            upcomingList.appendChild(li);
        });
    } catch (err) {
        upcomingList.innerHTML = "<li class=\"upcoming-empty\">Could not load events.</li>";
    }
}

if (upcomingList) {
    afterEventSaved = loadWeek;
    loadWeek();
}

// ---------- Calendar page (calendar.html) ----------

const calendarGrid = document.getElementById("calendar-grid");
const calendarTitle = document.getElementById("calendar-title");

let viewYear = new Date().getFullYear();
let viewMonth = new Date().getMonth(); // 0-11

async function loadMonth() {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const leadingDays = firstOfMonth.getDay();
    const rows = Math.ceil((leadingDays + daysInMonth) / 7);
    const totalCells = rows * 7;

    const gridStart = new Date(viewYear, viewMonth, 1 - leadingDays);
    const gridEnd = new Date(viewYear, viewMonth, 1 - leadingDays + totalCells - 1);

    calendarTitle.textContent = firstOfMonth.toLocaleString("en-US", {
        month: "long",
        year: "numeric",
    });

    let events = [];
    try {
        events = await fetchEvents(toDateString(gridStart), toDateString(gridEnd));
    } catch (err) {
        alert("Could not load events. Is app.py running?");
    }

    // Group events by date
    const byDate = {};
    events.forEach((ev) => {
        (byDate[ev.event_date] = byDate[ev.event_date] || []).push(ev);
    });

    // Remove old day cells (keep the Sun-Sat headers)
    calendarGrid.querySelectorAll(".calendar-day").forEach((cell) => cell.remove());

    const todayStr = toDateString(new Date());

    for (let i = 0; i < totalCells; i++) {
        const cellDate = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
        const dateStr = toDateString(cellDate);

        const cell = document.createElement("div");
        cell.className = "calendar-day";
        if (cellDate.getMonth() !== viewMonth) cell.classList.add("muted");
        if (dateStr === todayStr) cell.classList.add("today");

        const number = document.createElement("span");
        number.textContent = cellDate.getDate();
        cell.appendChild(number);

        (byDate[dateStr] || []).forEach((ev) => {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "calendar-event";
            chip.textContent = (ev.event_time ? formatTime(ev.event_time) + " " : "") + ev.title;
            chip.title = "Click to delete";
            chip.addEventListener("click", async (e) => {
                e.stopPropagation(); // don't also open the add popup
                if (!confirm('Delete "' + ev.title + '"?')) return;
                try {
                    await removeEvent(ev.id);
                    loadMonth();
                } catch (err) {
                    alert("Could not delete the event. Please try again.");
                }
            });
            cell.appendChild(chip);
        });

        // Clicking an empty part of a day opens the popup with that date filled in
        cell.addEventListener("click", () => openEventDialog(dateStr));

        calendarGrid.appendChild(cell);
    }
}

function changeMonth(delta) {
    viewMonth += delta;
    if (viewMonth < 0) {
        viewMonth = 11;
        viewYear--;
    } else if (viewMonth > 11) {
        viewMonth = 0;
        viewYear++;
    }
    loadMonth();
}

if (calendarGrid) {
    document.getElementById("prev-month").addEventListener("click", () => changeMonth(-1));
    document.getElementById("next-month").addEventListener("click", () => changeMonth(1));
    afterEventSaved = loadMonth;
    loadMonth();
}