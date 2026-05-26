function getSelectedNumber(name) {
  const checked = document.querySelector(`input[name="${name}"]:checked`);
  return checked ? Number(checked.value) : 0;
}

function showRecoveryMessage(type, content) {
  const box = document.getElementById("recoveryMessage");
  if (!box) return;

  box.classList.remove("box-error", "box-success");

  if (type === "error") {
    box.classList.add("box-error");
  } else if (type === "success") {
    box.classList.add("box-success");
  }

  if (Array.isArray(content)) {
    box.innerHTML = content.map(function (item) {
      return `<div>${item}</div>`;
    }).join("");
  } else {
    box.textContent = content;
  }
}

function renderReasons(reasons) {
  const box = document.getElementById("reasonTags");
  if (!box) return;

  box.innerHTML = reasons.map(function (reason) {
    return `<div class="reason-chip">${reason}</div>`;
  }).join("");
}

function renderAdvice(advice) {
  const box = document.getElementById("adviceList");
  if (!box) return;

  box.innerHTML = advice.map(function (item) {
    return `<div class="advice-item">${item}</div>`;
  }).join("");
}

function renderPlan(plan) {
  document.getElementById("planMon").textContent = plan.Mon || "";
  document.getElementById("planTue").textContent = plan.Tue || "";
  document.getElementById("planWed").textContent = plan.Wed || "";
  document.getElementById("planThu").textContent = plan.Thu || "";
  document.getElementById("planFri").textContent = plan.Fri || "";
  document.getElementById("planSat").textContent = plan.Sat || "";
  document.getElementById("planSun").textContent = plan.Sun || "";
}

function renderRisk(result) {
  const dashboard = document.getElementById("riskDashboard");
  const advice = document.getElementById("recoveryAdvice");
  const plan = document.getElementById("nextWeekPlan");

  dashboard.classList.remove("hidden-section");
  advice.classList.remove("hidden-section");
  plan.classList.remove("hidden-section");

  document.getElementById("riskLevelText").textContent = result.riskLevel;
  document.getElementById("riskSummary").textContent = result.summary;

  const fill = document.getElementById("riskFill");
  fill.className = "risk-fill";

  if (result.riskLevel === "Low") {
    fill.classList.add("low");
  } else if (result.riskLevel === "Medium") {
    fill.classList.add("medium");
  } else {
    fill.classList.add("high");
  }

  renderReasons(result.reasons);
  renderAdvice(result.advice);
  renderPlan(result.weeklyPlan);
}

async function loadRecoveryHistory() {
  const historyBox = document.getElementById("historyBox");
  if (!historyBox) return;

  try {
    const response = await fetch("/api/recovery-checks");
    const data = await response.json();

    if (!response.ok) {
      historyBox.textContent = "Could not load recovery history.";
      return;
    }

    if (!Array.isArray(data) || data.length === 0) {
      historyBox.textContent = "No saved recovery check-ins yet.";
      return;
    }

    const highCount = data.filter(function (item) {
      return item.risk_level === "High";
    }).length;

    const mediumCount = data.filter(function (item) {
      return item.risk_level === "Medium";
    }).length;

    const lowCount = data.filter(function (item) {
      return item.risk_level === "Low";
    }).length;

    const summaryHtml = `
      <div class="history-summary">
        <div class="mini-stat"><strong>${data.length}</strong><span>Total checks</span></div>
        <div class="mini-stat"><strong>${lowCount}</strong><span>Low</span></div>
        <div class="mini-stat"><strong>${mediumCount}</strong><span>Medium</span></div>
        <div class="mini-stat"><strong>${highCount}</strong><span>High</span></div>
      </div>
    `;

    const cardsHtml = data.map(function (item) {
      const reasonsText = Array.isArray(item.reasons) ? item.reasons.join(", ") : "";
      return `
        <div class="history-card">
          <div class="history-card-head">
            <strong>${item.risk_level} risk</strong>
            <span class="status-pill ${item.risk_level === "High" ? "" : item.risk_level === "Medium" ? "" : "reviewed"}">${item.goal}</span>
          </div>
          <div class="history-meta">Score: ${item.risk_score} | Workout days: ${item.workout_days}</div>
          <div class="history-meta">Created: ${item.created_at}</div>
          <div class="history-meta">Main reasons: ${reasonsText || "Balanced response"}</div>
        </div>
      `;
    }).join("");

    historyBox.innerHTML = summaryHtml + `<div class="history-grid">${cardsHtml}</div>`;
  } catch (error) {
    historyBox.textContent = "Could not load recovery history.";
  }
}

function startRecoveryButtons() {
  const goAdvice = document.getElementById("goAdvice");
  const goPlan = document.getElementById("goPlan");

  if (goAdvice) {
    goAdvice.addEventListener("click", function () {
      document.getElementById("recoveryAdvice").scrollIntoView({ behavior: "smooth" });
    });
  }

  if (goPlan) {
    goPlan.addEventListener("click", function () {
      document.getElementById("nextWeekPlan").scrollIntoView({ behavior: "smooth" });
    });
  }
}

function startRecoveryForm() {
  const form = document.getElementById("recoveryForm");
  if (!form) return;

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const payload = {
      goal: document.getElementById("goalSelect").value,
      workout_days: document.getElementById("daysSelect").value,
      sleep_quality: getSelectedNumber("sleepQuality"),
      stress_level: getSelectedNumber("stressLevel"),
      soreness: getSelectedNumber("sorenessLevel"),
      energy: getSelectedNumber("energyLevel")
    };

    try {
      const response = await fetch("/api/recovery-checks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        showRecoveryMessage("error", result.errors || result.message || "Validation failed.");
        return;
      }

      showRecoveryMessage("success", "Your recovery check has been analysed and saved successfully.");
      renderRisk(result.result);
      loadRecoveryHistory();

      document.getElementById("riskDashboard").scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      showRecoveryMessage("error", "Could not connect to the server.");
    }
  });
}

document.addEventListener("DOMContentLoaded", function () {
  startRecoveryButtons();
  startRecoveryForm();
  loadRecoveryHistory();
});