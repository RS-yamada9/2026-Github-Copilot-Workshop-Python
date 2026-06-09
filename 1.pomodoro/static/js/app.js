(() => {
  const STORAGE_KEY = "pomodoro.gamified.v1";
  const XP_PER_COMPLETION = 25;
  const XP_PER_LEVEL = 100;
  const RING_CIRCUMFERENCE = 327;
  const BADGES = [
    {
      id: "streak-3",
      title: "3日連続",
      description: "3日連続でポモドーロを完了する",
      icon: "🔥",
      isUnlocked: (analytics) => analytics.streak >= 3,
    },
    {
      id: "weekly-10",
      title: "今週10回完了",
      description: "直近7日間で10回以上完了する",
      icon: "📅",
      isUnlocked: (analytics) => analytics.weekly.completedCount >= 10,
    },
    {
      id: "monthly-20",
      title: "月間20回完了",
      description: "直近30日間で20回以上完了する",
      icon: "🏅",
      isUnlocked: (analytics) => analytics.monthly.completedCount >= 20,
    },
    {
      id: "level-5",
      title: "レベル5到達",
      description: "獲得XPでレベル5に到達する",
      icon: "⭐",
      isUnlocked: (analytics) => analytics.level >= 5,
    },
    {
      id: "focus-600",
      title: "集中マスター",
      description: "直近30日間の集中時間が600分を超える",
      icon: "🧠",
      isUnlocked: (analytics) => analytics.monthly.focusMinutes >= 600,
    },
  ];

  const elements = {
    workMinutes: document.getElementById("work-minutes"),
    breakMinutes: document.getElementById("break-minutes"),
    startButton: document.getElementById("start-button"),
    pauseButton: document.getElementById("pause-button"),
    resetButton: document.getElementById("reset-button"),
    timeRemaining: document.getElementById("time-remaining"),
    modeLabel: document.getElementById("mode-label"),
    timerStatus: document.getElementById("timer-status"),
    sessionMessage: document.getElementById("session-message"),
    progressRing: document.getElementById("progress-ring"),
    levelValue: document.getElementById("level-value"),
    xpValue: document.getElementById("xp-value"),
    xpProgress: document.getElementById("xp-progress"),
    streakValue: document.getElementById("streak-value"),
    badgeCount: document.getElementById("badge-count"),
    badgeList: document.getElementById("badge-list"),
    todayCompletions: document.getElementById("today-completions"),
    todayFocus: document.getElementById("today-focus"),
    weeklyRate: document.getElementById("weekly-rate"),
    weeklyAverage: document.getElementById("weekly-average"),
    monthlyRate: document.getElementById("monthly-rate"),
    monthlyAverage: document.getElementById("monthly-average"),
    totalCompletions: document.getElementById("total-completions"),
    nextLevel: document.getElementById("next-level"),
    weeklyChart: document.getElementById("weekly-chart"),
    monthlyChart: document.getElementById("monthly-chart"),
  };

  let intervalId = null;
  let state = loadState();

  bindEvents();
  syncTimerFromClock();
  render();

  function createTimer(mode, minutes) {
    const totalSeconds = minutesToSeconds(minutes);
    return {
      mode,
      status: "idle",
      remainingSeconds: totalSeconds,
      totalSeconds,
      expectedEndAt: null,
    };
  }

  function createDefaultState() {
    return {
      settings: {
        workMinutes: 25,
        breakMinutes: 5,
      },
      timer: createTimer("work", 25),
      attempts: [],
      activeAttemptId: null,
    };
  }

  function sanitizeNumber(value, fallback, min, max) {
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }
    return Math.min(max, Math.max(min, parsed));
  }

  function normalizeState(value) {
    const defaults = createDefaultState();
    const settings = value?.settings || {};
    const timer = value?.timer || defaults.timer;
    const workMinutes = sanitizeNumber(settings.workMinutes, defaults.settings.workMinutes, 0.05, 120);
    const breakMinutes = sanitizeNumber(settings.breakMinutes, defaults.settings.breakMinutes, 0.05, 60);
    const totalSeconds = Math.max(1, Math.round(Number(timer.totalSeconds || minutesToSeconds(workMinutes))));
    const remainingSeconds = Math.min(
      totalSeconds,
      Math.max(0, Math.round(Number(timer.remainingSeconds ?? totalSeconds))),
    );

    return {
      settings: {
        workMinutes,
        breakMinutes,
      },
      timer: {
        mode: timer.mode === "break" ? "break" : "work",
        status: ["idle", "running", "paused"].includes(timer.status) ? timer.status : "idle",
        remainingSeconds,
        totalSeconds,
        expectedEndAt: Number.isFinite(Number(timer.expectedEndAt)) ? Number(timer.expectedEndAt) : null,
      },
      attempts: Array.isArray(value?.attempts)
        ? value.attempts
            .filter((attempt) => attempt && attempt.id && attempt.startedAt)
            .map((attempt) => ({
              id: String(attempt.id),
              startedAt: String(attempt.startedAt),
              completedAt: attempt.completedAt ? String(attempt.completedAt) : null,
              durationMinutes: sanitizeNumber(attempt.durationMinutes, workMinutes, 0.05, 120),
              completed: Boolean(attempt.completed),
            }))
            .slice(-365)
        : [],
      activeAttemptId: value?.activeAttemptId ? String(value.activeAttemptId) : null,
    };
  }

  function loadState() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? normalizeState(JSON.parse(raw)) : createDefaultState();
    } catch (error) {
      return createDefaultState();
    }
  }

  function saveState() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      elements.sessionMessage.textContent = "ブラウザ保存が利用できないため、このセッションは一時的にのみ保持されます。";
    }
  }

  function bindEvents() {
    elements.startButton.addEventListener("click", startTimer);
    elements.pauseButton.addEventListener("click", pauseTimer);
    elements.resetButton.addEventListener("click", resetTimer);
    elements.workMinutes.addEventListener("change", applySettings);
    elements.breakMinutes.addEventListener("change", applySettings);
  }

  function applySettings() {
    state.settings.workMinutes = sanitizeNumber(elements.workMinutes.value, state.settings.workMinutes, 0.05, 120);
    state.settings.breakMinutes = sanitizeNumber(elements.breakMinutes.value, state.settings.breakMinutes, 0.05, 60);
    elements.workMinutes.value = state.settings.workMinutes;
    elements.breakMinutes.value = state.settings.breakMinutes;

    if (state.timer.status === "idle") {
      const targetMinutes = state.timer.mode === "work" ? state.settings.workMinutes : state.settings.breakMinutes;
      state.timer = createTimer(state.timer.mode, targetMinutes);
    }

    saveState();
    render();
  }

  function startTimer() {
    applySettings();
    if (state.timer.status === "running") {
      return;
    }

    if (state.timer.mode === "work" && state.timer.status === "idle") {
      const attemptId = generateAttemptId();
      state.attempts.push({
        id: attemptId,
        startedAt: new Date().toISOString(),
        completedAt: null,
        durationMinutes: state.settings.workMinutes,
        completed: false,
      });
      state.activeAttemptId = attemptId;
    }

    state.timer.status = "running";
    state.timer.expectedEndAt = Date.now() + state.timer.remainingSeconds * 1000;
    startInterval();
    saveState();
    render();
  }

  function pauseTimer() {
    if (state.timer.status !== "running") {
      return;
    }

    updateRemainingSeconds();
    state.timer.status = "paused";
    state.timer.expectedEndAt = null;
    stopInterval();
    saveState();
    render();
  }

  function resetTimer() {
    stopInterval();
    const mode = "work";
    state.timer = createTimer(mode, state.settings.workMinutes);
    state.activeAttemptId = null;
    saveState();
    render();
  }

  function syncTimerFromClock() {
    if (state.timer.status !== "running" || !state.timer.expectedEndAt) {
      return;
    }

    updateRemainingSeconds();
    if (state.timer.remainingSeconds === 0) {
      completeCurrentSession();
      return;
    }
    startInterval();
  }

  function startInterval() {
    stopInterval();
    intervalId = window.setInterval(() => {
      updateRemainingSeconds();
      renderTimer();

      if (state.timer.remainingSeconds === 0) {
        completeCurrentSession();
      }
    }, 250);
  }

  function stopInterval() {
    if (intervalId) {
      window.clearInterval(intervalId);
      intervalId = null;
    }
  }

  function updateRemainingSeconds() {
    if (!state.timer.expectedEndAt) {
      return;
    }

    const remaining = Math.max(0, Math.ceil((state.timer.expectedEndAt - Date.now()) / 1000));
    state.timer.remainingSeconds = remaining;
  }

  function completeCurrentSession() {
    stopInterval();

    if (state.timer.mode === "work") {
      completeWorkAttempt();
      state.timer = createTimer("break", state.settings.breakMinutes);
      elements.sessionMessage.textContent = "ポモドーロ完了！ 25XPを獲得し、休憩セッションへ切り替えました。";
    } else {
      state.timer = createTimer("work", state.settings.workMinutes);
      elements.sessionMessage.textContent = "休憩完了！ 次のポモドーロを始めましょう。";
    }

    saveState();
    render();
  }

  function completeWorkAttempt() {
    const activeAttempt = state.attempts.find((attempt) => attempt.id === state.activeAttemptId);
    const completedAt = new Date().toISOString();

    if (activeAttempt) {
      activeAttempt.completed = true;
      activeAttempt.completedAt = completedAt;
      activeAttempt.durationMinutes = state.settings.workMinutes;
    } else {
      state.attempts.push({
        id: generateAttemptId("recovered"),
        startedAt: completedAt,
        completedAt,
        durationMinutes: state.settings.workMinutes,
        completed: true,
      });
    }

    state.activeAttemptId = null;
    state.attempts = state.attempts.slice(-365);
  }

  function buildAnalytics() {
    const completedAttempts = state.attempts.filter((attempt) => attempt.completed && attempt.completedAt);
    const todayKey = formatDateKey(new Date());
    const weekly = summarizeRange(7, completedAttempts, state.attempts);
    const monthly = summarizeRange(30, completedAttempts, state.attempts);
    const todaySummary = completedAttempts.reduce(
      (summary, attempt) => {
        if (formatDateKey(new Date(attempt.completedAt)) === todayKey) {
          summary.completedCount += 1;
          summary.focusMinutes += attempt.durationMinutes;
        }
        return summary;
      },
      { completedCount: 0, focusMinutes: 0 },
    );
    const xp = completedAttempts.length * XP_PER_COMPLETION;
    const level = Math.floor(xp / XP_PER_LEVEL) + 1;
    const currentLevelXp = xp % XP_PER_LEVEL;
    const streak = calculateCurrentStreak(completedAttempts);
    const badgeStates = BADGES.map((badge) => ({ ...badge, unlocked: badge.isUnlocked({ weekly, monthly, streak, level }) }));
    const nextLevelXp = currentLevelXp === 0 ? XP_PER_LEVEL : XP_PER_LEVEL - currentLevelXp;

    return {
      xp,
      level,
      currentLevelXp,
      nextLevelXp,
      streak,
      today: todaySummary,
      weekly,
      monthly,
      totalCompleted: completedAttempts.length,
      badgeStates,
    };
  }

  function summarizeRange(days, completedAttempts, attempts) {
    const buckets = buildDayBuckets(days);
    const firstKey = buckets[0].key;
    const completedByDay = new Map(buckets.map((bucket) => [bucket.key, { ...bucket, count: 0, focusMinutes: 0 }]));
    let startedCount = 0;

    attempts.forEach((attempt) => {
      const startedKey = formatDateKey(new Date(attempt.startedAt));
      if (startedKey >= firstKey && completedByDay.has(startedKey)) {
        startedCount += 1;
      }
    });

    completedAttempts.forEach((attempt) => {
      const completedKey = formatDateKey(new Date(attempt.completedAt));
      const bucket = completedByDay.get(completedKey);
      if (bucket) {
        bucket.count += 1;
        bucket.focusMinutes += attempt.durationMinutes;
      }
    });

    const completedCount = Array.from(completedByDay.values()).reduce((sum, bucket) => sum + bucket.count, 0);
    const focusMinutes = Array.from(completedByDay.values()).reduce((sum, bucket) => sum + bucket.focusMinutes, 0);

    return {
      completedCount,
      startedCount,
      focusMinutes,
      averageFocusMinutes: completedCount ? focusMinutes / completedCount : 0,
      completionRate: startedCount ? (completedCount / startedCount) * 100 : 0,
      buckets: Array.from(completedByDay.values()),
    };
  }

  function buildDayBuckets(days) {
    const results = [];
    for (let index = days - 1; index >= 0; index -= 1) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - index);
      results.push({
        key: formatDateKey(date),
        label: `${date.getMonth() + 1}/${date.getDate()}`,
      });
    }
    return results;
  }

  function calculateCurrentStreak(completedAttempts) {
    const uniqueDates = [...new Set(completedAttempts.map((attempt) => formatDateKey(new Date(attempt.completedAt))))].sort().reverse();
    if (!uniqueDates.length) {
      return 0;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const latest = new Date(uniqueDates[0]);

    if (latest.getTime() < yesterday.getTime()) {
      return 0;
    }

    let streak = 0;
    const cursor = latest.getTime() === today.getTime() ? new Date(today) : new Date(yesterday);
    while (uniqueDates.includes(formatDateKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  function render() {
    const analytics = buildAnalytics();

    elements.workMinutes.value = state.settings.workMinutes;
    elements.breakMinutes.value = state.settings.breakMinutes;
    elements.levelValue.textContent = `Lv.${analytics.level}`;
    elements.xpValue.textContent = `${analytics.xp} XP`;
    elements.xpProgress.style.width = `${(analytics.currentLevelXp / XP_PER_LEVEL) * 100}%`;
    elements.streakValue.textContent = `${analytics.streak}日`;
    elements.todayCompletions.textContent = `${analytics.today.completedCount}回`;
    elements.todayFocus.textContent = `集中 ${formatMinutes(analytics.today.focusMinutes)}分`;
    elements.weeklyRate.textContent = formatPercentage(analytics.weekly.completionRate);
    elements.weeklyAverage.textContent = `平均集中 ${formatMinutes(analytics.weekly.averageFocusMinutes)}分`;
    elements.monthlyRate.textContent = formatPercentage(analytics.monthly.completionRate);
    elements.monthlyAverage.textContent = `平均集中 ${formatMinutes(analytics.monthly.averageFocusMinutes)}分`;
    elements.totalCompletions.textContent = `${analytics.totalCompleted}回`;
    elements.nextLevel.textContent = `次レベルまで ${analytics.nextLevelXp}XP`;

    const unlockedCount = analytics.badgeStates.filter((badge) => badge.unlocked).length;
    elements.badgeCount.textContent = `${unlockedCount} / ${analytics.badgeStates.length}`;
    renderBadges(analytics.badgeStates);
    renderChart(elements.weeklyChart, analytics.weekly.buckets, "完了数", "直近7日間の完了数");
    renderChart(elements.monthlyChart, analytics.monthly.buckets, "集中分", "直近30日間の集中時間", true);
    renderTimer();
  }

  function renderBadges(badges) {
    elements.badgeList.innerHTML = badges
      .map(
        (badge) => `
          <article class="badge ${badge.unlocked ? "unlocked" : ""}">
            <div class="badge-icon">${badge.icon}</div>
            <div>
              <strong>${badge.title}</strong>
              <p>${badge.description}</p>
            </div>
          </article>
        `,
      )
      .join("");
  }

  function renderChart(container, buckets, metricLabel, heading, useFocusMinutes = false) {
    const values = buckets.map((bucket) => (useFocusMinutes ? bucket.focusMinutes : bucket.count));
    const maxValue = Math.max(...values, 1);

    container.innerHTML = `
      <div class="chart-legend">
        <span>${heading}</span>
        <span>最大 ${maxValue}${useFocusMinutes ? "分" : "回"}</span>
      </div>
      <div class="chart-bars">
        ${buckets
          .map((bucket) => {
            const value = useFocusMinutes ? bucket.focusMinutes : bucket.count;
            const height = Math.max(8, (value / maxValue) * 160);
            return `
              <div class="chart-bar">
                <strong>${value}</strong>
                <div class="chart-column" style="height:${height}px"></div>
                <small>${bucket.label}</small>
              </div>
            `;
          })
          .join("")}
      </div>
      <div class="chart-legend">
        <span>${metricLabel}</span>
        <span>${useFocusMinutes ? "平均" : "合計"}をバー表示</span>
      </div>
    `;
  }

  function renderTimer() {
    const isRunning = state.timer.status === "running";
    const modeLabel = state.timer.mode === "work" ? "作業セッション" : "休憩セッション";
    const statusLabel = {
      idle: "待機中",
      running: "進行中",
      paused: "一時停止中",
    }[state.timer.status];
    const progressRatio =
      state.timer.totalSeconds > 0 ? state.timer.remainingSeconds / state.timer.totalSeconds : 0;

    elements.modeLabel.textContent = modeLabel;
    elements.timerStatus.textContent = statusLabel;
    elements.timeRemaining.textContent = formatClock(state.timer.remainingSeconds);
    elements.progressRing.style.strokeDashoffset = `${RING_CIRCUMFERENCE * (1 - progressRatio)}`;
    elements.startButton.textContent = state.timer.status === "paused" ? "再開" : "開始";
    elements.pauseButton.disabled = !isRunning;
  }

  function formatClock(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = Math.floor(totalSeconds % 60)
      .toString()
      .padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  function formatDateKey(date) {
    return date.toISOString().slice(0, 10);
  }

  function formatPercentage(value) {
    return `${Math.round(value)}%`;
  }

  function formatMinutes(value) {
    const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  }

  function minutesToSeconds(minutes) {
    return Math.max(1, Math.round(minutes * 60));
  }

  function generateAttemptId(suffix = "") {
    const token =
      window.crypto && typeof window.crypto.randomUUID === "function"
        ? window.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    return `${token}${suffix ? `-${suffix}` : ""}`;
  }
})();
