const quickLinks = [
  { term: "yoga", page: "programs.html#recovery-zone", text: "Flow and Recovery" },
  { term: "strength", page: "programs.html#strength-zone", text: "Strength Builder" },
  { term: "conditioning", page: "programs.html#hiit-zone", text: "HIIT Burn" },
  { term: "coaching", page: "programs.html#coaching-zone", text: "Personal Training" },
  { term: "membership", page: "membership.html", text: "Membership Page" },
  { term: "trainer", page: "about.html", text: "Trainer Highlights" },
  { term: "support", page: "contact.html", text: "Contact Page" },
  { term: "recovery", page: "recovery.html", text: "Recovery Check" },
  { term: "burnout", page: "recovery.html", text: "Burnout Balance Assistant" }
];

function startMenu() {
  const button = document.getElementById("menuButton");
  const rail = document.getElementById("leftRail");
  if (!button || !rail) return;
  button.addEventListener("click", function () {
    rail.classList.toggle("open");
  });
}

function showGreetingText() {
  const target = document.getElementById("welcomeText");
  if (!target) return;
  const hour = new Date().getHours();
  if (hour < 12) {
    target.textContent = "Good morning. Check the website and plan your next session.";
  } else if (hour < 18) {
    target.textContent = "Good afternoon. Explore the pages and compare the plans.";
  } else {
    target.textContent = "Good evening. Check the website and plan your next session.";
  }
}

function startTopicSearch() {
  const input = document.getElementById("topicInput");
  const button = document.getElementById("topicButton");
  const output = document.getElementById("topicOutput");
  if (!input || !button || !output) return;

  button.addEventListener("click", function () {
    const keyword = input.value.trim().toLowerCase();
    if (keyword === "") {
      output.textContent = "Please type a keyword before searching.";
      return;
    }
    const results = quickLinks.filter(function (item) {
      return item.term.includes(keyword) || item.text.toLowerCase().includes(keyword);
    });
    if (results.length === 0) {
      output.textContent = "No matching section was found.";
      return;
    }
    output.innerHTML = results.map(function (item) {
      return `<div><a href="${item.page}">${item.text}</a></div>`;
    }).join("");
  });
}

function startProgramFilter() {
  const buttons = document.querySelectorAll(".chip-button");
  const cards = document.querySelectorAll(".course-card");
  if (!buttons.length || !cards.length) return;

  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      const selected = btn.dataset.show;
      buttons.forEach(function (item) {
        item.classList.remove("chip-active");
      });
      btn.classList.add("chip-active");
      cards.forEach(function (card) {
        if (selected === "all" || card.dataset.kind === selected) {
          card.classList.remove("hidden-item");
        } else {
          card.classList.add("hidden-item");
        }
      });
    });
  });
}

function startAccordion() {
  const buttons = document.querySelectorAll(".trainer-button");
  if (!buttons.length) return;

  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      const panel = button.nextElementSibling;
      if (panel) panel.classList.toggle("open");
    });
  });
}

function clearMarks(fieldList) {
  fieldList.forEach(function (field) {
    field.classList.remove("field-error");
    field.classList.remove("field-ok");
  });
}

function markBad(field) {
  field.classList.add("field-error");
  field.classList.remove("field-ok");
}

function markGood(field) {
  field.classList.add("field-ok");
  field.classList.remove("field-error");
}

function escapeValue(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function loadSavedRequests() {
  const box = document.getElementById("savedRequests");
  if (!box) return;

  const topicFilter = document.getElementById("filterTopic");
  const statusFilter = document.getElementById("filterStatus");
  const searchInput = document.getElementById("searchRequest");

  const params = new URLSearchParams();
  if (topicFilter && topicFilter.value) params.set("topic", topicFilter.value);
  if (statusFilter && statusFilter.value) params.set("status", statusFilter.value);
  if (searchInput && searchInput.value.trim()) params.set("search", searchInput.value.trim());

  try {
    const response = await fetch(`/api/enquiries?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      box.innerHTML = "Could not load enquiries.";
      return;
    }

    if (!Array.isArray(data) || data.length === 0) {
      box.textContent = "No enquiries matched the current view.";
      return;
    }

    box.innerHTML = data.map(function (item) {
      return `
        <div class="saved-request">
          <div class="saved-request-head">
            <div>
              <strong>${escapeValue(item.full_name)}</strong>
              <span class="status-pill ${item.status === "Reviewed" ? "reviewed" : ""}">${escapeValue(item.status)}</span>
              <div class="saved-meta">${escapeValue(item.email)} | ${escapeValue(item.phone)} | ${escapeValue(item.topic)}</div>
              <div class="saved-meta">Created: ${escapeValue(item.created_at)}</div>
              <div class="saved-meta">Updated: ${escapeValue(item.updated_at)}</div>
            </div>
            <div class="saved-actions">
              ${item.status !== "Reviewed" ? `<button class="status-button" data-review-id="${item.id}">Mark Reviewed</button>` : ""}
              <button class="delete-button" data-delete-id="${item.id}">Delete</button>
            </div>
          </div>
          <div>${escapeValue(item.message)}</div>
        </div>
      `;
    }).join("");

    box.querySelectorAll("[data-review-id]").forEach(function (button) {
      button.addEventListener("click", function () {
        markReviewed(button.dataset.reviewId);
      });
    });

    box.querySelectorAll("[data-delete-id]").forEach(function (button) {
      button.addEventListener("click", function () {
        deleteEnquiry(button.dataset.deleteId);
      });
    });
  } catch (error) {
    box.innerHTML = "Could not load enquiries.";
  }
}

async function markReviewed(id) {
  const messageBox = document.getElementById("formMessage");
  try {
    const response = await fetch(`/api/enquiries/${id}/review`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" }
    });
    const result = await response.json();
    if (!response.ok) {
      messageBox.classList.remove("box-success");
      messageBox.classList.add("box-error");
      messageBox.textContent = result.message || "Could not update the enquiry.";
      return;
    }
    messageBox.classList.remove("box-error");
    messageBox.classList.add("box-success");
    messageBox.textContent = "The enquiry status has been updated successfully.";
    loadSavedRequests();
  } catch (error) {
    messageBox.classList.remove("box-success");
    messageBox.classList.add("box-error");
    messageBox.textContent = "Could not connect to the server.";
  }
}

async function deleteEnquiry(id) {
  const messageBox = document.getElementById("formMessage");
  if (!confirm("Do you want to delete this enquiry?")) return;
  try {
    const response = await fetch(`/api/enquiries/${id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) {
      messageBox.classList.remove("box-success");
      messageBox.classList.add("box-error");
      messageBox.textContent = result.message || "Could not delete the enquiry.";
      return;
    }
    messageBox.classList.remove("box-error");
    messageBox.classList.add("box-success");
    messageBox.textContent = "The enquiry was deleted successfully.";
    loadSavedRequests();
  } catch (error) {
    messageBox.classList.remove("box-success");
    messageBox.classList.add("box-error");
    messageBox.textContent = "Could not connect to the server.";
  }
}

function startFilterControls() {
  const applyButton = document.getElementById("applyFilters");
  const resetButton = document.getElementById("resetFilters");
  const searchInput = document.getElementById("searchRequest");
  const topicFilter = document.getElementById("filterTopic");
  const statusFilter = document.getElementById("filterStatus");

  if (!applyButton || !resetButton || !searchInput || !topicFilter || !statusFilter) return;

  applyButton.addEventListener("click", function () {
    loadSavedRequests();
  });

  resetButton.addEventListener("click", function () {
    searchInput.value = "";
    topicFilter.value = "";
    statusFilter.value = "";
    loadSavedRequests();
  });
}

function startContactForm() {
  const form = document.getElementById("contactRequestForm");
  const messageBox = document.getElementById("formMessage");
  if (!form || !messageBox) return;

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const nameField = document.getElementById("visitorName");
    const emailField = document.getElementById("visitorEmail");
    const phoneField = document.getElementById("visitorPhone");
    const topicField = document.getElementById("visitorTopic");
    const messageField = document.getElementById("visitorMessage");

    const allFields = [nameField, emailField, phoneField, topicField, messageField];
    const errors = [];

    messageBox.classList.remove("box-error", "box-success");
    clearMarks(allFields);

    if (!nameField.value.trim()) {
      errors.push("Full name is required.");
      markBad(nameField);
    } else if (nameField.value.trim().length < 2) {
      errors.push("Full name must be at least 2 characters.");
      markBad(nameField);
    } else {
      markGood(nameField);
    }

    if (!emailField.value.trim()) {
      errors.push("Email is required.");
      markBad(emailField);
    } else {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(emailField.value.trim())) {
        errors.push("Please enter a valid email address.");
        markBad(emailField);
      } else {
        markGood(emailField);
      }
    }

    if (!phoneField.value.trim()) {
      errors.push("Phone number is required.");
      markBad(phoneField);
    } else {
      const digitsOnly = /^\d+$/;
      if (!digitsOnly.test(phoneField.value.trim())) {
        errors.push("Phone number must contain digits only.");
        markBad(phoneField);
      } else if (phoneField.value.trim().length > 10) {
        errors.push("Phone number must not be more than 10 digits.");
        markBad(phoneField);
      } else if (phoneField.value.trim().length < 8) {
        errors.push("Phone number should be at least 8 digits.");
        markBad(phoneField);
      } else {
        markGood(phoneField);
      }
    }

    if (!topicField.value.trim()) {
      errors.push("Please choose a topic.");
      markBad(topicField);
    } else {
      markGood(topicField);
    }

    if (!messageField.value.trim()) {
      errors.push("Message is required.");
      markBad(messageField);
    } else if (messageField.value.trim().length < 10) {
      errors.push("Message should be at least 10 characters.");
      markBad(messageField);
    } else {
      markGood(messageField);
    }

    if (errors.length > 0) {
      messageBox.classList.add("box-error");
      messageBox.innerHTML = errors.map(function (item) {
        return `<div>${item}</div>`;
      }).join("");
      return;
    }

    try {
      const response = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: nameField.value.trim(),
          email: emailField.value.trim(),
          phone: phoneField.value.trim(),
          topic: topicField.value.trim(),
          message: messageField.value.trim()
        })
      });

      const result = await response.json();

      if (!response.ok) {
        messageBox.classList.add("box-error");
        messageBox.innerHTML = Array.isArray(result.errors)
          ? result.errors.map(function (item) { return `<div>${item}</div>`; }).join("")
          : (result.message || "Your enquiry could not be saved.");
        return;
      }

      messageBox.classList.add("box-success");
      messageBox.textContent = "Your enquiry was saved successfully in the website database.";
      form.reset();
      clearMarks(allFields);
      loadSavedRequests();
    } catch (error) {
      messageBox.classList.add("box-error");
      messageBox.textContent = "Could not connect to the server.";
    }
  });
}

document.addEventListener("DOMContentLoaded", function () {
  startMenu();
  showGreetingText();
  startTopicSearch();
  startProgramFilter();
  startAccordion();
  startContactForm();
  startFilterControls();
  loadSavedRequests();
});
