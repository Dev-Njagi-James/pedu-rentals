'use client';
import { useEffect, useState } from 'react';
import {
   LineChart, Line, XAxis, YAxis,
   CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import styles from '../css/growthMetrics.module.css';

function toUTCRange(startDateStr) {
   // startDateStr: 'YYYY-MM-DD' in local time, treat as UTC start of day
   const [y, m, d] = startDateStr.split('-').map(Number);
   const start = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
   const end   = new Date(Date.UTC(y, m - 1, d + 6, 23, 59, 59)); // +6 days = 7-day window
   return { start: start.toISOString(), end: end.toISOString() };
}

function todayStr() {
   const now = new Date();
   return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
}

export default function GrowthMetricsChart() {
   const [data, setData]           = useState([]);
   const [startDate, setStartDate] = useState(todayStr());

   useEffect(() => {
      const { start, end } = toUTCRange(startDate);
      fetch(`/api/adminRo/analytics?start=${start}&end=${end}`)
         .then(r => r.json())
         .then(rows => setData(rows.map(r => ({
            date: r.date.slice(5),
            visits: Number(r.visits),
         }))));
   }, [startDate]);


    return (
      <section className={styles.section}>
         <h2 className={styles.title}>Platform Growth Metrics</h2>

         <div className={styles.controls}>
            <label className={styles.dateLabel}>
               Start Date
               <input
                  type="date"
                  className={styles.dateInput}
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
               />
            </label>
            <span className={styles.dateRangeInfo}>
               {/* show the computed end date for clarity */}
               {(() => {
                  const { end } = toUTCRange(startDate);
                  return `→ ${end.slice(0, 10)}`;
               })()}
            </span>
         </div>

         <div className={styles.chartWrapper}>
            {data.length === 0 && (
               <div className={styles.noData}>No data available for this period</div>
            )}
            <ResponsiveContainer width="100%" height={300}>
               <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ className: styles.axisLabel }} />
                  <YAxis tick={{ className: styles.axisLabel }} />
                  <Tooltip />
                  <Line
                     type="monotone"
                     dataKey="visits"
                     stroke="var(--accent)"
                     strokeWidth={2}
                     dot={true}
                  />
               </LineChart>
            </ResponsiveContainer>
         </div>
      </section>
   );
}