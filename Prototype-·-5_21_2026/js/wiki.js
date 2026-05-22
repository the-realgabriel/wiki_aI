/* VoxWiki — App Logic */

window.wiki = {};

/* =============================================
   View Router
   ============================================= */

wiki.switchView = function (viewId) {
  document.querySelectorAll('.view-panel').forEach(function (el) {
    el.style.display = 'none';
  });
  var target = document.getElementById('view-' + viewId);
  if (target) {
    target.style.display = 'block';
  }
  document.querySelectorAll('.nav-item').forEach(function (el) {
    el.classList.toggle('active', el.dataset.view === viewId);
  });
  window.location.hash = viewId;
};

wiki.initRouter = function () {
  var hash = window.location.hash.replace('#', '') || 'dashboard';
  wiki.switchView(hash);
  document.querySelectorAll('.nav-item[data-view]').forEach(function (el) {
    el.addEventListener('click', function () {
      wiki.switchView(el.dataset.view);
    });
  });
};

/* =============================================
   File Tree
   ============================================= */

wiki.toggleTree = function (el) {
  var children = el.nextElementSibling;
  var chevron = el.querySelector('.chevron');
  if (children && children.classList.contains('file-tree-children')) {
    children.classList.toggle('hidden');
    if (chevron) chevron.classList.toggle('open');
  }
};

wiki.initFileTree = function () {
  document.querySelectorAll('.file-tree-item').forEach(function (el) {
    if (el.nextElementSibling && el.nextElementSibling.classList.contains('file-tree-children')) {
      el.addEventListener('click', function (e) {
        e.stopPropagation();
        wiki.toggleTree(el);
      });
    }
  });
};

/* =============================================
   AI Chat
   ============================================= */

wiki.chatHistory = [
  { role: 'ai', text: 'Hello! I\'m your wiki assistant. Ask me anything about your knowledge base, or tell me to search, summarize, or draft content.' }
];

wiki.renderChat = function () {
  var container = document.getElementById('chat-messages');
  if (!container) return;
  container.innerHTML = '';
  wiki.chatHistory.forEach(function (msg) {
    var div = document.createElement('div');
    div.className = 'chat-msg ' + msg.role;
    var avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = msg.role === 'ai' ? 'AI' : 'U';
    var bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.innerHTML = '<p>' + msg.text.replace(/\n/g, '<br>') + '</p>';
    div.appendChild(avatar);
    div.appendChild(bubble);
    container.appendChild(div);
  });
  container.scrollTop = container.scrollHeight;
};

wiki.sendChat = function () {
  var input = document.getElementById('chat-input');
  if (!input) return;
  var text = input.value.trim();
  if (!text) return;
  wiki.chatHistory.push({ role: 'user', text: text });
  input.value = '';
  wiki.renderChat();
  setTimeout(function () {
    var response = wiki.generateAIResponse(text);
    wiki.chatHistory.push({ role: 'ai', text: response });
    wiki.renderChat();
  }, 400);
};

wiki.generateAIResponse = function (query) {
  var q = query.toLowerCase();
  if (q.includes('search') || q.includes('find') || q.includes('look up')) {
    return 'I searched the knowledge base for "' + query.replace(/^(search|find|look up)\s+/i, '') + '". I found 3 relevant articles: **API Authentication**, **Database Schema Guide**, and **Deployment Checklist**. Would you like me to summarize any of these?';
  }
  if (q.includes('summarize') || q.includes('summary')) {
    return 'Here\'s a summary of the requested article:\n\n**API Authentication** covers OAuth 2.0 flows, API key management, and rate limiting. The key takeaway is that all production endpoints require token-based auth with 60-minute expiry.';
  }
  if (q.includes('draft') || q.includes('write') || q.includes('create')) {
    return 'I\'ll help draft that. Could you specify the topic and any key points you\'d like covered? I can create a well-structured wiki page with sections, code examples, and references.';
  }
  if (q.includes('hello') || q.includes('hi ') || q === 'hi' || q === 'hello') {
    return 'Hi there! I\'m your AI wiki assistant. I can help you search the knowledge base, summarize articles, draft new content, or answer questions about your documentation. What would you like help with?';
  }
  return 'I searched the knowledge base for "' + query + '". I found related articles in **Engineering Docs**, **Product Specs**, and **Design System**. Would you like to explore any of these sections?';
};

wiki.handleChatKeydown = function (e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    wiki.sendChat();
  }
};

wiki.initChat = function () {
  wiki.renderChat();
  var input = document.getElementById('chat-input');
  if (input) {
    input.addEventListener('keydown', wiki.handleChatKeydown);
  }
  var sendBtn = document.getElementById('chat-send');
  if (sendBtn) {
    sendBtn.addEventListener('click', wiki.sendChat);
  }
};

/* =============================================
   Search
   ============================================= */

wiki.searchResults = [
  { title: 'API Authentication Guide', excerpt: 'OAuth 2.0 flows, API key management, and rate limiting for production services.', category: 'Engineering', updated: '2 days ago' },
  { title: 'Database Schema Overview', excerpt: 'Core tables, relationships, and indexing strategy for the main application database.', category: 'Engineering', updated: '5 days ago' },
  { title: 'Design System — Components', excerpt: 'Button, input, card, and navigation component specifications with usage guidelines.', category: 'Design', updated: '1 week ago' },
  { title: 'Deployment Checklist', excerpt: 'Pre-flight checks, environment variables, and rollback procedures for production releases.', category: 'Operations', updated: '3 days ago' },
  { title: 'Product Roadmap Q2 2026', excerpt: 'Strategic priorities, feature releases, and milestones for the second quarter.', category: 'Product', updated: '1 week ago' },
  { title: 'Onboarding Guide for New Engineers', excerpt: 'Setup instructions, repo structure, and first sprint expectations for new team members.', category: 'Engineering', updated: '2 weeks ago' },
  { title: 'Team Collaboration Guidelines', excerpt: 'Communication norms, meeting cadence, and async work best practices for the team.', category: 'Culture', updated: '3 weeks ago' }
];

wiki.performSearch = function (query) {
  var resultsContainer = document.getElementById('search-results');
  if (!resultsContainer) return;
  var q = query.toLowerCase().trim();
  if (!q) {
    resultsContainer.innerHTML = '<div class="text-muted" style="padding: var(--space-lg); text-align: center;">Start typing to search across the knowledge base…</div>';
    return;
  }
  var filtered = wiki.searchResults.filter(function (r) {
    return r.title.toLowerCase().includes(q) || r.excerpt.toLowerCase().includes(q) || r.category.toLowerCase().includes(q);
  });
  if (filtered.length === 0) {
    resultsContainer.innerHTML = '<div class="text-muted" style="padding: var(--space-lg); text-align: center;">No results found for "' + query + '". Try a different search term or browse categories.</div>';
    return;
  }
  var html = '';
  filtered.forEach(function (r) {
    html += '<div class="activity-item" style="cursor:pointer;">';
    html += '<div class="activity-icon">📄</div>';
    html += '<div class="activity-content">';
    html += '<div class="activity-title">' + wiki.highlight(r.title, q) + '</div>';
    html += '<div class="activity-desc">' + wiki.highlight(r.excerpt, q) + '</div>';
    html += '<div style="display:flex;gap:8px;margin-top:4px;"><span class="badge badge-accent">' + r.category + '</span><span class="text-xs text-muted">Updated ' + r.updated + '</span></div>';
    html += '</div>';
    html += '</div>';
  });
  resultsContainer.innerHTML = html;
};

wiki.highlight = function (text, query) {
  if (!query) return text;
  var re = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
  return text.replace(re, '<mark style="background:color-mix(in srgb, var(--accent) 20%, transparent);padding:0 2px;border-radius:2px;">$1</mark>');
};

wiki.initSearch = function () {
  var input = document.getElementById('global-search');
  if (input) {
    input.addEventListener('input', function () {
      wiki.performSearch(input.value);
    });
  }
  wiki.performSearch('');
};

/* =============================================
   Calendar
   ============================================= */

wiki.calendarEvents = [
  { date: '2026-05-22', title: 'Sprint Review', type: 'meeting' },
  { date: '2026-05-25', title: 'API Docs Deadline', type: 'deadline' },
  { date: '2026-05-28', title: 'Q2 Milestone', type: 'milestone' },
  { date: '2026-06-01', title: 'Design Review', type: 'meeting' },
  { date: '2026-06-05', title: 'Deployment v2.3', type: 'deadline' },
  { date: '2026-06-12', title: 'Team Retro', type: 'meeting' }
];

wiki.renderCalendar = function (year, month) {
  var container = document.getElementById('calendar-grid');
  if (!container) return;
  year = year || 2026;
  month = month !== undefined ? month : 4;

  var firstDay = new Date(year, month, 1).getDay();
  var daysInMonth = new Date(year, month + 1, 0).getDate();
  var daysInPrev = new Date(year, month, 0).getDate();

  var dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var html = '';

  dayHeaders.forEach(function (d) {
    html += '<div class="calendar-day-header">' + d + '</div>';
  });

  var today = new Date();

  for (var p = firstDay - 1; p >= 0; p--) {
    html += '<div class="calendar-day other-month"><div class="day-number">' + (daysInPrev - p) + '</div></div>';
  }

  for (var d = 1; d <= daysInMonth; d++) {
    var dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    var events = wiki.calendarEvents.filter(function (e) { return e.date === dateStr; });
    var isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
    html += '<div class="calendar-day' + (isToday ? ' today' : '') + '">';
    html += '<div class="day-number">' + d + '</div>';
    events.forEach(function (e) {
      html += '<div class="calendar-event ' + e.type + '">' + e.title + '</div>';
    });
    html += '</div>';
  }

  var remaining = 42 - (firstDay + daysInMonth);
  for (var n = 1; n <= remaining; n++) {
    html += '<div class="calendar-day other-month"><div class="day-number">' + n + '</div></div>';
  }

  container.innerHTML = html;

  var monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var titleEl = document.getElementById('calendar-month-title');
  if (titleEl) titleEl.textContent = monthNames[month] + ' ' + year;
};

wiki.initCalendar = function () {
  wiki.renderCalendar(2026, 4);
  var prevBtn = document.getElementById('cal-prev');
  var nextBtn = document.getElementById('cal-next');
  var currentYear = 2026;
  var currentMonth = 4;
  if (prevBtn) {
    prevBtn.addEventListener('click', function () {
      currentMonth--;
      if (currentMonth < 0) { currentMonth = 11; currentYear--; }
      wiki.renderCalendar(currentYear, currentMonth);
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      currentMonth++;
      if (currentMonth > 11) { currentMonth = 0; currentYear++; }
      wiki.renderCalendar(currentYear, currentMonth);
    });
  }
};

/* =============================================
   File Upload
   ============================================= */

wiki.initUpload = function () {
  var zone = document.getElementById('upload-zone');
  if (!zone) return;
  var input = document.getElementById('file-input');
  if (!input) return;

  zone.addEventListener('click', function () {
    input.click();
  });

  zone.addEventListener('dragover', function (e) {
    e.preventDefault();
    zone.style.borderColor = 'var(--accent)';
    zone.style.background = 'color-mix(in srgb, var(--accent) 8%, var(--surface))';
  });

  zone.addEventListener('dragleave', function () {
    zone.style.borderColor = '';
    zone.style.background = '';
  });

  zone.addEventListener('drop', function (e) {
    e.preventDefault();
    zone.style.borderColor = '';
    zone.style.background = '';
    var files = e.dataTransfer.files;
    wiki.handleFiles(files);
  });

  input.addEventListener('change', function () {
    wiki.handleFiles(input.files);
    input.value = '';
  });
};

wiki.handleFiles = function (files) {
  var list = document.getElementById('uploaded-files');
  if (!list) return;
  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    var item = document.createElement('div');
    item.className = 'activity-item';
    var icon = f.type.startsWith('image/') ? '🖼️' : f.type.includes('pdf') ? '📕' : '📄';
    item.innerHTML = '<div class="activity-icon">' + icon + '</div><div class="activity-content"><div class="activity-title">' + f.name + '</div><div class="activity-desc">' + (f.size / 1024).toFixed(1) + ' KB — uploaded just now</div></div><div><span class="badge badge-success">Indexed</span></div>';
    list.appendChild(item);
  }
};

/* =============================================
   Tabs
   ============================================= */

wiki.initTabs = function () {
  document.querySelectorAll('.tabs').forEach(function (tabs) {
    tabs.querySelectorAll('.tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        var target = tab.dataset.tab;
        var parent = tabs.closest('[data-tab-group]');
        if (parent) {
          var group = parent.dataset.tabGroup;
          parent.querySelectorAll('[data-tab-panel]').forEach(function (p) {
            p.style.display = p.dataset.tabPanel === target ? 'block' : 'none';
          });
        }
      });
    });
  });
};

/* =============================================
   Dropdown
   ============================================= */

wiki.toggleDropdown = function (id) {
  var el = document.getElementById(id);
  if (el) el.classList.toggle('open');
};

document.addEventListener('click', function (e) {
  if (!e.target.closest('.dropdown-toggle') && !e.target.closest('.dropdown-menu')) {
    document.querySelectorAll('.dropdown-menu.open').forEach(function (m) {
      m.classList.remove('open');
    });
  }
});

/* =============================================
   Init
   ============================================= */

document.addEventListener('DOMContentLoaded', function () {
  wiki.initRouter();
  wiki.initFileTree();
  wiki.initChat();
  wiki.initSearch();
  wiki.initCalendar();
  wiki.initUpload();
  wiki.initTabs();
});
