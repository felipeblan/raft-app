# Raft v2.0 - Ticket 28 Feature Enhancement
**Log Date: May 29, 2026**

This document outlines the latest update for the Raft Bitcoin tool concerning everyday spending visibility.

---

## Average Monthly Spending
* **Problem Solved**: Raft originally calculated the fiat runway using only fixed, tracked bills. Real-life expenses naturally include variable everyday spending like food, transport, and shopping. Without accounting for these, the calculated runway appeared artificially long and potentially misleading.
* **The Solution**:
  - **Optional Spending Estimate**: Added a single, optional input field in the "Update Position" modal for users to provide a best estimate of their average monthly everyday spending.
  - **Contextual Tooltip Guidance**: Built a quiet, non-intrusive tooltip that appears *only on the very first interaction* with this field to help users understand what expenses to include. It leverages local storage to ensure it never nags the user again.
  - **Adjusted Calculations**: The application now seamlessly factors this monthly spending into total fiat outflows, thereby accurately reducing the monthly net cashflow and available BTC stacking capacity.
  - **Honest Runway Display**: Instead of outright replacing the main runway display, the dashboard preserves the baseline metric and dynamically injects a smaller, contextual "adjusted runway" directly below it (e.g., *"With your estimated everyday spending, your runway is 2.5 months."*). This provides users with a comprehensive and transparent view of their financial health without complicating the interface. Both runway figures are now formatted to one decimal place for superior precision.
