# Raft v2.0 - Core Feature Enhancements Summary
**Log Date: May 28, 2026**

This document outlines the latest updates and usability improvements delivered for the Raft Bitcoin tool.

---

## 1. Fiat-Based Saving Goal
* **Problem Solved**: The goal system previously only accepted a monthly target in satoshis. Users who earn in fiat and aren't accustomed to calculating in BTC had to perform manual conversions before setting a goal, creating unnecessary friction.
* **The Solution**:
  - Re-designed the goal modal to include a "Unit" selector (Fiat or Sats).
  - When "Fiat" is selected, the input label changes to "Amount per month" with the active currency symbol.
  - The dashboard goal progress ring now intelligently compares the user's monthly BTC capacity (converted dynamically to fiat) against the fiat goal.
  - Added a responsive subtext line beneath the goal ring (e.g., "≈ 0.0008 BTC today") that updates automatically as the Bitcoin price changes.

---

## 2. Goal-to-What-If Nudge
* **Problem Solved**: After setting a goal, users often wondered how buying that specific amount of Bitcoin would affect their financial runway. Exploring this required manually navigating to the simulator and retyping the numbers.
* **The Solution**:
  - Added a "See how this affects your runway" action link directly below the active goal ring on the dashboard.
  - Clicking this link smoothly scrolls the user to the What-If simulator.
  - The simulator automatically opens in a "linked" mode, pre-filling the exact fiat or sats equivalent of their goal amount and selecting the "Buy BTC" action.

---

## 3. Fiat-Input Wallet Fields with Live BTC Conversion
* **Problem Solved**: Updating wallet positions required users to input their Cold, Liquid, and Mobile balances strictly in BTC. For users tracking their net worth in fiat, this required mental overhead and discouraged frequent updates.
* **The Solution**:
  - Converted the wallet input fields within the "Update Position" modal to accept fiat currency amounts instead of BTC.
  - Implemented real-time dynamic sub-labels beneath each input that calculate and display the approximate BTC equivalent based on the live CoinGecko price.
  - The system automatically handles the conversion math on save, persisting the exact BTC balances in the background to preserve data integrity across the app.

---

## 4. Income Breakdown with Pay Frequency
* **Problem Solved**: The app previously relied on a single "Expected Monthly Income" input, forcing users to manually add up their multiple income streams and obscuring when they actually get paid.
* **The Solution**:
  - Upgraded the "Update Position" modal to feature an inline list of distinct income sources (similar to the bill tracking pattern).
  - Users can now name each income stream, define its amount, and set its frequency (Monthly, Bi-weekly, Weekly, Custom day, or Irregular).
  - The system automatically calculates and normalizes the total monthly income (e.g., multiplying weekly pay by 4.33).
  - This system dynamically derives the user's paydays, seamlessly syncing with the "Payday Pulse" feature to provide accurate awareness notifications without manual calendar entry.

---

## 5. Onboarding Polish
* **Problem Solved**: The initial app onboarding flow lacked context regarding why financial questions were being asked, lacked clear boundaries about financial advice, and offered no way to skip straight to the dashboard.
* **The Solution**:
  - Added explanatory microcopy ("We'll use this to tailor your dashboard view.") to build user trust.
  - Added a prominent disclaimer: "Raft never recommends anything. It just does math on your numbers." to manage expectations and liabilities.
  - Introduced a "Skip for now" link that cleanly exits the onboarding process, loading the dashboard with safe default values and allowing users to explore the tool immediately.
