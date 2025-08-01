document.getElementById('openOptions').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("options.html") });
});

function loadTodayCount() {
  const today = new Date().toISOString().split('T')[0];
  chrome.storage.local.get(['applications'], (result) => {
    const applications = result.applications || [];
    const todayApps = applications.filter(app => app.dateApplied === today);
    document.getElementById('todayCount').textContent = todayApps.length;
    updateCircle(todayApps.length, applications.length);
  });
}

function updateCircle(todayCount, totalCount) {
  const circle = document.getElementById('progressCircle');
  const percentLabel = document.getElementById('progressPercent');
  if (totalCount === 0) {
    circle.style.strokeDashoffset = 339.292; 
    percentLabel.textContent = '0%';
    return;
  }
  const percent = Math.round((todayCount / totalCount) * 100);
  const circumference = 2 * Math.PI * 54; 
  const offset = circumference - (circumference * percent) / 100;
  circle.style.strokeDashoffset = offset;
  percentLabel.textContent = percent + '%';
}

loadTodayCount();
