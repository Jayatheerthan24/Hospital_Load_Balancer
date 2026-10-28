"""
MIMIC-IV-ED Preprocessing and Feature Engineering Pipeline
Handles clinical data cleaning, unit standardization, vital sign validation,
and engineered physiological indices (Shock Index, MAP, Pulse Pressure).
"""

import re
import numpy as np
import pandas as pd
from pathlib import Path

RAW_DIR = Path("ml/data/raw")
PROCESSED_DIR = Path("ml/data/processed")

def clean_pain_score(val):
    if pd.isna(val):
        return 0.0
    val_str = str(val).strip().lower()
    if val_str in ['unable', 'utd', 'denies', 'critical', 'unresponsive', 'na', 'none']:
        return 0.0
    # Match first integer/float found
    match = re.search(r'(\d+)', val_str)
    if match:
        num = float(match.group(1))
        return min(max(num, 0.0), 10.0)
    return 0.0

def convert_temp_to_celsius(temp):
    if pd.isna(temp):
        return 37.0
    try:
        t = float(temp)
        if t > 50.0:  # Fahrenheit (e.g. 98.6F -> 37.0C)
            return round((t - 32) * 5 / 9, 1)
        return round(t, 1)
    except:
        return 37.0

def preprocess_triage_data():
    triage_path = RAW_DIR / "triage.csv"
    edstays_path = RAW_DIR / "edstays.csv"
    
    df_triage = pd.read_csv(triage_path)
    df_edstays = pd.read_csv(edstays_path)
    
    # Merge triage with edstays
    df = pd.merge(df_triage, df_edstays[['stay_id', 'gender', 'arrival_transport', 'intime', 'outtime']], on='stay_id', how='inner')
    
    # Clean vitals
    df['temp_c'] = df['temperature'].apply(convert_temp_to_celsius)
    df['pain_score'] = df['pain'].apply(clean_pain_score)
    df['heartrate'] = pd.to_numeric(df['heartrate'], errors='coerce').fillna(80.0).clip(30, 220)
    df['resprate'] = pd.to_numeric(df['resprate'], errors='coerce').fillna(18.0).clip(6, 60)
    df['o2sat'] = pd.to_numeric(df['o2sat'], errors='coerce').fillna(98.0).clip(50, 100)
    df['sbp'] = pd.to_numeric(df['sbp'], errors='coerce').fillna(120.0).clip(50, 260)
    df['dbp'] = pd.to_numeric(df['dbp'], errors='coerce').fillna(75.0).clip(30, 160)
    
    # Clinical Engineered Features
    df['shock_index'] = (df['heartrate'] / df['sbp']).round(3)
    df['pulse_pressure'] = (df['sbp'] - df['dbp']).round(1)
    df['mean_arterial_pressure'] = ((2 * df['dbp'] + df['sbp']) / 3).round(1)
    
    # NEWS2-like physiological risk components
    def calculate_vitals_risk(row):
        score = 0
        if row['resprate'] <= 8 or row['resprate'] >= 25: score += 3
        elif row['resprate'] >= 21: score += 2
        
        if row['o2sat'] <= 91: score += 3
        elif row['o2sat'] <= 93: score += 2
        elif row['o2sat'] <= 95: score += 1
        
        if row['sbp'] <= 90 or row['sbp'] >= 220: score += 3
        elif row['sbp'] <= 100: score += 2
        elif row['sbp'] <= 110: score += 1
        
        if row['heartrate'] <= 40 or row['heartrate'] >= 131: score += 3
        elif row['heartrate'] >= 111 or row['heartrate'] <= 50: score += 1
        
        if row['temp_c'] <= 35.0: score += 3
        elif row['temp_c'] >= 39.1: score += 2
        elif row['temp_c'] >= 38.1 or row['temp_c'] <= 36.0: score += 1
        return score
        
    df['vitals_risk_score'] = df.apply(calculate_vitals_risk, axis=1)
    
    # Categorical features
    df['is_male'] = (df['gender'] == 'M').astype(int)
    df['is_ambulance'] = df['arrival_transport'].astype(str).str.contains('AMBULANCE', case=False, na=False).astype(int)
    
    # Chief complaint high-risk indicator
    def extract_complaint_features(text):
        if pd.isna(text):
            return 0
        t = str(text).lower()
        high_risk_terms = ['chest pain', 'dyspnea', 'shortness of breath', 'sob', 'altered', 'stroke', 'trauma', 'bleeding', 'syncope', 'seizure']
        return 1 if any(term in t for term in high_risk_terms) else 0

    df['high_risk_complaint'] = df['chiefcomplaint'].apply(extract_complaint_features)
    
    # Drop records missing target acuity for supervised triage priority training
    df_clean = df.dropna(subset=['acuity']).copy()
    df_clean['acuity'] = df_clean['acuity'].astype(int)
    
    # Map ESI acuity: 1 (Resuscitation), 2 (Emergent), 3 (Urgent), 4 (Less Urgent), 5 (Non-urgent)
    # Acuity 1 -> 'RESUSCITATION', 2 -> 'HIGH', 3 -> 'MEDIUM', 4/5 -> 'LOW'
    priority_map = {1: 'RESUSCITATION', 2: 'HIGH', 3: 'MEDIUM', 4: 'LOW', 5: 'NON_URGENT'}
    df_clean['priority_label'] = df_clean['acuity'].map(lambda x: priority_map.get(x, 'MEDIUM'))
    
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    out_path = PROCESSED_DIR / "mimic_triage_clean.csv"
    df_clean.to_csv(out_path, index=False)
    print(f"Cleaned triage dataset saved: {len(df_clean)} records -> {out_path}")
    
    return df_clean

if __name__ == "__main__":
    preprocess_triage_data()
