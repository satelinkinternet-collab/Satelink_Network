"use client";

import { useState } from "react";
import Link from "next/link";

export function NodeOperatorTeaser() {
  const [dailyRequests, setDailyRequests] = useState(100000);
  const pricePerRequest = 0.00003;
  const operatorShare = 0.50;

  const dailyEarnings = dailyRequests * pricePerRequest * operatorShare;
  const monthlyEarnings = dailyEarnings * 30;

  return (
    <section className="section" id="nodes">
      <div className="container">
        <div className="node-cta-card">
          <span className="badge badge-live" style={{ marginBottom: "var(--space-6)" }}>
            Node Operators
          </span>

          <h2 className="heading-lg" style={{ marginBottom: "var(--space-4)" }}>
            Turn idle hardware into{" "}
            <span style={{ color: "var(--earn)" }}>USDT income</span>
          </h2>

          <p className="text-body-lg" style={{ maxWidth: "640px", margin: "0 auto var(--space-8)" }}>
            50% of all revenue routes to node operators. Claim when you hit 1 USDT.
            Paid in USDT on Polygon.
          </p>

          <div className="stats-row">
            <div className="stat-item-large">
              <div className="stat-value-large" style={{ color: "var(--earn)" }}>50%</div>
              <div className="stat-label-large">Revenue Share</div>
            </div>
            <div className="stat-item-large">
              <div className="stat-value-large">1 USDT</div>
              <div className="stat-label-large">Min Claim</div>
            </div>
            <div className="stat-item-large">
              <div className="stat-value-large">Polygon</div>
              <div className="stat-label-large">Settlement</div>
            </div>
          </div>

          <div className="calculator">
            <div className="calculator-header">
              <span>Daily Requests</span>
              <span className="calculator-value">{dailyRequests.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min="1000"
              max="1000000"
              step="1000"
              value={dailyRequests}
              onChange={(e) => setDailyRequests(Number(e.target.value))}
              className="calculator-slider"
            />
            <div className="calculator-result">
              <div className="result-item">
                <span className="result-label">Monthly USDT</span>
                <span className="result-value">${monthlyEarnings.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <Link href="/nodes" className="btn btn-primary btn-lg" style={{ marginTop: "var(--space-8)" }}>
            Calculate earnings &rarr;
          </Link>
        </div>
      </div>

      <style jsx>{`
        .node-cta-card {
          background: var(--gradient-card);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-2xl);
          padding: var(--space-12);
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .node-cta-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--earn), transparent);
        }

        .stats-row {
          display: flex;
          justify-content: center;
          gap: var(--space-12);
          margin-bottom: var(--space-8);
          flex-wrap: wrap;
        }

        .stat-item-large {
          text-align: center;
        }

        .stat-value-large {
          font-family: var(--font-heading);
          font-size: 2rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: var(--space-1);
        }

        .stat-label-large {
          font-size: 0.875rem;
          color: var(--text-muted);
        }

        .calculator {
          max-width: 400px;
          margin: 0 auto;
          padding: var(--space-6);
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-xl);
        }

        .calculator-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-4);
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .calculator-value {
          font-family: var(--font-mono);
          color: var(--text-primary);
          font-weight: 600;
        }

        .calculator-slider {
          width: 100%;
          height: 4px;
          background: var(--border-subtle);
          border-radius: 2px;
          outline: none;
          -webkit-appearance: none;
          margin-bottom: var(--space-6);
        }

        .calculator-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          background: var(--signal);
          border-radius: 50%;
          cursor: pointer;
        }

        .calculator-result {
          padding-top: var(--space-4);
          border-top: 1px solid var(--border-subtle);
        }

        .result-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .result-label {
          color: var(--text-muted);
          font-size: 0.875rem;
        }

        .result-value {
          font-family: var(--font-heading);
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--earn);
        }
      `}</style>
    </section>
  );
}
