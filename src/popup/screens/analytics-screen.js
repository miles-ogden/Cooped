/**
 * Analytics Screen Manager
 * Two-level analytics: Main view (current week) + Detailed view (full history)
 * Similar to Apple Screen Time with multi-domain color-coded bars
 */

import { getCurrentUser, querySelect } from '../../logic/supabaseClient.js';
import { getBlockedSites } from '../../utils/storage.js';
import { getUserTimezone, getDateInTimezone, getMondayOfWeek } from '../../utils/time-tracking.js';

export class AnalyticsScreen {
  constructor() {
    this.userProfile = null;
    this.currentView = 'main';           // 'main' or 'detail'
    this.currentTimePeriod = 'weekly';   // 'daily', 'weekly', or 'monthly'
    this.timezone = 'UTC';
    this.dailyData = {};                 // { date: { domain: minutes } }
    this.weeklyData = {};                // { weekStart: { domain: minutes } }
    this.domainColors = {};              // { domain: '#RRGGBB' }
    console.log('[ANALYTICS_SCREEN] Initialized');
  }

  /**
   * Load analytics data and render appropriate view
   */
  async show(viewType = 'main') {
    try {
      console.log(`[ANALYTICS_SCREEN] Loading analytics data - view: ${viewType}`);

      // Get authenticated user
      const user = await getCurrentUser(true);
      if (!user) {
        console.error('[ANALYTICS_SCREEN] No authenticated user');
        this.renderError('Not authenticated');
        return;
      }

      this.userProfile = user;

      // Get user's timezone
      this.timezone = await getUserTimezone();

      // Initialize domain colors
      this.initializeDomainColors();

      // Load appropriate data based on view
      if (viewType === 'detail') {
        this.currentView = 'detail';
        await this.loadDetailedAnalyticsData(user.id);
        this.renderDetailAnalytics();
      } else {
        this.currentView = 'main';
        await this.loadMainAnalyticsData(user.id);
        this.renderMainAnalytics();
      }

      // Setup event listeners
      this.setupEventListeners();

      console.log('[ANALYTICS_SCREEN] Analytics data loaded and rendered');
    } catch (error) {
      console.error('[ANALYTICS_SCREEN] Error loading analytics:', error);
      this.renderError(`Error loading analytics: ${error.message}`);
    }
  }

  /**
   * Load main analytics data (current week)
   */
  async loadMainAnalyticsData(userId) {
    try {
      console.log('[ANALYTICS_SCREEN] Loading main analytics data...');

      // Get current week boundaries
      const today = getDateInTimezone(Date.now(), this.timezone);
      const mondayOfWeek = getMondayOfWeek(today);
      const sundayOfWeek = new Date(new Date(mondayOfWeek).getTime() + 6 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      // Query daily data for current week
      const dailyRecords = await querySelect('daily_time_tracking', {
        eq: { user_id: userId },
        gte: { date: mondayOfWeek },
        lte: { date: sundayOfWeek }
      });

      // Organize data by date and domain
      const weekData = {};
      for (let i = 0; i < 7; i++) {
        const date = new Date(new Date(mondayOfWeek).getTime() + i * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];
        weekData[date] = {};
      }

      if (dailyRecords && Array.isArray(dailyRecords)) {
        dailyRecords.forEach(record => {
          if (!weekData[record.date]) {
            weekData[record.date] = {};
          }
          weekData[record.date][record.domain] = record.total_minutes || 0;
        });
      }

      this.dailyData = weekData;
      console.log('[ANALYTICS_SCREEN] Main analytics data loaded:', this.dailyData);
    } catch (error) {
      console.error('[ANALYTICS_SCREEN] Error loading main analytics data:', error);
      this.dailyData = {};
    }
  }

  /**
   * Load detailed analytics data (last 90 days for daily, 12 weeks for weekly)
   */
  async loadDetailedAnalyticsData(userId) {
    try {
      console.log('[ANALYTICS_SCREEN] Loading detailed analytics data...');

      // Get date range (last 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const startDate = ninetyDaysAgo.toISOString().split('T')[0];

      // Query daily records
      const dailyRecords = await querySelect('daily_time_tracking', {
        eq: { user_id: userId },
        gte: { date: startDate },
        order: { column: 'date', ascending: true }
      });

      // Query weekly records (last 12 weeks)
      const weeklyRecords = await querySelect('weekly_time_tracking', {
        eq: { user_id: userId },
        order: { column: 'week_start_date', ascending: false },
        limit: 12
      });

      // Organize daily data
      const dailyData = {};
      if (dailyRecords && Array.isArray(dailyRecords)) {
        dailyRecords.forEach(record => {
          if (!dailyData[record.date]) {
            dailyData[record.date] = {};
          }
          dailyData[record.date][record.domain] = record.total_minutes || 0;
        });
      }

      // Organize weekly data
      const weeklyData = {};
      if (weeklyRecords && Array.isArray(weeklyRecords)) {
        weeklyRecords.forEach(record => {
          if (!weeklyData[record.week_start_date]) {
            weeklyData[record.week_start_date] = {};
          }
          weeklyData[record.week_start_date][record.domain] = record.total_minutes || 0;
        });
      }

      this.dailyData = dailyData;
      this.weeklyData = weeklyData;
      console.log('[ANALYTICS_SCREEN] Detailed analytics data loaded');
    } catch (error) {
      console.error('[ANALYTICS_SCREEN] Error loading detailed analytics data:', error);
      this.dailyData = {};
      this.weeklyData = {};
    }
  }

  /**
   * Initialize color mapping for domains
   */
  initializeDomainColors() {
    const colorMap = {
      'youtube.com': '#FF0000',      // Red
      'tiktok.com': '#000000',       // Black
      'facebook.com': '#1877F2',     // Facebook Blue
      'instagram.com': '#E4405F',    // Instagram Pink
      'x.com': '#000000',            // Black
      'twitter.com': '#000000'       // Black
    };

    // Add colors and create fallback for unlisted domains
    const domains = new Set();
    Object.values(this.dailyData).forEach(dayData => {
      Object.keys(dayData).forEach(domain => domains.add(domain));
    });
    Object.values(this.weeklyData).forEach(weekData => {
      Object.keys(weekData).forEach(domain => domains.add(domain));
    });

    let colorIndex = 0;
    const extraColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];

    domains.forEach(domain => {
      if (colorMap[domain]) {
        this.domainColors[domain] = colorMap[domain];
      } else {
        this.domainColors[domain] = extraColors[colorIndex % extraColors.length];
        colorIndex++;
      }
    });

    console.log('[ANALYTICS_SCREEN] Domain colors initialized:', this.domainColors);
  }

  /**
   * Render main analytics view (current week summary)
   */
  renderMainAnalytics() {
    const container = document.getElementById('app');
    if (!container) return;

    // Calculate weekly totals
    const weeklyStats = this.calculateWeeklyStats();

    const html = `
      <div class="analytics-screen analytics-main-view">
        <div class="analytics-header">
          <h1>📊 Time Analytics</h1>
          <p class="subtitle">Current Week Summary</p>
        </div>

        <div class="analytics-content">
          <div class="weekly-total">
            <div class="total-label">Total This Week</div>
            <div class="total-time">${this.formatTimeDisplay(weeklyStats.totalMinutes)}</div>
          </div>

          <div class="chart-container">
            <div class="daily-chart">
              ${this.renderDailyBarChart(this.dailyData)}
            </div>
            <p class="chart-hint">Click chart for detailed analytics</p>
          </div>

          <div class="top-sites">
            <h3>Top Sites This Week</h3>
            <div class="sites-list">
              ${this.renderTopSites(weeklyStats.topSites)}
            </div>
          </div>
        </div>

        <div class="analytics-footer">
          <button class="btn-detail-analytics">View Detailed Analytics →</button>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  /**
   * Render detailed analytics view
   */
  renderDetailAnalytics() {
    const container = document.getElementById('app');
    if (!container) return;

    const html = `
      <div class="analytics-screen analytics-detail-view">
        <div class="analytics-header">
          <button class="btn-back">← Back</button>
          <h1>📊 Detailed Analytics</h1>
        </div>

        <div class="analytics-content">
          <div class="time-period-selector">
            <button class="period-btn ${this.currentTimePeriod === 'daily' ? 'active' : ''}" data-period="daily">
              Daily
            </button>
            <button class="period-btn ${this.currentTimePeriod === 'weekly' ? 'active' : ''}" data-period="weekly">
              Weekly
            </button>
            <button class="period-btn ${this.currentTimePeriod === 'monthly' ? 'active' : ''}" data-period="monthly">
              Monthly
            </button>
          </div>

          <div class="chart-section">
            <div class="stacked-chart">
              ${this.renderStackedBarChart(this.currentTimePeriod)}
            </div>
          </div>

          <div class="legend-section">
            <h3>Legend</h3>
            <div class="legend-grid">
              ${this.renderLegend()}
            </div>
          </div>

          <div class="breakdown-section">
            <h3>Detailed Breakdown</h3>
            <div class="breakdown-table">
              ${this.renderBreakdownTable(this.currentTimePeriod)}
            </div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  /**
   * Render daily bar chart for main view
   */
  renderDailyBarChart(dailyData) {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    let html = '<div class="bars-container">';

    const dates = Object.keys(dailyData).sort();
    dates.forEach((date, index) => {
      const domainData = dailyData[date];
      const dayTotal = Object.values(domainData).reduce((a, b) => a + b, 0);
      const dayLabel = days[index] || '?';

      html += `
        <div class="bar-wrapper" data-date="${date}">
          <div class="bar" style="height: ${Math.min(dayTotal / 60 * 5, 100)}px;">
            ${Object.entries(domainData)
              .map(([domain, minutes]) => {
                const percentage = dayTotal > 0 ? (minutes / dayTotal) * 100 : 0;
                return `<div class="bar-segment" style="background-color: ${this.domainColors[domain]}; flex: ${percentage};" title="${domain}: ${this.formatTimeDisplay(minutes)}"></div>`;
              })
              .join('')}
          </div>
          <div class="bar-label">${dayLabel}</div>
          <div class="bar-time">${this.formatTimeDisplay(dayTotal)}</div>
        </div>
      `;
    });

    html += '</div>';
    return html;
  }

  /**
   * Render stacked bar chart for detail view
   */
  renderStackedBarChart(period) {
    if (period === 'daily') {
      return this.renderDailyDetailChart();
    } else if (period === 'weekly') {
      return this.renderWeeklyDetailChart();
    } else if (period === 'monthly') {
      return this.renderMonthlyDetailChart();
    }
    return '';
  }

  /**
   * Render daily detail chart
   */
  renderDailyDetailChart() {
    const dates = Object.keys(this.dailyData).sort();
    let html = '<div class="detail-bars-container">';

    dates.slice(-30).forEach(date => {
      const domainData = this.dailyData[date];
      const dayTotal = Object.values(domainData).reduce((a, b) => a + b, 0);
      const dateObj = new Date(date);
      const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      html += `
        <div class="detail-bar-wrapper">
          <div class="detail-bar-label">${dateStr}</div>
          <div class="detail-bar" style="height: 40px;">
            ${Object.entries(domainData)
              .filter(([domain, minutes]) => minutes > 0)
              .map(([domain, minutes]) => {
                const percentage = dayTotal > 0 ? (minutes / dayTotal) * 100 : 0;
                return `<div class="bar-segment" style="background-color: ${this.domainColors[domain]}; flex: ${percentage};" title="${domain}: ${this.formatTimeDisplay(minutes)}"></div>`;
              })
              .join('')}
          </div>
          <div class="detail-bar-time">${this.formatTimeDisplay(dayTotal)}</div>
        </div>
      `;
    });

    html += '</div>';
    return html;
  }

  /**
   * Render weekly detail chart
   */
  renderWeeklyDetailChart() {
    const weeks = Object.keys(this.weeklyData).sort().reverse();
    let html = '<div class="detail-bars-container">';

    weeks.forEach(weekStart => {
      const domainData = this.weeklyData[weekStart];
      const weekTotal = Object.values(domainData).reduce((a, b) => a + b, 0);
      const weekEnd = new Date(new Date(weekStart).getTime() + 6 * 24 * 60 * 60 * 1000)
        .toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const weekLabel = `${new Date(weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd}`;

      html += `
        <div class="detail-bar-wrapper">
          <div class="detail-bar-label">${weekLabel}</div>
          <div class="detail-bar" style="height: 40px;">
            ${Object.entries(domainData)
              .filter(([domain, minutes]) => minutes > 0)
              .map(([domain, minutes]) => {
                const percentage = weekTotal > 0 ? (minutes / weekTotal) * 100 : 0;
                return `<div class="bar-segment" style="background-color: ${this.domainColors[domain]}; flex: ${percentage};" title="${domain}: ${this.formatTimeDisplay(minutes)}"></div>`;
              })
              .join('')}
          </div>
          <div class="detail-bar-time">${this.formatTimeDisplay(weekTotal)}</div>
        </div>
      `;
    });

    html += '</div>';
    return html;
  }

  /**
   * Render monthly detail chart
   */
  renderMonthlyDetailChart() {
    const dates = Object.keys(this.dailyData).sort();
    const monthlyData = {};

    // Group daily data by month
    dates.forEach(date => {
      const monthKey = date.substring(0, 7); // YYYY-MM
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {};
      }
      Object.entries(this.dailyData[date]).forEach(([domain, minutes]) => {
        if (!monthlyData[monthKey][domain]) {
          monthlyData[monthKey][domain] = 0;
        }
        monthlyData[monthKey][domain] += minutes;
      });
    });

    let html = '<div class="detail-bars-container">';

    Object.keys(monthlyData)
      .sort()
      .reverse()
      .forEach(month => {
        const domainData = monthlyData[month];
        const monthTotal = Object.values(domainData).reduce((a, b) => a + b, 0);
        const monthDate = new Date(month + '-01');
        const monthLabel = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        html += `
          <div class="detail-bar-wrapper">
            <div class="detail-bar-label">${monthLabel}</div>
            <div class="detail-bar" style="height: 40px;">
              ${Object.entries(domainData)
                .filter(([domain, minutes]) => minutes > 0)
                .map(([domain, minutes]) => {
                  const percentage = monthTotal > 0 ? (minutes / monthTotal) * 100 : 0;
                  return `<div class="bar-segment" style="background-color: ${this.domainColors[domain]}; flex: ${percentage};" title="${domain}: ${this.formatTimeDisplay(minutes)}"></div>`;
                })
                .join('')}
            </div>
            <div class="detail-bar-time">${this.formatTimeDisplay(monthTotal)}</div>
          </div>
        `;
      });

    html += '</div>';
    return html;
  }

  /**
   * Render legend with color codes
   */
  renderLegend() {
    return Object.entries(this.domainColors)
      .map(([domain, color]) => `
        <div class="legend-item">
          <div class="legend-color" style="background-color: ${color};"></div>
          <span class="legend-label">${domain}</span>
        </div>
      `)
      .join('');
  }

  /**
   * Render breakdown table
   */
  renderBreakdownTable(period) {
    if (period === 'daily') {
      return this.renderDailyBreakdownTable();
    } else if (period === 'weekly') {
      return this.renderWeeklyBreakdownTable();
    } else if (period === 'monthly') {
      return this.renderMonthlyBreakdownTable();
    }
    return '';
  }

  /**
   * Render daily breakdown table
   */
  renderDailyBreakdownTable() {
    const domainTotals = {};
    let grandTotal = 0;

    Object.values(this.dailyData).forEach(dayData => {
      Object.entries(dayData).forEach(([domain, minutes]) => {
        if (!domainTotals[domain]) {
          domainTotals[domain] = 0;
        }
        domainTotals[domain] += minutes;
        grandTotal += minutes;
      });
    });

    let html = `
      <table class="breakdown-table">
        <thead>
          <tr>
            <th>Website</th>
            <th>Daily Avg</th>
            <th>Total</th>
            <th>%</th>
          </tr>
        </thead>
        <tbody>
    `;

    Object.entries(domainTotals)
      .sort((a, b) => b[1] - a[1])
      .forEach(([domain, minutes]) => {
        const dailyAvg = Math.round(minutes / Object.keys(this.dailyData).length);
        const percentage = grandTotal > 0 ? ((minutes / grandTotal) * 100).toFixed(1) : 0;
        html += `
          <tr>
            <td><span class="color-dot" style="background-color: ${this.domainColors[domain]};"></span>${domain}</td>
            <td>${this.formatTimeDisplay(dailyAvg)}</td>
            <td>${this.formatTimeDisplay(minutes)}</td>
            <td>${percentage}%</td>
          </tr>
        `;
      });

    html += `
        </tbody>
        <tfoot>
          <tr>
            <td><strong>Total</strong></td>
            <td><strong>${this.formatTimeDisplay(Math.round(grandTotal / Object.keys(this.dailyData).length))}</strong></td>
            <td><strong>${this.formatTimeDisplay(grandTotal)}</strong></td>
            <td><strong>100%</strong></td>
          </tr>
        </tfoot>
      </table>
    `;

    return html;
  }

  /**
   * Render weekly breakdown table
   */
  renderWeeklyBreakdownTable() {
    const domainTotals = {};
    let grandTotal = 0;

    Object.values(this.weeklyData).forEach(weekData => {
      Object.entries(weekData).forEach(([domain, minutes]) => {
        if (!domainTotals[domain]) {
          domainTotals[domain] = 0;
        }
        domainTotals[domain] += minutes;
        grandTotal += minutes;
      });
    });

    let html = `
      <table class="breakdown-table">
        <thead>
          <tr>
            <th>Website</th>
            <th>Weekly Avg</th>
            <th>Total</th>
            <th>%</th>
          </tr>
        </thead>
        <tbody>
    `;

    Object.entries(domainTotals)
      .sort((a, b) => b[1] - a[1])
      .forEach(([domain, minutes]) => {
        const weeklyAvg = Math.round(minutes / Object.keys(this.weeklyData).length);
        const percentage = grandTotal > 0 ? ((minutes / grandTotal) * 100).toFixed(1) : 0;
        html += `
          <tr>
            <td><span class="color-dot" style="background-color: ${this.domainColors[domain]};"></span>${domain}</td>
            <td>${this.formatTimeDisplay(weeklyAvg)}</td>
            <td>${this.formatTimeDisplay(minutes)}</td>
            <td>${percentage}%</td>
          </tr>
        `;
      });

    html += `
        </tbody>
        <tfoot>
          <tr>
            <td><strong>Total</strong></td>
            <td><strong>${this.formatTimeDisplay(Math.round(grandTotal / Object.keys(this.weeklyData).length))}</strong></td>
            <td><strong>${this.formatTimeDisplay(grandTotal)}</strong></td>
            <td><strong>100%</strong></td>
          </tr>
        </tfoot>
      </table>
    `;

    return html;
  }

  /**
   * Render monthly breakdown table
   */
  renderMonthlyBreakdownTable() {
    const dates = Object.keys(this.dailyData).sort();
    const monthlyData = {};

    // Group by month
    dates.forEach(date => {
      const monthKey = date.substring(0, 7);
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {};
      }
      Object.entries(this.dailyData[date]).forEach(([domain, minutes]) => {
        if (!monthlyData[monthKey][domain]) {
          monthlyData[monthKey][domain] = 0;
        }
        monthlyData[monthKey][domain] += minutes;
      });
    });

    const domainTotals = {};
    let grandTotal = 0;

    Object.values(monthlyData).forEach(monthData => {
      Object.entries(monthData).forEach(([domain, minutes]) => {
        if (!domainTotals[domain]) {
          domainTotals[domain] = 0;
        }
        domainTotals[domain] += minutes;
        grandTotal += minutes;
      });
    });

    let html = `
      <table class="breakdown-table">
        <thead>
          <tr>
            <th>Website</th>
            <th>Monthly Avg</th>
            <th>Total</th>
            <th>%</th>
          </tr>
        </thead>
        <tbody>
    `;

    Object.entries(domainTotals)
      .sort((a, b) => b[1] - a[1])
      .forEach(([domain, minutes]) => {
        const monthlyAvg = Math.round(minutes / Object.keys(monthlyData).length);
        const percentage = grandTotal > 0 ? ((minutes / grandTotal) * 100).toFixed(1) : 0;
        html += `
          <tr>
            <td><span class="color-dot" style="background-color: ${this.domainColors[domain]};"></span>${domain}</td>
            <td>${this.formatTimeDisplay(monthlyAvg)}</td>
            <td>${this.formatTimeDisplay(minutes)}</td>
            <td>${percentage}%</td>
          </tr>
        `;
      });

    html += `
        </tbody>
        <tfoot>
          <tr>
            <td><strong>Total</strong></td>
            <td><strong>${this.formatTimeDisplay(Math.round(grandTotal / Object.keys(monthlyData).length))}</strong></td>
            <td><strong>${this.formatTimeDisplay(grandTotal)}</strong></td>
            <td><strong>100%</strong></td>
          </tr>
        </tfoot>
      </table>
    `;

    return html;
  }

  /**
   * Render top sites list
   */
  renderTopSites(topSites) {
    return topSites
      .map(
        (site, index) => `
        <div class="site-item">
          <div class="site-rank">${index + 1}</div>
          <div class="site-info">
            <div class="site-name">${site.domain}</div>
            <div class="site-percentage">${site.percentage}%</div>
          </div>
          <div class="site-time">${this.formatTimeDisplay(site.minutes)}</div>
        </div>
      `
      )
      .join('');
  }

  /**
   * Calculate weekly statistics
   */
  calculateWeeklyStats() {
    const domainTotals = {};
    let totalMinutes = 0;

    Object.values(this.dailyData).forEach(dayData => {
      Object.entries(dayData).forEach(([domain, minutes]) => {
        if (!domainTotals[domain]) {
          domainTotals[domain] = 0;
        }
        domainTotals[domain] += minutes;
        totalMinutes += minutes;
      });
    });

    const topSites = Object.entries(domainTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([domain, minutes]) => ({
        domain,
        minutes,
        percentage: totalMinutes > 0 ? ((minutes / totalMinutes) * 100).toFixed(1) : 0
      }));

    return { totalMinutes, topSites };
  }

  /**
   * Format time for display
   */
  formatTimeDisplay(minutes) {
    if (minutes === 0) {
      return '0m';
    } else if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Main view: Navigate to detail view
    const detailBtn = document.querySelector('.btn-detail-analytics');
    if (detailBtn) {
      detailBtn.addEventListener('click', () => {
        this.show('detail');
      });
    }

    const chartContainer = document.querySelector('.chart-container');
    if (chartContainer) {
      chartContainer.addEventListener('click', () => {
        this.show('detail');
      });
    }

    // Detail view: Back button
    const backBtn = document.querySelector('.btn-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.show('main');
      });
    }

    // Detail view: Period buttons
    const periodBtns = document.querySelectorAll('.period-btn');
    periodBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const period = e.target.getAttribute('data-period');
        this.currentTimePeriod = period;

        // Remove active class from all buttons
        periodBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        // Re-render detail view
        this.renderDetailAnalytics();
        this.setupEventListeners();
      });
    });
  }

  /**
   * Render error message
   */
  renderError(message) {
    const container = document.getElementById('app');
    if (!container) return;

    container.innerHTML = `
      <div class="analytics-screen">
        <div class="error-state">
          <p class="error-message">❌ ${message}</p>
        </div>
      </div>
    `;
  }
}

export default AnalyticsScreen;
