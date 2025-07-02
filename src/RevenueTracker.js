// src/RevenueTracker.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { ResponsiveContainer } from 'recharts';
import html2pdf from 'html2pdf.js';
import { db } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const CustomDot = ({ cx, cy, payload, highestDay, lowestDay }) => {
  const isHighest = highestDay && payload.date === highestDay.date;
  const isLowest = lowestDay && payload.date === lowestDay.date;

  let fill = "#8884d8"; // default
  if (isHighest) fill = "green";
  if (isLowest) fill = "red";

  return (
    <circle
      cx={cx}
      cy={cy}
      r={6}
      fill={fill}
      stroke="white"
      strokeWidth={2}
    />
  );
};

const RevenueTracker = () => {
  const [revenueData, setRevenueData] = useState([]);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const exportRef = useRef();

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [highestDay, setHighestDay] = useState(null);
  const [lowestDay, setLowestDay] = useState(null);

  const updateRevenueData = useCallback((dataObj) => {
    const filtered = Object.entries(dataObj)
      .filter(([day]) => day.startsWith(selectedMonth))
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .map(([day, amt]) => ({ date: day, revenue: amt }));

    setRevenueData(filtered);

    const total = filtered.reduce((sum, item) => sum + item.revenue, 0);
    setTotalRevenue(total);

    if (filtered.length > 0) {
      let highest = filtered[0];
      let lowest = filtered[0];

      for (let i = 1; i < filtered.length; i++) {
        if (filtered[i].revenue > highest.revenue) highest = filtered[i];
        if (filtered[i].revenue < lowest.revenue) lowest = filtered[i];
      }

      setHighestDay(highest);
      setLowestDay(lowest);
    } else {
      setHighestDay(null);
      setLowestDay(null);
    }
  }, [selectedMonth]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("revenue")) || {};
    updateRevenueData(stored);
  }, [updateRevenueData]);

  const handleSubmit = () => {
    if (!amount) return alert("Enter amount");
    const stored = JSON.parse(localStorage.getItem("revenue")) || {};
    stored[date] = (stored[date] || 0) + parseFloat(amount);
    localStorage.setItem("revenue", JSON.stringify(stored));
    updateRevenueData(stored);
    setAmount('');
  };

  const handleDownloadPDF = () => {
    const clone = exportRef.current.cloneNode(true);
    const excludes = clone.querySelectorAll('.exclude-from-pdf');
    excludes.forEach(el => el.remove());

    const opt = {
      margin: 0.5,
      filename: `revenue-report-${selectedMonth}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(clone).save();
  };

  const handleSaveToCloud = async () => {
    try {
      const stored = JSON.parse(localStorage.getItem("revenue")) || {};
      await setDoc(doc(db, "revenueTracker", "user1"), {
        revenue: stored
      });
      alert("Data saved to cloud!");
    } catch (error) {
      console.error("Error saving to cloud:", error);
      alert("Failed to save to cloud.");
    }
  };

  const handleLoadFromCloud = async () => {
    try {
      const docRef = doc(db, "revenueTracker", "user1");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data().revenue;
        localStorage.setItem("revenue", JSON.stringify(data));
        updateRevenueData(data);
        alert("Data loaded from cloud!");
      } else {
        alert("No cloud data found.");
      }
    } catch (error) {
      console.error("Error loading from cloud:", error);
      alert("Failed to load from cloud.");
    }
  };

  const formatMonthYear = (value) => {
    const [year, month] = value.split("-");
    const date = new Date(year, month - 1);
    return date.toLocaleString("en-US", { month: "long", year: "numeric" });
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="card">
      <div ref={exportRef}>
        <div className="report-header">
          <img src="/logo.png" alt="Company Logo" className="report-logo" />
          <div className="report-title">
            <h2>Ryme Interiors</h2>
            <p>Monthly Revenue Report — {formatMonthYear(selectedMonth)}</p>
          </div>
        </div>

        <div className="input-group">
          <input className="exclude-from-pdf"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
          />
          <input className="exclude-from-pdf"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <input className="exclude-from-pdf"
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
          <button className="exclude-from-pdf" onClick={handleSubmit}>Add Revenue</button>
        </div>

        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={revenueData}>
              <CartesianGrid stroke="#eee" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#8884d8"
                dot={(props) => (
                  <CustomDot {...props} highestDay={highestDay} lowestDay={lowestDay} />
                )}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="stats">
          <div className="stat-card">
            <strong>Total:</strong><br /> ₦{totalRevenue.toLocaleString()}
          </div>

          {highestDay && (
            <div className="stat-card">
              <strong>Highest:</strong><br />
              ₦{highestDay.revenue.toLocaleString()} on {highestDay.date}
            </div>
          )}

          {lowestDay && (
            <div className="stat-card lowest">
              <strong>Lowest:</strong><br />
              ₦{lowestDay.revenue.toLocaleString()} on {lowestDay.date}
            </div>
          )}
        </div>

        <table className="revenue-table">
          <thead>
            <tr>
              <th>Revenue (₦)</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {revenueData.map((entry, index) => (
              <tr key={index}>
                <td>₦{entry.revenue.toLocaleString()}</td>
                <td>{formatDate(entry.date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
        <button className="no-print" onClick={handleDownloadPDF}>
          📄 Download Full Report as PDF
        </button>
      </div>
      <div className="center-button">
        <button className="no-print" onClick={handleSaveToCloud}>
          ☁️ Save to Cloud
        </button>
      </div>

      <div className="center-button">
        <button className="no-print" onClick={handleLoadFromCloud}>
          ☁️ Load from Cloud
        </button>
      </div>
    </div>
  );
};

export default RevenueTracker;
