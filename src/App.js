import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Bar } from "react-chartjs-2";
import { CategoryScale } from 'chart.js';
import Chart from 'chart.js/auto';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import Modal from 'react-modal';
import './App.css';

Chart.register(CategoryScale);
Modal.setAppElement('#root');

const App = () => {
  const [view, setView] = useState("yearly");
  const [data, setData] = useState({});
  const [year, setYear] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [entriesForMonth, setEntriesForMonth] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [entriesMap, setEntriesMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const api = axios.create({
      baseURL: 'http://localhost:5000',
    });
    const fetchData = async () => {
      setLoading(true);
      const endpoint = view === "yearly" ? "/api/yearly" : `/api/monthly/${year}`;
      const response = await api.get(endpoint);
      setData(response.data);

      if (view === "monthly") {
        const entriesResponse = await api.get(`/api/entries/${year}`);
        const entries = entriesResponse.data;

        const entriesMapping = {};
        entries.forEach(entry => {
          const date = new Date(entry.created_at);
          const dateKey = date.toLocaleDateString('en-CA');
          entriesMapping[dateKey] = entry.id;
        });

        setEntriesMap(entriesMapping);
        setEntriesForMonth(entries.map(entry => new Date(entry.created_at)));
      }
      setLoading(false);
    };
    fetchData();
  }, [view, year]);

  // Stats calculations
  const stats = useMemo(() => {
    const values = Object.values(data);
    const total = values.reduce((a, b) => a + b, 0);
    const avg = values.length ? Math.round(total / values.length) : 0;
    const max = Math.max(...values, 0);
    const maxKey = Object.keys(data).find(k => data[k] === max) || '-';

    if (view === "yearly") {
      return {
        total,
        periods: Object.keys(data).length,
        avg,
        best: maxKey,
        bestLabel: "Most Active Year"
      };
    } else {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return {
        total,
        periods: values.filter(v => v > 0).length,
        avg,
        best: monthNames[parseInt(maxKey) - 1] || '-',
        bestLabel: "Most Active Month"
      };
    }
  }, [data, view]);

  const handleBarClick = (elements) => {
    if (elements.length) {
      if (view === "yearly") {
        const clickedYear = Object.keys(data)[elements[0].index];
        setYear(clickedYear);
        setView("monthly");
      } else if (view === "monthly") {
        const clickedMonth = elements[0].index + 1;
        setSelectedMonth(clickedMonth);
      }
    }
  };

  const goToYearly = () => {
    setView("yearly");
    setYear(null);
    setSelectedMonth(null);
  };

  const goToMonthly = () => {
    setSelectedMonth(null);
  };

  const labels = view === "yearly"
    ? Object.keys(data)
    : Object.keys(data).map((month) => new Date(2000, month - 1).toLocaleString("default", { month: "short" }));

  const values = Object.values(data);

  const chartData = {
    labels,
    datasets: [
      {
        label: "Entries",
        data: values,
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return 'rgba(167, 139, 250, 0.8)';
          const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, 'rgba(99, 102, 241, 0.8)');
          gradient.addColorStop(1, 'rgba(167, 139, 250, 0.8)');
          return gradient;
        },
        borderColor: 'rgba(167, 139, 250, 1)',
        borderWidth: 0,
        borderRadius: 8,
        borderSkipped: false,
        hoverBackgroundColor: 'rgba(167, 139, 250, 1)',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (event, elements) => handleBarClick(elements),
    animation: {
      duration: 800,
      easing: 'easeOutQuart',
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(30, 30, 46, 0.95)',
        titleColor: '#e4e4e7',
        bodyColor: '#a1a1aa',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 10,
        padding: 12,
        titleFont: { size: 14, weight: '600' },
        bodyFont: { size: 13 },
        callbacks: {
          title: (context) => {
            if (view === "yearly") return context[0].label;
            return `${context[0].label} ${year}`;
          },
          label: (context) => `${context.raw} entries`,
        },
        displayColors: false,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: '#71717a',
          font: { size: 12, weight: '500' },
        },
        border: { display: false },
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.04)',
          drawBorder: false,
        },
        ticks: {
          color: '#71717a',
          font: { size: 12 },
          padding: 10,
        },
        border: { display: false },
      },
    },
    onHover: (event, chartElement) => {
      event.native.target.style.cursor = chartElement.length ? 'pointer' : 'default';
    },
  };

  const tileClassName = ({ date }) => {
    if (entriesForMonth.some(entryDate =>
      entryDate.getDate() === date.getDate() &&
      entryDate.getMonth() === date.getMonth() &&
      entryDate.getFullYear() === date.getFullYear()
    )) {
      return 'has-entry';
    }
    return null;
  };

  const handleTileClick = (date) => {
    const dateKey = date.toLocaleDateString('en-CA');
    const entryId = entriesMap[dateKey];
    if (entryId) {
      fetchEntryContent(entryId);
    }
  };

  const fetchEntryContent = async (entryId) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/entry/${entryId}`);
      setSelectedEntry(response.data);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error fetching entry:', error);
    }
  };

  const getMonthName = (month) => {
    return new Date(2000, month - 1).toLocaleString('default', { month: 'long' });
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>Journal</h1>
        <p className="subtitle">Your personal writing journey, visualized</p>
      </header>

      {/* Breadcrumb Navigation */}
      {view === "monthly" && (
        <nav className="breadcrumb">
          <span className="breadcrumb-item" onClick={goToYearly}>
            All Years
          </span>
          <span className="breadcrumb-separator">/</span>
          {selectedMonth ? (
            <>
              <span className="breadcrumb-item" onClick={goToMonthly}>
                {year}
              </span>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-item active">
                {getMonthName(selectedMonth)}
              </span>
            </>
          ) : (
            <span className="breadcrumb-item active">{year}</span>
          )}
        </nav>
      )}

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card highlight">
          <div className="stat-value">{stats.total.toLocaleString()}</div>
          <div className="stat-label">Total Entries</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.periods}</div>
          <div className="stat-label">{view === "yearly" ? "Years" : "Active Months"}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.avg}</div>
          <div className="stat-label">Avg per {view === "yearly" ? "Year" : "Month"}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.best}</div>
          <div className="stat-label">{stats.bestLabel}</div>
        </div>
      </div>

      {/* Chart */}
      <div className="chart-container">
        <h2 className="chart-title">
          {view === "yearly" ? "Entries by Year" : `Entries in ${year}`}
        </h2>
        {loading ? (
          <div className="loading">
            <div className="loading-spinner"></div>
          </div>
        ) : (
          <div className="chart-wrapper">
            <Bar data={chartData} options={options} />
          </div>
        )}
        {!loading && view === "yearly" && (
          <p style={{ textAlign: 'center', color: '#71717a', marginTop: '16px', fontSize: '0.875rem' }}>
            Click a bar to explore that year
          </p>
        )}
        {!loading && view === "monthly" && !selectedMonth && (
          <p style={{ textAlign: 'center', color: '#71717a', marginTop: '16px', fontSize: '0.875rem' }}>
            Click a bar to see entries for that month
          </p>
        )}
      </div>

      {/* Calendar View */}
      {selectedMonth && view === "monthly" && (
        <div className="calendar-section">
          <div className="calendar-container">
            <h2 className="chart-title" style={{ margin: 0 }}>
              {getMonthName(selectedMonth)} {year}
            </h2>
            <Calendar
              key={`${year}-${selectedMonth}`}
              activeStartDate={new Date(year, selectedMonth - 1, 1)}
              tileClassName={tileClassName}
              showNavigation={false}
              onClickDay={handleTileClick}
            />
            <p style={{ color: '#71717a', fontSize: '0.875rem', textAlign: 'center' }}>
              Highlighted dates have entries. Click to read.
            </p>
          </div>
        </div>
      )}

      {/* Entry Modal */}
      <Modal
        isOpen={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)}
        className="modal-content"
        overlayClassName="modal-overlay"
        style={{
          overlay: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          },
          content: {
            position: 'relative',
            inset: 'auto',
          }
        }}
      >
        <div className="modal-header">
          <h3>
            Journal Entry
            {selectedEntry && (
              <span className="date-badge">
                {new Date(selectedEntry.created_at).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            )}
          </h3>
          <button className="modal-close" onClick={() => setIsModalOpen(false)}>
            &times;
          </button>
        </div>
        <div className="modal-body">
          {selectedEntry && (
            <div dangerouslySetInnerHTML={{ __html: selectedEntry.richtext_body }} />
          )}
        </div>
      </Modal>
    </div>
  );
};

export default App;
