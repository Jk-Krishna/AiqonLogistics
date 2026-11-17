# Shipment Analysis — Intelligent Multimodal Route Optimizer

An enterprise-grade shipment planning and multimodal route optimization platform. It balances **freight cost, delivery speed, and disruption risk** under uncertainty using multi-attribute utility theory, Pareto non-dominance filtering, and Monte Carlo stochastic simulations.

---

## Quick Start (Run Locally in 2 Steps)

### Step 1: Install Python Dependencies
```bash
pip install -r requirements.txt
```

### Step 2: Start the Web Server
```bash
python run_app.py
```
Open **[http://localhost:8000](http://localhost:8000)** in your browser.

> **Zero Extra Setup:** The web interface and backend API run together from this single command. No Node.js or external database required.

---

## What This System Does

When shipping cargo globally (e.g., *Hyderabad → Singapore*, *Chennai → London*, *Delhi → New York*, or *Mumbai → Rotterdam*), picking the cheapest route often leads to expensive delays, while expedited air freight can exceed your budget.

**Shipment Analysis** solves this by:
1. **Generating realistic candidate routes** across ocean, air, rail, road, and multimodal corridors between 50+ global trade hubs.
2. **Filtering out impossible routes** that exceed delivery deadlines, breach budgets, or violate cargo handling rules (e.g., hazardous or temperature-controlled goods).
3. **Pruning inferior routes** using a Pareto dominance filter (dropping routes that are worse across all metrics).
4. **Ranking surviving routes** according to your priority:
   * **Lowest Cost**: Minimizes total freight expense.
   * **Fastest Delivery**: Prioritizes reaching destination quickly.
   * **Lowest Risk**: Prioritizes reliability and low disruption risk.
   * **Balanced**: Equal consideration of cost, time, and reliability.
   * **Custom**: Set exact sliders for Cost, Speed, and Reliability.
5. **Testing uncertainty** with **2,500 Monte Carlo simulation runs** to calculate true on-time delivery probability ($P(\text{on-time})$), worst-case transit times ($P_{90}$), and decision stability.
6. **Explaining the decision in plain English**: Clearly explains why the winning route was chosen, the trade-off made, and why every competitor lost.

---

## Benchmark Results (30 Global Corridors)

The decision engine was benchmarked across **30 diverse intercontinental shipments** against 3 standard baseline heuristics (1,000 Monte Carlo runs per shipment):

| Strategy | Base Freight | Delay Penalties Paid | Total Realized Cost | On-Time Reliability | Budget/Cargo Violations |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Shipment Analysis Engine** | **$4,432** | **$124** | **$4,557** | **96.0%** | **0** |
| Baseline 1: Cheapest First | $2,840 | $2,583 | $5,423 | 27.6% | 1 |
| Baseline 2: Fastest First | $4,532 | $18 | $4,550 | 99.6% | 1 |
| Baseline 3: Lowest Risk | $5,138 | $29 | $5,167 | 99.0% | 4 |

> **Key Takeaway ("The Cheap Route Trap"):** The "Cheapest" baseline looks cheaper on paper ($2,840 upfront), but severe transit delays incur an average of **$2,583 in delay penalties**, dropping on-time delivery to **27.6%** and driving total realized cost 19% higher than our optimized engine.

To rerun the offline benchmark evaluation:
```bash
python evaluate.py
```

---

## Project Structure

```text
├── backend/
│   └── app.py              # FastAPI REST API & static file web server
├── core/
│   ├── aggregator.py       # Cumulative cost, transit time & delay probability math
│   ├── constraints.py      # Hard constraint filtering (deadlines, budget, reefer, hazardous)
│   ├── explainer.py        # Plain-English trade-off & elimination rationale
│   ├── generator.py        # Dynamic multimodal route synthesizer
│   ├── locations.py        # 50+ global seaports, airports & inland hub coordinates
│   ├── models.py           # Pydantic data schemas (Shipment, Route, Leg, Evaluation)
│   ├── pareto.py           # Multi-objective Pareto non-dominance pruning
│   ├── pipeline.py         # 8-stage decision pipeline orchestrator
│   ├── recommender.py      # Final ranking & close-call margin detector
│   ├── scoring.py          # Multi-attribute utility functions & objective weighting
│   └── uncertainty.py      # Monte Carlo simulation & sensitivity analysis
├── frontend/
│   ├── dist/               # Prebuilt production React application
│   ├── src/
│   │   ├── App.jsx         # Clean, minimal monochromatic SaaS UI
│   │   ├── index.css       # Tailwind CSS styles
│   │   └── main.jsx        # React root
│   ├── index.html
│   └── package.json
├── evaluate.py             # Offline benchmark runner
├── evaluation_results.json # Benchmark dataset records
├── requirements.txt        # Python dependencies (FastAPI, NumPy, Pandas, Matplotlib)
├── run_app.py              # Single command launcher
└── REPORT.md               # Detailed technical report
```

---

## API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Healthcheck and active shipment catalog status |
| `GET` | `/api/locations?q={query}` | Search and autocomplete global trade hubs |
| `POST` | `/api/generate-routes` | Dynamically synthesizes candidate multimodal routes |
| `POST` | `/api/optimize` | Runs the 8-stage optimization pipeline on a shipment |
| `GET` | `/api/evaluate` | Retrieves benchmark performance metrics |
| `GET` | `/docs` | Interactive Swagger API documentation |
