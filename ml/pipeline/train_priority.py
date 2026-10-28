"""
Priority Prediction Model Training
Trains a Random Forest Classifier on MIMIC-IV-ED triage data to predict patient triage acuity.
Target: ESI Acuity (1: Resuscitation, 2: Emergent/High, 3: Urgent/Medium, 4: Less Urgent/Low)
"""

import json
from datetime import datetime
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, classification_report
import joblib

PROCESSED_DATA_PATH = Path("ml/data/processed/mimic_triage_clean.csv")
MODELS_DIR = Path("ml/models")

FEATURES = [
    'temp_c',
    'heartrate',
    'resprate',
    'o2sat',
    'sbp',
    'dbp',
    'pain_score',
    'shock_index',
    'pulse_pressure',
    'mean_arterial_pressure',
    'vitals_risk_score',
    'is_male',
    'is_ambulance',
    'high_risk_complaint'
]

def train_priority_model():
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    if not PROCESSED_DATA_PATH.exists():
        raise FileNotFoundError(f"Processed data file {PROCESSED_DATA_PATH} not found.")
        
    df = pd.read_csv(PROCESSED_DATA_PATH)
    
    # Clip acuity to standard 1, 2, 3, 4
    df['target'] = df['acuity'].clip(1, 4).astype(int)
    
    X = df[FEATURES]
    y = df['target']
    
    # Stratified split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=42, stratify=y
    )
    
    clf = RandomForestClassifier(
        n_estimators=120,
        max_depth=6,
        min_samples_split=4,
        class_weight='balanced',
        random_state=42
    )
    
    clf.fit(X_train, y_train)
    
    y_pred = clf.predict(X_test)
    y_proba = clf.predict_proba(X_test)
    
    acc = float(accuracy_score(y_test, y_pred))
    prec = float(precision_score(y_test, y_pred, average='weighted', zero_division=0))
    rec = float(recall_score(y_test, y_pred, average='weighted', zero_division=0))
    f1 = float(f1_score(y_test, y_pred, average='weighted', zero_division=0))
    macro_f1 = float(f1_score(y_test, y_pred, average='macro', zero_division=0))
    cm = confusion_matrix(y_test, y_pred).tolist()
    
    # Baseline: Majority Class Predictor
    majority_class = int(y_train.mode()[0])
    y_baseline = np.full_like(y_test, fill_value=majority_class)
    baseline_acc = float(accuracy_score(y_test, y_baseline))
    
    # Class distribution in training set
    class_distribution = {int(k): int(v) for k, v in y.value_counts().sort_index().items()}
    
    feature_importances = {
        feat: float(imp) for feat, imp in zip(FEATURES, clf.feature_importances_)
    }
    feature_importances = dict(sorted(feature_importances.items(), key=lambda item: item[1], reverse=True))
    
    metrics = {
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
        "macro_f1": round(macro_f1, 4),
        "baseline_majority_accuracy": round(baseline_acc, 4),
        "majority_class": majority_class,
        "confusion_matrix": cm,
        "classes": [int(c) for c in clf.classes_],
        "class_distribution": class_distribution,
        "feature_importances": feature_importances,
        "dataset_size": len(df),
        "train_size": len(X_train),
        "test_size": len(X_test),
        "clinical_safety_notice": "Experimental decision-support only. Acuity classification must never override clinical staff triage.",
        "performance_assessment": "Moderate predictive performance due to class imbalance and overlapping vital signs across ESI 2 and ESI 3."
    }
    
    model_path = MODELS_DIR / "priority_model_v1.joblib"
    joblib.dump({
        "model": clf,
        "features": FEATURES,
        "classes": clf.classes_,
        "metrics": metrics
    }, model_path)
    
    print(f"Priority Model trained: Acc={acc:.4f} (Baseline: {baseline_acc:.4f}), F1={f1:.4f}, Macro-F1={macro_f1:.4f}")
    return metrics

if __name__ == "__main__":
    train_priority_model()
