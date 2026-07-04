'use client';
import { useEffect, useState } from 'react';
import {
   LineChart, Line, BarChart, Bar, XAxis, YAxis,
   CartesianGrid, Tooltip, ResponsiveContainer, LabelList
} from 'recharts';
import styles from '../css/AnalyticsGraph.module.css';

function toUTCRange(startDateStr) {
   const [y, m, d] = startDateStr.split('-').map(Number);
   const start = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
   const end   = new Date(Date.UTC(y, m - 1, d + 6, 23, 59, 59));
   return { start: start.toISOString(), end: end.toISOString() };
}

function todayStr() {
   const now = new Date();
   return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
}

function DateRangeControls({ startDate, setStartDate, disabled = false }) {
   const endDate = toUTCRange(startDate).end.slice(0, 10);
   return (
      <div className={styles.controls}>
         <label className={styles.dateLabel}>
            Start Date
            <input
               type="date"
               disabled={disabled}
               className={styles.dateInput}
               value={startDate}
               onChange={e => setStartDate(e.target.value)}
            />
         </label>
         <span className={styles.dateRangeInfo}>→ {endDate}</span>
      </div>
   );
}

function ListerGrowthChart() {
   const [data, setData]           = useState([]);
   const [startDate, setStartDate] = useState(todayStr());

   useEffect(() => {
      const { start, end } = toUTCRange(startDate);
      fetch(`/api/adminRo/listerGrowth?start=${start}&end=${end}`)
         .then(r => r.json())
         .then(rows => {
            if (!Array.isArray(rows)) return;
            setData(rows.map(r => ({
               date:  r.date.slice(5),
               count: Number(r.count),
            })));
         });
   }, [startDate]);

   return (
      <section className={styles.section}>
         <h2 className={styles.title}>Listing Growth Metrics</h2>

         <DateRangeControls startDate={startDate} setStartDate={setStartDate} />

         <div className={styles.chartWrapper}>
            {data.length === 0 && (
               <div className={styles.noData}>No data available for this period</div>
            )}
            <ResponsiveContainer width="100%" height={300}>
               <BarChart data={data} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ className: styles.axisLabel }} />
                  <YAxis allowDecimals={false} tick={{ className: styles.axisLabel }} />
                  <Tooltip formatter={v => `${v} listers`} />
                  <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]}>
                     <LabelList dataKey="count" position="top" style={{ fontSize: 11 }} />
                  </Bar>
               </BarChart>
            </ResponsiveContainer>
         </div>
      </section>
   );
}

function RevenueGrowthChart() {
   const [data, setData]           = useState([]);
   const [startDate, setStartDate] = useState(todayStr());

   useEffect(() => {
      const { start, end } = toUTCRange(startDate);
      fetch(`/api/adminRo/revenueChart?start=${start}&end=${end}`)
         .then(r => r.json())
         .then(rows => {
            if (!Array.isArray(rows)) return;
            setData(rows.map(r => ({
               date:   r.date.slice(5),
               amount: Number(r.amount),
            })));
         });
   }, [startDate]);

   return (
      <section className={styles.section}>
         <h2 className={styles.title}>Revenue Growth Metrics</h2>

         <DateRangeControls startDate={startDate} setStartDate={setStartDate} />

         <div className={styles.chartWrapper}>
            {data.length === 0 && (
               <div className={styles.noData}>No data available for this period</div>
            )}
            <ResponsiveContainer width="100%" height={300}>
               <LineChart data={data} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ className: styles.axisLabel }} />
                  <YAxis tick={{ className: styles.axisLabel }} />
                  <Tooltip formatter={v => `KSH ${Number(v).toLocaleString()}`} />
                  <Line type="monotone" dataKey="amount" stroke="var(--accent)" strokeWidth={2} dot={true}>
                     <LabelList dataKey="amount" position="top" formatter={v => `KSH ${Number(v).toLocaleString()}`} style={{ fontSize: 10 }} />
                  </Line>
               </LineChart>
            </ResponsiveContainer>
         </div>
      </section>
   );
}

export default function Analytics() {
   return (
      <>
         <RevenueGrowthChart />
         <ListerGrowthChart />
      </>
   );
}