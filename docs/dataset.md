# Dataset Documentation: PhysioNet MIMIC-IV-ED

## Overview
The system uses the official **MIMIC-IV-ED** (Medical Information Mart for Intensive Care IV - Emergency Department) dataset from PhysioNet.

- **Official Source**: [https://physionet.org/content/mimic-iv-ed-demo/2.2/](https://physionet.org/content/mimic-iv-ed-demo/2.2/)
- **Citation**: Johnson, A., Bulgarelli, L., Pollard, T., Celi, L. A., Mark, R., & Horng, S. (2023). MIMIC-IV-ED (version 2.2). PhysioNet.

## Files Ingested

1. **`triage.csv`**: Contains initial vital signs recorded upon patient arrival at emergency triage:
   - `temperature`: Initial body temperature
   - `heartrate`: Pulse in beats per minute
   - `resprate`: Respiratory rate
   - `o2sat`: Peripheral capillary oxygen saturation ($SpO_2$)
   - `sbp` / `dbp`: Systolic and diastolic blood pressure
   - `pain`: Initial pain score
   - `acuity`: Emergency Severity Index (ESI 1-5) ground truth target
   - `chiefcomplaint`: Patient-reported presenting complaint

2. **`edstays.csv`**: Contains admission and departure timestamps:
   - `stay_id`: Unique ED stay identifier
   - `intime` / `outtime`: Registration and discharge timestamps
   - `gender`, `race`, `arrival_transport`

3. **`vitalsign.csv`**: Periodic vital sign measurements recorded during the clinical stay.

## Preprocessing & Clinical Feature Engineering

- **Unit Standardization**: Automatic detection of Fahrenheit vs Celsius; standardized to Celsius.
- **Pain Sanitization**: Text tokens (`unable`, `denies`, `critical`) parsed into clean numerical scale $[0, 10]$.
- **Shock Index**: Calculated as $\frac{\text{Heart Rate}}{\text{Systolic BP}}$. Critical indicator of occult shock ($> 0.9$).
- **Mean Arterial Pressure (MAP)**: $\frac{2 \cdot \text{DBP} + \text{SBP}}{3}$.
- **Pulse Pressure**: $\text{SBP} - \text{DBP}$.
- **Physiological Risk Score**: Derived from the National Early Warning Score (NEWS2) protocol.
