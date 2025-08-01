const applicationsKey = 'applications';
const statusOptions = ["Applied", "Screen", "Interviewing", "Offer", "Rejected", "Archived"];


const domCache = {
  tbody: document.getElementById('applicationsTableBody'),
  todayApps: document.getElementById('todayApps'),
  monthlyApps: document.getElementById('monthlyApps'),
  totalApps: document.getElementById('totalApps'),
  searchInput: document.getElementById('searchInput'),
  addJobBtn: document.getElementById('addJobBtn'),
  uploadJsonInput: document.getElementById('uploadJsonInput')
};


const dateUtils = {
  formatDate: (date) => date.toISOString().split('T')[0],
  today: new Date(),
  get todayStr() { return this.formatDate(this.today); },
  get date30DaysAgo() { return this.formatDate(new Date(this.today - 30 * 24 * 60 * 60 * 1000)); }
};


const storage = {
  get: () => new Promise(resolve => {
    chrome.storage.local.get([applicationsKey], result => {
      resolve(result[applicationsKey] || []);
    });
  }),
  set: (apps) => new Promise(resolve => {
    chrome.storage.local.set({ [applicationsKey]: apps }, resolve);
  }),
  updateAppStatus: async (index, newStatus) => {
    const apps = await storage.get();
    if (apps[index]) {
      apps[index].status = newStatus;
      await storage.set(apps);
      loadDashboard();
    }
  }
};


async function initializeStorage() {
  const apps = await storage.get();
  if (!apps.length) {
    await storage.set(dummyData);
  }
  loadDashboard();
}

async function loadDashboard() {
  const apps = await storage.get();
  updateAnalytics(apps);
  renderTable(apps);
  createGraphGrid(apps);
}

function updateAnalytics(apps) {
  const total = apps.length;
  const todayCount = apps.filter(app => app.dateApplied === dateUtils.todayStr).length;
  const monthlyCount = apps.filter(app => app.dateApplied >= dateUtils.date30DaysAgo).length;

  domCache.todayApps.textContent = todayCount;
  domCache.monthlyApps.textContent = monthlyCount;
  domCache.totalApps.textContent = total;
}

function renderTable(apps) {
  const { tbody } = domCache;
  

  if (!apps.length || tbody.children.length === 0 || tbody.querySelector('.empty-message')) {
    tbody.innerHTML = '';
    
    if (!apps.length) {
      const emptyRow = document.createElement('tr');
      emptyRow.innerHTML = `
        <td class="text-center py-10 text-gray-400 cursor-pointer underline" colspan="5">
          Your submitted job applications will appear here. Click here to create your application profile.
        </td>
      `;
      emptyRow.onclick = modal.openAddPopup;
      tbody.appendChild(emptyRow);
      return;
    }
  }


  apps.forEach((app, index) => {
    let row = tbody.children[index];
    
    if (!row) {
      row = document.createElement('tr');
      row.className = 'hover:bg-gray-800';
      row.setAttribute('data-job', app.jobTitle.toLowerCase());
      row.setAttribute('data-company', app.companyLink.toLowerCase());
      tbody.appendChild(row);
    }


    row.innerHTML = `
      <td class="px-4 py-2">
        ${app.jobLink?.trim() ? 
          `<a href="${app.jobLink}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">${app.jobTitle}</a>` : 
          app.jobTitle}
      </td>
      <td class="px-4 py-2">
        <a href="${app.companyLink}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline break-all">${app.companyLink}</a>
      </td>
      <td class="px-4 py-2">
        <select class="bg-gray-900 text-white px-2 py-1 rounded status-dropdown">
          ${statusOptions.map(option => 
            `<option value="${option}" ${option === app.status ? 'selected' : ''}>${option}</option>`
          ).join('')}
        </select>
      </td>
      <td class="px-4 py-2">${app.dateApplied}</td>
    `;

    const select = row.querySelector('select');
    select.addEventListener('change', (e) => {
      storage.updateAppStatus(index, e.target.value);
    });
  });


  while (tbody.children.length > apps.length) {
    tbody.removeChild(tbody.lastChild);
  }
}


const modal = {
  createStyles: () => {
    if (!document.getElementById('modalStyles')) {
      const style = document.createElement('style');
      style.id = 'modalStyles';
      style.textContent = `
        #modalBg {
          position: fixed; 
          top: 0; 
          left: 0; 
          width: 100%; 
          height: 100%;
          background-color: rgba(0,0,0,0.7);
          display: flex; 
          justify-content: center; 
          align-items: center;
          z-index: 1000;
          animation: fadeInBg 0.3s ease forwards;
        }
        
        #modalContent {
          background-color: #1f2937; 
          padding: 2rem; 
          border-radius: 0.5rem;
          width: 100%; 
          max-width: 500px;
          color: #e5e7eb; 
          box-shadow: 0 0 15px rgba(0,0,0,0.5);
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          animation: scaleIn 0.3s ease forwards;
        }
        
        #modalContent h2 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #3b82f6;
          margin-bottom: 1.5rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #374151;
        }
        
        .form-group {
          margin-bottom: 1.25rem;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #e5e7eb;
        }
        
        .form-group input {
          width: 92%;
          padding: 0.75rem;
          background-color: #1f2937;
          border: 1px solid #374151;
          border-radius: 0.375rem;
          color: #f3f4f6;
          font-size: 0.875rem;
          transition: border-color 0.2s;
        }
        
        .form-group input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
        }
        
        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 1.5rem;
        }
        
        .btn {
          padding: 0.625rem 1.25rem;
          border-radius: 0.375rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-cancel {
          background-color: #ef4444;
          color: white;
        }
        
        .btn-cancel:hover {
          background-color: #dc2626;
        }
        
        .btn-submit {
          background-color: #3b82f6;
          color: white;
        }
        
        .btn-submit:hover {
          background-color: #2563eb;
        }
        
        @keyframes fadeInBg { 
          from { opacity: 0; } 
          to { opacity: 1; } 
        }
        
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        
        @keyframes fadeOutBg { 
          from { opacity: 1; } 
          to { opacity: 0; } 
        }
        
        @keyframes scaleOut { 
          from { opacity: 1; transform: scale(1); } 
          to { opacity: 0; transform: scale(0.95); } 
        }
      `;
      document.head.appendChild(style);
    }
  },
  close: (modalBg) => {
    modalBg.style.animation = 'fadeOutBg 0.3s ease forwards';
    modalBg.querySelector('#modalContent').style.animation = 'scaleOut 0.3s ease forwards';
    setTimeout(() => modalBg.remove(), 300);
  },
  openAddPopup: () => {
    modal.createStyles();
    
    const modalBg = document.createElement('div');
    modalBg.id = 'modalBg';
    modalBg.innerHTML = `
      <div id="modalContent">
        <h2>Add Job Application</h2>
        <form id="addJobForm">
          <div class="form-group">
            <label for="jobTitleInput">Job Title</label>
            <input type="text" id="jobTitleInput" required placeholder="Software Engineer" />
          </div>
          <div class="form-group">
            <label for="jobLinkInput">Job Link (optional)</label>
            <input type="url" id="jobLinkInput" placeholder="https://company.com/job/123" />
          </div>
          <div class="form-group">
            <label for="companyLinkInput">Company Website</label>
            <input type="url" id="companyLinkInput" required placeholder="https://company.com" />
          </div>
          <div class="form-group">
            <label for="dateAppliedInput">Application Date</label>
            <input type="date" id="dateAppliedInput" required max="${dateUtils.todayStr}" />
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-cancel" id="cancelAddBtn">Cancel</button>
            <button type="submit" class="btn btn-submit">Add Application</button>
          </div>
        </form>
      </div>
    `;
    
    document.body.appendChild(modalBg);
    
    document.getElementById('dateAppliedInput').value = dateUtils.todayStr;
    
    document.getElementById('cancelAddBtn').onclick = () => modal.close(modalBg);
    
    document.getElementById('addJobForm').onsubmit = async (e) => {
      e.preventDefault();
      const form = e.target;
      const jobTitle = form.jobTitleInput.value.trim();
      const jobLink = form.jobLinkInput.value.trim();
      const companyLink = form.companyLinkInput.value.trim();
      const dateApplied = form.dateAppliedInput.value;

      if (!jobTitle || !companyLink || !dateApplied) {
        alert('Please fill in all required fields.');
        return;
      }

      const apps = await storage.get();
      const newApp = { 
        jobTitle, 
        jobLink, 
        companyLink, 
        status: "Applied", 
        dateApplied 
      };
      

      if (domCache.tbody.querySelector('.empty-message')) {
        domCache.tbody.innerHTML = '';
      }
      
      apps.push(newApp);
      await storage.set(apps);
      
      const newRow = document.createElement('tr');
      newRow.className = 'hover:bg-gray-800';
      newRow.setAttribute('data-job', newApp.jobTitle.toLowerCase());
      newRow.setAttribute('data-company', newApp.companyLink.toLowerCase());
      
      newRow.innerHTML = `
        <td class="px-4 py-2">
          ${newApp.jobLink?.trim() ? 
            `<a href="${newApp.jobLink}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">${newApp.jobTitle}</a>` : 
            newApp.jobTitle}
        </td>
        <td class="px-4 py-2">
          <a href="${newApp.companyLink}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline break-all">${newApp.companyLink}</a>
        </td>
        <td class="px-4 py-2">
          <select class="bg-gray-900 text-white px-2 py-1 rounded status-dropdown">
            ${statusOptions.map(option => 
              `<option value="${option}" ${option === newApp.status ? 'selected' : ''}>${option}</option>`
            ).join('')}
          </select>
        </td>
        <td class="px-4 py-2">${newApp.dateApplied}</td>
      `;
      
      const select = newRow.querySelector('select');
      select.addEventListener('change', (e) => {
        storage.updateAppStatus(apps.length - 1, e.target.value);
      });
      
      domCache.tbody.appendChild(newRow);
      updateAnalytics(apps);
      modal.close(modalBg);
    };
  }
};

async function handleUploadJSON(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const json = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = e => reject(new Error('File reading failed'));
      reader.readAsText(file);
    });

    const data = JSON.parse(json);
    if (!data.applications || !Array.isArray(data.applications)) {
      throw new Error("Invalid JSON structure: Missing 'applications' array");
    }

    const normalizedApps = data.applications.map(app => ({
      ...app,
      status: statusOptions.includes(app.status) ? app.status : "Applied"
    }));

    const existingApps = await storage.get();
    const mergedApps = [...existingApps];
    
    normalizedApps.forEach(newApp => {
      const exists = existingApps.some(app =>
        app.jobTitle === newApp.jobTitle &&
        app.companyLink === newApp.companyLink &&
        app.dateApplied === newApp.dateApplied
      );
      if (!exists) mergedApps.push(newApp);
    });

    await storage.set(mergedApps);
    loadDashboard();
    alert("Data uploaded and merged successfully!");
    event.target.value = '';
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}


const chartJsScript = document.createElement('script');
chartJsScript.src = 'https://cdn.jsdelivr.net/npm/chart.js';
document.head.appendChild(chartJsScript);

let chartInstance = null;

function renderApplicationsChart(apps) {
  if (!window.Chart) return; 
  const ctx = document.getElementById('applicationsChart').getContext('2d');


  const dateCounts = {};
  apps.forEach(app => {
    dateCounts[app.dateApplied] = (dateCounts[app.dateApplied] || 0) + 1;
  });

  const sortedDates = Object.keys(dateCounts).sort();
  const counts = sortedDates.map(date => dateCounts[date]);

  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: sortedDates,
      datasets: [{
        label: 'Applications',
        data: counts,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.2)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: '#6366f1',
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true }
      },
      scales: {
        x: {
          grid: {
            display: true,
            color: '#374151',
            borderDash: [4, 4],
          },
          title: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            display: true,
            color: '#374151',
            borderDash: [4, 4], 
          },
          title: {
            display: false
          }
        }
      }
    }
  });
}


const origLoadDashboard = loadDashboard;
loadDashboard = async function() {
  const apps = await storage.get();
  updateAnalytics(apps);
  renderTable(apps);
  createGraphGrid(apps);
};


chartJsScript.onload = () => {
  loadDashboard();
};

function setupUI() {
  domCache.addJobBtn.addEventListener('click', modal.openAddPopup);
  domCache.uploadJsonInput.addEventListener('change', handleUploadJSON);
  

  const tabs = Array.from(document.querySelectorAll('.tab'));
  tabs.forEach(tab => {
    tab.addEventListener('click', async () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const apps = await storage.get();
      renderTable(filterApps(apps, tab.textContent.trim()));
    });
  });


  domCache.searchInput.addEventListener('input', async () => {
    const query = domCache.searchInput.value.trim().toLowerCase();
    const apps = await storage.get();
    const filtered = apps.filter(app =>
      app.jobTitle.toLowerCase().includes(query) ||
      app.companyLink.toLowerCase().includes(query)
    );
    renderTable(filtered);
  });
}





function filterApps(apps, filter) {
  if (filter === 'All') return apps;
  
  const todayStr = dateUtils.todayStr;
  const isWithinDays = (dateStr, days) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const pastDate = new Date(today);
    pastDate.setDate(pastDate.getDate() - days + 1);
    return date >= pastDate && date <= today;
  };

  switch(filter) {
    case 'Today': return apps.filter(app => app.dateApplied === todayStr);
    case '1 Week': return apps.filter(app => isWithinDays(app.dateApplied, 7));
    case '1 Month': return apps.filter(app => isWithinDays(app.dateApplied, 30));
    default: return apps;
  }
}


function createGraphGrid(apps) {
  const grid = document.querySelector('.graph');
  grid.innerHTML = '';
  grid.style.position = 'relative';


  const dateCounts = {};
  apps.forEach(app => {
    dateCounts[app.dateApplied] = (dateCounts[app.dateApplied] || 0) + 1;
  });


  const dateEntries = Object.entries(dateCounts).map(([date, count]) => ({ date, count }));
  dateEntries.sort((a, b) => new Date(a.date) - new Date(b.date));

  if (dateEntries.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'text-gray-400 text-center py-10';
    emptyMessage.textContent = 'No application data to display';
    grid.appendChild(emptyMessage);
    return;
  }

  const minDate = new Date(dateEntries[0].date);
  const maxDate = new Date(dateEntries[dateEntries.length - 1].date);
  const dateRange = maxDate - minDate || 1;

  const maxCount = Math.max(...dateEntries.map(entry => entry.count), 1);

  for (let i = 0; i <= maxCount; i++) {
    const y = 100 - (i / maxCount) * 100;
    const line = document.createElement('div');
    line.style.position = 'absolute';
    line.style.left = '0';
    line.style.right = '0';
    line.style.height = '1px';
    line.style.background = '#374151';
    line.style.bottom = `${(i / maxCount) * 100}%`;
    line.style.opacity = '0.5';
    grid.appendChild(line);

    const label = document.createElement('div');
    label.style.position = 'absolute';
    label.style.left = '-40px';
    label.style.bottom = `${(i / maxCount) * 100}%`;
    label.style.color = '#a5b4fc';
    label.style.fontSize = '0.8rem';
    label.style.width = '35px';
    label.style.textAlign = 'right';
    label.textContent = i;
    grid.appendChild(label);
  }


  const numVerticalLines = Math.min(dateEntries.length, 7);
  for (let i = 0; i < numVerticalLines; i++) {
    const index = Math.floor(i * (dateEntries.length - 1) / (numVerticalLines - 1));
    const dateEntry = dateEntries[index];
    const date = new Date(dateEntry.date);
    const xPos = ((date - minDate) / dateRange) * 100;

    const line = document.createElement('div');
    line.style.position = 'absolute';
    line.style.bottom = '0';
    line.style.top = '0';
    line.style.width = '1px';
    line.style.background = '#374151';
    line.style.left = `${xPos}%`;
    line.style.opacity = '0.5';
    grid.appendChild(line);

    const label = document.createElement('div');
    label.style.position = 'absolute';
    label.style.left = `${xPos}%`;
    label.style.bottom = '-22px';
    label.style.transform = 'translateX(-50%)';
    label.style.color = '#a5b4fc';
    label.style.fontSize = '0.8rem';
    label.textContent = new Date(dateEntry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    grid.appendChild(label);
  }

  let svg = grid.querySelector('svg');
  if (svg) svg.remove();
  svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.style.position = 'absolute';
  svg.style.left = '0';
  svg.style.top = '0';
  svg.style.width = '100%';
  svg.style.height = '100%';
  svg.style.pointerEvents = 'none';


  const points = dateEntries.map(entry => {
    const date = new Date(entry.date);
    const x = ((date - minDate) / dateRange) * grid.clientWidth;
    const y = grid.clientHeight - (entry.count / maxCount) * grid.clientHeight;
    return `${x},${y}`;
  }).join(' ');

  if (dateEntries.length > 1) {
    const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    polyline.setAttribute('points', points);
    polyline.setAttribute('fill', 'none');
    polyline.setAttribute('stroke', '#6366f1');
    polyline.setAttribute('stroke-width', '2');
    polyline.setAttribute('stroke-linecap', 'round');
    svg.appendChild(polyline);
  }
  grid.appendChild(svg);


  dateEntries.forEach(entry => {
    const date = new Date(entry.date);
    const xPos = ((date - minDate) / dateRange) * 100;
    const yPos = (entry.count / maxCount) * 100;
    const dot = document.createElement('div');
    dot.style.position = 'absolute';
    dot.style.left = `${xPos}%`;
    dot.style.bottom = `${yPos}%`;
    dot.style.width = '10px';
    dot.style.height = '10px';
    dot.style.background = '#6366f1';
    dot.style.borderRadius = '50%';
    dot.style.transform = 'translate(-50%, 50%)';
    dot.style.border = '2px solid #fff';
    dot.setAttribute('title', `${entry.date}: ${entry.count} application${entry.count > 1 ? 's' : ''}`);
    grid.appendChild(dot);
  });
}




let resizeTimeout;

window.addEventListener('resize', async () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(async () => {
    const apps = await storage.get();
    createGraphGrid(apps);
  }, 300); // Wait 300ms after resize ends
});




document.addEventListener('DOMContentLoaded', () => {
  initializeStorage();
  setupUI();
});