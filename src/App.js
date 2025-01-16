import React, { useState, useEffect } from "react";
import axios from "axios";
import { Bar } from "react-chartjs-2";
import { CategoryScale } from 'chart.js';
import Chart from 'chart.js/auto';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import Modal from 'react-modal';

Chart.register(CategoryScale);

// Initialize Modal
Modal.setAppElement('#root');

const App = () => {
  const [view, setView] = useState("yearly");
  const [data, setData] = useState([]);
  const [year, setYear] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [entriesForMonth, setEntriesForMonth] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [entriesMap, setEntriesMap] = useState({});
  const api = axios.create({
    baseURL: 'http://localhost:5000', // Base URL of your Python backend
  });

  useEffect(() => {
    const fetchData = async () => {
      const endpoint = view === "yearly" ? "/api/yearly" : `/api/monthly/${year}`;
      const response = await api.get(endpoint);
      setData(response.data);
      
      if (view === "monthly") {
        const entriesResponse = await api.get(`/api/entries/${year}`);
        const entries = entriesResponse.data;
        
        // Create a mapping of dates to entry IDs
        const entriesMapping = {};
        entries.forEach(entry => {
          const date = new Date(entry.created_at);
          const dateKey = date.toLocaleDateString('en-CA');
          entriesMapping[dateKey] = entry.id;
        });
        
        setEntriesMap(entriesMapping);
        setEntriesForMonth(entries.map(entry => new Date(entry.created_at)));
      }
    };
    fetchData();
  }, [view, year]);

  const handleBarClick = (elements) => {
    if (elements.length) {
      if (view === "yearly") {
        const clickedYear = Object.keys(data)[elements[0].index];
        setYear(clickedYear);
        setView("monthly");
      } else if (view === "monthly") {
        const clickedMonth = elements[0].index + 1; // Months are 1-based
        setSelectedMonth(clickedMonth);
      }
    }
  };

  const goBack = () => {
    if (selectedMonth !== null) {
      setSelectedMonth(null);
    } else {
      setView("yearly");
      setYear(null);
    }
  };

  const labels = view === "yearly" ? Object.keys(data) : Object.keys(data).map((month) => new Date(2000, month - 1).toLocaleString("default", { month: "long" }));
  const values = Object.values(data);

  const chartData = {
    labels,
    datasets: [
      {
        label: `Number of Entries (${view === "yearly" ? "Yearly" : `Monthly for ${year}`})`,
        data: values,
        backgroundColor: "rgba(75, 192, 192, 0.6)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (event, elements) => handleBarClick(elements),
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (context) => `${context.raw} entries` } },
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
      const response = await api.get(`/api/entry/${entryId}`);
      setSelectedEntry(response.data);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error fetching entry:', error);
    }
  };

  return (
    <div style={{ width: "80%", margin: "0 auto", padding: "20px" }}>
      <h1>Journal Entries Visualization</h1>
      {view === "monthly" && (
        <h2>
          {selectedMonth 
            ? `Viewing entries for ${new Date(year, selectedMonth - 1).toLocaleString('default', { month: 'long' })} ${year}`
            : `Viewing entries for ${year}`
          }
        </h2>
      )}
      <div style={{ height: "500px" }}>
        <Bar data={chartData} options={options} />
      </div>
      {selectedMonth && view === "monthly" && (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          marginTop: '20px',
          gap: '20px'
        }}>
          <button onClick={goBack}>Back to Monthly View</button>
          <Calendar 
            value={new Date(year, selectedMonth - 1)} 
            tileClassName={tileClassName}
            showNavigation={false}
            onClickDay={handleTileClick}
            
          />
        </div>
      )}
      {view === "monthly" && !selectedMonth && (
        <button onClick={goBack}>Back to Yearly View</button>
      )}
      <Modal
        isOpen={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)}
        style={{
          content: {
            top: '50%',
            left: '50%',
            right: 'auto',
            bottom: 'auto',
            marginRight: '-50%',
            transform: 'translate(-50%, -50%)',
            maxWidth: '80%',
            maxHeight: '80%',
            overflow: 'auto'
          }
        }}
      >
        <div>
          <button 
            onClick={() => setIsModalOpen(false)}
            style={{
              float: 'right',
              padding: '5px 10px',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
          <div style={{ marginTop: '20px' }}>
            {selectedEntry && (
              <>
                <h3>{new Date(selectedEntry.created_at).toLocaleDateString()}</h3>
                <div dangerouslySetInnerHTML={{ __html: selectedEntry.richtext_body }} />
              </>
            )}
          </div>
        </div>
      </Modal>
      <style>
        {`
          .has-entry {
            background-color: #4BC0C0 !important;
            color: white !important;
            border-radius: 50%;
          }
          .has-entry:hover {
            background-color: #3AA0A0 !important;
          }
          .react-calendar {
            width: 350px;
            max-width: 100%;
            background: white;
            border: 1px solid #a0a096;
            font-family: Arial, Helvetica, sans-serif;
            line-height: 1.125em;
            margin: 0 auto;
          }
        `}
      </style>
    </div>
  );
};

export default App;
