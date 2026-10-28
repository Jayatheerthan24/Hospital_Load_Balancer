"""
Queue Abandonment (LWBS - Left Without Being Seen) Risk Model Training
Predicts the risk probability of a patient leaving the queue prematurely based on:
- Wait time elapsed vs expected wait time
- Acuity level (lower acuity + prolonged wait = highest walkout risk)
- Queue depth and peak hour stress
"""

import os
import json
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import roc_auc_score, f1_score, accuracy_score, precision_score, recall_score
from sklearn.model_selection import train_test_split
import joblib

MODEL_DIR = Path("ml/models")

def build_abandonment_dataset(n_samples: int = 3000):
    np.random.seed(42)
    
    # Generate realistic queue wait distributions
    acuity = np.random.choice([1, 2, 3, 4, 5], size=n_samples, p=[0.05, 0.20, 0.45, 0.20, 0.10])
    wait_time_minutes = np.random.exponential(scale=35, size=n_samples) + 5
    queue_length = np.random.poisson(lam=8, size=n_samples) + 1
    hour = np.random.randint(0, 24, size=n_samples)
    age = np.random.randint(18, 85, size=n_samples)
    
    # Calculate ground truth probability of leaving
    # Higher for lower urgency (acuity 4,5), longer wait times, large queues, overnight hours
    acuity_weight = {1: 0.01, 2: 0.03, 3: 0.12, 4: 0.25, 5: 0.35}
    acuity_factor = np.array([acuity_weight[a] for a in acuity])
    
    # Sigmoid on wait time threshold
    wait_factor = 1.0 / (1.0 + np.exp(-(wait_time_minutes - 45.0) / 15.0))
    queue_factor = np.clip(queue_length / 15.0, 0.1, 1.0)
    
    prob = (0.4 * wait_factor + 0.35 * acuity_factor + 0.15 * queue_factor) * 0.85
    prob = np.clip(prob, 0.01, 0.95)
    
    # Binary label
    y = (np.random.rand(n_samples) < prob).astype(int)
    
    df = pd.DataFrame({
        "acuity": acuity,
        "wait_time_minutes": wait_time_minutes,
        "queue_length": queue_length,
        "hour": hour,
        "age": age,
        "wait_to_acuity_ratio": wait_time_minutes / acuity,
        "lwbs_target": y
    })
    return df

FEATURE_COLS = [
    "acuity", "wait_time_minutes", "queue_length", "hour", "age", "wait_to_acuity_ratio"
]

def train_abandonment_model():
    print("--- Training Queue Abandonment (LWBS) Risk Model ---")
    df = build_abandonment_dataset()
    
    X = df[FEATURE_COLS]
    y = df["lwbs_target"]
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    
    clf = GradientBoostingClassifier(
        n_estimators=100,
        learning_rate=0.08,
        max_depth=3,
        random_state=42
    )
    clf.fit(X_train, y_train)
    
    y_pred = clf.predict(X_test)
    y_prob = clf.predict_proba(X_test)[:, 1]
    
    acc = float(accuracy_score(y_test, y_pred))
    prec = float(precision_score(y_test, y_pred, zero_division=0))
    rec = float(recall_score(y_test, y_pred, zero_division=0))
    f1 = float(f1_score(y_test, y_pred, zero_division=0))
    roc_auc = float(roc_auc_score(y_test, y_prob))
    
    print(f"Abandonment Model Metrics -> Accuracy: {acc:.3f} | ROC-AUC: {roc_auc:.3f} | F1: {f1:.3f}")
    
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    model_artifact = {
        "model": clf,
        "features": FEATURE_COLS,
        "metrics": {
            "accuracy": acc,
            "precision": prec,
            "recall": rec,
            "f1_score": f1,
            "roc_auc": roc_auc,
            "sample_count": len(df)
        },
        "version": "1.0.0"
    }
    
    model_path = MODEL_DIR / "abandonment_model.joblib"
    joblib.dump(model_artifact, model_path)
    print(f"Saved abandonment model to: {model_path}")
    
    return {
        "name": "Queue Abandonment (LWBS) Classifier",
        "algorithm": "Gradient Boosting Classifier",
        "target": "Left Without Being Seen Risk (Binary Probability)",
        "features": FEATURE_COLS,
        "metrics": {"accuracy": acc, "roc_auc": roc_auc, "f1_score": f1},
        "artifact_path": str(model_path)
    }

if __name__ == "__main__":
    train_abandonment_model()
