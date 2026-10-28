# Queue & Load Balancing Algorithms

## 1. Queue Engine Mechanics

The queue engine implements a **Priority-Preempted FIFO** discipline:

1. **Intake & Triage**:
   - Each registered patient is assigned an ESI priority category: `RESUSCITATION` (1), `HIGH` (2), `MEDIUM` (3), `LOW` (4).
   - Acuity 1 & 2 patients are prioritized at the top of the queue for immediate clinical evaluation.

2. **Token Generation**:
   - Tokens follow the department convention (e.g. `EMG-101`, `CRD-102`, `GEN-103`).

3. **Consultation State Transitions**:
   - `WAITING` $\rightarrow$ `IN_CONSULTATION` $\rightarrow$ `COMPLETED` / `CANCELLED`.
   - Starting a consultation marks the physician status as `BUSY` and advances the queue.
   - Completing a consultation logs the clinical duration and disposition outcome, sets the doctor to `AVAILABLE`, and triggers automatic waiting-time recalculations for all downstream patients.

---

## 2. Multi-Factor Load Balancing Algorithm

Rather than assigning patients solely to the shortest queue, the system computes a multi-dimensional affinity score:

$$\text{Score} = S_{\text{base}} + B_{\text{avail}} + B_{\text{specialty}} + B_{\text{exp}} - P_{\text{queue}} - P_{\text{wait}} - P_{\text{workload}}$$

### Scoring Parameters

| Factor | Weight / Formula | Rationale |
|---|---|---|
| **Department Specialty Match** | $+40$ pts (exact) / $+10$ pts (cross-compatible) | Ensures clinical competency match |
| **Workstation Availability** | $+50$ pts (`AVAILABLE`) / $+15$ pts (`BUSY`) | Prioritizes idle physicians |
| **Queue Length Penalty** | $-2.5 \times \text{queue\_len}$ | Prevents queue depth imbalance |
| **Predicted Wait Time** | $-1.5 \times \text{predicted\_wait\_min}$ | Directly minimizes patient delays |
| **Doctor Workload Penalty** | $-3.0 \times \frac{\text{queue}}{\text{capacity}} \times 10$ | Protects physicians from burnout |
| **Physician Experience Bonus** | $+0.5 \times \text{experience\_years}$ | Favors senior physicians for complex triage |

### Transparent Rationale Example

For Patient `P104` presenting with acute respiratory symptoms:
- **Doctor A (Trauma)**: Queue = 8, Wait = 32 min, Workload = 67% $\rightarrow$ Score: 78.4
- **Doctor B (Emergency)**: Queue = 1, Wait = 4 min, Workload = 10% $\rightarrow$ Score: 142.1 (RECOMMENDED)
- **Doctor C (Off-shift)**: OFFLINE $\rightarrow$ Score: -500.0 (EXCLUDED)

*System Recommendation Reason:*
> "Optimal choice: Dr. Marcus Vance (Emergency Medicine) with 1 in queue, 4.0 min predicted wait, and 10.0% capacity."
