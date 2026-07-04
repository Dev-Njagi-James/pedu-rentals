'use client';

import { useState, useEffect } from "react";
import cardStyles from "../css/cardsInfo.module.css";
import revenueStyles from '../css/revenueStats.module.css';
import GrowthMetricsChart from "./GrowthMetricsChart";

const STAT_CARDS = [
  { label: "Active Listings", key: "activeListings" },
  { label: "Suspended Account", key: "suspendedAccount" },
  { label: "Registered Listers", key: "registeredListers" },
  { label: "Total Visits", key: "totalVisits" },
];

const REVENUE_CARDS = [
  { label: 'Total Revenue Generated', key: 'totalRevenue', prefix: 'KSH' },
  { label: 'Total Transactions Performed', key: 'totalTransactions', prefix: '' },
  { label: 'Total Calls', key: 'totalCalls', prefix: '' },
];

function toUTCRange(startDateStr) {
  const [ y, m, d ] = startDateStr.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  const end = new Date(Date.UTC(y, m - 1, d + 6, 23, 59, 59));
  return { start: start.toISOString(), end: end.toISOString() };
}

function todayStr() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
}

const formatValue = (value, prefix) =>
  prefix ? `${prefix} ${Number(value).toLocaleString()}` : Number(value).toLocaleString();

export default function Dashboard() {
  const [ stats, setStats ] = useState({
    activeListings: 0, suspendedAccount: 0,
    registeredListers: 0, totalVisits: 0,
  });

  const [ revenueStats, setRevenueStats ] = useState({
    totalRevenue: 0, totalTransactions: 0, totalCalls: 0,
  });

  const [ filtered, setFiltered ] = useState(false);
  const [ startDate, setStartDate ] = useState(todayStr());

  // fetch stat cards
  useEffect(() => {
    fetch("/api/Admin")
      .then(r => r.json())
      .then(data => {
        const { totalVisits, ...rest } = data;
        setStats(prev => ({ ...prev, ...rest }));
      });
  }, []);

  // fetch revenue
  useEffect(() => {
    const params = new URLSearchParams({ filtered: String(filtered) });
    if (filtered) {
      const { start, end } = toUTCRange(startDate);
      params.set('start', start);
      params.set('end', end);
    }
    fetch(`/api/adminRo/revenue?${params}`)
      .then(r => r.json())
      .then(data => setRevenueStats({
        totalRevenue: data.totalRevenue ?? 0,
        totalTransactions: data.totalTransactions ?? 0,
        totalCalls: data.totalCalls ?? 0,
      }));
  }, [ filtered, startDate ]);

  // fetch total visits (all time)
  useEffect(() => {
    const start = new Date(Date.UTC(2020, 0, 1)).toISOString();
    const end = new Date().toISOString();
    fetch(`/api/adminRo/analytics?start=${start}&end=${end}`)
      .then(r => r.json())
      .then(rows => {
        const total = rows.reduce((sum, r) => sum + Number(r.visits), 0);
        setStats(prev => ({ ...prev, totalVisits: total }));
      });
  }, []);

  return (
    <>
      <section className={cardStyles.cardsSection}>
        {STAT_CARDS.map((card, i) => (
          <div key={card.key} className={cardStyles.card} style={{ animationDelay: `${i * 60}ms` }}>
            <span className={cardStyles.cardLabel}>{card.label}</span>
            <span className={cardStyles.cardValue}>{stats[ card.key ]}</span>
          </div>
        ))}
      </section>

      <section className={revenueStyles.revenueSection}>
        <div className={revenueStyles.controlBlock}>

          <label className={revenueStyles.filterToggle}>
            <input
              type="checkbox"
              checked={filtered}
              onChange={e => setFiltered(e.target.checked)}
              className={revenueStyles.filterCheckbox}
            />
            <span className={revenueStyles.filterLabel}>Filter by period</span>
          </label>

          <div className={`${revenueStyles.dropdowns} ${!filtered ? revenueStyles.dropdownsDisabled : ''}`}>
            <label className={revenueStyles.dateLabel}>
              Start Date
              <input
                type="date"
                disabled={!filtered}
                className={revenueStyles.dateInput}
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </label>
            <span className={revenueStyles.dateRangeInfo}>
              {toUTCRange(startDate).end.slice(0, 10)}
            </span>
          </div>

        </div>

        <div className={revenueStyles.revenueCards}>
          {REVENUE_CARDS.map(card => (
            <div key={card.key} className={revenueStyles.revenueCard}>
              <span className={revenueStyles.revenueCardLabel}>{card.label}</span>
              <span className={revenueStyles.revenueCardValue}>
                {formatValue(revenueStats[ card.key ], card.prefix)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <GrowthMetricsChart />
    </>
  );
}