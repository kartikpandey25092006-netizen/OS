# Four scripted selector demos

Start the app with `npm run dev`, open **Simulator**, keep **Minimum average waiting time**, **Auto** priority scale, automatic Round Robin quantum, zero context-switch cost, and default thresholds. For each scenario choose the named **Demo scenario**, click **Load**, then **Run simulation**. Read the rule and computed statistics in **Why this algorithm?**, and inspect its Gantt and comparison chart. A verification warning may appear because the rule choice is deliberately kept separate from the measured best competitor.

| Demo                                      | Preset and exact rows `(PID, arrival, burst, priority)`                | Computed signal                              | Expected rule and selection                                                                 |
| ----------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 1. Priority signal                        | **Priority spread**: `(P1,0,6,1)`, `(P2,1,4,4)`, `(P3,2,3,2)`          | Observed priority spread ratio `1.00`        | `priority-spread`; **Priority**. Explain that smaller priority numbers run first.           |
| 2. High variation with staggered arrivals | **Staggered high variance**: `(P1,0,20,1)`, `(P2,3,2,1)`, `(P3,6,2,1)` | Burst CV about `1.06`; arrival ratio `0.75`  | `high-cv-staggered`; **SRTF**. Step the timeline to show a short new arrival preempting P1. |
| 3. Similar bursts                         | **Similar bursts**: `(P1,0,5,1)`, `(P2,0,6,1)`, `(P3,0,5,1)`           | Burst CV about `0.09`                        | `low-cv`; **Round Robin**, quantum `5` (median burst). Explain queue rotation.              |
| 4. Moderate variation                     | **Moderate variation**: `(P1,0,3,1)`, `(P2,0,5,1)`                     | Burst CV `0.25`, exactly the low-CV boundary | `moderate`; **SJF**. Explain that low-CV uses `< 0.25`, so equality reaches the fallback.   |

To demonstrate the other half of the high-CV rule, load **Batch high variance** after demo 2. It has bursts 20, 2, 2 arriving together and selects **SJF** because the arrival ratio is zero. The mixed Priority path can be shown with P1 `(0,11,1)` and P2 `(0,29,5)` after setting the manual priority scale to 1–11; both spread and CV hit their thresholds.

The defaults here are the original explainable rules. Clicking **Apply tuned thresholds** in Evaluation changes the simulator settings and may change these decisions. Reset to defaults before repeating this script.
